/**
 * 管理后台主要功能
 * 处理页面导航和初始化
 */

// 导入adminAuth模块和API配置
import { adminAuth } from './admin-auth.js';
import { API_BASE_URL } from '../config.js';
import { ADMIN_API_BASE_URL } from './admin-config.js';
import adminAPI from './admin-api.js';

// 确保全局可访问的配置和API
window.API_BASE_URL = API_BASE_URL;
window.ADMIN_API_BASE_URL = ADMIN_API_BASE_URL;
window.adminAPI = adminAPI;

// 确保API配置可用
console.log('admin-main.js中的API配置:', { API_BASE_URL, ADMIN_API_BASE_URL });

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    // 初始化管理员认证
    const isLoggedIn = adminAuth.init();
    
    if (!isLoggedIn) {
        // 显示登录模态框
        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        loginModal.show();
    } else {
        // 已登录，加载仪表盘数据
        // 检查window.loadDashboardData是否可用，如果不可用则使用本地函数
        if (typeof window.loadDashboardData === 'function') {
            window.loadDashboardData();
        } else {
            console.warn('全局loadDashboardData函数未找到，尝试使用本地函数');
            loadDashboardData();
        }
    }
    
    // 设置事件监听器
    setupEventListeners();
    
    // 预加载页面模板
    preloadPageTemplates();
});

// 设置事件监听器
function setupEventListeners() {
    // 导航菜单点击事件
    document.querySelectorAll('.nav-link[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // 检查是否已登录
            if (!adminAuth.check()) return;
            
            const targetPage = e.currentTarget.getAttribute('data-page');
            navigateToPage(targetPage);
        });
    });
    
    // 登录表单提交
    document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('adminUsername').value;
        const password = document.getElementById('adminPassword').value;
        const loginError = document.getElementById('loginError');
        
        try {
            loginError.classList.add('d-none');
            await adminAuth.login(username, password);
            
            // 关闭登录模态框
            const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            loginModal.hide();
            
            // 加载仪表盘数据
            if (typeof window.loadDashboardData === 'function') {
                window.loadDashboardData();
            } else {
                console.warn('全局loadDashboardData函数未找到，尝试使用本地函数');
                loadDashboardData();
            }
        } catch (error) {
            loginError.textContent = error.message || '登录失败，请检查用户名和密码';
            loginError.classList.remove('d-none');
        }
    });
    
    // 退出登录按钮
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        adminAuth.logout();
    });
    
    // 下拉菜单中的退出登录
    document.getElementById('dropdownLogout').addEventListener('click', (e) => {
        e.preventDefault();
        adminAuth.logout();
    });
}

// 页面导航
function navigateToPage(pageName) {
    // 更新活动导航项
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('data-page') === pageName) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // 更新页面标题
    const pageTitle = document.getElementById('pageTitle');
    switch (pageName) {
        case 'dashboard':
            pageTitle.textContent = '仪表盘';
            break;
        case 'products':
            pageTitle.textContent = '商品管理';
            break;
        case 'orders':
            pageTitle.textContent = '订单管理';
            break;
        case 'users':
            pageTitle.textContent = '用户管理';
            break;
        case 'categories':
            pageTitle.textContent = '分类管理';
            break;
        case 'reviews':
            pageTitle.textContent = '评价管理';
            break;
        case 'statistics':
            pageTitle.textContent = '数据统计';
            break;
        case 'settings':
            pageTitle.textContent = '系统设置';
            break;
        case 'profile':
            pageTitle.textContent = '个人资料';
            break;
        case 'statistics':
            pageTitle.textContent = '数据统计';
            break;
        case 'settings':
            pageTitle.textContent = '系统设置';
            break;
        case 'profile':
            pageTitle.textContent = '个人资料';
            break;
        default:
            pageTitle.textContent = '仪表盘';
    }
    
    // 隐藏所有页面内容
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // 显示目标页面内容
    const targetSection = document.getElementById(pageName);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // 根据页面类型加载相应数据
        switch (pageName) {
            case 'dashboard':
                loadDashboardData();
                break;
            case 'products':
                loadProductsPage();
                break;
            case 'orders':
                loadOrdersPage();
                break;
            case 'users':
                loadUsersPage();
                break;
            case 'categories':
                loadCategoriesPage();
                break;
            case 'reviews':
                loadReviewsPage();
                break;
            case 'statistics':
                loadStatisticsPage();
                break;
            case 'settings':
                loadSettingsPage();
                break;
            case 'profile':
                loadProfilePage();
                break;
        }
    }
}

