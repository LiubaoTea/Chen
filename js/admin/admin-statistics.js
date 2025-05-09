/**
 * 管理后台数据统计模块
 * 处理统计数据的加载和图表展示
 */

// 导入adminAuth模块和API配置
import { adminAuth } from './admin-auth.js';
import adminAPI, { API_BASE_URL, ADMIN_API_BASE_URL } from './admin-api.js';

// 确保API配置可用
console.log('admin-statistics.js中的API配置:', { API_BASE_URL, ADMIN_API_BASE_URL });
console.log('admin-statistics.js中的adminAPI:', adminAPI);

// 初始化统计页面
async function initStatisticsPage() {
    // 检查是否已登录
    if (!adminAuth.check()) return;
    
    try {
        // 设置默认日期范围（最近30天）
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        document.getElementById('statisticsStartDate').valueAsDate = startDate;
        document.getElementById('statisticsEndDate').valueAsDate = endDate;
        
        // 加载统计数据
        await refreshStatisticsData();
        
        // 设置事件监听器
        setupStatisticsEventListeners();
    } catch (error) {
        console.error('初始化统计页面失败:', error);
        showErrorToast('初始化统计页面失败，请稍后重试');
    }
}

// 导出为全局变量，供其他模块使用
window.initStatisticsPage = initStatisticsPage;
window.refreshStatisticsData = refreshStatisticsData;
window.adminStatistics = { init: initStatisticsPage, refresh: refreshStatisticsData };

// 刷新统计数据
async function refreshStatisticsData() {
    try {
        const period = document.getElementById('statisticsPeriodSelect').value;
        const startDate = document.getElementById('statisticsStartDate').value;
        const endDate = document.getElementById('statisticsEndDate').value;
        
        // 获取销售趋势数据
        const salesTrendData = await adminAPI.getSalesTrend(period, startDate, endDate);
        renderSalesTrendChart(salesTrendData);
        
        // 获取商品销售占比数据
        const productSalesData = await adminAPI.getProductSalesDistribution(startDate, endDate);
        renderProductSalesChart(productSalesData);
        
        // 获取用户增长趋势数据
        const userGrowthData = await adminAPI.getUserGrowthTrend(period, startDate, endDate);
        renderUserGrowthChart(userGrowthData);
        
        // 获取订单状态分布数据
        const orderStatusData = await adminAPI.getOrderStatusDistribution(startDate, endDate);
        renderOrderStatusChart(orderStatusData);
        
        // 获取热销商品排行数据
        const topProductsData = await adminAPI.getTopProducts(10, startDate, endDate);
        renderTopProductsList(topProductsData);
    } catch (error) {
        console.error('刷新统计数据失败:', error);
        showErrorToast('刷新统计数据失败，请稍后重试');
    }
}

// 设置统计页面事件监听器
function setupStatisticsEventListeners() {
    // 刷新按钮点击事件
    document.getElementById('refreshStatisticsBtn').addEventListener('click', refreshStatisticsData);
    
    // 导出按钮点击事件
    document.getElementById('exportStatisticsBtn').addEventListener('click', exportStatisticsReport);
    
    // 统计周期变更事件
    document.getElementById('statisticsPeriodSelect').addEventListener('change', refreshStatisticsData);
    
    // 日期范围变更事件
    document.getElementById('statisticsStartDate').addEventListener('change', refreshStatisticsData);
    document.getElementById('statisticsEndDate').addEventListener('change', refreshStatisticsData);
}

// 渲染销售趋势图表
function renderSalesTrendChart(data) {
    const ctx = document.getElementById('salesTrendChart').getContext('2d');
    
    // 检查图表元素是否存在
    if (!ctx) {
        console.error('销售趋势图表元素不存在');
        return;
    }
    
    // 如果图表已存在，先尝试销毁它
    try {
        if (window.salesTrendChart) {
            if (typeof window.salesTrendChart.destroy === 'function') {
                window.salesTrendChart.destroy();
            } else {
                // 如果destroy不是函数，则重置为null
                window.salesTrendChart = null;
            }
        }
    } catch (error) {
        console.error('销毁旧图表时出错:', error);
        window.salesTrendChart = null;
    }
    
    // 创建新图表
    try {
        window.salesTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: '销售额',
                    data: data.values,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    } catch (error) {
        console.error('创建销售趋势图表时出错:', error);
    }
}

// 渲染商品销售占比图表
function renderProductSalesChart(data) {
    const ctx = document.getElementById('productSalesChart').getContext('2d');
    
    // 如果图表已存在，销毁它
    try {
        if (window.productSalesChart) {
            if (typeof window.productSalesChart.destroy === 'function') {
                window.productSalesChart.destroy();
            } else {
                // 如果destroy不是函数，则重置为null
                window.productSalesChart = null;
            }
        }
    } catch (error) {
        console.error('销毁商品销售占比图表时出错:', error);
        window.productSalesChart = null;
    }
    
    // 创建新图表
    window.productSalesChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)',
                    'rgba(255, 159, 64, 0.7)',
                    'rgba(199, 199, 199, 0.7)',
                    'rgba(83, 102, 255, 0.7)',
                    'rgba(40, 159, 64, 0.7)',
                    'rgba(210, 199, 199, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)',
                    'rgba(199, 199, 199, 1)',
                    'rgba(83, 102, 255, 1)',
                    'rgba(40, 159, 64, 1)',
                    'rgba(210, 199, 199, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            const percentage = context.parsed;
                            return label + ': ¥' + value.toLocaleString('zh-CN') + ' (' + percentage.toFixed(2) + '%)';
                        }
                    }
                }
            }
        }
    });
}

