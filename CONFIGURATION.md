# 陳記六堡茶管理系统配置说明

## 配置修改说明

### 1. D1数据库配置

已将`wrangler.toml`文件中的数据库ID更新为实际值：

```toml
[[d1_databases]]
binding = "DB"
database_name = "liubaocha-db"
database_id = "440ba7f7-c29c-406c-95ba-ebb2b6aa98cd"
```

### 2. JWT密钥配置

已修改`utils/auth.js`文件，使其从环境变量中获取JWT密钥：

```js
// JWT密钥，从环境变量中获取，如果不存在则使用默认值
const JWT_SECRET = typeof env !== 'undefined' && env.JWT_SECRET ? env.JWT_SECRET : 'liubaocha-admin-secret-key';
```

### 3. API_BASE_URL配置

已修复管理员登录页面中的API_BASE_URL未定义问题：

- 在`js/admin/admin-auth.js`中添加了对config.js的导入
- 修改了`admin/login.html`中的脚本引入方式，使用模块方式导入

### 4. 管理员API路径修复

已修复管理员登录API 404错误问题：

- 将`js/config.js`中的`ADMIN_API_BASE_URL`从`https://api.liubaotea.online`修改为`https://workers.liubaotea.online`，使其与前端部署在同一域名下
- 更新了`js/admin/admin-api.js`中所有管理员API调用，确保使用正确的`ADMIN_API_BASE_URL`变量
- 管理员API现在正确指向`/api/admin`路径，与functions目录中的API路由结构一致

## 系统运作逻辑

### 1. 系统架构概述

陳記六堡茶管理系统采用前后端分离架构：

- **前端**：纯静态HTML/CSS/JavaScript，部署在Cloudflare Pages上
- **后端**：Cloudflare Workers提供API服务，与D1数据库交互
- **数据库**：Cloudflare D1 SQLite数据库，存储所有业务数据

### 2. 数据流转过程

1. **用户认证流程**：
   - 管理员通过登录页面输入用户名和密码
   - 前端将凭据发送到`/api/admin/login`接口
   - 后端验证凭据，生成JWT令牌并返回
   - 前端存储令牌，用于后续API请求的身份验证

2. **数据加载流程**：
   - 用户点击导航菜单（如商品管理、订单管理等）
   - 前端通过`admin-main.js`中的`navigateToPage`函数处理导航事件
   - 相应页面内容从`admin/pages/`目录加载
   - 页面加载后调用对应模块（如`admin-products.js`）的初始化函数
   - 初始化函数通过`admin-api.js`中的方法从后端API获取数据
   - 后端API从D1数据库查询数据并返回
   - 前端接收数据并渲染到页面

3. **数据修改流程**：
   - 用户在界面上进行操作（如添加商品、修改订单状态等）
   - 前端收集表单数据，通过API发送到后端
   - 后端验证数据，更新D1数据库
   - 操作结果返回前端，更新界面显示

### 3. 模块功能说明

1. **前端模块**：
   - `admin-auth.js`：管理员认证模块，处理登录、登出和权限验证
   - `admin-api.js`：API接口模块，封装与后端的通信
   - `admin-main.js`：主控制模块，处理导航和页面加载
   - `admin-dashboard.js`：仪表盘模块，显示统计数据和图表
   - `admin-products.js`：商品管理模块，处理商品的CRUD操作
   - `admin-orders.js`：订单管理模块，处理订单的查看和状态更新
   - `admin-users.js`：用户管理模块，处理用户信息的查看和管理
   - 其他功能模块：分类管理、评价管理、统计分析等

2. **后端API**：
   - `/api/admin/login`：管理员登录接口
   - `/api/admin/dashboard/*`：仪表盘数据接口
   - `/api/admin/products/*`：商品管理接口
   - `/api/admin/orders/*`：订单管理接口
   - `/api/admin/users/*`：用户管理接口
   - 其他功能接口：分类、评价、统计等

### 4. 导航点击无反应问题修复

当前导航点击无反应的主要原因是各功能模块（如`admin-dashboard.js`、`admin-products.js`等）中的函数没有正确导出或设为全局变量，导致`admin-main.js`无法调用这些函数。修复方法：

1. **方法一：将函数设为全局变量**
   在各功能模块的末尾添加：
   ```js
   // 设置全局函数，供admin-main.js调用
   window.loadDashboardData = loadDashboardData;
   window.adminProducts = { init: initProductsPage };
   window.adminOrders = { init: initOrdersPage };
   window.adminUsers = { init: initUsersPage };
   window.initCategoriesPage = initCategoriesPage;
   window.refreshCategoriesData = refreshCategoriesData;
   window.initReviewsPage = initReviewsPage;
   window.refreshReviewsData = refreshReviewsData;
   window.initStatisticsPage = initStatisticsPage;
   window.refreshStatisticsData = refreshStatisticsData;
   window.initSettingsPage = initSettingsPage;
   window.refreshSettingsData = refreshSettingsData;
   window.initProfilePage = initProfilePage;
   window.refreshProfileData = refreshProfileData;
   ```

2. **方法二：使用ES模块导出/导入**
   - 在各功能模块中导出函数：
     ```js
     export { initProductsPage, refreshProductsData };
     ```
   - 在`admin-main.js`中导入：
     ```js
     import { initProductsPage, refreshProductsData } from './admin-products.js';
     ```

## 环境变量配置说明

在Cloudflare Workers/Pages中，您需要配置以下环境变量：

1. **JWT_SECRET**: JWT令牌加密密钥
   - 名称: `JWT_SECRET`
   - 建议值: 生成一个强随机字符串，不要使用默认值

## 如何在Cloudflare中设置环境变量

1. 登录Cloudflare控制台
2. 进入您的Workers或Pages项目
3. 点击「设置」>「环境变量」
4. 添加名为`JWT_SECRET`的环境变量
5. 输入您的密钥值
6. 保存更改

## 管理员账户

您提到已在D1数据库中创建了管理员账户：
- admin_id: 10000
- username: admin
- password_hash: admin
- role: superadmin

请注意，正常情况下password_hash应该是经过哈希处理的密码，而不是明文。如果您在登录时遇到问题，可能需要使用`init-admin.js`脚本重新初始化管理员账户。