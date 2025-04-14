# 陳記六堡茶 - 电商网站

一个基于Cloudflare Workers的六堡茶电商网站，提供完整的在线购物体验。

## 项目概述

陳記六堡茶是一个专注于销售广西梧州六堡镇特产黑茶的电商平台。该项目采用现代Web技术栈构建，前端使用原生HTML、CSS和JavaScript，后端基于Cloudflare Workers，数据存储使用Cloudflare D1数据库，图片资源存储在Cloudflare R2中。

## 功能特点

- **响应式设计**：完美适配移动端和桌面端设备
- **用户系统**：支持用户注册、登录和个人信息管理
- **产品展示**：精美的产品展示页面，包含详细的产品信息
- **在线商城**：
  - 商品分类和筛选
  - 购物车管理
  - 订单创建和跟踪
- **品牌文化**：展示六堡茶的历史、文化和制作工艺
- **图片存储**：使用Cloudflare R2存储和提供产品图片

## 技术栈

### 前端
- HTML5
- CSS3 (响应式设计)
- JavaScript (原生)
- Font Awesome 图标库

### 后端
- Cloudflare Workers (无服务器函数)
- Cloudflare D1 (SQLite兼容的数据库)
- Cloudflare R2 (对象存储)

### 部署
- Cloudflare Pages (静态网站托管)
- GitHub (代码版本控制)

## 项目结构

```
├── css/                  # 样式文件
├── image/                # 图片资源
│   └── Goods/            # 商品图片
├── js/                   # JavaScript文件
│   ├── api.js            # API交互函数
│   ├── auth.js           # 用户认证
│   ├── main.js           # 主要功能
│   ├── shop.js           # 商城功能
│   └── ...               # 其他JS文件
├── worker/               # Cloudflare Worker代码
│   └── liubaotea.js      # 主要Worker代码
├── index.html            # 首页
├── shop.html             # 商城页面
├── product-detail.html   # 商品详情页
├── user-center.html      # 用户中心
└── ...                   # 其他HTML页面
```

## 安装与部署

### 前提条件

- Cloudflare账户
- GitHub账户
- 基本的Web开发知识

### 部署步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/LiubaoTea/Chen.git
   cd Chen
   ```

2. **配置Cloudflare Worker**
   - 在Cloudflare Dashboard创建新的Worker
   - 上传`worker/liubaotea.js`文件内容
   - 配置环境变量（R2_DOMAIN等）

3. **设置Cloudflare D1数据库**
   - 创建新的D1数据库
   - 使用SQL脚本创建必要的表（users, products, orders, order_items, carts）
   - 将数据库绑定到Worker

4. **配置Cloudflare R2存储**
   - 创建新的R2存储桶
   - 上传商品图片到`image/Goods/`目录
   - 将R2存储桶绑定到Worker

5. **配置Cloudflare Pages**
   - 连接GitHub仓库
   - 设置构建命令（如果需要）
   - 部署网站

6. **更新API基础URL**
   - 在`js/api.js`中更新`API_BASE_URL`为你的Worker URL

## 使用指南

### 管理员

- 通过数据库直接管理产品和用户信息
- 监控订单状态和处理订单

### 用户

- 注册/登录账户
- 浏览产品目录
- 将商品添加到购物车
- 结算并创建订单
- 查看订单历史

## 贡献指南

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

## 许可证

本项目采用MIT许可证 - 详情请参阅LICENSE文件

## 联系方式

如有任何问题或建议，请通过以下方式联系我们：

- 电子邮件：contact@liubaotea.com
- 微信公众号：陳記六堡茶