// 渲染用户增长趋势图表
function renderUserGrowthChart(data) {
    const ctx = document.getElementById('userGrowthChart').getContext('2d');
    
    // 如果图表已存在，销毁它
    try {
        if (window.userGrowthChart) {
            if (typeof window.userGrowthChart.destroy === 'function') {
                window.userGrowthChart.destroy();
            } else {
                // 如果destroy不是函数，则重置为null
                window.userGrowthChart = null;
            }
        }
    } catch (error) {
        console.error('销毁用户增长趋势图表时出错:', error);
        window.userGrowthChart = null;
    }
    
    // 创建新图表
    window.userGrowthChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: '新增用户',
                data: data.values,
                backgroundColor: 'rgba(75, 192, 192, 0.7)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

// 渲染订单状态分布图表
function renderOrderStatusChart(data) {
    const ctx = document.getElementById('orderStatusChart').getContext('2d');
    
    // 如果图表已存在，销毁它
    try {
        if (window.orderStatusChart) {
            if (typeof window.orderStatusChart.destroy === 'function') {
                window.orderStatusChart.destroy();
            } else {
                // 如果destroy不是函数，则重置为null
                window.orderStatusChart = null;
            }
        }
    } catch (error) {
        console.error('销毁订单状态分布图表时出错:', error);
        window.orderStatusChart = null;
    }
    
    // 创建新图表
    window.orderStatusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: [
                    'rgba(255, 206, 86, 0.7)',  // 待付款
                    'rgba(54, 162, 235, 0.7)',  // 待发货
                    'rgba(75, 192, 192, 0.7)',  // 已发货
                    'rgba(153, 102, 255, 0.7)', // 已完成
                    'rgba(255, 99, 132, 0.7)'   // 已取消
                ],
                borderColor: [
                    'rgba(255, 206, 86, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 99, 132, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// 渲染热销商品排行列表
function renderTopProductsList(products) {
    const topProductsList = document.getElementById('topProductsList');
    topProductsList.innerHTML = '';
    
    // 计算总销售额
    const totalSales = products.reduce((sum, product) => sum + product.totalSales, 0);
    
    // 添加商品行
    products.forEach((product, index) => {
        const percentage = (product.totalSales / totalSales * 100).toFixed(2);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>
                <div class="d-flex align-items-center">
                    <img src="${product.image || '../image/Goods/Goods_1.png'}" alt="${product.name}" class="me-2" style="width: 40px; height: 40px; object-fit: cover;">
                    <div>
                        <div class="fw-bold">${product.name}</div>
                        <small class="text-muted">ID: ${product.id}</small>
                    </div>
                </div>
            </td>
            <td>${product.quantity}</td>
            <td>¥${product.totalSales.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>${percentage}%</td>
        `;
        
        topProductsList.appendChild(row);
    });
}

// 导出统计报表
function exportStatisticsReport() {
    try {
        const period = document.getElementById('statisticsPeriodSelect').value;
        const startDate = document.getElementById('statisticsStartDate').value;
        const endDate = document.getElementById('statisticsEndDate').value;
        
        // 创建CSV内容
        let csvContent = "数据,值\n";
        
        // 添加销售数据
        if (window.salesTrendChart) {
            const data = window.salesTrendChart.data;
            csvContent += "\n销售趋势\n";
            for (let i = 0; i < data.labels.length; i++) {
                csvContent += `${data.labels[i]},${data.datasets[0].data[i]}\n`;
            }
        }
        
        // 添加商品销售占比数据
        if (window.productSalesChart) {
            const data = window.productSalesChart.data;
            csvContent += "\n商品销售占比\n";
            for (let i = 0; i < data.labels.length; i++) {
                csvContent += `${data.labels[i]},${data.datasets[0].data[i]}\n`;
            }
        }
        
        // 添加用户增长数据
        if (window.userGrowthChart) {
            const data = window.userGrowthChart.data;
            csvContent += "\n用户增长趋势\n";
            for (let i = 0; i < data.labels.length; i++) {
                csvContent += `${data.labels[i]},${data.datasets[0].data[i]}\n`;
            }
        }
        
        // 添加订单状态分布数据
        if (window.orderStatusChart) {
            const data = window.orderStatusChart.data;
            csvContent += "\n订单状态分布\n";
            for (let i = 0; i < data.labels.length; i++) {
                csvContent += `${data.labels[i]},${data.datasets[0].data[i]}\n`;
            }
        }
        
        // 创建下载链接
        const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `统计报表_${startDate}_${endDate}.csv`);
        document.body.appendChild(link);
        
        // 触发下载
        link.click();
        document.body.removeChild(link);
        
        showSuccessToast('报表导出成功');
    } catch (error) {
        console.error('导出报表失败:', error);
        showErrorToast('导出报表失败，请稍后重试');
    }
}

// 显示成功提示
function showSuccessToast(message) {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = 'toast align-items-center text-white bg-success border-0';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="bi bi-check-circle me-2"></i>${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // 自动移除
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// 显示错误提示
function showErrorToast(message) {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = 'toast align-items-center text-white bg-danger border-0';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="bi bi-exclamation-triangle me-2"></i>${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // 自动移除
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// 创建Toast容器
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(container);
    return container;
}

// 设置全局函数，供admin-main.js调用
window.initStatisticsPage = initStatisticsPage;
window.refreshStatisticsData = refreshStatisticsData;