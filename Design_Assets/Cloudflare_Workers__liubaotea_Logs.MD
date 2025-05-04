日志1：
Uncaught SyntaxError: Identifier 'showSuccessToast' has already been declared (at admin-users.js:438:1)Understand this error
admin-api.js:14 admin-api.js中的配置: {API_BASE_URL: 'https://workers.liubaotea.online', ADMIN_API_BASE_URL: 'https://workers.liubaotea.online'}
admin-users.js:438 Uncaught SyntaxError: Identifier 'showSuccessToast' has already been declared (at admin-users.js:438:1)Understand this error
admin-api.js:764 
Uncaught SyntaxError: Identifier 'showSuccessToast' has already been declared (at admin-users.js:438:1)
            
admin-api.js:764 
 GET https://workers.liubaotea.online/api/admin/categories/distribution 500 (Internal Server Error)
getCategoryDistribution	@	admin-api.js:764
loadDashboardData	@	admin-dashboard.js:29
await in loadDashboardData		
(anonymous)	@	admin-main.js:21

admin-api.js:778 获取分类占比数据出错: Error: 获取分类占比数据失败
    at Object.getCategoryDistribution (admin-api.js:773:23)
    at async loadDashboardData (admin-dashboard.js:29:38)
getCategoryDistribution	@	admin-api.js:778
await in getCategoryDistribution		
loadDashboardData	@	admin-dashboard.js:29
await in loadDashboardData		
(anonymous)	@	admin-main.js:21
admin-dashboard.js:32 加载仪表盘数据失败: Error: 获取分类占比数据失败
    at Object.getCategoryDistribution (admin-api.js:773:23)
    at async loadDashboardData (admin-dashboard.js:29:38)
loadDashboardData	@	admin-dashboard.js:32
await in loadDashboardData		
(anonymous)	@	admin-main.js:21
﻿


﻿
日志2：
admin-api.js:268 获取分类列表出错: Error: 获取分类列表失败
    at Object.getCategories (admin-api.js:263:23)
    at async loadCategories (admin-products.js:40:28)
    at async Object.initProductsPage [as init] (admin-products.js:20:9)
getCategories	@	admin-api.js:268
await in getCategories		
loadCategories	@	admin-products.js:40
initProductsPage	@	admin-products.js:20
loadProductsPage	@	admin-main.js:230
navigateToPage	@	admin-main.js:153
(anonymous)	@	admin-main.js:42
admin-products.js:54 加载商品分类失败: TypeError: categories.forEach is not a function
    at loadCategories (admin-products.js:47:20)
    at async Object.initProductsPage [as init] (admin-products.js:20:9)
loadCategories	@	admin-products.js:54
await in loadCategories		
initProductsPage	@	admin-products.js:20
loadProductsPage	@	admin-main.js:230
navigateToPage	@	admin-main.js:153
(anonymous)	@	admin-main.js:42
admin-products.js:28 初始化商品管理页面失败: TypeError: categories.forEach is not a function
    at loadCategories (admin-products.js:47:20)
    at async Object.initProductsPage [as init] (admin-products.js:20:9)
initProductsPage	@	admin-products.js:28
await in initProductsPage		
loadProductsPage	@	admin-main.js:230
navigateToPage	@	admin-main.js:153
(anonymous)	@	admin-main.js:42
﻿

﻿

日志3：
admin-api.js:182 
 GET https://workers.liubaotea.online/api/admin/orders?page=1&pageSize=10 404 (Not Found)
getOrders	@	admin-api.js:182
loadOrders	@	admin-orders.js:48
initOrdersPage	@	admin-orders.js:27
loadOrdersPage	@	admin-main.js:248
navigateToPage	@	admin-main.js:156
(anonymous)	@	admin-main.js:42

admin-api.js:196 获取订单列表出错: Error: 获取订单列表失败
    at Object.getOrders (admin-api.js:191:23)
    at async loadOrders (admin-orders.js:48:24)
    at async Object.initOrdersPage [as init] (admin-orders.js:27:9)
getOrders	@	admin-api.js:196
await in getOrders		
loadOrders	@	admin-orders.js:48
initOrdersPage	@	admin-orders.js:27
loadOrdersPage	@	admin-main.js:248
navigateToPage	@	admin-main.js:156
(anonymous)	@	admin-main.js:42
admin-orders.js:58 加载订单列表失败: TypeError: Cannot read properties of undefined (reading 'toLocaleString')
    at admin-orders.js:86:39
    at Array.forEach (<anonymous>)
    at updateOrdersList (admin-orders.js:74:16)
    at loadOrders (admin-orders.js:53:9)
    at async Object.initOrdersPage [as init] (admin-orders.js:27:9)
loadOrders	@	admin-orders.js:58
await in loadOrders		
initOrdersPage	@	admin-orders.js:27
loadOrdersPage	@	admin-main.js:248
navigateToPage	@	admin-main.js:156
(anonymous)	@	admin-main.js:42
﻿