// 预加载页面模板
async function preloadPageTemplates() {
    try {
        // 加载商品管理页面
        const productsPage = await fetch('../admin/pages/products.html');
        const productsHtml = await productsPage.text();
        document.getElementById('products').innerHTML = productsHtml;
        
        // 加载订单管理页面
        const ordersPage = await fetch('../admin/pages/orders.html');
        const ordersHtml = await ordersPage.text();
        document.getElementById('orders').innerHTML = ordersHtml;
        
        // 加载用户管理页面
        const usersPage = await fetch('../admin/pages/users.html');
        const usersHtml = await usersPage.text();
        document.getElementById('users').innerHTML = usersHtml;
        
        // 加载分类管理页面
        const categoriesPage = await fetch('../admin/pages/categories.html');
        const categoriesHtml = await categoriesPage.text();
        document.getElementById('categories').innerHTML = categoriesHtml;
        
        // 加载评价管理页面
        const reviewsPage = await fetch('../admin/pages/reviews.html');
        const reviewsHtml = await reviewsPage.text();
        document.getElementById('reviews').innerHTML = reviewsHtml;
    } catch (error) {
        console.error('预加载页面模板失败:', error);
    }
}

// 加载各页面的函数（这些函数将在各自的模块中实现）
function loadProductsPage() {
    // 检查是否已加载产品页面内容
    if (document.getElementById('products').children.length === 0) {
        // 如果未加载，则动态加载产品页面内容
        fetch('../admin/pages/products.html')
            .then(response => response.text())
            .then(html => {
                document.getElementById('products').innerHTML = html;
                // 初始化产品页面功能
                if (window.adminProducts && typeof window.adminProducts.init === 'function') {
                    window.adminProducts.init();
                }
            })
            .catch(error => console.error('加载产品页面失败:', error));
    } else {
        // 如果已加载，则初始化产品页面
        if (window.adminProducts && typeof window.adminProducts.init === 'function') {
            window.adminProducts.init();
        }
    }
}

function loadOrdersPage() {
    if (document.getElementById('orders').children.length === 0) {
        fetch('../admin/pages/orders.html')
            .then(response => response.text())
            .then(html => {
                document.getElementById('orders').innerHTML = html;
                if (window.adminOrders && typeof window.adminOrders.init === 'function') {
                    window.adminOrders.init();
                }
            })
            .catch(error => console.error('加载订单页面失败:', error));
    } else {
        if (window.adminOrders && typeof window.adminOrders.init === 'function') {
            window.adminOrders.init();
        }
    }
}

function loadUsersPage() {
    if (document.getElementById('users').children.length === 0) {
        fetch('../admin/pages/users.html')
            .then(response => response.text())
            .then(html => {
                document.getElementById('users').innerHTML = html;
                if (window.adminUsers && typeof window.adminUsers.init === 'function') {
                    window.adminUsers.init();
                }
            })
            .catch(error => console.error('加载用户页面失败:', error));
    } else {
        if (window.adminUsers && typeof window.adminUsers.init === 'function') {
            window.adminUsers.init();
        }
    }
}

function loadCategoriesPage() {
    if (document.getElementById('categories').children.length === 0) {
        fetch('../admin/pages/categories.html')
            .then(response => response.text())
            .then(html => {
                document.getElementById('categories').innerHTML = html;
                if (typeof initCategoriesPage === 'function') {
                    initCategoriesPage();
                }
            })
            .catch(error => console.error('加载分类页面失败:', error));
    } else {
        if (typeof refreshCategoriesData === 'function') {
            refreshCategoriesData();
        }
    }
}

function loadReviewsPage() {
    if (document.getElementById('reviews').children.length === 0) {
        fetch('../admin/pages/reviews.html')
            .then(response => response.text())
            .then(html => {
                document.getElementById('reviews').innerHTML = html;
                if (typeof initReviewsPage === 'function') {
                    initReviewsPage();
                }
            })
            .catch(error => console.error('加载评价页面失败:', error));
    } else {
        if (typeof refreshReviewsData === 'function') {
            refreshReviewsData();
        }
    }
}

function loadStatisticsPage() {
    if (document.getElementById('statistics').children.length === 0) {
        fetch('../admin/pages/statistics.html')
            .then(response => response.text())
            .then(html => {
                document.getElementById('statistics').innerHTML = html;
                if (window.initStatisticsPage && typeof window.initStatisticsPage === 'function') {
                    window.initStatisticsPage();
                } else {
                    console.error('统计页面初始化函数未找到');
                }
            })
            .catch(error => console.error('加载统计页面失败:', error));
    } else {
        if (window.refreshStatisticsData && typeof window.refreshStatisticsData === 'function') {
            window.refreshStatisticsData();
        } else {
            console.error('统计数据刷新函数未找到');
        }
    }
}

