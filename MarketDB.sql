/* =====================================================================
   MarketDB - SQL Server schema for the "مارکت" online store
   Target: SQL Server 2012 or newer, run from SSMS 18 (uses THROW and SEQUENCE)

   How to run
   - SSMS 18: File > Open > File... > MarketDB.sql, then click Execute (F5).
     The script creates the MarketDB database itself; you do not need to
     pick a database first. The file is saved as UTF-8 with BOM so Persian
     text is read correctly.
   - sqlcmd:  sqlcmd -S localhost -i MarketDB.sql -f 65001 -I
              (-I is required: filtered indexes need QUOTED_IDENTIFIER ON)

   Run it once. Procedures, views and the trigger are dropped and
   recreated, so they can be re-run safely; the tables cannot (drop the
   MarketDB database first if you want to start over).

   Conventions
   - All timestamps are UTC (SYSUTCDATETIME()).
   - Prices are whole numbers (تومان) stored as DECIMAL(18,0).
   - Passwords are NEVER hashed in SQL. Your backend hashes with
     bcrypt / Argon2 / PBKDF2 (e.g. ASP.NET Core Identity's hasher) and
     passes the finished hash string to usp_RegisterUser.
   ===================================================================== */

IF DB_ID(N'MarketDB') IS NULL
    CREATE DATABASE MarketDB COLLATE Persian_100_CI_AS;   -- case-insensitive, Persian-aware sorting
GO

USE MarketDB;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* =====================================================================
   1. USERS & AUTH
   Mirrors register.html: firstName, lastName, email, phone, password,
   terms checkbox. Email is stored lowercase, phone as 09XXXXXXXXX -
   exactly what the normalized JS validators produce.
   ===================================================================== */
CREATE TABLE dbo.Users (
    UserId            INT IDENTITY(1,1) NOT NULL,
    FirstName         NVARCHAR(50)  NOT NULL,
    LastName          NVARCHAR(50)  NOT NULL,
    Email             NVARCHAR(254) NOT NULL,
    Phone             CHAR(11)      NOT NULL,
    PasswordHash      NVARCHAR(255) NOT NULL,
    Role              NVARCHAR(20)  NOT NULL DEFAULT (N'customer'),
    IsActive          BIT           NOT NULL DEFAULT (1),
    IsEmailVerified   BIT           NOT NULL DEFAULT (0),
    IsPhoneVerified   BIT           NOT NULL DEFAULT (0),
    FailedLoginCount  TINYINT       NOT NULL DEFAULT (0),
    LockoutEnd        DATETIME2(0)  NULL,
    LastLoginAt       DATETIME2(0)  NULL,
    TermsAcceptedAt   DATETIME2(0)  NOT NULL,
    CreatedAt         DATETIME2(0)  NOT NULL DEFAULT (SYSUTCDATETIME()),
    UpdatedAt         DATETIME2(0)  NOT NULL DEFAULT (SYSUTCDATETIME()),
    RowVer            ROWVERSION,
    CONSTRAINT PK_Users PRIMARY KEY CLUSTERED (UserId),
    CONSTRAINT UX_Users_Email UNIQUE (Email),
    CONSTRAINT UX_Users_Phone UNIQUE (Phone),
    CONSTRAINT CK_Users_Phone CHECK (Phone LIKE '09[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'),
    CONSTRAINT CK_Users_Email CHECK (
        Email COLLATE Latin1_General_BIN2 = LOWER(Email) COLLATE Latin1_General_BIN2
        AND Email LIKE N'_%@_%._%'),
    CONSTRAINT CK_Users_Role  CHECK (Role IN (N'customer', N'admin'))
);
GO

CREATE TABLE dbo.Addresses (
    AddressId       INT IDENTITY(1,1) NOT NULL,
    UserId          INT           NOT NULL,
    Title           NVARCHAR(50)  NULL,                  -- e.g. "خانه", "محل کار"
    RecipientName   NVARCHAR(100) NOT NULL,
    RecipientPhone  CHAR(11)      NOT NULL,
    Province        NVARCHAR(50)  NOT NULL,
    City            NVARCHAR(50)  NOT NULL,
    AddressLine     NVARCHAR(500) NOT NULL,
    PostalCode      CHAR(10)      NOT NULL,
    IsDefault       BIT           NOT NULL DEFAULT (0),
    CreatedAt       DATETIME2(0)  NOT NULL DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Addresses PRIMARY KEY (AddressId),
    CONSTRAINT FK_Addresses_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE CASCADE,
    CONSTRAINT CK_Addresses_Phone  CHECK (RecipientPhone LIKE '09[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'),
    CONSTRAINT CK_Addresses_Postal CHECK (PostalCode NOT LIKE '%[^0-9]%' AND LEN(PostalCode) = 10)
);
CREATE INDEX IX_Addresses_User ON dbo.Addresses (UserId);
CREATE UNIQUE INDEX UX_Addresses_OneDefault ON dbo.Addresses (UserId) WHERE IsDefault = 1;
GO

/* Every login try, for server-side rate limiting / auditing.
   (The client-side lockout in js-login.js is only UX - this is the real one.) */
CREATE TABLE dbo.LoginAttempts (
    AttemptId    BIGINT IDENTITY(1,1) NOT NULL,
    UserId       INT          NULL,
    Identifier   NVARCHAR(254) NOT NULL,                 -- what was typed (email/phone)
    IpAddress    VARCHAR(45)  NULL,                      -- fits IPv6
    Succeeded    BIT          NOT NULL,
    AttemptedAt  DATETIME2(0) NOT NULL DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_LoginAttempts PRIMARY KEY (AttemptId),
    CONSTRAINT FK_LoginAttempts_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE SET NULL
);
CREATE INDEX IX_LoginAttempts_Identifier ON dbo.LoginAttempts (Identifier, AttemptedAt DESC);
CREATE INDEX IX_LoginAttempts_Ip         ON dbo.LoginAttempts (IpAddress, AttemptedAt DESC);
GO

/* For "فراموشی رمز عبور": store only a HASH (SHA-256) of the emailed/SMS token. */
CREATE TABLE dbo.PasswordResetTokens (
    TokenId     INT IDENTITY(1,1) NOT NULL,
    UserId      INT          NOT NULL,
    TokenHash   BINARY(32)   NOT NULL,
    ExpiresAt   DATETIME2(0) NOT NULL,
    UsedAt      DATETIME2(0) NULL,
    CreatedAt   DATETIME2(0) NOT NULL DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_PasswordResetTokens PRIMARY KEY (TokenId),
    CONSTRAINT FK_PasswordResetTokens_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE CASCADE,
    CONSTRAINT UX_PasswordResetTokens_Hash UNIQUE (TokenHash)
);
CREATE INDEX IX_PasswordResetTokens_User ON dbo.PasswordResetTokens (UserId);
GO

