-- ============================================================
--  دیتابیس فروشگاه اینترنتی «مارکت»  |  MarketDB
--  SQL Server (SSMS)
--  اجرا: کل اسکریپت را Select کنید (Ctrl+A) و F5 بزنید
-- ============================================================

CREATE DATABASE MarketDB;
GO
USE MarketDB;
GO

-- ============================================================
-- 1) جدول کاربران (Users)
--    PK: UserID   |   FK: ندارد (جدول والد)
-- ============================================================
CREATE TABLE Users (
    UserID       INT IDENTITY(1,1) PRIMARY KEY,
    FirstName    NVARCHAR(50)  NOT NULL,
    LastName     NVARCHAR(50)  NOT NULL,
    Email        NVARCHAR(100) NOT NULL UNIQUE,
    Phone        VARCHAR(11)   NOT NULL UNIQUE CHECK (Phone LIKE '09%' AND LEN(Phone)=11),
    [Password]   NVARCHAR(255) NOT NULL,
    RegisterDate DATETIME DEFAULT GETDATE()
);
GO

INSERT INTO Users (FirstName, LastName, Email, Phone, [Password]) VALUES
(N'علی',     N'احمدی',   'ali@mail.com',    '09123456789', 'pass1234'),
(N'مریم',    N'رضایی',   'maryam@mail.com', '09121112233', 'pass1234'),
(N'رضا',     N'کریمی',   'reza@mail.com',   '09356667788', 'pass1234');
GO

-- ============================================================
-- 2) جدول دسته‌بندی (Categories)  -  خودارجاعی
--    PK: CategoryID   |   FK: ParentID -> Categories (زیردسته)
-- ============================================================
CREATE TABLE Categories (
    CategoryID   INT IDENTITY(1,1) PRIMARY KEY,
    ParentID     INT NULL REFERENCES Categories(CategoryID),
    CategoryName NVARCHAR(100) NOT NULL
);
GO

INSERT INTO Categories (ParentID, CategoryName) VALUES
(NULL, N'کالای دیجیتال'),
(NULL, N'مد و پوشاک'),
(NULL, N'جواهرات و ساعت'),
(1,    N'موبایل'),
(1,    N'لپ‌تاپ'),
(1,    N'مانیتور'),
(2,    N'کیف زنانه');
GO

-- ============================================================
-- 3) جدول محصولات (Products)
--    PK: ProductID   |   FK: CategoryID -> Categories
-- ============================================================
CREATE TABLE Products (
    ProductID  INT IDENTITY(1,1) PRIMARY KEY,
    CategoryID INT NOT NULL REFERENCES Categories(CategoryID),
    ProductName NVARCHAR(200) NOT NULL,
    Price      DECIMAL(18,0) NOT NULL CHECK (Price >= 0),
    OldPrice   DECIMAL(18,0) NULL,
    Stock      INT DEFAULT 0 CHECK (Stock >= 0),
    Rating     TINYINT DEFAULT 0 CHECK (Rating BETWEEN 0 AND 5),
    ImageURL   NVARCHAR(300) NULL
);
GO

INSERT INTO Products (CategoryID, ProductName, Price, OldPrice, Stock, Rating, ImageURL) VALUES
(4, N'گوشی سامسونگ A54',   12500000, 14500000, 10, 4, 'images/1_3_18.jpg'),
(5, N'لپ‌تاپ ایسوس',        50000000, 55000000, 5,  4, 'images/E3.jpg'),
(6, N'مانیتور 42 اینچ',     45000000, 44000000, 8,  3, 'images/e11.jpg'),
(7, N'کیف چرم زنانه',       65000000, NULL,     12, 4, 'images/B5.jpg'),
(3, N'ساعت مچی مردانه',     97000000, NULL,     6,  5, 'images/w1.jpg'),
(3, N'گردنبند قلبی',        50000000, 44000000, 15, 4, 'images/J9-270x270.jpg');
GO

-- ============================================================
-- 4) جدول سفارش‌ها (Orders)
--    PK: OrderID   |   FK: UserID -> Users
-- ============================================================
CREATE TABLE Orders (
    OrderID     INT IDENTITY(1,1) PRIMARY KEY,
    UserID      INT NOT NULL REFERENCES Users(UserID),
    OrderDate   DATETIME DEFAULT GETDATE(),
    TotalAmount DECIMAL(18,0) NOT NULL CHECK (TotalAmount >= 0),
    [Status]    NVARCHAR(20) DEFAULT N'در حال پردازش'
);
GO

INSERT INTO Orders (UserID, TotalAmount, [Status]) VALUES
(1, 175000000, N'تحویل شد'),
(2, 50000000,  N'در حال پردازش'),
(3, 97000000,  N'ارسال شد');
GO

-- ============================================================
-- 5) جدول جزئیات سفارش (OrderDetails)
--    PK: OrderDetailID
--    FK: OrderID -> Orders  |  ProductID -> Products
-- ============================================================
CREATE TABLE OrderDetails (
    OrderDetailID INT IDENTITY(1,1) PRIMARY KEY,
    OrderID       INT NOT NULL REFERENCES Orders(OrderID),
    ProductID     INT NOT NULL REFERENCES Products(ProductID),
    Quantity      INT NOT NULL CHECK (Quantity > 0),
    UnitPrice     DECIMAL(18,0) NOT NULL
);
GO

