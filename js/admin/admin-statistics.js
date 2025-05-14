/**
 * 管理后台数据统计模块
 * 处理统计数据的加载和图表展示
 */

// 导入adminAuth模块和API配置
import { adminAuth } from './admin-auth.js';
import adminAPI, { API_BASE_URL, ADMIN_API_BASE_URL } from './admin-api.js';

// 确保Chart.js全局可用
if (typeof window.Chart === 'undefined' && typeof Chart !== 'undefined') {
    window.Chart = Chart;
}

// 存储图表实例
let salesTrendChart = null;
let productSalesChart = null;
let userGrowthChart = null;
let orderStatusChart = null;

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
        // 显示加载状态
        showLoadingState();
        
        const period = document.getElementById('statisticsPeriodSelect').value;
        const startDate = document.getElementById('statisticsStartDate').value;
        const endDate = document.getElementById('statisticsEndDate').value;
        
        // 获取销售趋势数据
        try {
            const salesTrendData = await adminAPI.getSalesTrend(period, startDate, endDate);
            console.log('获取到销售趋势数据:', salesTrendData);
            renderSalesTrendChart(salesTrendData);
        } catch (error) {
            console.error('获取销售趋势数据失败:', error);
            // 使用默认数据渲染
            renderSalesTrendChart({
                labels: ['无数据'],
                sales: [0],
                orders: [0]
            });
        }
        
        // 获取商品销售占比数据
        try {
            const productSalesData = await adminAPI.getProductSalesDistribution(startDate, endDate);
            console.log('获取到商品销售占比数据:', productSalesData);
            renderProductSalesChart(productSalesData);
        } catch (error) {
            console.error('获取商品销售占比数据失败:', error);
            renderProductSalesChart([{ name: '无数据', value: 1 }]);
        }
        
        // 获取用户增长趋势数据
        try {
            const userGrowthData = await adminAPI.getUserGrowthTrend(period, startDate, endDate);
            console.log('获取到用户增长趋势数据:', userGrowthData);
            renderUserGrowthChart(userGrowthData);
        } catch (error) {
            console.error('获取用户增长趋势数据失败:', error);
            renderUserGrowthChart({ labels: ['无数据'], values: [0] });
        }
        
        // 获取订单状态分布数据
        try {
            const orderStatusData = await adminAPI.getOrderStatusDistribution(startDate, endDate);
            console.log('获取到订单状态分布数据:', orderStatusData);
            renderOrderStatusChart(orderStatusData);
        } catch (error) {
            console.error('获取订单状态分布数据失败:', error);
            renderOrderStatusChart([{ status: '无数据', count: 1 }]);
        }
        
        // 获取热销商品排行数据
        try {
            const topProductsData = await adminAPI.getTopProducts(10, startDate, endDate);
            console.log('获取到热销商品排行数据:', topProductsData);
            renderTopProductsList(topProductsData);
        } catch (error) {
            console.error('获取热销商品排行数据失败:', error);
            renderTopProductsList([]);
        }
        
        // 隐藏加载状态
        hideLoadingState();
    } catch (error) {
        console.error('刷新统计数据失败:', error);
        showErrorToast('刷新统计数据失败，请稍后重试');
        hideLoadingState();
    }
}

// 显示加载状态
function showLoadingState() {
    const chartContainers = document.querySelectorAll('.card-body');
    chartContainers.forEach(container => {
        if (container.querySelector('canvas')) {
            const loadingSpinner = document.createElement('div');
            loadingSpinner.className = 'text-center loading-spinner';
            loadingSpinner.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">加载中...</span></div>';
            
            // 清除现有的加载状态
            const existingSpinner = container.querySelector('.loading-spinner');
            if (existingSpinner) {
                existingSpinner.remove();
            }
            
            container.appendChild(loadingSpinner);
        }
    });
}