/* =====================================================================
   2. CATALOG
   Categories are a self-referencing tree that matches the mega-menu:
   Level 1 = top nav item (کالای دیجیتال) -> Level 2 = submenu column
   (لپ‌تاپ و کامپیوتر) -> Level 3 = link (مانیتور).
   Products can be attached to any level.
   ===================================================================== */
CREATE TABLE dbo.Categories (
    CategoryId  INT IDENTITY(1,1) NOT NULL,
    ParentId    INT           NULL,
    Name        NVARCHAR(100) NOT NULL,
    Slug        VARCHAR(100)  NOT NULL,
    IconClass   VARCHAR(60)   NULL,                      -- Font Awesome class, e.g. 'fas fa-laptop'
    ImageUrl    NVARCHAR(500) NULL,
    SortOrder   SMALLINT      NOT NULL DEFAULT (0),
    IsActive    BIT           NOT NULL DEFAULT (1),
    CONSTRAINT PK_Categories PRIMARY KEY (CategoryId),
    CONSTRAINT UX_Categories_Slug UNIQUE (Slug),
    CONSTRAINT FK_Categories_Parent FOREIGN KEY (ParentId) REFERENCES dbo.Categories(CategoryId),
    CONSTRAINT CK_Categories_NotOwnParent CHECK (ParentId IS NULL OR ParentId <> CategoryId)
);
CREATE INDEX IX_Categories_Parent ON dbo.Categories (ParentId, SortOrder);
GO

CREATE TABLE dbo.Products (
    ProductId         INT IDENTITY(1,1) NOT NULL,
    CategoryId        INT            NOT NULL,
    Name              NVARCHAR(200)  NOT NULL,
    Slug              VARCHAR(200)   NOT NULL,
    Sku               VARCHAR(50)    NULL,
    ShortDescription  NVARCHAR(500)  NULL,
    Description       NVARCHAR(MAX)  NULL,
    Price             DECIMAL(18,0)  NOT NULL,           -- current selling price
    OldPrice          DECIMAL(18,0)  NULL,               -- price before discount (shown struck-through)
    Currency          NVARCHAR(10)   NOT NULL DEFAULT (N'تومان'),
    StockQty          INT            NOT NULL DEFAULT (0),
    IsActive          BIT            NOT NULL DEFAULT (1),   -- soft delete / hide
    IsNew             BIT            NOT NULL DEFAULT (0),   -- "جدید" badge
    IsFeatured        BIT            NOT NULL DEFAULT (0),   -- big featured card in the tabs grid
    IsSpecialOffer    BIT            NOT NULL DEFAULT (0),   -- "تخفیف‌های ویژه" section
    RatingAvg         DECIMAL(3,2)   NOT NULL DEFAULT (0),   -- maintained by trigger on Reviews
    RatingCount       INT            NOT NULL DEFAULT (0),
    CreatedAt         DATETIME2(0)   NOT NULL DEFAULT (SYSUTCDATETIME()),
    UpdatedAt         DATETIME2(0)   NOT NULL DEFAULT (SYSUTCDATETIME()),
    /* the "-10%" badge, calculated so it can never drift from the prices */
    DiscountPercent AS (CASE WHEN OldPrice IS NOT NULL AND OldPrice > Price
                             THEN CONVERT(INT, ROUND((OldPrice - Price) * 100.0 / OldPrice, 0))
                             ELSE 0 END) PERSISTED,
    CONSTRAINT PK_Products PRIMARY KEY (ProductId),
    CONSTRAINT UX_Products_Slug UNIQUE (Slug),
    CONSTRAINT FK_Products_Categories FOREIGN KEY (CategoryId) REFERENCES dbo.Categories(CategoryId),
    CONSTRAINT CK_Products_Price    CHECK (Price >= 0),
    CONSTRAINT CK_Products_OldPrice CHECK (OldPrice IS NULL OR OldPrice > Price),
    CONSTRAINT CK_Products_Stock    CHECK (StockQty >= 0),
    CONSTRAINT CK_Products_Rating   CHECK (RatingAvg BETWEEN 0 AND 5)
);
CREATE UNIQUE INDEX UX_Products_Sku ON dbo.Products (Sku) WHERE Sku IS NOT NULL;
CREATE INDEX IX_Products_Category ON dbo.Products (CategoryId, IsActive) INCLUDE (Price, Name);
CREATE INDEX IX_Products_New      ON dbo.Products (CreatedAt DESC) WHERE IsNew = 1 AND IsActive = 1;
CREATE INDEX IX_Products_Special  ON dbo.Products (ProductId)      WHERE IsSpecialOffer = 1 AND IsActive = 1;
CREATE INDEX IX_Products_Name     ON dbo.Products (Name);
GO

/* Each product card has a main image, a hover image and thumbnails. */
CREATE TABLE dbo.ProductImages (
    ImageId    INT IDENTITY(1,1) NOT NULL,
    ProductId  INT           NOT NULL,
    Url        NVARCHAR(500) NOT NULL,
    AltText    NVARCHAR(200) NULL,
    ImageType  VARCHAR(10)   NOT NULL DEFAULT ('gallery'),
    SortOrder  SMALLINT      NOT NULL DEFAULT (0),
    CONSTRAINT PK_ProductImages PRIMARY KEY (ImageId),
    CONSTRAINT FK_ProductImages_Products FOREIGN KEY (ProductId) REFERENCES dbo.Products(ProductId) ON DELETE CASCADE,
    CONSTRAINT CK_ProductImages_Type CHECK (ImageType IN ('main', 'hover', 'gallery'))
);
CREATE INDEX IX_ProductImages_Product ON dbo.ProductImages (ProductId, SortOrder);
CREATE UNIQUE INDEX UX_ProductImages_Main  ON dbo.ProductImages (ProductId) WHERE ImageType = 'main';
CREATE UNIQUE INDEX UX_ProductImages_Hover ON dbo.ProductImages (ProductId) WHERE ImageType = 'hover';
GO

CREATE TABLE dbo.Reviews (
    ReviewId    INT IDENTITY(1,1) NOT NULL,
    ProductId   INT           NOT NULL,
    UserId      INT           NOT NULL,
    Rating      TINYINT       NOT NULL,
    Title       NVARCHAR(150) NULL,
    Body        NVARCHAR(2000) NULL,
    IsApproved  BIT           NOT NULL DEFAULT (0),      -- moderate before showing
    CreatedAt   DATETIME2(0)  NOT NULL DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Reviews PRIMARY KEY (ReviewId),
    CONSTRAINT UX_Reviews_OnePerUser UNIQUE (ProductId, UserId),
    CONSTRAINT FK_Reviews_Products FOREIGN KEY (ProductId) REFERENCES dbo.Products(ProductId) ON DELETE CASCADE,
    CONSTRAINT FK_Reviews_Users    FOREIGN KEY (UserId)    REFERENCES dbo.Users(UserId)       ON DELETE CASCADE,
    CONSTRAINT CK_Reviews_Rating CHECK (Rating BETWEEN 1 AND 5)
);
GO