function loadSettingsPage() {
    if (document.getElementById('settings').children.length === 0) {
        fetch('../admin/pages/settings.html')
            .then(response => response.text())
            .then(html => {
                document.getElementById('settings').innerHTML = html;
                if (window.initSettingsPage && typeof window.initSettingsPage === 'function') {
                    window.initSettingsPage();
                } else {
                    console.error('设置页面初始化函数未找到');
                }
            })
            .catch(error => console.error('加载设置页面失败:', error));
    } else {
        if (window.refreshSettingsData && typeof window.refreshSettingsData === 'function') {
            window.refreshSettingsData();
        } else {
            console.error('设置数据刷新函数未找到');
        }
    }
}

function loadProfilePage() {
    if (document.getElementById('profile').children.length === 0) {
        fetch('../admin/pages/profile.html')
            .then(response => response.text())
            .then(html => {
                document.getElementById('profile').innerHTML = html;
                if (typeof initProfilePage === 'function') {
                    initProfilePage();
                }
            })
            .catch(error => console.error('加载个人资料页面失败:', error));
    } else {
        if (typeof refreshProfileData === 'function') {
            refreshProfileData();
        }
    }
}

// 本地实现的仪表盘数据加载函数
// 当admin-dashboard.js中的全局函数未加载时使用
async function loadDashboardData() {
    // 检查是否已登录
    if (!adminAuth.check()) return;
    
    try {
        console.log('使用admin-main.js中的本地loadDashboardData函数');
        
        // 检查adminAPI是否可用
        if (!adminAPI) {
            console.error('adminAPI未定义，无法加载仪表盘数据');
            return;
        }
        
        // 获取仪表盘统计数据
        const statsData = await adminAPI.getDashboardStats();
        console.log('仪表盘统计数据:', statsData);
        
        // 更新仪表盘UI
        updateDashboardStats(statsData);
        
        // 获取最近订单
        try {
            const recentOrders = await adminAPI.getRecentOrders(5);
            updateRecentOrders(recentOrders);
        } catch (orderError) {
            console.error('获取最近订单失败:', orderError);
        }
        
        // 获取热销商品
        try {
            const topProducts = await adminAPI.getTopProducts(5);
            updateTopProducts(topProducts);
        } catch (productError) {
            console.error('获取热销商品失败:', productError);
        }
        
        // 获取销售趋势数据
        try {
            const salesTrend = await adminAPI.getSalesTrend('month');
            renderSalesChart(salesTrend);
        } catch (trendError) {
            console.error('获取销售趋势数据失败:', trendError);
        }
        
        // 获取分类占比数据
        try {
            const categoryDistribution = await adminAPI.getCategoryDistribution();
            renderCategoryChart(categoryDistribution);
        } catch (categoryError) {
            console.error('获取分类占比数据失败:', categoryError);
        }
    } catch (error) {
        console.error('加载仪表盘数据失败:', error);
    }
}

// 更新仪表盘统计数据
function updateDashboardStats(data) {
    // 更新总订单数
    const totalOrdersEl = document.getElementById('totalOrders');
    if (totalOrdersEl) totalOrdersEl.textContent = data.totalOrders.toLocaleString();
    
    // 更新总销售额
    const totalSalesEl = document.getElementById('totalSales');
    if (totalSalesEl) totalSalesEl.textContent = `¥${data.totalSales.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    // 更新用户总数
    const totalUsersEl = document.getElementById('totalUsers');
    if (totalUsersEl) totalUsersEl.textContent = data.totalUsers.toLocaleString();
    
    // 更新商品总数
    const totalProductsEl = document.getElementById('totalProducts');
    if (totalProductsEl) totalProductsEl.textContent = data.totalProducts.toLocaleString();
}

// 更新最近订单列表
function updateRecentOrders(orders) {
    const recentOrdersList = document.getElementById('recentOrdersList');
    if (!recentOrdersList) return;
    
    recentOrdersList.innerHTML = '';
    
    if (orders.length === 0) {
        recentOrdersList.innerHTML = '<tr><td colspan="5" class="text-center">暂无订单数据</td></tr>';
        return;
    }
    
    orders.forEach(order => {
        // 格式化日期
        const orderDate = new Date(order.created_at * 1000).toLocaleDateString('zh-CN');
        
        // 创建状态标签
        const statusClass = getOrderStatusClass(order.status);
        const statusText = getOrderStatusText(order.status);
        
        // 创建行
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.order_id.substring(0, 8)}...</td>
            <td>${order.username || '未知用户'}</td>
            <td>¥${order.total_amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>${orderDate}</td>
        `;
        
        recentOrdersList.appendChild(row);
    });
}

// 获取订单状态样式类
function getOrderStatusClass(status) {
    switch (status) {
        case 'pending': return 'status-pending';
        case 'paid': return 'status-paid';
        case 'shipped': return 'status-shipped';
        case 'delivered': return 'status-delivered';
        case 'cancelled': return 'status-cancelled';
        default: return 'status-pending';
    }
}