INSERT INTO OrderDetails (OrderID, ProductID, Quantity, UnitPrice) VALUES
(1, 2, 2, 50000000),
(1, 4, 1, 65000000),
(2, 2, 1, 50000000),
(3, 5, 1, 97000000);
GO

-- ============================================================
-- 6) جدول علاقه‌مندی‌ها (Wishlist)
--    PK: WishlistID   |   FK: UserID -> Users , ProductID -> Products
-- ============================================================
CREATE TABLE Wishlist (
    WishlistID INT IDENTITY(1,1) PRIMARY KEY,
    UserID     INT NOT NULL REFERENCES Users(UserID),
    ProductID  INT NOT NULL REFERENCES Products(ProductID),
    AddedDate  DATETIME DEFAULT GETDATE(),
    CONSTRAINT UQ_Wishlist UNIQUE (UserID, ProductID)
);
GO

INSERT INTO Wishlist (UserID, ProductID) VALUES
(1, 5),
(1, 6),
(2, 1);
GO

-- ============================================================
-- 7) جدول نظرات (Reviews)
--    PK: ReviewID   |   FK: UserID -> Users , ProductID -> Products
-- ============================================================
CREATE TABLE Reviews (
    ReviewID   INT IDENTITY(1,1) PRIMARY KEY,
    UserID     INT NOT NULL REFERENCES Users(UserID),
    ProductID  INT NOT NULL REFERENCES Products(ProductID),
    Rating     TINYINT CHECK (Rating BETWEEN 1 AND 5),
    Comment    NVARCHAR(1000) NULL,
    ReviewDate DATETIME DEFAULT GETDATE()
);
GO

INSERT INTO Reviews (UserID, ProductID, Rating, Comment) VALUES
(1, 2, 5, N'لپ‌تاپ عالی بود، پیشنهاد می‌کنم.'),
(2, 1, 4, N'گوشی خوبی است ولی باتریش می‌توانست بهتر باشد.'),
(3, 5, 5, N'ساعت بسیار شیک و با کیفیتی است.');
GO

-- ============================================================
-- 8) جدول سبد خرید (CartItems)
--    PK: CartItemID   |   FK: UserID -> Users , ProductID -> Products
-- ============================================================
CREATE TABLE CartItems (
    CartItemID INT IDENTITY(1,1) PRIMARY KEY,
    UserID     INT NOT NULL REFERENCES Users(UserID),
    ProductID  INT NOT NULL REFERENCES Products(ProductID),
    Quantity   INT NOT NULL DEFAULT 1 CHECK (Quantity > 0),
    CONSTRAINT UQ_Cart UNIQUE (UserID, ProductID)
);
GO

INSERT INTO CartItems (UserID, ProductID, Quantity) VALUES
(1, 3, 2),
(2, 6, 1);
GO

-- ============================================================
-- 9) جدول آدرس‌ها (Addresses)
--    PK: AddressID   |   FK: UserID -> Users
-- ============================================================
CREATE TABLE Addresses (
    AddressID   INT IDENTITY(1,1) PRIMARY KEY,
    UserID      INT NOT NULL REFERENCES Users(UserID),
    City        NVARCHAR(50),
    FullAddress NVARCHAR(500),
    PostalCode  VARCHAR(10) CHECK (PostalCode LIKE '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]')
);
GO

INSERT INTO Addresses (UserID, City, FullAddress, PostalCode) VALUES
(1, N'تهران', N'تهران، خیابان انقلاب، کوچه ۱۲، پلاک ۵', '1234567890'),
(2, N'اصفهان', N'اصفهان، خیابان چهارباغ، پلاک ۲۰', '0987654321');
GO

-- ============================================================
--  کوئری‌های تست (JOIN ها)
-- ============================================================

-- الف) سفارشات هر کاربر + نام محصول
SELECT o.OrderID,
       u.FirstName + N' ' + u.LastName AS Customer,
       p.ProductName,
       od.Quantity,
       od.UnitPrice,
       o.[Status]
FROM Orders o
JOIN Users u         ON o.UserID = u.UserID
JOIN OrderDetails od ON o.OrderID = od.OrderID
JOIN Products p      ON od.ProductID = p.ProductID;
GO

-- ب) محصولات هر دسته‌بندی
SELECT c.CategoryName, p.ProductName, p.Price
FROM Products p
JOIN Categories c ON p.CategoryID = c.CategoryID;
GO

-- ج) لیست علاقه‌مندی کاربر «علی احمدی»
SELECT u.FirstName, p.ProductName, w.AddedDate
FROM Wishlist w
JOIN Users u    ON w.UserID = u.UserID
JOIN Products p ON w.ProductID = p.ProductID
WHERE u.UserID = 1;
GO

-- د) میانگین امتیاز هر محصول
SELECT p.ProductName, AVG(CAST(r.Rating AS FLOAT)) AS AvgRating
FROM Reviews r
JOIN Products p ON r.ProductID = p.ProductID
GROUP BY p.ProductName;
GO