/* =====================================================================
   3. CART, WISHLIST, COMPARE
   These are the things js-main.js currently keeps in localStorage.
   A cart belongs to EITHER a logged-in user OR a guest (GUID kept in a
   cookie); usp_MergeGuestCart moves the guest cart into the user's cart
   at login.
   ===================================================================== */
CREATE TABLE dbo.Carts (
    CartId      INT IDENTITY(1,1) NOT NULL,
    UserId      INT              NULL,
    GuestToken  UNIQUEIDENTIFIER NULL,
    CreatedAt   DATETIME2(0)     NOT NULL DEFAULT (SYSUTCDATETIME()),
    UpdatedAt   DATETIME2(0)     NOT NULL DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Carts PRIMARY KEY (CartId),
    CONSTRAINT FK_Carts_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE CASCADE,
    CONSTRAINT CK_Carts_Owner CHECK ((UserId IS NOT NULL AND GuestToken IS NULL)
                                  OR (UserId IS NULL AND GuestToken IS NOT NULL))
);
CREATE UNIQUE INDEX UX_Carts_User  ON dbo.Carts (UserId)     WHERE UserId IS NOT NULL;
CREATE UNIQUE INDEX UX_Carts_Guest ON dbo.Carts (GuestToken) WHERE GuestToken IS NOT NULL;
GO

CREATE TABLE dbo.CartItems (
    CartId     INT          NOT NULL,
    ProductId  INT          NOT NULL,
    Quantity   INT          NOT NULL,
    AddedAt    DATETIME2(0) NOT NULL DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_CartItems PRIMARY KEY (CartId, ProductId),
    CONSTRAINT FK_CartItems_Carts    FOREIGN KEY (CartId)    REFERENCES dbo.Carts(CartId)       ON DELETE CASCADE,
    CONSTRAINT FK_CartItems_Products FOREIGN KEY (ProductId) REFERENCES dbo.Products(ProductId) ON DELETE CASCADE,
    CONSTRAINT CK_CartItems_Qty CHECK (Quantity BETWEEN 1 AND 99)
);
GO

CREATE TABLE dbo.Wishlists (
    UserId     INT          NOT NULL,
    ProductId  INT          NOT NULL,
    AddedAt    DATETIME2(0) NOT NULL DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Wishlists PRIMARY KEY (UserId, ProductId),
    CONSTRAINT FK_Wishlists_Users    FOREIGN KEY (UserId)    REFERENCES dbo.Users(UserId)       ON DELETE CASCADE,
    CONSTRAINT FK_Wishlists_Products FOREIGN KEY (ProductId) REFERENCES dbo.Products(ProductId) ON DELETE CASCADE
);
GO

CREATE TABLE dbo.CompareItems (
    UserId     INT          NOT NULL,
    ProductId  INT          NOT NULL,
    AddedAt    DATETIME2(0) NOT NULL DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_CompareItems PRIMARY KEY (UserId, ProductId),
    CONSTRAINT FK_CompareItems_Users    FOREIGN KEY (UserId)    REFERENCES dbo.Users(UserId)       ON DELETE CASCADE,
    CONSTRAINT FK_CompareItems_Products FOREIGN KEY (ProductId) REFERENCES dbo.Products(ProductId) ON DELETE CASCADE
);
GO

/* =====================================================================
   4. ORDERS & PAYMENTS
   Orders keep a SNAPSHOT of address, product names and prices, so later
   edits/deletes in the catalog never change history.
   ===================================================================== */
CREATE SEQUENCE dbo.OrderNumberSeq AS INT START WITH 100001 INCREMENT BY 1;
GO

CREATE TABLE dbo.Orders (
    OrderId         INT IDENTITY(1,1) NOT NULL,
    OrderNumber     VARCHAR(20)   NOT NULL,              -- shown to customer, e.g. MK100001
    UserId          INT           NOT NULL,
    Status          NVARCHAR(20)  NOT NULL DEFAULT (N'Pending'),
    RecipientName   NVARCHAR(100) NOT NULL,
    RecipientPhone  CHAR(11)      NOT NULL,
    Province        NVARCHAR(50)  NOT NULL,
    City            NVARCHAR(50)  NOT NULL,
    AddressLine     NVARCHAR(500) NOT NULL,
    PostalCode      CHAR(10)      NOT NULL,
    Currency        NVARCHAR(10)  NOT NULL DEFAULT (N'تومان'),
    Subtotal        DECIMAL(18,0) NOT NULL,
    ShippingFee     DECIMAL(18,0) NOT NULL DEFAULT (0),
    DiscountAmount  DECIMAL(18,0) NOT NULL DEFAULT (0),
    Total AS (Subtotal + ShippingFee - DiscountAmount) PERSISTED,
    Notes           NVARCHAR(500) NULL,
    PlacedAt        DATETIME2(0)  NOT NULL DEFAULT (SYSUTCDATETIME()),
    UpdatedAt       DATETIME2(0)  NOT NULL DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Orders PRIMARY KEY (OrderId),
    CONSTRAINT UX_Orders_Number UNIQUE (OrderNumber),
    CONSTRAINT FK_Orders_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId),   -- deactivate users, don't delete
    CONSTRAINT CK_Orders_Status CHECK (Status IN (N'Pending', N'Paid', N'Processing', N'Shipped',
                                                   N'Delivered', N'Cancelled', N'Refunded')),
    CONSTRAINT CK_Orders_Amounts CHECK (Subtotal >= 0 AND ShippingFee >= 0
                                        AND DiscountAmount >= 0 AND DiscountAmount <= Subtotal + ShippingFee)
);
CREATE INDEX IX_Orders_User   ON dbo.Orders (UserId, PlacedAt DESC);
CREATE INDEX IX_Orders_Status ON dbo.Orders (Status, PlacedAt DESC);
GO

