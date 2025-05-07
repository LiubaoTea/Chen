D1数据库所有表
carts、order_items、orders、product_categories、product_reviews、products	、shopping_sessions、user_addresses、user_settings、users、admins、admin_settings、admin_statistics
D1数据表的路径为：D1 数据库/liubaotea/具体各数据表
D1数据表的ID：440ba7f7-c29c-406c-95ba-ebb2b6aa98c

每个表包含的属性如下：

1、users （用户信息表）

CREATE TABLE users (
  -- 核心用户信息
  user_id INTEGER PRIMARY KEY
    CHECK (
      -- 强制 6 位数字
      user_id BETWEEN 100000 AND 999999
      -- 所有数字不包含 4，且首位非 0
      AND CAST(user_id AS TEXT) GLOB '[1-35-9][0-35-9][0-35-9][0-35-9][0-35-9][0-35-9]'
    ),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  
  -- 联系方式
  phone_number VARCHAR(15) 
    CHECK (phone_number GLOB '+[0-9][0-9]*')
    UNIQUE,
  
  -- 时间戳管理
  created_at INTEGER DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
  last_login TIMESTAMP
);

-- 高频查询索引
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_email ON users(email);


2、products：（商品数据表）

CREATE TABLE products (
  "product_id" INTEGER PRIMARY KEY AUTOINCREMENT,                       -- 商品ID（自增主键）
  "name" TEXT NOT NULL,                                                 -- 商品名称（必填）
  "description" TEXT,                                                   -- 商品描述（可选）
  "specifications" TEXT NOT NULL DEFAULT '{}',                          -- 规格参数（JSON字符串，默认空对象）
  "aging_years" INTEGER NOT NULL DEFAULT 0,                             -- 陈化年份（默认0年）
  "price" REAL NOT NULL,                                                -- 商品价格（必须含小数点）
  "stock" INTEGER NOT NULL DEFAULT 0,                                   -- 库存数量（默认0）
  "created_at" INTEGER DEFAULT (CAST(strftime('%s','now') AS INTEGER) ) -- 创建时间（Unix时间戳）
);

-- 创建商品名称索引（加速搜索）
CREATE INDEX idx_product_name ON products ("name");

-- 创建年份索引（可选，优化按年份筛选）
CREATE INDEX idx_aging_years ON products ("aging_years");

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

14、product_category_mapping：（商品-分类映射表）
-- 创建商品-分类映射表
CREATE TABLE product_category_mapping (
  product_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  created_at INTEGER DEFAULT (CAST(strftime('%s','now') AS INTEGER)),

  PRIMARY KEY (product_id, category_id),
  FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES product_categories(category_id) ON DELETE CASCADE
);

-- 创建双向索引优化查询
CREATE INDEX idx_mapping_product ON product_category_mapping(product_id);
CREATE INDEX idx_mapping_category ON product_category_mapping(category_id);