// 隐藏加载状态
function hideLoadingState() {
    const loadingSpinners = document.querySelectorAll('.loading-spinner');
    loadingSpinners.forEach(spinner => spinner.remove());
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
    const canvas = document.getElementById('salesTrendChart');
    if (!canvas) {
        console.error('销售趋势图表元素不存在');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // 检查Chart对象是否可用
    if (typeof window.Chart === 'undefined') {
        console.error('Chart对象未定义，请确保Chart.js已正确加载');
        return;
    }
    
    // 销毁现有图表
    if (salesTrendChart instanceof Chart) {
        salesTrendChart.destroy();
    }
    
    // 检查数据格式是否正确
    if (!data || !data.labels || !Array.isArray(data.labels)) {
        console.error('销售趋势数据格式不正确:', data);
        // 创建默认数据
        data = {
            labels: ['无数据'],
            sales: [0],
            orders: [0]
        };
    }
    
    // 确保数据格式一致，支持新的API返回格式
    const labels = Array.isArray(data.labels) ? data.labels : [];
    const values = data.sales || data.values || [];
    const ordersData = data.orders || [];
    
    console.log('销售趋势图表数据:', { labels, values, ordersData });
    
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
    
    // 调整图表容器大小，确保有足够的空间显示
    const chartContainer = document.getElementById('salesTrendChart').parentNode;
    chartContainer.style.height = '300px';
    
    // 调整销售趋势和商品分类占比图表的布局
    const salesTrendCard = document.querySelector('#salesTrendChart').closest('.col-md-6');
    const productSalesCard = document.querySelector('#productSalesChart').closest('.col-md-6');
    
    if (salesTrendCard && productSalesCard) {
        salesTrendCard.className = 'col-md-6 mb-4';
        productSalesCard.className = 'col-md-6 mb-4';
    }
    
    // 创建新图表
    try {
        window.salesTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '销售额',
                        data: values,
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 2,
                        tension: 0.1,
                        yAxisID: 'y'
                    },
                    {
                        label: '订单数',
                        data: ordersData,
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 2,
                        tension: 0.1,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000 // 添加动画效果
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '销售额'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '订单数'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('创建销售趋势图表时出错:', error);
    }
}

// 渲染商品销售占比图表
function renderProductSalesChart(data) {
    const canvas = document.getElementById('productSalesChart');
    if (!canvas) {
        console.error('商品销售占比图表元素不存在');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // 检查Chart对象是否可用
    if (typeof window.Chart === 'undefined') {
        console.error('Chart对象未定义，请确保Chart.js已正确加载');
        return;
    }
    
    // 销毁现有图表
    if (productSalesChart instanceof Chart) {
        productSalesChart.destroy();
    }
    
    // 检查数据格式是否正确
    if (!data || !Array.isArray(data)) {
        console.error('商品销售占比数据格式不正确:', data);
        // 创建默认数据
        data = [{ name: '无数据', value: 1 }];
    }
    
    // 提取标签和值
    const labels = data.map(item => item.name || item.category_name || '未分类');
    const values = data.map(item => item.value || item.product_count || 0);
    
    console.log('商品销售占比图表数据:', { labels, values });
    
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
    try {
        window.productSalesChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
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
                        }}
                    }
                }
            }
        });
    } catch (error) {
        console.error('创建商品销售占比图表时出错:', error);
        window.productSalesChart = null;
    }
}

