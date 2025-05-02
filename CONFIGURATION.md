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