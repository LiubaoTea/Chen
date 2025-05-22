D1数据库所有表
carts、order_items、orders、product_categories、product_reviews、products	、shopping_sessions、user_addresses、user_settings、users、admins、admin_settings、admin_statistics
D1数据表的路径为：D1 数据库/liubaotea/具体各数据表
D1数据表的ID：440ba7f7-c29c-406c-95ba-ebb2b6aa98c

每个表包含的属性如下：

---

**1、users （用户信息表）**

-- 用户核心信息表
CREATE TABLE users (
--------------------

  "user_id" INTEGER PRIMARY KEY                                              -- 用户ID（6位数字主键，排除数字4）
    CHECK (
      user_id BETWEEN 100000 AND 999999                                      -- 范围约束：100000~999999
      AND CAST(user_id AS TEXT) GLOB '[1-35-9][0-35-9][0-35-9][0-35-9][0-35-9][0-35-9]'  -- 正则约束：首位非0且不含4
    ),
  "username" TEXT NOT NULL UNIQUE,                                           -- 用户名（唯一且必填）
  "password_hash" TEXT NOT NULL,                                             -- 密码哈希值（必填，加密存储）
  "email" TEXT NOT NULL UNIQUE,                                              -- 电子邮箱（唯一且必填）
  "phone_number" VARCHAR(15)                                                 -- 国际电话号码（格式：+国家码+号码）
    CHECK (phone_number GLOB '+[0-9][0-9]*')                                 -- 格式约束：以+开头且至少两位国家码
    UNIQUE,                                                                  -- 唯一性约束
  "created_at" INTEGER DEFAULT (CAST(strftime('%s','now') AS INTEGER)),      -- 创建时间（Unix时间戳，默认当前时间）
  "last_login" TIMESTAMP                                                     -- 最后登录时间（标准时间格式）
);

---

-- 高频查询字段索引
-------------------

CREATE INDEX "idx_users_phone" ON users ("phone_number");      -- 电话号码索引（优化查询性能）
CREATE INDEX "idx_users_email" ON users ("email");             -- 邮箱索引（优化唯一性校验）
CREATE INDEX "idx_last_login" ON users ("last_login");         -- 最后登录时间索引（新增优化）

-- 添加用户状态列（正常/禁用/删除）
ALTER TABLE users ADD COLUMN "status" TEXT NOT NULL DEFAULT '正常'
  CHECK ("status" IN ('正常', '禁用', '删除'));  -- 强制三选一

-- 添加删除状态列（是/否）
ALTER TABLE users ADD COLUMN "is_deleted" TEXT NOT NULL DEFAULT '否'
  CHECK ("is_deleted" IN ('是', '否'));         -- 强制二选一

-- 可选：添加复合约束（如果 status='删除'，则 is_deleted 必须为 '是'）
-- ALTER TABLE users ADD CHECK (
--   (status = '删除' AND is_deleted = '是') OR
--   (status != '删除')
-- );

---



**2、products：（商品数据表）**

-- 创建新表（整合状态字段）
CREATE TABLE products (
  "product_id" INTEGER PRIMARY KEY AUTOINCREMENT,                       -- 商品ID（自增主键）
  "name" TEXT NOT NULL,                                                 -- 商品名称（必填）
  "description" TEXT,                                                   -- 商品描述（可选）
  "specifications" TEXT NOT NULL DEFAULT '{}',                          -- 规格参数（JSON字符串，默认空对象）
  "aging_years" INTEGER NOT NULL DEFAULT 0,                             -- 陈化年份（默认0年）
  "price" REAL NOT NULL,                                                -- 商品价格（必须含小数点）
  "stock" INTEGER NOT NULL DEFAULT 0,                                   -- 库存数量（默认0）
  "status" TEXT NOT NULL DEFAULT 'active'                               -- 商品状态（active=上架，inactive=下架）
    CHECK (status IN ('active', 'inactive')),                           -- 状态约束
  "created_at" INTEGER DEFAULT (CAST(strftime('%s','now') AS INTEGER)   -- 创建时间（Unix时间戳）
));

-- 重建索引
CREATE INDEX idx_product_name ON products ("name");         -- 商品名称索引
CREATE INDEX idx_aging_years ON products ("aging_years");   -- 陈化年份索引
CREATE INDEX idx_product_status ON products ("status");     -- 状态索引（新增优化）

ALTER TABLE products ADD COLUMN "original_price" REAL NOT NULL DEFAULT 0.0;-- 添加原价列（支持小数点，默认值为0）

---