CREATE TABLE dbo.OrderItems (
    OrderItemId  INT IDENTITY(1,1) NOT NULL,
    OrderId      INT           NOT NULL,
    ProductId    INT           NOT NULL,
    ProductName  NVARCHAR(200) NOT NULL,                 -- snapshot
    Sku          VARCHAR(50)   NULL,                     -- snapshot
    UnitPrice    DECIMAL(18,0) NOT NULL,                 -- snapshot
    Quantity     INT           NOT NULL,
    LineTotal AS (UnitPrice * Quantity) PERSISTED,
    CONSTRAINT PK_OrderItems PRIMARY KEY (OrderItemId),
    CONSTRAINT FK_OrderItems_Orders   FOREIGN KEY (OrderId)   REFERENCES dbo.Orders(OrderId) ON DELETE CASCADE,
    CONSTRAINT FK_OrderItems_Products FOREIGN KEY (ProductId) REFERENCES dbo.Products(ProductId),
    CONSTRAINT CK_OrderItems_Qty   CHECK (Quantity > 0),
    CONSTRAINT CK_OrderItems_Price CHECK (UnitPrice >= 0)
);
CREATE INDEX IX_OrderItems_Order   ON dbo.OrderItems (OrderId);
CREATE INDEX IX_OrderItems_Product ON dbo.OrderItems (ProductId);
GO

CREATE TABLE dbo.Payments (
    PaymentId    INT IDENTITY(1,1) NOT NULL,
    OrderId      INT           NOT NULL,
    Provider     NVARCHAR(50)  NOT NULL,                 -- gateway name
    Amount       DECIMAL(18,0) NOT NULL,
    Status       NVARCHAR(20)  NOT NULL DEFAULT (N'Initiated'),
    GatewayRef   NVARCHAR(100) NULL,                     -- authority / reference id from the gateway
    CreatedAt    DATETIME2(0)  NOT NULL DEFAULT (SYSUTCDATETIME()),
    PaidAt       DATETIME2(0)  NULL,
    CONSTRAINT PK_Payments PRIMARY KEY (PaymentId),
    CONSTRAINT FK_Payments_Orders FOREIGN KEY (OrderId) REFERENCES dbo.Orders(OrderId),
    CONSTRAINT CK_Payments_Status CHECK (Status IN (N'Initiated', N'Succeeded', N'Failed', N'Refunded')),
    CONSTRAINT CK_Payments_Amount CHECK (Amount > 0)
);
CREATE INDEX IX_Payments_Order ON dbo.Payments (OrderId);
CREATE UNIQUE INDEX UX_Payments_GatewayRef ON dbo.Payments (Provider, GatewayRef) WHERE GatewayRef IS NOT NULL;
GO

/* =====================================================================
   5. CONTENT
   ===================================================================== */
/* Newsletter box in the footer (js-main.js -> subscribeNewsletter) */
CREATE TABLE dbo.NewsletterSubscribers (
    SubscriberId    INT IDENTITY(1,1) NOT NULL,
    Email           NVARCHAR(254) NOT NULL,
    IsActive        BIT           NOT NULL DEFAULT (1),
    SubscribedAt    DATETIME2(0)  NOT NULL DEFAULT (SYSUTCDATETIME()),
    UnsubscribedAt  DATETIME2(0)  NULL,
    CONSTRAINT PK_NewsletterSubscribers PRIMARY KEY (SubscriberId),
    CONSTRAINT UX_NewsletterSubscribers_Email UNIQUE (Email),
    CONSTRAINT CK_NewsletterSubscribers_Email CHECK (
        Email COLLATE Latin1_General_BIN2 = LOWER(Email) COLLATE Latin1_General_BIN2
        AND Email LIKE N'_%@_%._%')
);
GO

/* One table for every image block on the home page: slider, side ads,
   "مجموعه ها", hot categories, top-products strip. */
CREATE TABLE dbo.Banners (
    BannerId   INT IDENTITY(1,1) NOT NULL,
    Placement  VARCHAR(30)   NOT NULL,
    Title      NVARCHAR(150) NULL,
    Subtitle   NVARCHAR(300) NULL,
    ImageUrl   NVARCHAR(500) NOT NULL,
    LinkUrl    NVARCHAR(500) NULL,
    SortOrder  SMALLINT      NOT NULL DEFAULT (0),
    IsActive   BIT           NOT NULL DEFAULT (1),
    StartsAt   DATETIME2(0)  NULL,
    EndsAt     DATETIME2(0)  NULL,
    CONSTRAINT PK_Banners PRIMARY KEY (BannerId),
    CONSTRAINT CK_Banners_Placement CHECK (Placement IN ('slider', 'side_ad', 'collection', 'hot_category', 'top_product')),
    CONSTRAINT CK_Banners_Dates CHECK (EndsAt IS NULL OR StartsAt IS NULL OR EndsAt > StartsAt)
);
CREATE INDEX IX_Banners_Placement ON dbo.Banners (Placement, IsActive, SortOrder);
GO

/* =====================================================================
   6. TRIGGER - keep Products.RatingAvg / RatingCount in sync
   ===================================================================== */
IF OBJECT_ID(N'dbo.trg_Reviews_UpdateProductRating') IS NOT NULL DROP TRIGGER dbo.trg_Reviews_UpdateProductRating;
GO

CREATE TRIGGER dbo.trg_Reviews_UpdateProductRating
ON dbo.Reviews
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Affected TABLE (ProductId INT PRIMARY KEY);
    INSERT @Affected (ProductId)
    SELECT ProductId FROM inserted
    UNION
    SELECT ProductId FROM deleted;

    UPDATE p
       SET RatingCount = ISNULL(r.Cnt, 0),
           RatingAvg   = ISNULL(r.AvgRating, 0)
      FROM dbo.Products AS p
      JOIN @Affected    AS a ON a.ProductId = p.ProductId
     OUTER APPLY (SELECT COUNT(*) AS Cnt,
                         CAST(AVG(CAST(Rating AS DECIMAL(4,2))) AS DECIMAL(3,2)) AS AvgRating
                    FROM dbo.Reviews
                   WHERE ProductId = p.ProductId AND IsApproved = 1) AS r;
END
GO

/* =====================================================================
   7. VIEWS
   ===================================================================== */
IF OBJECT_ID(N'dbo.vw_ProductListing') IS NOT NULL DROP VIEW dbo.vw_ProductListing;
GO

CREATE VIEW dbo.vw_ProductListing
AS
SELECT  p.ProductId, p.Name, p.Slug, p.Sku,
        p.CategoryId, c.Name AS CategoryName, c.Slug AS CategorySlug,
        p.Price, p.OldPrice, p.DiscountPercent, p.Currency,
        p.StockQty, CAST(CASE WHEN p.StockQty > 0 THEN 1 ELSE 0 END AS BIT) AS InStock,
        p.IsNew, p.IsFeatured, p.IsSpecialOffer,
        p.RatingAvg, p.RatingCount, p.CreatedAt,
        mainImg.Url  AS MainImageUrl,
        hoverImg.Url AS HoverImageUrl
