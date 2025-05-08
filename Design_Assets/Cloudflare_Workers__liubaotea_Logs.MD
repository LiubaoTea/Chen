config.js加载完成，API配置: {API_BASE_URL: 'https://workers.liubaotea.online', API_BASE_URL_TYPE: 'string'}
admin-auth.js:13 加载admin-auth.js，配置: {API_BASE_URL: 'https://workers.liubaotea.online'}
admin-auth.js:22 API URL清理过程: {原始API_BASE_URL: 'https://workers.liubaotea.online', 原始ADMIN_API_BASE_URL: undefined, 清理后API_BASE_URL: 'https://workers.liubaotea.online', 清理后ADMIN_API_BASE_URL: '', 最终ADMIN_API_URL: 'https://workers.liubaotea.online'}
admin-auth.js:37 admin-auth.js中的配置: {API_BASE_URL: 'https://workers.liubaotea.online', ADMIN_API_BASE_URL: undefined, ADMIN_API_URL: 'https://workers.liubaotea.online'}
admin-users.js:438 Uncaught SyntaxError: Identifier 'showSuccessToast' has already been declared (at admin-users.js:438:1)Understand this error
admin-config.js:13 admin-config.js加载完成，管理后台API配置: {ADMIN_API_BASE_URL: 'https://adminsystemworkers.liubaotea.online', ADMIN_API_BASE_URL_TYPE: 'string'}
admin-api.js:12 admin-api.js中的配置: {API_BASE_URL: 'https://workers.liubaotea.online', ADMIN_API_BASE_URL: 'https://adminsystemworkers.liubaotea.online'}
admin-users.js:438 Uncaught SyntaxError: Identifier 'showSuccessToast' has already been declared (at admin-users.js:438:1)Understand this error
admin-api.js:884 
            
            
           GET https://adminsystemworkers.liubaotea.online/api/admin/categories/distribution 404 (Not Found)
getCategoryDistribution @ admin-api.js:884
loadDashboardData @ admin-dashboard.js:29
await in loadDashboardData
(anonymous) @ admin-main.js:21Understand this error
admin-api.js:898 获取分类占比数据出错: Error: 获取分类占比数据失败
    at Object.getCategoryDistribution (admin-api.js:893:23)
    at async loadDashboardData (admin-dashboard.js:29:38)
getCategoryDistribution @ admin-api.js:898
await in getCategoryDistribution
loadDashboardData @ admin-dashboard.js:29
await in loadDashboardData
(anonymous) @ admin-main.js:21Understand this error
admin-dashboard.js:32 加载仪表盘数据失败: Error: 获取分类占比数据失败
    at Object.getCategoryDistribution (admin-api.js:893:23)
    at async loadDashboardData (admin-dashboard.js:29:38)
loadDashboardData @ admin-dashboard.js:32
await in loadDashboardData
(anonymous) @ admin-main.js:21Understand this error
admin-products.js:24 初始化商品管理页面...
admin-products.js:47 正在从D1数据库加载商品分类...
admin-api.js:338 发送分类请求，URL: https://adminsystemworkers.liubaotea.online/api/admin/categories?page=1&pageSize=10
admin-api.js:355 成功获取分类数据: (18) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
admin-products.js:59 成功加载分类数据: (18) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
admin-products.js:103 正在从D1数据库加载商品数据...
admin-products.js:104 筛选条件 - 页码: 1 分类ID:  搜索关键词: 
admin-api.js:36 发送商品请求，URL: https://adminsystemworkers.liubaotea.online/api/admin/products?page=1&pageSize=10&include_category_mappings=true
admin-api.js:53 成功获取商品数据: {products: Array(10), pagination: {…}}
admin-api.js:95 发送商品分类映射请求，URL: https://adminsystemworkers.liubaotea.online/api/admin/product-category-mappings?product_ids=19,19,19,20,20,20,21,21,21,22
admin-api.js:97 
            
            
           GET https://adminsystemworkers.liubaotea.online/api/admin/product-category-mappings?product_ids=19,19,19,20,20,20,21,21,21,22 404 (Not Found)
