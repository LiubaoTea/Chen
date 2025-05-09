/**
 * 管理后台主要功能
 * 处理页面导航和初始化
 */

// 导入adminAuth模块和API配置
import { adminAuth } from './admin-auth.js';
import { API_BASE_URL } from '../config.js';
import { ADMIN_API_BASE_URL } from './admin-config.js';
import adminAPI from './admin-api.js';

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
        // 这里简单实现，完整实现应该在admin-dashboard.js中
        const dashboardEl = document.getElementById('dashboard');
        if (dashboardEl) {
            dashboardEl.innerHTML = '<div class="alert alert-info">仪表盘数据已加载</div>';
        }
    } catch (error) {
        console.error('加载仪表盘数据失败:', error);
    }
}