FROM dbo.Products AS p
JOIN dbo.Categories AS c ON c.CategoryId = p.CategoryId AND c.IsActive = 1
OUTER APPLY (SELECT TOP (1) Url FROM dbo.ProductImages i
              WHERE i.ProductId = p.ProductId AND i.ImageType = 'main')  AS mainImg
OUTER APPLY (SELECT TOP (1) Url FROM dbo.ProductImages i
              WHERE i.ProductId = p.ProductId AND i.ImageType = 'hover') AS hoverImg
WHERE p.IsActive = 1;
GO

IF OBJECT_ID(N'dbo.vw_CartDetails') IS NOT NULL DROP VIEW dbo.vw_CartDetails;
GO

CREATE VIEW dbo.vw_CartDetails
AS
SELECT  c.CartId, c.UserId, c.GuestToken,
        ci.ProductId, p.Name, p.Slug, p.Price, p.Currency, ci.Quantity,
        p.Price * ci.Quantity AS LineTotal,
        p.StockQty, p.IsActive,
        (SELECT TOP (1) Url FROM dbo.ProductImages i
          WHERE i.ProductId = p.ProductId AND i.ImageType = 'main') AS MainImageUrl
FROM dbo.Carts AS c
JOIN dbo.CartItems AS ci ON ci.CartId = c.CartId
JOIN dbo.Products  AS p  ON p.ProductId = ci.ProductId;
GO

/* =====================================================================
   8. STORED PROCEDURES
   Error codes are THROWn as short strings (message = code) so your API
   can map them straight to the messages js-register.js / js-login.js
   already understand:
     50001 EMAIL_EXISTS      50002 PHONE_EXISTS
     50010 PRODUCT_NOT_FOUND 50011 INSUFFICIENT_STOCK
     50012 MAX_QUANTITY      50013 INVALID_CART_OWNER
     50020 CART_EMPTY        50021 ADDRESS_NOT_FOUND
   ===================================================================== */

/* ---- Register ----------------------------------------------------- */
IF OBJECT_ID(N'dbo.usp_RegisterUser') IS NOT NULL DROP PROCEDURE dbo.usp_RegisterUser;
GO

CREATE PROCEDURE dbo.usp_RegisterUser
    @FirstName     NVARCHAR(50),
    @LastName      NVARCHAR(50),
    @Email         NVARCHAR(254),
    @Phone         CHAR(11),
    @PasswordHash  NVARCHAR(255),      -- already hashed by the application
    @UserId        INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    SET @Email = LOWER(LTRIM(RTRIM(@Email)));

    IF EXISTS (SELECT 1 FROM dbo.Users WHERE Email = @Email)
    BEGIN
        THROW 50001, N'EMAIL_EXISTS', 1;
    END;
    IF EXISTS (SELECT 1 FROM dbo.Users WHERE Phone = @Phone)
    BEGIN
        THROW 50002, N'PHONE_EXISTS', 1;
    END;

    BEGIN TRY
        INSERT dbo.Users (FirstName, LastName, Email, Phone, PasswordHash, TermsAcceptedAt)
        VALUES (LTRIM(RTRIM(@FirstName)), LTRIM(RTRIM(@LastName)), @Email, @Phone,
                @PasswordHash, SYSUTCDATETIME());
        SET @UserId = SCOPE_IDENTITY();
    END TRY
    BEGIN CATCH
        -- two requests raced past the EXISTS checks: the unique constraints still protect us
        IF ERROR_NUMBER() IN (2601, 2627)
        BEGIN
            IF ERROR_MESSAGE() LIKE N'%UX_Users_Email%'
            BEGIN
                THROW 50001, N'EMAIL_EXISTS', 1;
            END;
            THROW 50002, N'PHONE_EXISTS', 1;
        END;
        THROW;
    END CATCH;
END
GO

/* ---- Login (2 steps) ----------------------------------------------
   Step 1: usp_GetUserForLogin  -> app verifies the hash.
   Step 2: usp_RecordLoginResult -> logs attempt, handles lockout.
   For an unknown identifier step 1 returns no rows: the app should still
   run a dummy hash comparison and return the SAME generic error, so
   attackers can't tell whether an account exists. */
IF OBJECT_ID(N'dbo.usp_GetUserForLogin') IS NOT NULL DROP PROCEDURE dbo.usp_GetUserForLogin;
GO

CREATE PROCEDURE dbo.usp_GetUserForLogin
    @Identifier NVARCHAR(254)          -- email or phone, as typed (normalized by the app)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Id    NVARCHAR(254) = LOWER(LTRIM(RTRIM(@Identifier)));
    DECLARE @Email NVARCHAR(254) = CASE WHEN CHARINDEX(N'@', @Id) > 0 THEN @Id END;
    DECLARE @Phone CHAR(11)      = CASE WHEN CHARINDEX(N'@', @Id) = 0 AND LEN(@Id) = 11
                                        THEN CONVERT(CHAR(11), @Id) END;

    SELECT TOP (1)
           UserId, FirstName, LastName, Email, Phone, PasswordHash, Role, IsActive,
           FailedLoginCount, LockoutEnd,
           CAST(CASE WHEN LockoutEnd IS NOT NULL AND LockoutEnd > SYSUTCDATETIME() THEN 1 ELSE 0 END AS BIT) AS IsLockedOut
      FROM dbo.Users
     WHERE (@Email IS NOT NULL AND Email = @Email)
        OR (@Phone IS NOT NULL AND Phone = @Phone);
END
GO

IF OBJECT_ID(N'dbo.usp_RecordLoginResult') IS NOT NULL DROP PROCEDURE dbo.usp_RecordLoginResult;
GO

CREATE PROCEDURE dbo.usp_RecordLoginResult
    @UserId          INT NULL,
    @Identifier      NVARCHAR(254),
    @IpAddress       VARCHAR(45) = NULL,
    @Succeeded       BIT,
    @MaxFailures     TINYINT = 5,
    @LockoutMinutes  INT = 15
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRAN;

    INSERT dbo.LoginAttempts (UserId, Identifier, IpAddress, Succeeded)
    VALUES (@UserId, LEFT(LOWER(LTRIM(RTRIM(@Identifier))), 254), @IpAddress, @Succeeded);

    IF @UserId IS NOT NULL
    BEGIN
        IF @Succeeded = 1
            UPDATE dbo.Users
               SET FailedLoginCount = 0, LockoutEnd = NULL,
                   LastLoginAt = SYSUTCDATETIME()
             WHERE UserId = @UserId;
        ELSE
            UPDATE dbo.Users        -- right-hand sides use the pre-update values
               SET LockoutEnd = CASE WHEN FailedLoginCount + 1 >= @MaxFailures
                                     THEN DATEADD(MINUTE, @LockoutMinutes, SYSUTCDATETIME())
                                     ELSE LockoutEnd END,
                   FailedLoginCount = CASE WHEN FailedLoginCount + 1 >= @MaxFailures
                                           THEN 0 ELSE FailedLoginCount + 1 END
             WHERE UserId = @UserId;
    END;

    COMMIT;