getProductCategoryMappings @ admin-api.js:97
getProducts @ admin-api.js:63
await in getProducts
loadProducts @ admin-products.js:113
initProductsPage @ admin-products.js:30
await in initProductsPage
loadProductsPage @ admin-main.js:230
navigateToPage @ admin-main.js:153
(anonymous) @ admin-main.js:42Understand this error
admin-api.js:107 商品分类映射API响应错误: 404 {"error":"未找到请求的API"}
getProductCategoryMappings @ admin-api.js:107
await in getProductCategoryMappings
getProducts @ admin-api.js:63
await in getProducts
loadProducts @ admin-products.js:113
initProductsPage @ admin-products.js:30
await in initProductsPage
loadProductsPage @ admin-main.js:230
navigateToPage @ admin-main.js:153
(anonymous) @ admin-main.js:42Understand this error
admin-api.js:115 获取商品分类映射出错: Error: 获取商品分类映射失败，HTTP状态码: 404
    at Object.getProductCategoryMappings (admin-api.js:108:23)
    at async Object.getProducts (admin-api.js:63:42)
    at async loadProducts (admin-products.js:113:24)
    at async Object.initProductsPage [as init] (admin-products.js:30:9)
getProductCategoryMappings @ admin-api.js:115
await in getProductCategoryMappings
getProducts @ admin-api.js:63
await in getProducts
loadProducts @ admin-products.js:113
initProductsPage @ admin-products.js:30
await in initProductsPage
loadProductsPage @ admin-main.js:230
navigateToPage @ admin-main.js:153
(anonymous) @ admin-main.js:42Understand this error
admin-products.js:130 分页信息: {currentPage: 1, totalPages: 4, totalItems: 34}
admin-products.js:173 获取商品分类映射失败: TypeError: adminAPI.getProductCategoryMappings is not a function
    at loadProducts (admin-products.js:146:49)
    at async Object.initProductsPage [as init] (admin-products.js:30:9)
loadProducts @ admin-products.js:173
await in loadProducts
initProductsPage @ admin-products.js:30
await in initProductsPage
loadProductsPage @ admin-main.js:230
navigateToPage @ admin-main.js:153
(anonymous) @ admin-main.js:42Understand this warning
admin-products.js:194 成功加载商品数据: (10) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
admin-products.js:298 未找到商品分类信息: {productId: 19, categoryMappings: Array(0), categories: Array(0), categoryId: undefined}
admin-products.js:298 未找到商品分类信息: {productId: 19, categoryMappings: Array(0), categories: Array(0), categoryId: undefined}
admin-products.js:298 未找到商品分类信息: {productId: 19, categoryMappings: Array(0), categories: Array(0), categoryId: undefined}
admin-products.js:298 未找到商品分类信息: {productId: 20, categoryMappings: Array(0), categories: Array(0), categoryId: undefined}
admin-products.js:298 未找到商品分类信息: {productId: 20, categoryMappings: Array(0), categories: Array(0), categoryId: undefined}
admin-products.js:298 未找到商品分类信息: {productId: 20, categoryMappings: Array(0), categories: Array(0), categoryId: undefined}
admin-products.js:298 未找到商品分类信息: {productId: 21, categoryMappings: Array(0), categories: Array(0), categoryId: undefined}
admin-products.js:298 未找到商品分类信息: {productId: 21, categoryMappings: Array(0), categories: Array(0), categoryId: undefined}
admin-products.js:298 未找到商品分类信息: {productId: 21, categoryMappings: Array(0), categories: Array(0), categoryId: undefined}
admin-products.js:298 未找到商品分类信息: {productId: 22, categoryMappings: Array(0), categories: Array(0), categoryId: undefined}
admin-api.js:338 发送分类请求，URL: https://adminsystemworkers.liubaotea.online/api/admin/categories?page=1&pageSize=10
admin-api.js:355 成功获取分类数据: (18) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
admin-categories.js:241 adminAPI.getCategoryById函数未定义
handleEditCategory @ admin-categories.js:241Understand this error
admin-categories.js:321 获取分类详情失败: TypeError: Cannot set properties of null (setting 'value')
    at HTMLButtonElement.handleEditCategory (admin-categories.js:253:63)
handleEditCategory @ admin-categories.js:321Understand this error