// 渲染用户增长趋势图表
function renderUserGrowthChart(data) {
    const canvas = document.getElementById('userGrowthChart');
    if (!canvas) {
        console.error('用户增长趋势图表元素不存在');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // 检查Chart对象是否可用
    if (typeof window.Chart === 'undefined') {
        console.error('Chart对象未定义，请确保Chart.js已正确加载');
        return;
    }
    
    // 销毁现有图表
    if (userGrowthChart instanceof Chart) {
        userGrowthChart.destroy();
    }
    
    // 检查数据格式是否正确
    if (!data || !data.labels || !Array.isArray(data.labels) || !data.values || !Array.isArray(data.values)) {
        console.error('用户增长趋势数据格式不正确:', data);
        // 创建默认数据
        data = {
            labels: ['无数据'],
            values: [0]
        };
    }
    
    console.log('用户增长趋势图表数据:', data);
    
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
    
    // 调整图表容器大小，确保有足够的空间显示
    const chartContainer = document.getElementById('userGrowthChart').parentNode;
    chartContainer.style.height = '300px';
    
    // 创建新图表
    try {
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
    } catch (error) {
        console.error('创建用户增长趋势图表时出错:', error);
        window.userGrowthChart = null;
    }
}

// 渲染订单状态分布图表
function renderOrderStatusChart(data) {
    const canvas = document.getElementById('orderStatusChart');
    if (!canvas) {
        console.error('订单状态分布图表元素不存在');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // 检查Chart对象是否可用
    if (typeof window.Chart === 'undefined') {
        console.error('Chart对象未定义，请确保Chart.js已正确加载');
        return;
    }
    
    // 销毁现有图表
    if (orderStatusChart instanceof Chart) {
        orderStatusChart.destroy();
    }
    
    // 检查数据格式是否正确
    if (!data || !Array.isArray(data)) {
        console.error('订单状态分布数据格式不正确:', data);
        // 创建默认数据
        data = [
            { status: '待付款', count: 0 },
            { status: '已付款', count: 0 }
        ];
    }
    
    // 处理数据格式
    const labels = data.map(item => item.status || '未知状态');
    const values = data.map(item => item.count || 0);
    
    console.log('订单状态分布图表数据:', { labels, values });
    
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
    
    // 调整图表容器大小，确保有足够的空间显示
    const chartContainer = document.getElementById('orderStatusChart').parentNode;
    chartContainer.style.height = '300px';
    
    // 创建新图表
    try {
        window.orderStatusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
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
    } catch (error) {
        console.error('创建订单状态分布图表时出错:', error);
    }
}

// 渲染热销商品排行列表
function renderTopProductsList(products) {
    const topProductsList = document.getElementById('topProductsList');
    
    // 检查元素是否存在
    if (!topProductsList) {
        console.error('热销商品列表元素不存在');
        return;
    }
    
    // 检查数据格式是否正确
    if (!products || !Array.isArray(products)) {
        console.error('热销商品数据格式不正确:', products);
        topProductsList.innerHTML = '<tr><td colspan="5" class="text-center">暂无热销商品数据</td></tr>';
        return;
    }
    
    // 清空表格内容
    topProductsList.innerHTML = '';
    
    // 如果没有数据，显示提示信息
    if (products.length === 0) {
        topProductsList.innerHTML = '<tr><td colspan="5" class="text-center">暂无热销商品数据</td></tr>';
        return;
    }
    
    console.log('渲染热销商品列表:', products);
    
    // 确保表格头部存在
    const tableElement = topProductsList.closest('table');
    if (tableElement) {
        const thead = tableElement.querySelector('thead');
        if (!thead || !thead.querySelector('tr')) {
            const newThead = document.createElement('thead');
            newThead.innerHTML = `
                <tr>
                    <th>排名</th>
                    <th>商品信息</th>
                    <th>销售数量</th>
                    <th>销售额</th>
                    <th>占比</th>
                </tr>
            `;
            tableElement.prepend(newThead);
        }
    }
    
    // 计算总销售额
    const totalSales = products.reduce((sum, product) => {
        // 尝试从不同的属性获取销售额
        const sales = product.totalSales || product.sales || product.total_sales || 0;
        return sum + (typeof sales === 'number' ? sales : 0);
    }, 0);
    
    // 添加商品行
    products.forEach((product, index) => {
        // 尝试从不同的属性获取数据
        const productName = product.name || product.product_name || '未知商品';
        const productId = product.id || product.product_id || '未知';
        const productImage = product.image || product.product_image || '../image/Goods/Goods_1.png';
        const productQuantity = product.quantity || product.sales_count || 0;
        const productSales = product.totalSales || product.sales || product.total_sales || 0;
        
        const percentage = totalSales > 0 ? (productSales / totalSales * 100).toFixed(2) : '0.00';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>
                <div class="d-flex align-items-center">
                    <img src="${productImage}" alt="${productName}" class="me-2" style="width: 40px; height: 40px; object-fit: cover;">
                    <div>
                        <div class="fw-bold">${productName}</div>
                        <small class="text-muted">ID: ${productId}</small>
                    </div>
                </div>
            </td>
            <td>${productQuantity}</td>
            <td>¥${typeof productSales === 'number' ? productSales.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
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