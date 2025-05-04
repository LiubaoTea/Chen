日志1：admin-api.js:369 
 GET https://workers.liubaotea.online/api/admin/categories/distribution 500 (Internal Server Error)
getCategoryDistribution	@	admin-api.js:369
loadDashboardData	@	admin-dashboard.js:29
await in loadDashboardData		
(anonymous)	@	admin-main.js:21

admin-api.js:383 获取分类占比数据出错: Error: 获取分类占比数据失败
    at Object.getCategoryDistribution (admin-api.js:378:23)
    at async loadDashboardData (admin-dashboard.js:29:38)
getCategoryDistribution	@	admin-api.js:383
await in getCategoryDistribution		
loadDashboardData	@	admin-dashboard.js:29
await in loadDashboardData		
(anonymous)	@	admin-main.js:21
admin-dashboard.js:32 加载仪表盘数据失败: Error: 获取分类占比数据失败
    at Object.getCategoryDistribution (admin-api.js:378:23)
    at async loadDashboardData (admin-dashboard.js:29:38)
loadDashboardData	@	admin-dashboard.js:32
await in loadDashboardData		
(anonymous)
日志2：
admin-products.js:50 加载商品分类失败: TypeError: adminAPI.getCategories is not a function
    at loadCategories (admin-products.js:36:43)
    at Object.initProductsPage [as init] (admin-products.js:20:15)
    at loadProductsPage (admin-main.js:230:34)
    at navigateToPage (admin-main.js:153:17)
    at HTMLAnchorElement.<anonymous> (admin-main.js:42:13)
loadCategories	@	admin-products.js:50
initProductsPage	@	admin-products.js:20
loadProductsPage	@	admin-main.js:230
navigateToPage	@	admin-main.js:153
(anonymous)	@	admin-main.js:42

admin-products.js:28 初始化商品管理页面失败: TypeError: adminAPI.getCategories is not a function
    at loadCategories (admin-products.js:36:43)
    at Object.initProductsPage [as init] (admin-products.js:20:15)
    at loadProductsPage (admin-main.js:230:34)
    at navigateToPage (admin-main.js:153:17)
    at HTMLAnchorElement.<anonymous> (admin-main.js:42:13)
initProductsPage	@	admin-products.js:28
await in initProductsPage		
loadProductsPage	@	admin-main.js:230
navigateToPage	@	admin-main.js:153
(anonymous)	@	admin-main.js:42

﻿

日志3：
admin-orders.js:58 加载订单列表失败: TypeError: adminAPI.getOrders is not a function
    at loadOrders (admin-orders.js:48:39)
    at Object.initOrdersPage [as init] (admin-orders.js:27:15)
    at loadOrdersPage (admin-main.js:248:32)
    at navigateToPage (admin-main.js:156:17)
    at HTMLAnchorElement.<anonymous> (admin-main.js:42:13)
loadOrders	@	admin-orders.js:58
initOrdersPage	@	admin-orders.js:27
loadOrdersPage	@	admin-main.js:248
navigateToPage	@	admin-main.js:156
(anonymous)	@	admin-main.js:42

日志4：
admin-users.js:56 加载用户列表失败: ReferenceError: currentPage is not defined
    at loadUsers (admin-users.js:39:21)
    at Object.initUsersPage [as init] (admin-users.js:26:15)
    at loadUsersPage (admin-main.js:266:31)
    at navigateToPage (admin-main.js:159:17)
    at HTMLAnchorElement.<anonymous> (admin-main.js:42:13)
loadUsers	@	admin-users.js:56
initUsersPage	@	admin-users.js:26
loadUsersPage	@	admin-main.js:266
navigateToPage	@	admin-main.js:159
(anonymous)	@	admin-main.js:42

﻿
日志5：
admin-categories.js:59 加载分类列表失败: TypeError: adminAPI.getCategories is not a function
    at loadCategories (admin-categories.js:49:39)
    at loadCategoriesPage (admin-main.js:284:13)
    at navigateToPage (admin-main.js:162:17)
    at HTMLAnchorElement.<anonymous> (admin-main.js:42:13)
loadCategories	@	admin-categories.js:59
loadCategoriesPage	@	admin-main.js:284
navigateToPage	@	admin-main.js:162
(anonymous)	@	admin-main.js:42

﻿

日志6：
admin-reviews.js:60 加载评价列表失败: TypeError: adminAPI.getReviews is not a function
    at loadReviews (admin-reviews.js:50:39)
    at loadReviewsPage (admin-main.js:302:13)
    at navigateToPage (admin-main.js:165:17)
    at HTMLAnchorElement.<anonymous> (admin-main.js:42:13)
loadReviews	@	admin-reviews.js:60
loadReviewsPage	@	admin-main.js:302
navigateToPage	@	admin-main.js:165
(anonymous)	@	admin-main.js:42
日志7：
admin-statistics.js:61 刷新统计数据失败: TypeError: window.salesTrendChart.destroy is not a function
    at renderSalesTrendChart (admin-statistics.js:88:32)
    at refreshStatisticsData (admin-statistics.js:43:9)
    at async initStatisticsPage (admin-statistics.js:24:9)
refreshStatisticsData	@	admin-statistics.js:61
await in refreshStatisticsData		
initStatisticsPage	@	admin-statistics.js:24
(anonymous)	@	admin-main.js:314
Promise.then		
loadStatisticsPage	@	admin-main.js:311
navigateToPage	@	admin-main.js:168
(anonymous)	@	admin-main.js:42

﻿
日志8：
admin-api.js:25 
 GET https://workers.liubaotea.online/api/admin/settings 404 (Not Found)
getSystemSettings	@	admin-api.js:25
refreshSettingsData	@	admin-settings.js:27
initSettingsPage	@	admin-settings.js:13
(anonymous)	@	admin-main.js:336
Promise.then		
loadSettingsPage	@	admin-main.js:333
navigateToPage	@	admin-main.js:171
(anonymous)	@	admin-main.js:42

admin-api.js:39 获取系统设置出错: Error: 获取系统设置失败
    at Object.getSystemSettings (admin-api.js:34:23)
    at async refreshSettingsData (admin-settings.js:27:26)
    at async initSettingsPage (admin-settings.js:13:9)
getSystemSettings	@	admin-api.js:39
await in getSystemSettings		
refreshSettingsData	@	admin-settings.js:27
initSettingsPage	@	admin-settings.js:13
(anonymous)	@	admin-main.js:336
Promise.then		
loadSettingsPage	@	admin-main.js:333
navigateToPage	@	admin-main.js:171
(anonymous)	@	admin-main.js:42
﻿

