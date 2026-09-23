-- ============================================================================
--  مارکت - دیتابیس فروشگاه اینترنتی | نسخه آماده اجرا در Visual Studio
--  ---------------------------------------------------------------
--  نحوه اجرا در Visual Studio:
--  1) منوی View > SQL Server Object Explorer
--  2) SQL Server > (localdb)\MSSQLLocalDB را اضافه کنید
--  3) روی آن کلیک راست > New Query ، این فایل را باز کنید و Ctrl+Shift+E
--  4) بعد از اجرا، Databases را Refresh کنید تا market_db دیده شود
-- ============================================================================
SET NOCOUNT ON;
GO

-- ============================================================
--  مارکت - دیتابیس کامل فروشگاه اینترنتی (SQL Server / SSMS)
--  Market E-Commerce Database - T-SQL Schema + Sample Data
--  نکته: همه متون فارسی با NVARCHAR ذخیره می‌شوند
-- ============================================================

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'market_db')
    CREATE DATABASE market_db;
GO

USE market_db;
GO

-- ============================================================
-- ۱. جدول کاربران (Users)
-- ============================================================
IF OBJECT_ID('dbo.users', 'U') IS NOT NULL DROP TABLE dbo.users;
GO
CREATE TABLE users (
    id             BIGINT IDENTITY(1,1) PRIMARY KEY,
    first_name     NVARCHAR(50)  NOT NULL,
    last_name      NVARCHAR(50)  NOT NULL,
    email          NVARCHAR(254) NOT NULL UNIQUE,
    phone          VARCHAR(15)   NOT NULL UNIQUE,          -- فرمت نرمال: 09XXXXXXXXX
    password_hash  NVARCHAR(255) NOT NULL,
    status         NVARCHAR(20)  NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','inactive','banned')),
    is_admin       BIT           NOT NULL DEFAULT 0,
    remember_token NVARCHAR(100) NULL,
    last_login_at  DATETIME      NULL,
    created_at     DATETIME      NOT NULL DEFAULT GETDATE(),
    updated_at     DATETIME      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT chk_phone CHECK (phone LIKE '09[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]')
);
GO

