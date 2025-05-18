/**
 * 管理后台数据统计模块
 * 处理统计数据的加载和图表展示
 */

// 导入adminAuth模块和API配置
import { adminAuth } from './admin-auth.js';
import adminAPI, { API_BASE_URL, ADMIN_API_BASE_URL } from './admin-api.js';

// 确保Chart.js全局可用
function initializeChart() {
    return new Promise((resolve) => {
        // 检查Chart对象是否已经可用
        if (typeof window.Chart !== 'undefined') {
            resolve(window.Chart);
            return;
        }

        // 如果Chart对象不可用，创建并加载Chart.js脚本
        const chartScript = document.createElement('script');
        chartScript.src = 'https://cdn.bootcdn.net/ajax/libs/chart.js/3.9.1/chart.min.js';
        chartScript.onload = () => {
            window.Chart = Chart;
            resolve(window.Chart);
        };
        document.head.appendChild(chartScript);
    });
}

// 确保Chart对象可用的辅助函数
function ensureChartAvailable() {
    if (typeof window.Chart === 'undefined') {
        if (typeof Chart !== 'undefined') {
            window.Chart = Chart;
            return true;
        }
        return false;
    }
    return true;
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
        // 确保统计页面有必要的HTML结构
        ensureStatisticsPageStructure();
        
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
        // 确保统计页面有必要的HTML结构
        ensureStatisticsPageStructure();
        
        // 确保Chart.js已加载
        await initializeChart();
        
        // 显示加载状态
        showLoadingState();
        
        const period = document.getElementById('statisticsPeriodSelect').value;
        const startDate = document.getElementById('statisticsStartDate').value;
        const endDate = document.getElementById('statisticsEndDate').value;
        
        // 获取销售趋势数据
        try {
            const salesTrendData = await adminAPI.getSalesTrend(period, startDate, endDate);
            console.log('获取到销售趋势数据:', salesTrendData);
            
            // 检查数据是否为空或格式不正确
            if (!salesTrendData || 
                !salesTrendData.labels || 
                !Array.isArray(salesTrendData.labels) || 
                salesTrendData.labels.length === 0) {
                console.warn('销售趋势数据为空或格式不正确，使用默认数据');
                renderSalesTrendChart({
                    labels: [new Date().toISOString().split('T')[0]],
                    sales: [0],
                    orders: [0]
                });
            } else {
                renderSalesTrendChart(salesTrendData);
            }
        } catch (error) {
            console.error('获取销售趋势数据失败:', error);
            // 使用默认数据渲染
            renderSalesTrendChart({
                labels: [new Date().toISOString().split('T')[0]],
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
    // 使用新的加载状态UI
    const loadingElements = document.querySelectorAll('.chart-loading');
    loadingElements.forEach(element => {
        element.classList.remove('d-none');
    });
    
    // 隐藏所有占位符
    const placeholders = document.querySelectorAll('.chart-placeholder');
    placeholders.forEach(placeholder => {
        placeholder.classList.add('d-none');
    });
}

// 隐藏加载状态
function hideLoadingState() {
    // 隐藏所有加载状态
    const loadingElements = document.querySelectorAll('.chart-loading');
    loadingElements.forEach(element => {
        element.classList.add('d-none');
    });
}

// 显示无数据占位符
function showNoDataPlaceholder(chartId) {
    const chartElement = document.getElementById(chartId);
    if (!chartElement) return;
    
    // 隐藏图表
    chartElement.style.display = 'none';
    
    // 显示占位符
    const cardBody = chartElement.closest('.card-body');
    if (cardBody) {
        const placeholder = cardBody.querySelector('.chart-placeholder');
        if (placeholder) {
            placeholder.classList.remove('d-none');
        }
    }
}

// 隐藏无数据占位符
function hideNoDataPlaceholder(chartId) {
    const chartElement = document.getElementById(chartId);
    if (!chartElement) return;
    
    // 显示图表
    chartElement.style.display = 'block';
    
    // 隐藏占位符
    const cardBody = chartElement.closest('.card-body');
    if (cardBody) {
        const placeholder = cardBody.querySelector('.chart-placeholder');
        if (placeholder) {
            placeholder.classList.add('d-none');
        }
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
    const canvas = document.getElementById('salesTrendChart');
    if (!canvas) {
        console.error('销售趋势图表元素不存在');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // 检查Chart对象是否可用
    if (!ensureChartAvailable()) {
        console.error('Chart对象未定义，请确保Chart.js已正确加载');
        return;
    }
    
    // 销毁现有图表
    if (salesTrendChart instanceof Chart) {
        salesTrendChart.destroy();
    }
    
    // 检查数据格式是否正确，并处理不同的API返回格式
    let labels = [];
    let values = [];
    let ordersData = [];
    let hasRealData = false;
    
    if (!data) {
        console.error('销售趋势数据为空');
        // 创建默认数据
        const today = new Date().toISOString().split('T')[0];
        labels = [today];
        values = [0];
        ordersData = [0];
    } else if (Array.isArray(data)) {
        // 处理数组格式的返回数据（来自/api/admin/stats/sales-trend）
        console.log('处理数组格式的销售趋势数据:', data);
        if (data.length === 0) {
            // 如果数组为空，使用当前日期作为标签
            const today = new Date().toISOString().split('T')[0];
            labels = [today];
            values = [0];
            ordersData = [0];
        } else {
            labels = data.map(item => item.time_period || '无日期');
            values = data.map(item => parseFloat(item.sales_amount) || 0);
            ordersData = data.map(item => parseInt(item.orders_count) || 0);
            hasRealData = data.some(item => (parseFloat(item.sales_amount) > 0 || parseInt(item.orders_count) > 0));
        }
    } else if (data.labels && Array.isArray(data.labels)) {
        // 处理对象格式的返回数据（来自/api/admin/sales/trend）
        console.log('处理对象格式的销售趋势数据:', data);
        if (data.labels.length === 0) {
            // 如果标签数组为空，使用当前日期作为标签
            const today = new Date().toISOString().split('T')[0];
            labels = [today];
            values = [0];
            ordersData = [0];
        } else {
            labels = data.labels;
            values = data.sales ? data.sales.map(val => parseFloat(val) || 0) : [];
            ordersData = data.orders ? data.orders.map(val => parseInt(val) || 0) : [];
            hasRealData = (values.some(val => val > 0) || ordersData.some(val => val > 0));
        }
    } else {
        console.error('销售趋势数据格式不正确:', data);
        // 创建默认数据
        const today = new Date().toISOString().split('T')[0];
        labels = [today];
        values = [0];
        ordersData = [0];
    }
    
    // 检查是否有实际数据
    if (period === 'week' && !hasRealData) {
        // 对于周报表，如果没有实际数据，显示占位符
        console.log('销售趋势无实际数据，显示占位符');
        showNoDataPlaceholder('salesTrendChart');
    } else {
        // 对于其他报表，或者有实际数据的周报表，显示图表
        console.log('销售趋势有实际数据，显示图表');
        hideNoDataPlaceholder('salesTrendChart');
    }
    
    // 确保数据长度一致
    const maxLength = Math.max(labels.length, values.length, ordersData.length);
    while (labels.length < maxLength) labels.push('无数据');
    while (values.length < maxLength) values.push(0);
    while (ordersData.length < maxLength) ordersData.push(0);
    
    // 获取当前选择的时间周期（使用已有的period变量，避免重复定义）
    let periodText = '';
    let xAxisTitle = '';
    
    // 根据不同的时间周期设置标题和格式化标签
    switch(period) {
        case 'day':
            periodText = '日';
            xAxisTitle = '日期';
            break;
        case 'week':
            periodText = '周';
            xAxisTitle = '日期';
            break;
        case 'month':
            periodText = '月';
            xAxisTitle = '日期';
            break;
        case 'year':
            periodText = '年';
            xAxisTitle = '月份';
            break;
        default:
            periodText = '';
            xAxisTitle = '时间';
    }
    
    // 格式化标签显示
    const formattedLabels = labels.map(label => {
        if (period === 'year' && label.includes('-')) {
            // 年报表显示月份
            const parts = label.split('-');
            if (parts.length >= 2) {
                return parts[0] + '年' + parts[1] + '月';
            }
        } else if ((period === 'month' || period === 'week' || period === 'day') && label.includes('-')) {
            // 月报表、周报表和日报表显示日期
            try {
                const date = new Date(label);
                if (!isNaN(date.getTime())) {
                    return (date.getMonth() + 1) + '月' + date.getDate() + '日';
                }
            } catch (error) {
                console.warn('日期格式化错误:', error, label);
                // 尝试其他格式解析
                if (label.includes('week')) {
                    // 处理周格式，例如 "2023-week-32"
                    const parts = label.split('-');
                    if (parts.length >= 3) {
                        return parts[0] + '年第' + parts[2] + '周';
                    }
                }
            }
        }
        return label;
    });
    
    // 确保标签不为空
    if (formattedLabels.length === 0) {
        formattedLabels.push('无数据');
    }
    
    console.log(`获取到${periodText}销售趋势数据:`, { labels: formattedLabels, values, ordersData });
    
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
    
    // 调整图表容器大小，确保有合适的显示高度
    const chartContainer = document.getElementById('salesTrendChart').parentNode;
    chartContainer.style.height = '400px'; // 增加高度以适应全宽显示
    
    // 创建新图表
    try {
        window.salesTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: formattedLabels,
                datasets: [
                    {
                        label: `${periodText}销售额`,
                        data: values,
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 2,
                        tension: 0.1,
                        yAxisID: 'y',
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        fill: true
                    },
                    {
                        label: `${periodText}订单数`,
                        data: ordersData,
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 2,
                        tension: 0.1,
                        yAxisID: 'y1',
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000 // 添加动画效果
                },
                plugins: {
                    title: {
                        display: true,
                        text: `${periodText}销售趋势图表`,
                        font: {
                            size: 18,
                            weight: 'bold'
                        },
                        padding: {
                            top: 10,
                            bottom: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    if (context.datasetIndex === 0) {
                                        label += '¥' + context.parsed.y.toLocaleString('zh-CN');
                                    } else {
                                        label += context.parsed.y + ' 单';
                                    }
                                }
                                return label;
                            }
                        }
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 14
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: xAxisTitle,
                            font: {
                                size: 14,
                                weight: 'bold'
                            },
                            padding: {top: 10, bottom: 0}
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: formattedLabels.length > 15 ? 15 : formattedLabels.length
                        },
                        grid: {
                            display: true,
                            drawBorder: true,
                            drawOnChartArea: true,
                            drawTicks: true,
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '销售额 (¥)',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            callback: function(value) {
                                return '¥' + value.toLocaleString('zh-CN');
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '订单数 (单)',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
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
    if (!ensureChartAvailable()) {
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
    
    // 检查是否所有数据值都为0
    const hasRealData = data.some(item => (item.value > 0 || item.amount > 0 || item.sold_count > 0));
    // 即使没有实际数据，也显示图表
    console.log('商品销售数据处理中，无论是否有销售额都将显示图表');
    // 如果数据中只有一项且名称为'无数据'或'无销售数据'，尝试替换为更友好的显示
    if (data.length === 1 && (data[0].name === '无数据' || data[0].name === '无销售数据')) {
        data[0].name = '暂无销售数据';
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
    
    // 调整商品销售占比图表容器的高度
    const chartContainer = document.getElementById('productSalesChart').parentNode;
    chartContainer.style.height = '350px';
    
    // 创建新图表 - 在全宽布局中使用环形图而不是饼图，并添加标题
    try {
        // 检查是否所有值都为0
        const allZeros = values.every(val => val === 0);
        
        // 如果所有值都为0，但有标签，则为每个标签分配相等的值以显示图表
        const chartData = allZeros && labels.length > 0 ? 
            labels.map(() => 1) : // 所有项目显示相等比例
            values;
        
        window.productSalesChart = new Chart(ctx, {
            type: 'doughnut', // 使用环形图代替饼图
            data: {
                labels: labels,
                datasets: [{
                    data: chartData,
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
                    borderWidth: 1,
                    hoverOffset: 15 // 悬停时突出显示扇区
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '50%', // 环形图中间空白区域大小
                plugins: {
                    title: {
                        display: true,
                        text: '商品销售占比分析',
                        font: {
                            size: 18,
                            weight: 'bold'
                        },
                        padding: {
                            top: 10,
                            bottom: 20
                        }
                    },
                    legend: {
                        position: 'right',
                        align: 'center',
                        labels: {
                            padding: 15,
                            boxWidth: 15,
                            font: {
                                size: 13,
                                weight: 'normal'
                            },
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                // 如果所有值为0，显示特殊提示
                                if (allZeros) {
                                    return `${label}: 暂无销售数据`;
                                }
                                
                                // 获取原始数据中的值和百分比
                                const index = context.dataIndex;
                                const value = data[index] ? (data[index].value || data[index].amount || 0) : 0;
                                const percentage = data[index] ? (data[index].percentage || 0) : 0;
                                
                                // 格式化显示
                                return label + ': ¥' + value.toLocaleString('zh-CN') + ' (' + percentage.toFixed(2) + '%)';
                            }
                        }
                    }
                },
                // 添加动画效果
                animation: {
                    animateScale: true,
                    animateRotate: true,
                    duration: 1000
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
    if (!ensureChartAvailable()) {
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
    if (!ensureChartAvailable()) {
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
    // 首先尝试获取统计页面中的热销商品列表元素
    let topProductsList = document.getElementById('topProductsList');
    
    // 如果在统计页面中找不到，尝试创建表格结构
    if (!topProductsList) {
        console.warn('未找到热销商品列表元素，尝试创建表格结构');
        const statisticsSection = document.getElementById('statistics');
        
        if (statisticsSection) {
            // 检查是否已有热销商品卡片
            let topProductsCard = statisticsSection.querySelector('#topProductsCard');
            
            if (!topProductsCard) {
                // 创建热销商品卡片
                const cardHtml = `
                    <div class="card mb-4" id="topProductsCard">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h6 class="m-0 font-weight-bold text-primary">热销商品排行</h6>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-bordered table-hover">
                                    <thead>
                                        <tr>
                                            <th>排名</th>
                                            <th>商品信息</th>
                                            <th>销售数量</th>
                                            <th>销售额</th>
                                            <th>占比</th>
                                        </tr>
                                    </thead>
                                    <tbody id="topProductsList">
                                        <!-- 热销商品数据将在这里动态加载 -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;
                
                // 创建新行并添加到统计部分
                const newRow = document.createElement('div');
                newRow.className = 'row';
                const col = document.createElement('div');
                col.className = 'col-12';
                col.innerHTML = cardHtml;
                newRow.appendChild(col);
                statisticsSection.appendChild(newRow);
                
                // 重新获取列表元素
                topProductsList = document.getElementById('topProductsList');
            } else {
                // 如果卡片存在但列表元素不存在，尝试获取或创建列表元素
                topProductsList = topProductsCard.querySelector('#topProductsList');
                if (!topProductsList) {
                    const tbody = document.createElement('tbody');
                    tbody.id = 'topProductsList';
                    topProductsCard.querySelector('table').appendChild(tbody);
                    topProductsList = tbody;
                }
            }
        }
    }
    
    // 如果仍然找不到元素，记录错误并返回
    if (!topProductsList) {
        console.error('无法找到或创建热销商品列表元素');
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
    
    // 计算总销售额
    const totalSales = products.reduce((sum, product) => {
        // 尝试从不同的属性获取销售额
        const sales = product.sales_amount || product.total_amount || product.totalSales || product.sales || product.total_sales || 0;
        return sum + (typeof sales === 'number' ? sales : 0);
    }, 0);
    
    // 添加商品行
    products.forEach((product, index) => {
        // 尝试从不同的属性获取数据
        const productName = product.name || product.product_name || '未知商品';
        const productId = product.id || product.product_id || '未知';
        const productImage = product.image || product.product_image || '../image/Goods/Goods_1.png';
        const productQuantity = product.sales_count || product.quantity || 0;
        const productSales = product.sales_amount || product.total_amount || product.totalSales || product.sales || product.total_sales || 0;
        
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
    
    console.log('热销商品列表渲染完成');

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

// 确保统计页面有必要的HTML结构
function ensureStatisticsPageStructure() {
    const statisticsSection = document.getElementById('statistics');
    if (!statisticsSection) {
        console.error('统计页面元素不存在');
        return;
    }
    
    // 如果统计页面为空，创建基本结构
    if (statisticsSection.children.length === 0) {
        console.log('创建统计页面基本结构');
        
        statisticsSection.innerHTML = `
            <div class="container-fluid">
                <!-- 筛选和控制区域 -->
                <div class="row mb-4">
                    <div class="col-md-12">
                        <div class="card">
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-3">
                                        <label for="statisticsPeriodSelect" class="form-label">统计周期</label>
                                        <select class="form-select" id="statisticsPeriodSelect">
                                            <option value="day">按天</option>
                                            <option value="week">按周</option>
                                            <option value="month" selected>按月</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label for="statisticsStartDate" class="form-label">开始日期</label>
                                        <input type="date" class="form-control" id="statisticsStartDate">
                                    </div>
                                    <div class="col-md-3">
                                        <label for="statisticsEndDate" class="form-label">结束日期</label>
                                        <input type="date" class="form-control" id="statisticsEndDate">
                                    </div>
                                    <div class="col-md-3 d-flex align-items-end">
                                        <button id="refreshStatisticsBtn" class="btn btn-primary me-2">
                                            <i class="bi bi-arrow-clockwise"></i> 刷新
                                        </button>
                                        <button id="exportStatisticsBtn" class="btn btn-outline-secondary">
                                            <i class="bi bi-download"></i> 导出
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 销售趋势图表 -->
                <div class="row mb-4">
                    <div class="col-md-12">
                        <div class="card">
                            <div class="card-header">
                                <h6 class="m-0 font-weight-bold">销售趋势</h6>
                            </div>
                            <div class="card-body" style="height: 350px;">
                                <canvas id="salesTrendChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 商品销售占比图表 -->
                <div class="row mb-4">
                    <div class="col-md-12">
                        <div class="card">
                            <div class="card-header">
                                <h6 class="m-0 font-weight-bold">商品销售占比</h6>
                            </div>
                            <div class="card-body" style="height: 300px;">
                                <canvas id="productSalesChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 用户增长和订单状态图表 -->
                <div class="row mb-4">
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header">
                                <h6 class="m-0 font-weight-bold">用户增长趋势</h6>
                            </div>
                            <div class="card-body" style="height: 300px;">
                                <canvas id="userGrowthChart"></canvas>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header">
                                <h6 class="m-0 font-weight-bold">订单状态分布</h6>
                            </div>
                            <div class="card-body" style="height: 300px;">
                                <canvas id="orderStatusChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 热销商品排行 -->
                <div class="row">
                    <div class="col-12">
                        <div class="card mb-4" id="topProductsCard">
                            <div class="card-header">
                                <h6 class="m-0 font-weight-bold">热销商品排行</h6>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-bordered table-hover">
                                        <thead>
                                            <tr>
                                                <th>排名</th>
                                                <th>商品信息</th>
                                                <th>销售数量</th>
                                                <th>销售额</th>
                                                <th>占比</th>
                                            </tr>
                                        </thead>
                                        <tbody id="topProductsList">
                                            <!-- 热销商品数据将在这里动态加载 -->
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// 设置全局函数，供admin-main.js调用
window.initStatisticsPage = initStatisticsPage;
window.refreshStatisticsData = refreshStatisticsData;