﻿
日志4：
用户列表，无对应日志

﻿
日志5：
admin-api.js:254 
 GET https://workers.liubaotea.online/api/admin/categories?page=1&pageSize=10 404 (Not Found)
getCategories	@	admin-api.js:254
loadCategories	@	admin-categories.js:51
loadCategoriesPage	@	admin-main.js:284
navigateToPage	@	admin-main.js:162
(anonymous)	@	admin-main.js:42

admin-api.js:268 获取分类列表出错: Error: 获取分类列表失败
    at Object.getCategories (admin-api.js:263:23)
    at async loadCategories (admin-categories.js:51:24)
getCategories	@	admin-api.js:268
await in getCategories		
loadCategories	@	admin-categories.js:51
loadCategoriesPage	@	admin-main.js:284
navigateToPage	@	admin-main.js:162
(anonymous)	@	admin-main.js:42

﻿
日志6：
admin-api.js:292 
 GET https://workers.liubaotea.online/api/admin/reviews?page=1&pageSize=10 404 (Not Found)
getReviews	@	admin-api.js:292
loadReviews	@	admin-reviews.js:52
loadReviewsPage	@	admin-main.js:302
navigateToPage	@	admin-main.js:165
(anonymous)	@	admin-main.js:42

admin-api.js:306 获取评价列表出错: Error: 获取评价列表失败
    at Object.getReviews (admin-api.js:301:23)
    at async loadReviews (admin-reviews.js:52:24)
getReviews	@	admin-api.js:306
await in getReviews		
loadReviews	@	admin-reviews.js:52
loadReviewsPage	@	admin-main.js:302
navigateToPage	@	admin-main.js:165
(anonymous)	@	admin-main.js:42
﻿


﻿
日志7：
admin-api.js:589 
 GET https://workers.liubaotea.online/api/admin/statistics/product-sales?startDate=2025-04-04&endDate=2025-05-04 404 (Not Found)
getProductSalesDistribution	@	admin-api.js:589
refreshStatisticsData	@	admin-statistics.js:51
await in refreshStatisticsData		
initStatisticsPage	@	admin-statistics.js:24
(anonymous)	@	admin-main.js:314
Promise.then		
loadStatisticsPage	@	admin-main.js:311
navigateToPage	@	admin-main.js:168
(anonymous)	@	admin-main.js:42

admin-api.js:603 获取商品销售占比数据出错: Error: 获取商品销售占比数据失败
    at Object.getProductSalesDistribution (admin-api.js:598:23)
    at async refreshStatisticsData (admin-statistics.js:51:34)
    at async initStatisticsPage (admin-statistics.js:24:9)
getProductSalesDistribution	@	admin-api.js:603
await in getProductSalesDistribution		
refreshStatisticsData	@	admin-statistics.js:51
await in refreshStatisticsData		
initStatisticsPage	@	admin-statistics.js:24
(anonymous)	@	admin-main.js:314
Promise.then		
loadStatisticsPage	@	admin-main.js:311
navigateToPage	@	admin-main.js:168
(anonymous)	@	admin-main.js:42
admin-statistics.js:66 刷新统计数据失败: TypeError: window.productSalesChart.destroy is not a function
    at renderProductSalesChart (admin-statistics.js:143:34)
    at refreshStatisticsData (admin-statistics.js:52:9)
    at async initStatisticsPage (admin-statistics.js:24:9)
refreshStatisticsData	@	admin-statistics.js:66
await in refreshStatisticsData		
initStatisticsPage	@	admin-statistics.js:24
(anonymous)	@	admin-main.js:314
Promise.then		
loadStatisticsPage	@	admin-main.js:311
navigateToPage	@	admin-main.js:168
(anonymous)	@	admin-main.js:42
﻿


﻿
日志8：
admin-api.js:420 
 GET https://workers.liubaotea.online/api/admin/settings 404 (Not Found)
getSystemSettings	@	admin-api.js:420
refreshSettingsData	@	admin-settings.js:32
initSettingsPage	@	admin-settings.js:13
(anonymous)	@	admin-main.js:336
Promise.then		
loadSettingsPage	@	admin-main.js:333
navigateToPage	@	admin-main.js:171
(anonymous)	@	admin-main.js:42

admin-api.js:434 获取系统设置出错: Error: 获取系统设置失败
    at Object.getSystemSettings (admin-api.js:429:23)
    at async refreshSettingsData (admin-settings.js:32:26)
    at async initSettingsPage (admin-settings.js:13:9)
getSystemSettings	@	admin-api.js:434
await in getSystemSettings		
refreshSettingsData	@	admin-settings.js:32
initSettingsPage	@	admin-settings.js:13
(anonymous)	@	admin-main.js:336
Promise.then		
loadSettingsPage	@	admin-main.js:333
navigateToPage	@	admin-main.js:171
(anonymous)	@	admin-main.js:42
﻿


﻿