3、orders：（订单）
-- 创建订单主表
CREATE TABLE orders (
  "order_id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),           -- 唯一订单号（UUID自动生成）
  "user_id" INTEGER NOT NULL,                                                 -- 关联用户表的user_id
  "total_amount" REAL NOT NULL,                                               -- 订单总金额
  "status" TEXT NOT NULL DEFAULT 'pending'                                    -- 订单状态
    CHECK(status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
  "created_at" INTEGER DEFAULT (CAST(strftime('%s','now') AS INTEGER)),       -- 创建时间（Unix时间戳）
  "updated_at" INTEGER,                                                       -- 最后更新时间

  -- 外键约束：关联用户表
  FOREIGN KEY ("user_id") REFERENCES users("user_id")
);

-- 为常用查询字段创建索引
CREATE INDEX idx_orders_user ON orders ("user_id");
CREATE INDEX idx_orders_status ON orders ("status");

---



4、order_items：（订单明细）

CREATE TABLE order_items (
  "item_id" INTEGER PRIMARY KEY AUTOINCREMENT,     -- 明细项ID（自增主键）
  "order_id" TEXT NOT NULL,                        -- 关联订单表的order_id
  "product_id" INTEGER NOT NULL,                   -- 关联商品表的product_id
  "quantity" INTEGER NOT NULL DEFAULT 1,           -- 购买数量（默认1）
  "unit_price" REAL NOT NULL,                      -- 商品单价（下单时的快照价格）

  -- 外键约束：关联订单和商品表
  FOREIGN KEY ("order_id") REFERENCES orders("order_id"),
  FOREIGN KEY ("product_id") REFERENCES products("product_id")
);

-- 优化订单详情查询效率
CREATE INDEX idx_order_items_order ON order_items ("order_id");

---



5、carts：（购物车）
CREATE TABLE carts (
  cart_id INTEGER PRIMARY KEY AUTOINCREMENT,  -- 购物车项ID（自增主键）
  user_id INTEGER NOT NULL,                   -- 关联用户ID
  product_id INTEGER NOT NULL,                -- 关联商品ID
  quantity INTEGER NOT NULL DEFAULT 1         -- 商品数量
  CHECK(quantity > 0),                        -- 数量必须大于0
  added_at INTEGER DEFAULT (                  -- 添加时间（Unix时间戳）
    CAST(strftime('%s','now') AS INTEGER)
  ),
  session_id TEXT,                            -- 新增字段：关联购物会话ID

  -- 外键约束（级联删除保证数据一致性）
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES shopping_sessions(session_id) ON DELETE SET NULL
);


6、user_addresses：（地址设置）
CREATE TABLE user_addresses (
  address_id INTEGER PRIMARY KEY AUTOINCREMENT,                        -- 地址ID（自增主键）
  user_id INTEGER NOT NULL,                                            -- 关联用户表的user_id
  recipient_name TEXT NOT NULL,                                        -- 收货人姓名
  contact_phone TEXT NOT NULL,                                         --  联系电话
  full_address TEXT NOT NULL,                                          -- 详细地址（街道+门牌号）
  region TEXT NOT NULL,                                                -- 地区（省/市/区）
  postal_code TEXT,                                                    --  邮编（可选）
  is_default INTEGER DEFAULT 0 CHECK(is_default IN (0, 1)),            --  是否默认地址（0否，1是）
  created_at INTEGER DEFAULT (CAST(strftime('%s','now') AS INTEGER)),  -- 创建时间（Unix时间戳）

  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_user_addresses_user ON user_addresses(user_id);
CREATE INDEX idx_user_addresses_default ON user_addresses(is_default);

---



7、user_settings：（账户设置）

CREATE TABLE user_settings (
  setting_id INTEGER PRIMARY KEY AUTOINCREMENT,                          -- 设置ID（自增主键）
  user_id INTEGER NOT NULL UNIQUE,                                       -- 关联用户表的user_id
  notification_prefs TEXT DEFAULT '{"email":1, "sms":0}',                --通知偏好（JSON格式）
  privacy_settings TEXT DEFAULT '{"show_email":0, "show_phone":0}',      --隐私设置（JSON格式）
  created_at INTEGER DEFAULT (CAST(strftime('%s','now') AS INTEGER)),    --创建时间
  updated_at INTEGER,                                                    --最后更新时间

  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_user_settings_user ON user_settings(user_id);

---



8、product_categories：（产品分类）
CREATE TABLE product_categories (
  category_id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_name TEXT NOT NULL,               -- 分类名称
  rule_type TEXT NOT NULL,                   -- 分类规则类型（name_keyword/aging_year）
  rule_value TEXT,                           -- 规则值（如关键词列表或年份条件）
  parent_category_id INTEGER,                -- 父分类ID
  description TEXT,                          -- 分类描述
  created_at INTEGER DEFAULT (CAST(strftime('%s','now') AS INTEGER)),

  FOREIGN KEY (parent_category_id) REFERENCES product_categories(category_id)
);

-- 索引优化
CREATE INDEX idx_categories_rule ON product_categories(rule_type, rule_value);
CREATE INDEX idx_categories_parent ON product_categories(parent_category_id);

---



9、product_reviews：（产品评论）
CREATE TABLE product_reviews (
  review_id INTEGER PRIMARY KEY AUTOINCREMENT,                                      --评价ID（自增主键）
  user_id INTEGER NOT NULL,                                                         --关联用户表的user_id
  product_id INTEGER NOT NULL,                                                      --关联商品表的product_id
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),                            --评分（1-5分）
  review_content TEXT,评价内容（可选）
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')), --审核状态
  created_at INTEGER DEFAULT (CAST(strftime('%s','now') AS INTEGER)),               --评价时间

  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);

CREATE INDEX idx_reviews_product ON product_reviews(product_id);
CREATE INDEX idx_reviews_rating ON product_reviews(rating);

---



10、shopping_sessions：（购物会话）
CREATE TABLE shopping_sessions (
  session_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),                  --会话ID（UUID生成）
  user_id INTEGER NOT NULL,                                                          --关联用户表的user_id
  cart_data TEXT,                                                                    --购物车数据（JSON格式）
  status TEXT DEFAULT 'active' CHECK(status IN ('active','expired')),                --会话状态
  expires_at INTEGER DEFAULT (CAST(strftime('%s','now','+7 days') AS INTEGER)),      --过期时间（默认7天）
  created_at INTEGER DEFAULT (CAST(strftime('%s','now') AS INTEGER)),                --创建时间

  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user ON shopping_sessions(user_id);
CREATE INDEX idx_sessions_expiry ON shopping_sessions(expires_at);

-- 删除旧表（操作前请备份数据）
DROP TABLE IF EXISTS admins;

---



11、admins创建管理员表（独立账户体系）
-- 创建管理员表（独立账户体系）
CREATE TABLE admins (
  admin_id INTEGER PRIMARY KEY AUTOINCREMENT,  -- 管理员唯一标识
  username TEXT NOT NULL UNIQUE,              -- 管理员账号（唯一）
  password_hash TEXT NOT NULL,                -- 密码哈希（BCrypt加密存储）
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin')),  -- 角色类型
  permissions JSON DEFAULT '[]',              -- 扩展权限字段（JSON数组存储）
  created_at INTEGER DEFAULT (CAST(strftime('%s','now') AS INTEGER)),  -- 创建时间
  last_login TIMESTAMP                        -- 最后登录时间
);

-- 高频查询索引
CREATE INDEX idx_admins_role ON admins(role);       -- 按角色快速筛选
CREATE INDEX idx_admins_username ON admins(username);  -- 登录优化

---



12、admin_settings：（系统设置）

-- 创建系统设置表（支持多模块配置）
CREATE TABLE admin_settings (
  setting_id INTEGER PRIMARY KEY AUTOINCREMENT,
  module TEXT NOT NULL CHECK(module IN ('site', 'payment', 'mail', 'security')),  -- 设置模块分类
  config_key TEXT NOT NULL,          -- 配置键名（如 'enableWechatPay'）
  config_value TEXT,                 -- 配置值（支持JSON/字符串）
  data_type TEXT NOT NULL DEFAULT 'string' CHECK(data_type IN ('boolean', 'number', 'string', 'json')),
  updated_at INTEGER DEFAULT (CAST(strftime('%s','now') AS INTEGER)),

  UNIQUE(module, config_key)         -- 防止重复配置项
);

-- 高频查询索引
CREATE INDEX idx_settings_module ON admin_settings(module);
CREATE INDEX idx_settings_key ON admin_settings(config_key);

---



13、admin_statistics：（统计表）

CREATE TABLE admin_statistics (
  stat_id INTEGER PRIMARY KEY AUTOINCREMENT,
  stat_type TEXT NOT NULL CHECK(stat_type IN (
    'sales_trend',    -- 销售趋势
    'product_dist',   -- 商品销售分布
    'user_growth',     -- 用户增长
    'order_status',     -- 订单状态
    'top_products'       -- 热销商品
  )),
  period TEXT NOT NULL CHECK(period IN ('daily', 'weekly', 'monthly', 'custom')),
  start_date INTEGER NOT NULL,-- 统计开始时间（Unix时间戳）
  end_date INTEGER NOT NULL,-- 统计结束时间（Unix时间戳）
  stat_data TEXT NOT NULL,-- 统计结果数据（结构化存储）
  generated_at INTEGER DEFAULT (CAST(strftime('%s','now') AS INTEGER))
);

-- 单独创建索引（不与 CREATE TABLE 语句合并）
CREATE INDEX idx_stat_type_range ON admin_statistics(stat_type, start_date, end_date);

---



14、product_category_mapping：（商品-分类映射表）
-- 创建商品-分类映射表
CREATE TABLE product_category_mapping (
  product_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  category_id INTEGER NOT NULL,
  category_name TEXT NOT NULL,
  created_at INTEGER DEFAULT (CAST(strftime('%s','now') AS INTEGER)),

  PRIMARY KEY (product_id, category_id),
  FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES product_categories(category_id) ON DELETE CASCADE
);
CREATE INDEX idx_mapping_product ON product_category_mapping(product_id);
CREATE INDEX idx_mapping_category ON product_category_mapping(category_id);

-- 插入根分类（全部产品）
INSERT INTO product_category_mapping (product_id, name, category_id, category_name)
SELECT
    p.product_id,
    p.name AS product_name,  -- 从 products 表获取产品名称
    1 AS category_id,
    c.category_name          -- 从 product_categories 表获取分类名称
FROM products p
CROSS JOIN product_categories c
WHERE c.category_id = 1;     -- 根分类（全部产品）的 category_id=1
-- 步骤1：插入传统系列分类
INSERT INTO product_category_mapping (product_id, name, category_id, category_name)
SELECT
    p.product_id,
    p.name,
    2 AS category_id,
    (SELECT category_name FROM product_categories WHERE category_id=2) AS category_name
FROM products p
WHERE p.name LIKE '%传统%';

-- 步骤2：插入季节特供分类
INSERT INTO product_category_mapping (product_id, name, category_id, category_name)
SELECT
    p.product_id,
    p.name,
    3 AS category_id,
    (SELECT category_name FROM product_categories WHERE category_id=3) AS category_name
FROM products p
WHERE
    p.name LIKE '%春茶%' OR
    p.name LIKE '%秋茶%' OR
    p.name LIKE '%夏茶%' OR
    p.name LIKE '%冬茶%';

-- 步骤3：插入限量版分类
-- 限量版分类（特惠/促销）
INSERT INTO product_category_mapping (product_id, name, category_id, category_name)
SELECT
    p.product_id,
    p.name,
    4 AS category_id,
    (SELECT category_name FROM product_categories WHERE category_id=4) AS category_name
FROM products p
WHERE
    p.name LIKE '%特惠%' OR
    p.name LIKE '%促销%';

-- 步骤4：插入礼盒装分类
INSERT INTO product_category_mapping (product_id, name, category_id, category_name)
SELECT
    p.product_id,
    p.name,
    5 AS category_id,
    (SELECT category_name FROM product_categories WHERE category_id=5) AS category_name
FROM products p
WHERE p.name LIKE '%礼盒%';

-- 步骤5：插入社茶分类
INSERT INTO product_category_mapping (product_id, name, category_id, category_name)
SELECT
    p.product_id,
    p.name,
    17 AS category_id,
    (SELECT category_name FROM product_categories WHERE category_id=17) AS category_name
FROM products p
WHERE p.name LIKE '%社%';

-- 步骤6：插入清明茶分类
INSERT INTO product_category_mapping (product_id, name, category_id, category_name)
SELECT
    p.product_id,
    p.name,
    18 AS category_id,
    (SELECT category_name FROM product_categories WHERE category_id=18) AS category_name
FROM products p
WHERE p.name LIKE '%清明%';

-- 步骤7：插入陈化年份分类
INSERT INTO product_category_mapping (product_id, name, category_id, category_name)
SELECT
    p.product_id,
    p.name,
    CASE
        WHEN aging_years = 1 THEN 6
        WHEN aging_years = 2 THEN 7
        WHEN aging_years = 3 THEN 8
        WHEN aging_years = 4 THEN 9
        WHEN aging_years = 5 THEN 10
        WHEN aging_years = 6 THEN 11
        WHEN aging_years = 7 THEN 12
        WHEN aging_years = 8 THEN 13
        WHEN aging_years = 9 THEN 14
        WHEN aging_years = 10 THEN 15
        WHEN aging_years > 10 THEN 16
    END AS category_id,
    c.category_name
FROM products p
JOIN product_categories c ON c.category_id = CASE
    WHEN aging_years = 1 THEN 6
    WHEN aging_years = 2 THEN 7
    WHEN aging_years = 3 THEN 8
    WHEN aging_years = 4 THEN 9
    WHEN aging_years = 5 THEN 10
    WHEN aging_years = 6 THEN 11
    WHEN aging_years = 7 THEN 12
    WHEN aging_years = 8 THEN 13
    WHEN aging_years = 9 THEN 14
    WHEN aging_years = 10 THEN 15
    WHEN aging_years > 10 THEN 16
END
WHERE p.aging_years > 0;
