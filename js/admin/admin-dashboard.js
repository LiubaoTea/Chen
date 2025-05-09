/**
 * 管理后台仪表盘功能
 * 处理仪表盘数据加载和图表显示
 */

// 导入adminAuth模块和adminAPI
import { adminAuth } from './admin-auth.js';
import adminAPI, { API_BASE_URL, ADMIN_API_BASE_URL } from './admin-api.js';

// 确保API配置可用
console.log('admin-dashboard.js中的API配置:', { API_BASE_URL, ADMIN_API_BASE_URL });

// 加载仪表盘数据
async function loadDashboardData() {
    // 检查是否已登录
    if (!adminAuth.check()) return;
    
    try {
        // 获取仪表盘统计数据
        const statsData = await adminAPI.getDashboardStats();
        updateDashboardStats(statsData);
        
        // 获取最近订单
        const recentOrders = await adminAPI.getRecentOrders(5);
        updateRecentOrders(recentOrders);
        
        // 获取热销商品
        const topProducts = await adminAPI.getTopProducts(5);
        updateTopProducts(topProducts);
        
        // 获取销售趋势数据
        const salesTrend = await adminAPI.getSalesTrend('month');
        renderSalesChart(salesTrend);
        
        // 获取分类占比数据
        const categoryDistribution = await adminAPI.getCategoryDistribution();
        renderCategoryChart(categoryDistribution);
    } catch (error) {
        console.error('加载仪表盘数据失败:', error);
        // 显示错误提示
        showErrorToast('加载仪表盘数据失败，请稍后重试');
    }
}

// 导出为全局变量，供其他模块使用
window.loadDashboardData = loadDashboardData;
window.adminDashboard = { init: loadDashboardData, refresh: loadDashboardData };

// 更新仪表盘统计数据
function updateDashboardStats(data) {
    // 更新总订单数
    document.getElementById('totalOrders').textContent = data.totalOrders.toLocaleString();
    
    // 更新总销售额
    document.getElementById('totalSales').textContent = `¥${data.totalSales.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    // 更新用户总数
    document.getElementById('totalUsers').textContent = data.totalUsers.toLocaleString();
    
    // 更新商品总数
    document.getElementById('totalProducts').textContent = data.totalProducts.toLocaleString();
}

// 更新最近订单列表
function updateRecentOrders(orders) {
    const recentOrdersList = document.getElementById('recentOrdersList');
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
            <td>${order.username}</td>
            <td>¥${order.total_amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>${orderDate}</td>
        `;
        
        recentOrdersList.appendChild(row);
    });
}