// 获取订单状态文本
function getOrderStatusText(status) {
    switch (status) {
        case 'pending': return '待付款';
        case 'paid': return '已付款';
        case 'shipped': return '已发货';
        case 'delivered': return '已送达';
        case 'cancelled': return '已取消';
        default: return '待处理';
    }
}

// 更新热销商品列表
function updateTopProducts(products) {
    const topProductsList = document.getElementById('topProductsList');
    if (!topProductsList) return;
    
    topProductsList.innerHTML = '';
    
    if (products.length === 0) {
        topProductsList.innerHTML = '<tr><td colspan="4" class="text-center">暂无商品数据</td></tr>';
        return;
    }
    
    products.forEach(product => {
        const row = document.createElement('tr');
        // 确保sales_count和stock/inventory属性存在
        const salesCount = product.sales_count || 0;
        const stockCount = product.stock || product.inventory || 0;
        
        row.innerHTML = `
            <td>
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-id">ID: ${product.product_id}</div>
                </div>
            </td>
            <td>¥${product.price.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>${salesCount}</td>
            <td>${stockCount}</td>
        `;
        
        topProductsList.appendChild(row);
    });
}

// 渲染销售趋势图表
function renderSalesChart(data) {
    const salesChartCanvas = document.getElementById('salesChart');
    if (!salesChartCanvas) return;
    
    // 检查Chart对象是否可用
    if (typeof Chart === 'undefined') {
        console.error('Chart对象未定义，请确保Chart.js已正确加载');
        return;
    }
    
    // 检查是否已存在Chart实例并正确销毁
    try {
        if (window.salesChart) {
            if (typeof window.salesChart.destroy === 'function') {
                window.salesChart.destroy();
            } else {
                window.salesChart = null;
            }
        }
    } catch (error) {
        console.error('销毁旧图表时出错:', error);
        window.salesChart = null;
    }
    
    // 检查数据格式，兼容两种格式：数组格式和{labels,sales,orders}格式
    let labels, salesData, ordersData;
    
    if (Array.isArray(data)) {
        // 数组格式
        labels = data.map(item => item.time_period);
        salesData = data.map(item => item.sales_amount);
        ordersData = data.map(item => item.orders_count);
    } else if (data && data.labels && data.sales && data.orders) {
        // 对象格式
        labels = data.labels;
        salesData = data.sales;
        ordersData = data.orders;
    } else {
        console.error('销售趋势数据格式不正确:', data);
        return;
    }
    
    // 创建图表
    window.salesChart = new Chart(salesChartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '销售额',
                    data: salesData,
                    borderColor: '#4e73df',
                    backgroundColor: 'rgba(78, 115, 223, 0.05)',
                    pointRadius: 3,
                    pointBackgroundColor: '#4e73df',
                    pointBorderColor: '#4e73df',
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: '#4e73df',
                    pointHoverBorderColor: '#4e73df',
                    pointHitRadius: 10,
                    pointBorderWidth: 2,
                    fill: true
                },
                {
                    label: '订单数',
                    data: ordersData,
                    borderColor: '#1cc88a',
                    backgroundColor: 'rgba(28, 200, 138, 0.05)',
                    pointRadius: 3,
                    pointBackgroundColor: '#1cc88a',
                    pointBorderColor: '#1cc88a',
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: '#1cc88a',
                    pointHoverBorderColor: '#1cc88a',
                    pointHitRadius: 10,
                    pointBorderWidth: 2,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    ticks: {
                        callback: function(value) {
                            return '¥' + value.toLocaleString();
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });
}

// 渲染分类占比图表
function renderCategoryChart(data) {
    const categoryChartCanvas = document.getElementById('categoryChart');
    if (!categoryChartCanvas) return;
    
    // 检查是否已存在Chart实例
    if (window.categoryChart) {
        window.categoryChart.destroy();
    }
    
    // 检查数据格式，确保数据是数组
    if (!Array.isArray(data)) {
        console.error('分类占比数据格式不正确:', data);
        return;
    }
    
    // 准备图表数据
    const labels = data.map(item => item.category_name || item.name);
    const values = data.map(item => item.product_count || item.count);
    const backgroundColors = [
        '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b',
        '#5a5c69', '#858796', '#6610f2', '#fd7e14', '#20c9a6'
    ];
    
    // 创建图表
    window.categoryChart = new Chart(categoryChartCanvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: backgroundColors.slice(0, data.length),
                hoverBackgroundColor: backgroundColors.slice(0, data.length),
                hoverBorderColor: 'rgba(234, 236, 244, 1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const dataset = context.dataset;
                            const total = dataset.data.reduce((acc, data) => acc + data, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '70%'
        }
    });
}