-- ============================================================
-- ۲. آدرس‌های کاربران
-- ============================================================
IF OBJECT_ID('dbo.addresses', 'U') IS NOT NULL DROP TABLE dbo.addresses;
GO
CREATE TABLE addresses (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id     BIGINT       NOT NULL,
    title       NVARCHAR(50) NOT NULL DEFAULT N'خانه',      -- خانه / محل کار
    province    NVARCHAR(50) NOT NULL,
    city        NVARCHAR(50) NOT NULL,
    postal_code VARCHAR(10)  NULL,
    address     NVARCHAR(MAX) NOT NULL,
    is_default  BIT          NOT NULL DEFAULT 0,
    created_at  DATETIME     NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_address_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_address_user ON addresses(user_id);
GO

-- ============================================================
-- ۳. دسته‌بندی‌ها (ساختار درختی - مثل منوی سایت)
-- ============================================================
IF OBJECT_ID('dbo.categories', 'U') IS NOT NULL DROP TABLE dbo.categories;
GO
CREATE TABLE categories (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    parent_id  INT          NULL,
    name       NVARCHAR(100) NOT NULL,
    slug       VARCHAR(120)  NOT NULL UNIQUE,
    image      VARCHAR(255)  NULL,
    is_hot     BIT  NOT NULL DEFAULT 0,                    -- دسته‌های دارای بج HOT
    sort_order INT  NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_category_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);
CREATE INDEX idx_category_parent ON categories(parent_id);
GO

-- ============================================================
-- ۴. محصولات
-- ============================================================
IF OBJECT_ID('dbo.products', 'U') IS NOT NULL DROP TABLE dbo.products;
GO
CREATE TABLE products (
    id           BIGINT IDENTITY(1,1) PRIMARY KEY,
    category_id  INT            NOT NULL,
    name         NVARCHAR(200)  NOT NULL,
    slug         VARCHAR(220)   NOT NULL UNIQUE,
    description  NVARCHAR(MAX)  NULL,
    price        DECIMAL(15,0)  NOT NULL,                  -- تومان
    old_price    DECIMAL(15,0)  NULL,                      -- قیمت قبل از تخفیف
    stock        INT            NOT NULL DEFAULT 0,
    rating       DECIMAL(2,1)   NOT NULL DEFAULT 0.0,      -- میانگین امتیاز ۰ تا ۵
    is_featured  BIT NOT NULL DEFAULT 0,                   -- محصول ویژه (کارت بزرگ)
    is_new       BIT NOT NULL DEFAULT 0,                   -- بج «جدید»
    status       NVARCHAR(20) NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','inactive','out_of_stock')),
    created_at   DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at   DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES categories(id),
    CONSTRAINT chk_price CHECK (price >= 0)
);
CREATE INDEX idx_product_category ON products(category_id);
CREATE INDEX idx_product_price    ON products(price);
CREATE INDEX idx_product_featured ON products(is_featured);
GO

-- ============================================================
-- ۵. تصاویر محصولات
-- ============================================================
IF OBJECT_ID('dbo.product_images', 'U') IS NOT NULL DROP TABLE dbo.product_images;
GO
CREATE TABLE product_images (
    id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    product_id  BIGINT       NOT NULL,
    image_path  VARCHAR(255) NOT NULL,
    is_main     BIT  NOT NULL DEFAULT 0,                   -- تصویر اصلی
    is_hover    BIT  NOT NULL DEFAULT 0,                   -- تصویر هاور
    sort_order  INT  NOT NULL DEFAULT 0,
    CONSTRAINT fk_image_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE INDEX idx_image_product ON product_images(product_id);
GO

-- ============================================================
-- ۶. نظرات و امتیازدهی
-- ============================================================
IF OBJECT_ID('dbo.reviews', 'U') IS NOT NULL DROP TABLE dbo.reviews;
GO
CREATE TABLE reviews (
    id         BIGINT IDENTITY(1,1) PRIMARY KEY,
    product_id BIGINT       NOT NULL,
    user_id    BIGINT       NOT NULL,
    rating     TINYINT      NOT NULL,
    comment    NVARCHAR(MAX) NULL,
    status     NVARCHAR(20) NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','approved','rejected')),
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_review_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    CONSTRAINT uq_review UNIQUE (product_id, user_id),     -- هر کاربر فقط یک نظر
    CONSTRAINT chk_rating CHECK (rating BETWEEN 1 AND 5)
);
CREATE INDEX idx_review_product ON reviews(product_id);
GO

-- ============================================================
-- ۷. سبد خرید
-- ============================================================
IF OBJECT_ID('dbo.carts', 'U') IS NOT NULL DROP TABLE dbo.carts;
GO
CREATE TABLE carts (
    id         BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id    BIGINT   NOT NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_cart_user ON carts(user_id);
GO

IF OBJECT_ID('dbo.cart_items', 'U') IS NOT NULL DROP TABLE dbo.cart_items;
GO
CREATE TABLE cart_items (
    id         BIGINT IDENTITY(1,1) PRIMARY KEY,
    cart_id    BIGINT        NOT NULL,
    product_id BIGINT        NOT NULL,
    quantity   INT           NOT NULL DEFAULT 1,
    price      DECIMAL(15,0) NOT NULL,                     -- قیمت لحظه‌ی افزودن به سبد
    added_at   DATETIME      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_cartitem_cart    FOREIGN KEY (cart_id)    REFERENCES carts(id)    ON DELETE CASCADE,
    CONSTRAINT fk_cartitem_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT uq_cart_item UNIQUE (cart_id, product_id),
    CONSTRAINT chk_cart_quantity CHECK (quantity > 0)
);
GO

-- ============================================================
-- ۸. لیست علاقه‌مندی‌ها
-- ============================================================
IF OBJECT_ID('dbo.wishlists', 'U') IS NOT NULL DROP TABLE dbo.wishlists;
GO
CREATE TABLE wishlists (
    id         BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id    BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    added_at   DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_wishlist_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    CONSTRAINT fk_wishlist_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT uq_wishlist UNIQUE (user_id, product_id)
);
GO

-- ============================================================
-- ۹. لیست مقایسه (حداکثر ۴ محصول)
-- ============================================================
IF OBJECT_ID('dbo.compare_items', 'U') IS NOT NULL DROP TABLE dbo.compare_items;
GO
CREATE TABLE compare_items (
    id         BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id    BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    added_at   DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_compare_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    CONSTRAINT fk_compare_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT uq_compare UNIQUE (user_id, product_id)
);
GO

-- ============================================================
-- ۱۰. سفارش‌ها
-- ============================================================
IF OBJECT_ID('dbo.orders', 'U') IS NOT NULL DROP TABLE dbo.orders;
GO
CREATE TABLE orders (
    id            BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id       BIGINT        NOT NULL,
    address_id    BIGINT        NULL,
    order_number  VARCHAR(20)   NOT NULL UNIQUE,           -- مثال: MK-1405-000123
    status        NVARCHAR(20)  NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','paid','processing','shipped','delivered','cancelled')),
    total_price   DECIMAL(15,0) NOT NULL DEFAULT 0,
    shipping_cost DECIMAL(15,0) NOT NULL DEFAULT 0,
    discount      DECIMAL(15,0) NOT NULL DEFAULT 0,
    final_price   DECIMAL(15,0) NOT NULL DEFAULT 0,
    created_at    DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_order_user    FOREIGN KEY (user_id)    REFERENCES users(id),
    CONSTRAINT fk_order_address FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE SET NULL
);
CREATE INDEX idx_order_user   ON orders(user_id);
CREATE INDEX idx_order_status ON orders(status);
GO

IF OBJECT_ID('dbo.order_items', 'U') IS NOT NULL DROP TABLE dbo.order_items;
GO
CREATE TABLE order_items (
    id           BIGINT IDENTITY(1,1) PRIMARY KEY,
    order_id     BIGINT        NOT NULL,
    product_id   BIGINT        NOT NULL,
    quantity     INT           NOT NULL,
    unit_price   DECIMAL(15,0) NOT NULL,                   -- قیمت واحد هنگام خرید
    total_price  DECIMAL(15,0) NOT NULL,
    CONSTRAINT fk_orderitem_order   FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
    CONSTRAINT fk_orderitem_product FOREIGN KEY (product_id) REFERENCES products(id)
);
CREATE INDEX idx_orderitem_order ON order_items(order_id);
GO

-- ============================================================
-- ۱۱. پرداخت‌ها
-- ============================================================
IF OBJECT_ID('dbo.payments', 'U') IS NOT NULL DROP TABLE dbo.payments;
GO
CREATE TABLE payments (
    id         BIGINT IDENTITY(1,1) PRIMARY KEY,
    order_id   BIGINT        NOT NULL,
    amount     DECIMAL(15,0) NOT NULL,
    gateway    NVARCHAR(20)  NOT NULL DEFAULT 'zarinpal'
               CHECK (gateway IN ('zarinpal','mellat','saman')),
    authority  VARCHAR(64)   NULL,                         -- شناسه تراکنش درگاه
    status     NVARCHAR(20)  NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','success','failed')),
    paid_at    DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_payment_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE INDEX idx_payment_order ON payments(order_id);
GO

-- ============================================================
-- ۱۲. مشترکین خبرنامه
-- ============================================================
IF OBJECT_ID('dbo.newsletter_subscribers', 'U') IS NOT NULL DROP TABLE dbo.newsletter_subscribers;
GO
CREATE TABLE newsletter_subscribers (
    id         BIGINT IDENTITY(1,1) PRIMARY KEY,
    email      NVARCHAR(254) NOT NULL UNIQUE,
    user_id    BIGINT        NULL,
    created_at DATETIME      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_newsletter_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
GO

-- ============================================================
-- ۱۳. کد تخفیف
-- ============================================================
IF OBJECT_ID('dbo.coupons', 'U') IS NOT NULL DROP TABLE dbo.coupons;
GO
CREATE TABLE coupons (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    code       VARCHAR(30)  NOT NULL UNIQUE,
    percent    TINYINT      NOT NULL,                      -- درصد تخفیف
    max_use    INT          NULL,                          -- سقف استفاده (NULL = نامحدود)
    used_count INT          NOT NULL DEFAULT 0,
    expires_at DATETIME     NULL,
    status     NVARCHAR(20) NOT NULL DEFAULT 'active'
               CHECK (status IN ('active','inactive')),
    CONSTRAINT chk_percent CHECK (percent BETWEEN 1 AND 100)
);
GO

IF OBJECT_ID('dbo.coupon_usages', 'U') IS NOT NULL DROP TABLE dbo.coupon_usages;
GO
CREATE TABLE coupon_usages (
    id        BIGINT IDENTITY(1,1) PRIMARY KEY,
    coupon_id INT      NOT NULL,
    user_id   BIGINT   NOT NULL,
    order_id  BIGINT   NOT NULL,
    used_at   DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT fk_usage_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id),
    CONSTRAINT fk_usage_user   FOREIGN KEY (user_id)   REFERENCES users(id),
    CONSTRAINT fk_usage_order  FOREIGN KEY (order_id)  REFERENCES orders(id)
);
GO

-- Trigger برای updated_at (SQL Server مثل MySQL ON UPDATE ندارد)
IF OBJECT_ID('dbo.trg_users_updated_at', 'TR') IS NOT NULL DROP TRIGGER dbo.trg_users_updated_at;
GO
CREATE TRIGGER trg_users_updated_at ON users
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE u SET updated_at = GETDATE()
    FROM users u INNER JOIN inserted i ON u.id = i.id;
END
GO

IF OBJECT_ID('dbo.trg_products_updated_at', 'TR') IS NOT NULL DROP TRIGGER dbo.trg_products_updated_at;
GO
CREATE TRIGGER trg_products_updated_at ON products
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE p SET updated_at = GETDATE()
    FROM products p INNER JOIN inserted i ON p.id = i.id;
END
GO

-- ############################################################
--                    داده‌های نمونه (Sample Data)
-- ############################################################
SET NOCOUNT ON;

-- ---------- دسته‌بندی‌ها ----------
SET IDENTITY_INSERT categories ON;
INSERT INTO categories (id, parent_id, name, slug, image, is_hot, sort_order) VALUES
(1,  NULL, N'کالای دیجیتال',    'digital',        'images/electronics.jpg',        1, 1),
(2,  NULL, N'لوازم برقی',        'appliances',     'images/health-beauty.jpg',      1, 2),
(3,  NULL, N'لوازم هنری',        'art',            NULL,                            1, 3),
(4,  NULL, N'مد و پوشاک',        'fashion',        'images/bags-holiday-supplies-gifts.jpg', 1, 4),
(5,  NULL, N'خوراکی و آشامیدنی', 'food',           NULL,                            0, 5),
(6,  NULL, N'ورزش و فضای باز',   'sports',         'images/sports-outdoors.jpg',    0, 6),
(7,  NULL, N'جواهرات و ساعت',    'jewelry-watches','images/jewelry-watches.jpg',    1, 7),
(8,  NULL, N'لوازم آرایشی',      'beauty',         'images/health-beauty.jpg',      1, 8),
(11, 1, N'لپ‌تاپ و کامپیوتر',    'laptop-pc',      NULL,                            1, 1),
(12, 1, N'موبایل و تبلت',        'mobile-tablet',  'images/smartphone-tablets.jpg', 1, 2),
(13, 1, N'صوتی و تصویری',        'av',             NULL,                            0, 3),
(14, 2, N'آشپزخانه',             'kitchen',        NULL,                            0, 1),
(15, 4, N'مردانه',               'men',            NULL,                            0, 1),
(16, 4, N'زنانه',                'women',          NULL,                            1, 2),
(17, 7, N'ساعت مچی',             'wrist-watch',    NULL,                            1, 1),
(18, 7, N'گردنبند',              'necklace',       NULL,                            0, 2),
(19, 6, N'لوازم دوچرخه',         'cycling',        NULL,                            0, 1),
(20, 4, N'کیف',                  'bags',           NULL,                            1, 3);
SET IDENTITY_INSERT categories OFF;
GO

-- ---------- کاربران ----------
SET IDENTITY_INSERT users ON;
INSERT INTO users (id, first_name, last_name, email, phone, password_hash, status) VALUES
(1, N'علی',  N'احمدی',     'ali.ahmadi@example.com',    '09121234567', '$2y$10$hash_demo_1',     'active'),
(2, N'سارا', N'محمدی',     'sara.mohammadi@example.com','09351234567', '$2y$10$hash_demo_2',     'active'),
(3, N'رضا',  N'کریمی',     'reza.karimi@example.com',   '09191234567', '$2y$10$hash_demo_3',     'active'),
(4, N'مدیر', N'سایت',      'admin@market.ir',           '09150001111', '$2y$10$hash_demo_admin', 'active');
SET IDENTITY_INSERT users OFF;
GO

-- ---------- آدرس‌ها ----------
SET IDENTITY_INSERT addresses ON;
INSERT INTO addresses (id, user_id, title, province, city, postal_code, address, is_default) VALUES
(1, 1, N'خانه',    N'تهران',  N'تهران',  '1234567890', N'تهران، خیابان انقلاب، کوچه بهار، پلاک ۱۲', 1),
(2, 2, N'محل کار', N'اصفهان', N'اصفهان', '9876543210', N'اصفهان، خیابان چهارباغ، پلاک ۴۵',          1),
(3, 3, N'خانه',    N'فارس',   N'شیراز',  '5544332211', N'شیراز، بلوار زند، پلاک ۷',                 1);
SET IDENTITY_INSERT addresses OFF;
GO

-- ---------- محصولات (هم‌نام محصولات سایت) ----------
SET IDENTITY_INSERT products ON;
INSERT INTO products (id, category_id, name, slug, description, price, old_price, stock, rating, is_featured, is_new) VALUES
(1,  11, N'لپ‌تاپ ۱۵ اینچ',         'laptop-15',       N'لپ‌تاپ با پردازنده قدرتمند و مناسب کار و بازی', 50000000, 55000000, 10, 4.0, 1, 0),
(2,  11, N'مانیتور ۴۲ اینچ',       'monitor-42',      N'مانیتور فول اچ‌دی با کیفیت تصویر بالا',       45000000, 48000000, 8,  4.0, 0, 0),
(3,  12, N'گوشی هوشمند و تبلت',    'phone-tablet',    N'انواع گوشی‌ها و تبلت‌های روز دنیا',           97000000, NULL,     15, 4.0, 1, 1),
(4,  20, N'کیف چرم زنانه',         'leather-bag',     N'کیف چرم طبیعی دست‌دوز زنانه',                 7200000,  8000000,  20, 3.0, 0, 0),
(5,  20, N'کیف ویدکی',             'weekend-bag',     N'کیف مسافرتی ویدکی با طراحی شیک',              50000000, 55000000, 12, 3.0, 0, 1),
(6,  17, N'ساعت مچی کلاسیک',       'classic-watch',   N'ساعت مچی با بند استیل و موتور ژاپنی',          14125000, 15000000, 25, 5.0, 0, 1),
(7,  18, N'گردنبند قلبی',          'heart-necklace',  N'گردنبند نقره طرح قلب',                        50000,    55000,    50, 4.0, 0, 0),
(8,  18, N'گردنبند نقره',          'silver-necklace', N'گردنبند نقره ۹۲۵ با آبکاری رادیوم',            360000,   450000,   30, 4.0, 0, 0),
(9,  8,  N'لوازم آرایشی',          'cosmetics',       N'ست کامل لوازم آرایشی حرفه‌ای',                14250000, 15000000, 18, 4.0, 0, 0),
(10, 6,  N'هلی‌کوپتر کنترلی',       'rc-helicopter',   N'هلی‌کوپتر کنترلی با باتری قابل شارژ',          50000000, NULL,     7,  4.0, 0, 1),
(11, 15, N'تی‌شرت ورزشی',          'sport-tshirt',    N'تی‌شرت نخی مناسب ورزش',                        450000,   NULL,     40, 4.0, 0, 0),
(12, 19, N'لوازم دوچرخه',          'cycling-gear',    N'ست کامل لوازم جانبی دوچرخه',                  960000,   1200000,  15, 4.0, 0, 0),
(13, 11, N'کیس اسمبل شده گیمینگ',  'gaming-pc',       N'کیس گیمینگ با کارت گرافیک قدرتمند',           85000000, NULL,     5,  4.5, 1, 1),
(14, 12, N'ساعت هوشمند',           'smart-watch',     N'ساعت هوشمند با نمایشگر AMOLED',               12500000, NULL,     22, 4.5, 0, 1);
SET IDENTITY_INSERT products OFF;
GO

-- ---------- تصاویر محصولات ----------
INSERT INTO product_images (product_id, image_path, is_main, is_hover, sort_order) VALUES
(1,  'images/E3.jpg',           1, 0, 1),
(1,  'images/7_3.jpg',          0, 1, 2),
(2,  'images/e11.jpg',          1, 0, 1),
(3,  'images/1_3_18.jpg',       1, 0, 1),
(3,  'images/2_2_25.jpg',       0, 0, 2),
(3,  'images/3_2_26.jpg',       0, 0, 3),
(4,  'images/B5.jpg',           1, 0, 1),
(4,  'images/B9.jpg',           0, 1, 2),
(5,  'images/b5.jpg',           1, 0, 1),
(5,  'images/B10.jpg',          0, 1, 2),
(6,  'images/w1.jpg',           1, 0, 1),
(6,  'images/w10.jpg',          0, 1, 2),
(7,  'images/J9-270x270.jpg',   1, 0, 1),
(7,  'images/J5.jpg',           0, 1, 2),
(8,  'images/J5.jpg',           1, 0, 1),
(8,  'images/J9-270x270.jpg',   0, 1, 2),
(9,  'images/m1.jpg',           1, 0, 1),
(9,  'images/m3.jpg',           0, 1, 2),
(10, 'images/1_3_30.jpg',       1, 0, 1),
(11, 'images/7_2.jpg',          1, 0, 1),
(12, 'images/B10.jpg',          1, 0, 1),
(13, 'images/7_3.jpg',          1, 0, 1),
(14, 'images/w10.jpg',          1, 0, 1);
GO

-- ---------- نظرات ----------
INSERT INTO reviews (product_id, user_id, rating, comment, status) VALUES
(1, 1, 5, N'کیفیت عالی، بسته‌بندی مناسب. کاملاً راضی‌ام.', 'approved'),
(1, 2, 4, N'عملکرد خوب ولی ارسال کمی دیر انجام شد.',    'approved'),
(6, 3, 5, N'ساعت بسیار شیک و اصلی است. پیشنهاد می‌کنم.', 'approved'),
(7, 2, 4, N'خیلی ظریف و قشنگه.',                        'approved'),
(4, 1, 3, N'کیفیت چرم متوسط بود.',                       'pending');
GO

-- ---------- سبد خرید ----------
SET IDENTITY_INSERT carts ON;
INSERT INTO carts (id, user_id) VALUES (1, 1), (2, 2);
SET IDENTITY_INSERT carts OFF;
GO

INSERT INTO cart_items (cart_id, product_id, quantity, price) VALUES
(1, 7,  2,  50000),
(1, 9,  1,  14250000),
(2, 6,  1,  14125000),
(2, 11, 3,  450000);
GO

-- ---------- علاقه‌مندی‌ها ----------
INSERT INTO wishlists (user_id, product_id) VALUES
(1, 6), (1, 8), (1, 14),
(2, 1), (2, 5),
(3, 10);
GO

-- ---------- مقایسه ----------
INSERT INTO compare_items (user_id, product_id) VALUES
(1, 1), (1, 13), (1, 3),
(2, 6), (2, 14);
GO

-- ---------- سفارش‌ها ----------
SET IDENTITY_INSERT orders ON;
INSERT INTO orders (id, user_id, address_id, order_number, status, total_price, shipping_cost, discount, final_price) VALUES
(1, 1, 1, 'MK-1405-000001', 'delivered',  14300000,  50000,  0,       14350000),
(2, 2, 2, 'MK-1405-000002', 'shipped',    14125000,  0,      0,       14125000),
(3, 1, 1, 'MK-1405-000003', 'processing', 50500000,  50000,  5000000, 45550000);
SET IDENTITY_INSERT orders OFF;
GO

INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES
(1, 9,  1, 14250000, 14250000),
(1, 7,  2, 50000,    100000),
(2, 6,  1, 14125000, 14125000),
(3, 1,  1, 50000000, 50000000),
(3, 11, 1, 500000,    500000);
GO

-- ---------- پرداخت‌ها ----------
INSERT INTO payments (order_id, amount, gateway, authority, status, paid_at) VALUES
(1, 14350000, 'zarinpal', 'A0000000000000000000000000001', 'success', GETDATE()),
(2, 14125000, 'zarinpal', 'A0000000000000000000000000002', 'success', GETDATE()),
(3, 45550000, 'mellat',   NULL,                            'pending', NULL);
GO

-- ---------- خبرنامه ----------
INSERT INTO newsletter_subscribers (email, user_id) VALUES
('ali.ahmadi@example.com',     1),
('sara.mohammadi@example.com', 2),
('guest@example.com',          NULL);
GO

-- ---------- کد تخفیف ----------
SET IDENTITY_INSERT coupons ON;
INSERT INTO coupons (id, code, percent, max_use, used_count, expires_at, status) VALUES
(1, 'WELCOME10', 10, NULL, 1, '2026-12-29 23:59:59', 'active'),
(2, 'SUMMER20',  20, 100,  0, '2026-09-30 23:59:59', 'active');
SET IDENTITY_INSERT coupons OFF;
GO

INSERT INTO coupon_usages (coupon_id, user_id, order_id, used_at) VALUES
(1, 1, 3, GETDATE());
GO

-- ============================================================
-- Trigger: به‌روزرسانی خودکار امتیاز محصول پس از تأیید نظر
-- ============================================================
IF OBJECT_ID('dbo.trg_update_product_rating', 'TR') IS NOT NULL DROP TRIGGER dbo.trg_update_product_rating;
GO
CREATE TRIGGER trg_update_product_rating ON reviews
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE p
    SET p.rating = ISNULL((
        SELECT ROUND(AVG(CAST(r.rating AS FLOAT)), 1)
        FROM reviews r
        WHERE r.product_id = i.product_id AND r.status = 'approved'
    ), 0)
    FROM products p
    INNER JOIN inserted i ON p.id = i.product_id
    WHERE i.status = 'approved';
END
GO

-- ############################################################
--           کوئری‌های پرکاربرد (Useful Queries)
-- ############################################################
-- محصولات یک دسته با زیرشاخه‌ها:
-- SELECT p.* FROM products p JOIN categories c ON p.category_id = c.id
-- WHERE c.id = 1 OR c.parent_id = 1;

-- جزئیات سفارش کاربر:
-- SELECT o.order_number, p.name, oi.quantity, oi.unit_price
-- FROM orders o JOIN order_items oi ON o.id = oi.order_id
-- JOIN products p ON oi.product_id = p.id WHERE o.user_id = 1;

-- محصولات پرفروش:
-- SELECT p.name, SUM(oi.quantity) AS sold FROM order_items oi
-- JOIN products p ON oi.product_id = p.id GROUP BY p.id, p.name ORDER BY sold DESC;