END
GO

/* ---- Cart --------------------------------------------------------- */
IF OBJECT_ID(N'dbo.usp_AddToCart') IS NOT NULL DROP PROCEDURE dbo.usp_AddToCart;
GO

CREATE PROCEDURE dbo.usp_AddToCart
    @UserId      INT = NULL,
    @GuestToken  UNIQUEIDENTIFIER = NULL,
    @ProductId   INT,
    @Quantity    INT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF (@UserId IS NULL AND @GuestToken IS NULL) OR (@UserId IS NOT NULL AND @GuestToken IS NOT NULL)
    BEGIN
        THROW 50013, N'INVALID_CART_OWNER', 1;
    END;
    IF @Quantity < 1
    BEGIN
        THROW 50012, N'MAX_QUANTITY', 1;
    END;

    DECLARE @CartId INT, @Stock INT, @Current INT;

    BEGIN TRAN;

    IF @UserId IS NOT NULL
        SELECT @CartId = CartId FROM dbo.Carts WITH (UPDLOCK, HOLDLOCK) WHERE UserId = @UserId;
    ELSE
        SELECT @CartId = CartId FROM dbo.Carts WITH (UPDLOCK, HOLDLOCK) WHERE GuestToken = @GuestToken;

    IF @CartId IS NULL
    BEGIN
        INSERT dbo.Carts (UserId, GuestToken) VALUES (@UserId, @GuestToken);
        SET @CartId = SCOPE_IDENTITY();
    END;

    SELECT @Stock = StockQty FROM dbo.Products WHERE ProductId = @ProductId AND IsActive = 1;
    IF @Stock IS NULL
    BEGIN
        THROW 50010, N'PRODUCT_NOT_FOUND', 1;
    END;

    SET @Current = ISNULL((SELECT Quantity FROM dbo.CartItems
                            WHERE CartId = @CartId AND ProductId = @ProductId), 0);

    IF @Current + @Quantity > 99
    BEGIN
        THROW 50012, N'MAX_QUANTITY', 1;
    END;
    IF @Current + @Quantity > @Stock
    BEGIN
        THROW 50011, N'INSUFFICIENT_STOCK', 1;
    END;

    IF @Current > 0
        UPDATE dbo.CartItems SET Quantity = @Current + @Quantity
         WHERE CartId = @CartId AND ProductId = @ProductId;
    ELSE
        INSERT dbo.CartItems (CartId, ProductId, Quantity) VALUES (@CartId, @ProductId, @Quantity);

    UPDATE dbo.Carts SET UpdatedAt = SYSUTCDATETIME() WHERE CartId = @CartId;

    COMMIT;

    SELECT @CartId AS CartId;
END
GO

/* Call right after a successful login to fold the guest cart into the user's cart. */
IF OBJECT_ID(N'dbo.usp_MergeGuestCart') IS NOT NULL DROP PROCEDURE dbo.usp_MergeGuestCart;
GO

CREATE PROCEDURE dbo.usp_MergeGuestCart
    @GuestToken  UNIQUEIDENTIFIER,
    @UserId      INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @GuestCartId INT, @UserCartId INT;

    BEGIN TRAN;

    SELECT @GuestCartId = CartId FROM dbo.Carts WITH (UPDLOCK, HOLDLOCK) WHERE GuestToken = @GuestToken;
    IF @GuestCartId IS NULL
    BEGIN
        COMMIT;
        RETURN;
    END;

    SELECT @UserCartId = CartId FROM dbo.Carts WITH (UPDLOCK, HOLDLOCK) WHERE UserId = @UserId;
    IF @UserCartId IS NULL
    BEGIN
        INSERT dbo.Carts (UserId) VALUES (@UserId);
        SET @UserCartId = SCOPE_IDENTITY();
    END;

    MERGE dbo.CartItems AS t
    USING (SELECT ProductId, Quantity FROM dbo.CartItems WHERE CartId = @GuestCartId) AS s
       ON t.CartId = @UserCartId AND t.ProductId = s.ProductId
     WHEN MATCHED THEN
          UPDATE SET Quantity = CASE WHEN t.Quantity + s.Quantity > 99 THEN 99 ELSE t.Quantity + s.Quantity END
     WHEN NOT MATCHED BY TARGET THEN
          INSERT (CartId, ProductId, Quantity) VALUES (@UserCartId, s.ProductId, s.Quantity);

    DELETE dbo.Carts WHERE CartId = @GuestCartId;      -- its items go with it (cascade)
    UPDATE dbo.Carts SET UpdatedAt = SYSUTCDATETIME() WHERE CartId = @UserCartId;

    COMMIT;
    -- Stock is re-validated at checkout (usp_PlaceOrder), not here.
END
GO

/* ---- Wishlist ----------------------------------------------------- */
IF OBJECT_ID(N'dbo.usp_ToggleWishlist') IS NOT NULL DROP PROCEDURE dbo.usp_ToggleWishlist;
GO

CREATE PROCEDURE dbo.usp_ToggleWishlist
    @UserId     INT,
    @ProductId  INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @InWishlist BIT;

    BEGIN TRAN;

    IF EXISTS (SELECT 1 FROM dbo.Wishlists WITH (UPDLOCK, HOLDLOCK)
                WHERE UserId = @UserId AND ProductId = @ProductId)
    BEGIN
        DELETE dbo.Wishlists WHERE UserId = @UserId AND ProductId = @ProductId;
        SET @InWishlist = 0;
    END
    ELSE
    BEGIN
        INSERT dbo.Wishlists (UserId, ProductId) VALUES (@UserId, @ProductId);
        SET @InWishlist = 1;
    END;

    COMMIT;

    SELECT @InWishlist AS IsInWishlist;
END
GO

/* ---- Checkout ----------------------------------------------------- */
IF OBJECT_ID(N'dbo.usp_PlaceOrder') IS NOT NULL DROP PROCEDURE dbo.usp_PlaceOrder;
GO

