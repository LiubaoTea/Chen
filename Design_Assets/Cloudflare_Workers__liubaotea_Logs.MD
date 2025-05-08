管理后台日志：
初始化商品管理页面...
admin-products.js:47 正在从D1数据库加载商品分类...
admin-api.js:338 发送分类请求，URL: https://adminsystemworkers.liubaotea.online/api/admin/categories?page=1&pageSize=10
admin-api.js:355 成功获取分类数据: (18) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
admin-products.js:59 成功加载分类数据: (18) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
admin-products.js:103 正在从D1数据库加载商品数据...
admin-products.js:104 筛选条件 - 页码: 1 分类ID:  搜索关键词: 
admin-api.js:36 发送商品请求，URL: https://adminsystemworkers.liubaotea.online/api/admin/products?page=1&pageSize=10&include_category_mappings=true
admin-api.js:53 成功获取商品数据: {products: Array(10), pagination: {…}}
admin-api.js:95 发送商品分类映射请求，URL: https://adminsystemworkers.liubaotea.online/api/admin/product-category-mappings?product_ids=19,19,19,20,20,20,21,21,21,22
admin-api.js:112 成功获取商品分类映射数据: (12) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
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