// 更新热销商品列表
function updateTopProducts(products) {
    const topProductsList = document.getElementById('topProductsList');
    topProductsList.innerHTML = '';
    
    if (products.length === 0) {
        topProductsList.innerHTML = '<tr><td colspan="4" class="text-center">暂无商品数据</td></tr>';
        return;
    }
    
    products.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.name}</td>
            <td>¥${product.price.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>${product.sales_count}</td>
            <td>${product.stock}</td>
        `;
        
        topProductsList.appendChild(row);
    });
}

// 渲染销售趋势图表
function renderSalesChart(data) {
    const ctx = document.getElementById('salesChart').getContext('2d');
    
    // 销毁现有图表（如果存在）
    if (window.salesChart instanceof Chart) {
        window.salesChart.destroy();
    }
    
    // 创建新图表
    window.salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: '销售额',
                data: data.sales,
                backgroundColor: 'rgba(78, 115, 223, 0.05)',
                borderColor: 'rgba(78, 115, 223, 1)',
                pointRadius: 3,
                pointBackgroundColor: 'rgba(78, 115, 223, 1)',
                pointBorderColor: 'rgba(78, 115, 223, 1)',
                pointHoverRadius: 5,
                pointHoverBackgroundColor: 'rgba(78, 115, 223, 1)',
                pointHoverBorderColor: 'rgba(78, 115, 223, 1)',
                pointHitRadius: 10,
                pointBorderWidth: 2,
                fill: true
            }, {
                label: '订单数',
                data: data.orders,
                backgroundColor: 'rgba(28, 200, 138, 0.05)',
                borderColor: 'rgba(28, 200, 138, 1)',
                pointRadius: 3,
                pointBackgroundColor: 'rgba(28, 200, 138, 1)',
                pointBorderColor: 'rgba(28, 200, 138, 1)',
                pointHoverRadius: 5,
                pointHoverBackgroundColor: 'rgba(28, 200, 138, 1)',
                pointHoverBorderColor: 'rgba(28, 200, 138, 1)',
                pointHitRadius: 10,
                pointBorderWidth: 2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        maxTicksLimit: 7
                    }
                },
                y: {
                    ticks: {
                        maxTicksLimit: 5,
                        padding: 10,
                        callback: function(value) {
                            return '¥' + value.toLocaleString();
                        }
                    },
                    grid: {
                        color: 'rgb(234, 236, 244)',
                        drawBorder: false,
                        borderDash: [2],
                        zeroLineBorderDash: [2]
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    backgroundColor: 'rgb(255, 255, 255)',
                    bodyColor: '#858796',
                    titleColor: '#6e707e',
                    titleMarginBottom: 10,
                    borderColor: '#dddfeb',
                    borderWidth: 1,
                    padding: 15,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            return label + ': ¥' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// 渲染分类占比图表
function renderCategoryChart(data) {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    
    // 销毁现有图表（如果存在）
    if (window.categoryChart instanceof Chart) {
        window.categoryChart.destroy();
    }
    
    // 创建新图表
    window.categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: [
                    '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b',
                    '#5a5c69', '#6f42c1', '#fd7e14', '#20c9a6', '#858796'
                ],
                hoverBackgroundColor: [
                    '#2e59d9', '#17a673', '#2c9faf', '#dda20a', '#be2617',
                    '#3a3b45', '#4e2c94', '#ca6510', '#13855c', '#60616f'
                ],
                hoverBorderColor: 'rgba(234, 236, 244, 1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgb(255, 255, 255)',
                    bodyColor: '#858796',
                    borderColor: '#dddfeb',
                    borderWidth: 1,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((acc, data) => acc + data, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${percentage}%`;
                        }
                    }
                }
            },
            cutout: '70%'
        }
    });
}

// 获取订单状态对应的CSS类
function getOrderStatusClass(status) {
    switch (status) {
        case 'pending':
            return 'status-pending';
        case 'paid':
            return 'status-paid';
        case 'shipped':
            return 'status-shipped';
        case 'delivered':
            return 'status-delivered';
        case 'cancelled':
            return 'status-cancelled';
        default:
            return 'status-pending';
    }
}

// 获取订单状态对应的文本
function getOrderStatusText(status) {
    switch (status) {
        case 'pending':
            return '待付款';
        case 'paid':
            return '已付款';
        case 'shipped':
            return '已发货';
        case 'delivered':
            return '已送达';
        case 'cancelled':
            return '已取消';
        default:
            return '未知状态';
    }
}

// 显示错误提示
function showErrorToast(message) {
    // 创建提示元素
    const toastContainer = document.createElement('div');
    toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
    toastContainer.style.zIndex = '5';
    
    const toastElement = document.createElement('div');
    toastElement.className = 'toast align-items-center text-white bg-danger border-0';
    toastElement.setAttribute('role', 'alert');
    toastElement.setAttribute('aria-live', 'assertive');
    toastElement.setAttribute('aria-atomic', 'true');
    
    const toastBody = document.createElement('div');
    toastBody.className = 'd-flex';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'toast-body';
    messageDiv.textContent = message;
    
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn-close btn-close-white me-2 m-auto';
    closeButton.setAttribute('data-bs-dismiss', 'toast');
    closeButton.setAttribute('aria-label', '关闭');
    
    toastBody.appendChild(messageDiv);
    toastBody.appendChild(closeButton);
    toastElement.appendChild(toastBody);
    toastContainer.appendChild(toastElement);
    
    document.body.appendChild(toastContainer);
    
    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    toast.show();
    
    // 提示关闭后移除元素
    toastElement.addEventListener('hidden.bs.toast', () => {
        document.body.removeChild(toastContainer);
    });
}

// 设置全局函数，供admin-main.js调用
window.loadDashboardData = loadDashboardData;