CREATE PROCEDURE dbo.usp_PlaceOrder
    @UserId       INT,
    @AddressId    INT,
    @ShippingFee  DECIMAL(18,0) = 0,
    @Notes        NVARCHAR(500) = NULL,
    @OrderId      INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;            -- any THROW below rolls the whole transaction back

    DECLARE @CartId INT, @Subtotal DECIMAL(18,0);
    DECLARE @RecipientName NVARCHAR(100), @RecipientPhone CHAR(11), @Province NVARCHAR(50),
            @City NVARCHAR(50), @AddressLine NVARCHAR(500), @PostalCode CHAR(10);

    BEGIN TRAN;

    SELECT @CartId = CartId FROM dbo.Carts WITH (UPDLOCK, HOLDLOCK) WHERE UserId = @UserId;
    IF @CartId IS NULL OR NOT EXISTS (SELECT 1 FROM dbo.CartItems WHERE CartId = @CartId)
    BEGIN
        THROW 50020, N'CART_EMPTY', 1;
    END;

    SELECT @RecipientName = RecipientName, @RecipientPhone = RecipientPhone, @Province = Province,
           @City = City, @AddressLine = AddressLine, @PostalCode = PostalCode
      FROM dbo.Addresses
     WHERE AddressId = @AddressId AND UserId = @UserId;
    IF @@ROWCOUNT = 0
    BEGIN
        THROW 50021, N'ADDRESS_NOT_FOUND', 1;
    END;

    -- lock the product rows so two buyers can't take the last item
    IF EXISTS (SELECT 1
                 FROM dbo.CartItems AS ci
                 JOIN dbo.Products  AS p WITH (UPDLOCK, HOLDLOCK) ON p.ProductId = ci.ProductId
                WHERE ci.CartId = @CartId
                  AND (p.IsActive = 0 OR p.StockQty < ci.Quantity))
    BEGIN
        THROW 50011, N'INSUFFICIENT_STOCK', 1;
    END;

    SELECT @Subtotal = SUM(p.Price * ci.Quantity)
      FROM dbo.CartItems AS ci
      JOIN dbo.Products  AS p ON p.ProductId = ci.ProductId
     WHERE ci.CartId = @CartId;

    DECLARE @Seq INT = NEXT VALUE FOR dbo.OrderNumberSeq;

    INSERT dbo.Orders (OrderNumber, UserId, RecipientName, RecipientPhone, Province, City,
                       AddressLine, PostalCode, Subtotal, ShippingFee, Notes)
    VALUES ('MK' + CONVERT(VARCHAR(12), @Seq), @UserId,
            @RecipientName, @RecipientPhone, @Province, @City, @AddressLine, @PostalCode,
            @Subtotal, @ShippingFee, @Notes);
    SET @OrderId = SCOPE_IDENTITY();

    INSERT dbo.OrderItems (OrderId, ProductId, ProductName, Sku, UnitPrice, Quantity)
    SELECT @OrderId, p.ProductId, p.Name, p.Sku, p.Price, ci.Quantity
      FROM dbo.CartItems AS ci
      JOIN dbo.Products  AS p ON p.ProductId = ci.ProductId
     WHERE ci.CartId = @CartId;

    UPDATE p
       SET StockQty = p.StockQty - ci.Quantity, UpdatedAt = SYSUTCDATETIME()
      FROM dbo.Products  AS p
      JOIN dbo.CartItems AS ci ON ci.ProductId = p.ProductId
     WHERE ci.CartId = @CartId;

    DELETE dbo.CartItems WHERE CartId = @CartId;

    COMMIT;
END
GO

/* ---- Housekeeping: schedule daily with SQL Server Agent ------------ */
IF OBJECT_ID(N'dbo.usp_PurgeExpiredData') IS NOT NULL DROP PROCEDURE dbo.usp_PurgeExpiredData;
GO

CREATE PROCEDURE dbo.usp_PurgeExpiredData
AS
BEGIN
    SET NOCOUNT ON;

    DELETE dbo.Carts WHERE GuestToken IS NOT NULL AND UpdatedAt < DATEADD(DAY, -30, SYSUTCDATETIME());
    DELETE dbo.LoginAttempts WHERE AttemptedAt < DATEADD(DAY, -90, SYSUTCDATETIME());
    DELETE dbo.PasswordResetTokens WHERE ExpiresAt < SYSUTCDATETIME() OR UsedAt IS NOT NULL;
END
GO

/* =====================================================================
   9. SAMPLE DATA (categories from the site's menu + a few products)
   Safe to delete. Only runs on an empty Categories table.
   ===================================================================== */
IF NOT EXISTS (SELECT 1 FROM dbo.Categories)
BEGIN
    -- Level 1: top navigation + the three home-page tabs
    INSERT dbo.Categories (Name, Slug, IconClass, SortOrder) VALUES
        (N'کالای دیجیتال',   'digital',         'fas fa-laptop',   1),
        (N'لوازم برقی',      'appliances',      'fas fa-plug',     2),
        (N'لوازم هنری',      'art-supplies',    'fas fa-palette',  3),
        (N'مد و پوشاک',      'fashion',         'fas fa-tshirt',   4),
        (N'خوردن و آشامیدن', 'food-drink',      'fas fa-utensils', 5),
        (N'ورزش و فضای باز', 'sports-outdoor',  NULL,              6),
        (N'الکترونیک',       'electronics',     NULL,              7),
        (N'جواهرات و ساعت',  'jewelry-watches', NULL,              8);

    -- Level 2: submenu columns
    INSERT dbo.Categories (ParentId, Name, Slug, SortOrder)
    SELECT p.CategoryId, v.Name, v.Slug, v.SortOrder
      FROM (VALUES
            ('digital',      N'لپ‌تاپ و کامپیوتر', 'digital-computers',      1),
            ('digital',      N'موبایل و تبلت',     'digital-mobile-tablet',  2),
            ('digital',      N'صوتی و تصویری',     'digital-audio-video',    3),
            ('digital',      N'گجت‌های هوشمند',    'digital-smart-gadgets',  4),
            ('appliances',   N'آشپزخانه',          'appliances-kitchen',     1),
            ('appliances',   N'نظافت و بهداشت',    'appliances-cleaning',    2),
            ('appliances',   N'سرمایش و گرمایش',   'appliances-hvac',        3),
            ('appliances',   N'صوتی و تصویری',     'appliances-audio-video', 4),
            ('art-supplies', N'نقاشی و طراحی',     'art-painting',           1),
            ('art-supplies', N'خوشنویسی',          'art-calligraphy',        2),
            ('art-supplies', N'موسیقی',            'art-music',              3),
            ('art-supplies', N'مجسمه‌سازی',        'art-sculpture',          4),
            ('fashion',      N'مردانه',            'fashion-men',            1),
            ('fashion',      N'زنانه',             'fashion-women',          2),
            ('fashion',      N'بچگانه',            'fashion-kids',           3),
            ('fashion',      N'اکسسوری',           'fashion-accessories',    4),
            ('food-drink',   N'خوراکی‌ها',         'food-snacks',            1),
            ('food-drink',   N'نوشیدنی‌ها',        'food-drinks',            2),
            ('food-drink',   N'مواد غذایی',        'food-groceries',         3),
            ('food-drink',   N'میوه و سبزیجات',    'food-fruit-veg',         4)
           ) AS v (ParentSlug, Name, Slug, SortOrder)
      JOIN dbo.Categories AS p ON p.Slug = v.ParentSlug;

    -- Level 3: links under کالای دیجیتال (add the other menus the same way)
    INSERT dbo.Categories (ParentId, Name, Slug, SortOrder)
    SELECT p.CategoryId, v.Name, v.Slug, v.SortOrder
      FROM (VALUES
            ('digital-computers',     N'لپ‌تاپ',              'digital-laptop',           1),
            ('digital-computers',     N'کیس‌های اسمبل شده',   'digital-assembled-pc',     2),
            ('digital-computers',     N'مانیتور',             'digital-monitor',          3),
            ('digital-computers',     N'قطعات داخلی کامپیوتر','digital-pc-parts',         4),
            ('digital-mobile-tablet', N'گوشی موبایل',         'digital-mobile',           1),
            ('digital-mobile-tablet', N'تبلت',                'digital-tablet',           2),
            ('digital-mobile-tablet', N'لوازم جانبی موبایل',  'digital-mobile-accessories',3),
            ('digital-mobile-tablet', N'سیم‌کارت',            'digital-sim',              4),
            ('digital-audio-video',   N'دوربین عکاسی',        'digital-camera',           1),
            ('digital-audio-video',   N'دوربین فیلم‌برداری',  'digital-camcorder',        2),
            ('digital-audio-video',   N'هدفون و هدست',        'digital-headphones',       3),
            ('digital-audio-video',   N'اسپیکر',              'digital-speaker',          4),
            ('digital-smart-gadgets', N'ساعت هوشمند',         'digital-smartwatch',       1),
            ('digital-smart-gadgets', N'مچ‌بند سلامتی',       'digital-fitness-band',     2),
            ('digital-smart-gadgets', N'هندزفری بی‌سیم',      'digital-wireless-earbuds', 3),
            ('digital-smart-gadgets', N'پاوربانک',            'digital-powerbank',        4)
           ) AS v (ParentSlug, Name, Slug, SortOrder)
      JOIN dbo.Categories AS p ON p.Slug = v.ParentSlug;

    -- Sample products (names/images taken from index.html; prices are placeholders)
    INSERT dbo.Products (CategoryId, Name, Slug, Sku, ShortDescription, Price, OldPrice, StockQty, IsNew, IsFeatured, IsSpecialOffer)
    SELECT c.CategoryId, v.Name, v.Slug, v.Sku, v.Short, v.Price, v.OldPrice, v.Stock, v.IsNew, v.IsFeatured, v.IsSpecial
      FROM (VALUES
            ('fashion-women',   N'کیف ویدکی',       'vidaki-bag',   'BAG-001', N'کیف زنانه',      50000000, 55000000, 15, 0, 0, 1),
            ('digital-monitor', N'مانیتور 42 اینچ', 'monitor-42',   'MON-042', N'مانیتور 42 اینچ', 45000000, 50000000,  8, 1, 1, 1),
            ('jewelry-watches', N'ساعت مچی',        'wrist-watch',  'WAT-001', N'ساعت مچی',        9700000,  NULL,     25, 0, 0, 0),
            ('digital-laptop',  N'لپ‌تاپ',          'laptop-basic', 'LAP-001', N'لپ‌تاپ',         56000000,  NULL,      5, 1, 0, 0),
            ('digital-mobile',  N'گوشی موبایل',     'mobile-basic', 'MOB-001', N'گوشی موبایل',    30000000, 33000000, 20, 0, 1, 0)
           ) AS v (CatSlug, Name, Slug, Sku, Short, Price, OldPrice, Stock, IsNew, IsFeatured, IsSpecial)
      JOIN dbo.Categories AS c ON c.Slug = v.CatSlug;

    INSERT dbo.ProductImages (ProductId, Url, AltText, ImageType, SortOrder)
    SELECT p.ProductId, v.Url, p.Name, v.ImageType, v.SortOrder
      FROM (VALUES
            ('vidaki-bag',  'images/b5.jpg',  'main',  0),
            ('vidaki-bag',  'images/B10.jpg', 'hover', 1),
            ('monitor-42',  'images/e11.jpg', 'main',  0),
            ('wrist-watch', 'images/w1.jpg',  'main',  0),
            ('wrist-watch', 'images/w10.jpg', 'hover', 1)
           ) AS v (Slug, Url, ImageType, SortOrder)
      JOIN dbo.Products AS p ON p.Slug = v.Slug;
END
GO

/* =====================================================================
   10. LEAST-PRIVILEGE LOGIN FOR YOUR API  (edit the password, then uncomment)
   The web app should never connect as sa / db_owner.
   ===================================================================== */
/*
CREATE LOGIN market_app WITH PASSWORD = N'CHANGE_ME_to_a_long_random_password', CHECK_POLICY = ON;
CREATE USER  market_app FOR LOGIN market_app;
GRANT EXECUTE ON SCHEMA::dbo TO market_app;
GRANT SELECT  ON dbo.vw_ProductListing TO market_app;
GRANT SELECT  ON dbo.vw_CartDetails    TO market_app;
GRANT SELECT  ON dbo.Categories        TO market_app;
GRANT SELECT  ON dbo.Banners           TO market_app;
-- add further table permissions only as the API actually needs them
*/

/* =====================================================================
   11. EXAMPLE QUERIES FOR THE HOME PAGE
   ===================================================================== */
/*
-- "New arrivals" carousel
SELECT TOP (12) * FROM dbo.vw_ProductListing WHERE IsNew = 1 ORDER BY CreatedAt DESC;

-- "Special offers" grid
SELECT TOP (6) * FROM dbo.vw_ProductListing WHERE IsSpecialOffer = 1 ORDER BY DiscountPercent DESC;

-- Products of a category INCLUDING all its sub-categories
WITH tree AS (
    SELECT CategoryId FROM dbo.Categories WHERE Slug = 'digital'
    UNION ALL
    SELECT c.CategoryId FROM dbo.Categories c JOIN tree t ON c.ParentId = t.CategoryId
)
SELECT l.* FROM dbo.vw_ProductListing l JOIN tree ON tree.CategoryId = l.CategoryId;

-- Search box (simple; consider Full-Text Search for large catalogs)
SELECT TOP (20) * FROM dbo.vw_ProductListing WHERE Name LIKE N'%' + @term + N'%';

-- Cart badge: "N items, total X"
SELECT SUM(Quantity) AS Items, SUM(LineTotal) AS Total FROM dbo.vw_CartDetails WHERE UserId = @UserId;
*/
