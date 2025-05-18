/**
 * 管理后台仪表盘功能
 * 处理仪表盘数据加载和图表显示
 */

// 导入adminAuth模块和API配置
import { adminAuth } from './admin-auth.js';
import adminAPI, { API_BASE_URL, ADMIN_API_BASE_URL } from './admin-api.js';

// 确保API配置可用
console.log('admin-dashboard.js中的API配置:', { API_BASE_URL, ADMIN_API_BASE_URL });
console.log('admin-dashboard.js中的adminAPI:', adminAPI);

// 当前选择的时间周期
let currentPeriod = 'month';

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
        const salesTrend = await adminAPI.getSalesTrend(currentPeriod);
        renderSalesChart(salesTrend);
        
        // 获取分类占比数据
        const categoryDistribution = await adminAPI.getCategoryDistribution();
        renderCategoryChart(categoryDistribution);
        
        // 初始化时间周期选择器
        initPeriodSelector();
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
        // 确保sales_count和stock属性存在，如果不存在则使用默认值
        const salesCount = product.sales_count || product.sold_count || 0;
        const stockCount = product.stock || product.inventory || 0;
        
        row.innerHTML = `
            <td>${product.name}</td>
            <td>¥${product.price.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>${salesCount}</td>
            <td>${stockCount}</td>
        `;
        
        topProductsList.appendChild(row);
    });
}

// 初始化时间周期选择器
function initPeriodSelector() {
    // 检查是否已经初始化
    if (document.getElementById('periodSelector')) {
        return;
    }
    
    // 获取销售趋势图表容器的父元素
    const salesChartCard = document.getElementById('salesChart').closest('.card');
    if (!salesChartCard) return;
    
    // 获取卡片头部
    const cardHeader = salesChartCard.querySelector('.card-header');
    if (!cardHeader) return;
    
    // 创建时间周期选择器
    const periodSelector = document.createElement('div');
    periodSelector.id = 'periodSelector';
    periodSelector.className = 'btn-group btn-group-sm float-end';
    periodSelector.innerHTML = `
        <button type="button" class="btn btn-outline-primary period-btn" data-period="day">日</button>
        <button type="button" class="btn btn-outline-primary period-btn" data-period="week">周</button>
        <button type="button" class="btn btn-outline-primary period-btn active" data-period="month">月</button>
        <button type="button" class="btn btn-outline-primary period-btn" data-period="year">年</button>
    `;
    
    // 添加到卡片头部
    cardHeader.appendChild(periodSelector);
    
    // 添加事件监听器
    const periodButtons = periodSelector.querySelectorAll('.period-btn');
    periodButtons.forEach(button => {
        button.addEventListener('click', async function() {
            // 移除所有按钮的active类
            periodButtons.forEach(btn => btn.classList.remove('active'));
            // 添加当前按钮的active类
            this.classList.add('active');
            
            // 更新当前周期
            currentPeriod = this.dataset.period;
            
            try {
                // 显示加载状态
                const salesChartContainer = document.getElementById('salesChart');
                if (salesChartContainer) {
                    salesChartContainer.style.opacity = '0.5';
                }
                
                // 获取新的销售趋势数据
                const salesTrend = await adminAPI.getSalesTrend(currentPeriod);
                renderSalesChart(salesTrend);
                
                // 恢复正常显示
                if (salesChartContainer) {
                    salesChartContainer.style.opacity = '1';
                }
            } catch (error) {
                console.error('获取销售趋势数据失败:', error);
                showErrorToast('获取销售趋势数据失败，请稍后重试');
            }
        });
    });
}

// 渲染销售趋势图表
function renderSalesChart(data) {
    const salesChartContainer = document.getElementById('salesChart');
    
    // 确保图表容器存在并设置明确的高度
    if (salesChartContainer) {
        salesChartContainer.style.height = '300px';
        salesChartContainer.style.width = '100%';
    } else {
        console.error('销售趋势图表容器不存在');
        return;
    }
    
    const ctx = salesChartContainer.getContext('2d');
    
    // 检查Chart对象是否可用
    if (typeof window.Chart === 'undefined') {
        console.error('Chart对象未定义，请确保Chart.js已正确加载');
        return;
    }
    
    try {
        console.log('开始处理销售趋势数据，原始数据:', data);
        
        // 根据当前周期生成适当的时间序列数据
        let timeSeriesData;
        
        // 如果数据为空或格式不正确，生成空的时间序列数据
        if (!data || (Array.isArray(data) && data.length === 0) || (!Array.isArray(data) && (!data.labels || !Array.isArray(data.labels)))) {
            console.warn('销售趋势数据为空或格式不正确，生成空的时间序列数据');
            timeSeriesData = generateEmptyTimeSeriesData(currentPeriod);
        } else if (Array.isArray(data)) {
            // 处理数组格式的返回数据（来自/api/admin/stats/sales-trend）
            console.log('处理数组格式的销售趋势数据:', data);
            
            // 提取标签和数据
            const labels = data.map(item => item.time_period || '无日期');
            const salesData = data.map(item => parseFloat(item.sales_amount) || 0);
            const ordersData = data.map(item => parseInt(item.orders_count) || 0);
            
            // 如果数据点数量不足，补充空数据
            timeSeriesData = ensureDataPointsCount(labels, salesData, ordersData, currentPeriod);
        } else if (data.labels) {
            // 处理对象格式的返回数据（来自/api/admin/sales/trend）
            console.log('处理对象格式的销售趋势数据:', data);
            
            // 安全地获取标签和数据
            const labels = Array.isArray(data.labels) ? data.labels.filter(label => label !== null && label !== undefined) : [];
            
            // 安全地处理销售额数据
            let salesData = [];
            if (data.sales && Array.isArray(data.sales)) {
                salesData = data.sales.map(val => (val !== null && val !== undefined) ? parseFloat(val) || 0 : 0);
            }
            
            // 安全地处理订单数据
            let ordersData = [];
            if (data.orders && Array.isArray(data.orders)) {
                ordersData = data.orders.map(val => (val !== null && val !== undefined) ? parseInt(val) || 0 : 0);
            }
            
            // 如果数据点数量不足，补充空数据
            timeSeriesData = ensureDataPointsCount(labels, salesData, ordersData, currentPeriod);
        } else {
            console.error('销售趋势数据格式不正确:', data);
            timeSeriesData = generateEmptyTimeSeriesData(currentPeriod);
        }
        
        console.log('处理后的时间序列数据:', timeSeriesData);
        
        // 确保所有数组长度一致
        const { labels, sales: salesData, orders: ordersData } = timeSeriesData;
        
        // 格式化标签
        const formattedLabels = formatLabelsForPeriod(labels, currentPeriod);
        console.log('格式化后的标签:', formattedLabels);
        
        // 销毁现有图表（如果存在）
        try {
            if (window.salesChart) {
                if (typeof window.salesChart.destroy === 'function') {
                    window.salesChart.destroy();
                } else {
                    // 如果destroy不是函数，则重置为null
                    window.salesChart = null;
                }
            }
        } catch (error) {
            console.error('销毁旧图表时出错:', error);
            window.salesChart = null;
        }
        
        // 获取当前选择的时间周期的文本表示
        let periodText = '';
        let xAxisTitle = '';
        let chartTitle = '';
        
        switch(currentPeriod) {
            case 'day': 
                periodText = '日'; 
                xAxisTitle = '日期';
                chartTitle = '日销售趋势图表';
                break;
            case 'week': 
                periodText = '周'; 
                xAxisTitle = '周次';
                chartTitle = '周销售趋势图表';
                break;
            case 'month': 
                periodText = '月'; 
                xAxisTitle = '日期';
                chartTitle = '月销售趋势图表';
                break;
            case 'year': 
                periodText = '年'; 
                xAxisTitle = '月份';
                chartTitle = '年销售趋势图表';
                break;
            default: 
                periodText = '';
                xAxisTitle = '时间';
                chartTitle = '销售趋势图表';
        }
        
        // 在图表标题区域添加周期标题
        const chartTitleElement = document.createElement('div');
        chartTitleElement.className = 'text-center text-danger mb-2';
        chartTitleElement.style.fontSize = '18px';
        chartTitleElement.style.fontWeight = 'bold';
        chartTitleElement.textContent = `${periodText}销售趋势图表`;
        
        // 查找图表容器的父元素
        const chartParent = salesChartContainer.parentElement;
        
        // 检查是否已存在标题元素
        const existingTitle = chartParent.querySelector('.text-danger.mb-2');
        if (existingTitle) {
            existingTitle.textContent = `${periodText}销售趋势图表`;
        } else {
            // 在图表前插入标题
            chartParent.insertBefore(chartTitleElement, salesChartContainer);
        }
        
        // 创建新图表
        window.salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: formattedLabels,
                datasets: [{
                    label: `${periodText}销售额`,
                    data: salesData,
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
                    fill: true,
                    tension: 0.1,
                    yAxisID: 'y',
                    // 确保即使数据为0也显示连续的线
                    spanGaps: false,
                    segment: {
                        borderColor: ctx => 'rgba(78, 115, 223, 1)'
                    }
                }, {
                    label: `${periodText}订单数`,
                    data: ordersData,
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
                    fill: true,
                    tension: 0.1,
                    yAxisID: 'y1',
                    // 确保即使数据为0也显示连续的线
                    spanGaps: false,
                    segment: {
                        borderColor: ctx => 'rgba(28, 200, 138, 1)'
                    }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000 // 添加动画效果
                },
                layout: {
                    padding: {
                        left: 10,
                        right: 25,
                        top: 25,
                        bottom: 25
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
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            // 根据不同周期调整显示的刻度数量
                            maxTicksLimit: currentPeriod === 'day' ? 12 : 
                                          currentPeriod === 'week' ? 12 : 
                                          currentPeriod === 'month' ? 15 : 
                                          currentPeriod === 'year' ? 12 : 7,
                            font: {
                                size: 11
                            }
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
                            maxTicksLimit: 5,
                            padding: 10,
                            callback: function(value) {
                                return '¥' + value.toLocaleString('zh-CN');
                            }
                        },
                        grid: {
                            color: 'rgb(234, 236, 244)',
                            drawBorder: false,
                            borderDash: [2],
                            zeroLineBorderDash: [2]
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
                },
                plugins: {
                    title: {
                        display: false, // 不使用Chart.js的标题，使用自定义标题
                        text: chartTitle,
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        padding: {
                            top: 10,
                            bottom: 20
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 14
                            }
                        }
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
                                if (context.datasetIndex === 0) {
                                    return label + ': ¥' + value.toLocaleString('zh-CN');
                                } else {
                                    return label + ': ' + value.toLocaleString('zh-CN') + ' 单';
                                }
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('渲染销售趋势图表时出错:', error);
    }
}

/**
 * 确保数据点数量符合当前周期的要求
 * @param {Array} labels - 标签数组
 * @param {Array} salesData - 销售额数据数组
 * @param {Array} ordersData - 订单数据数组
 * @param {string} period - 时间周期（day, week, month, year）
 * @returns {Object} - 包含调整后的labels, sales, orders数组的对象
 */
function ensureDataPointsCount(labels, salesData, ordersData, period) {
    // 根据不同的时间周期，确定所需的数据点数量
    let requiredPoints = 0;
    switch(period) {
        case 'day':
            requiredPoints = 24; // 最近24天
            break;
        case 'week':
            requiredPoints = 12; // 最近12周
            break;
        case 'month':
            requiredPoints = 30; // 最近30天
            break;
        case 'year':
            requiredPoints = 12; // 最近12个月
            break;
        default:
            requiredPoints = 30; // 默认30个数据点
    }
    
    // 如果现有数据点数量不足，生成空的时间序列数据
    if (labels.length === 0 || labels.length < requiredPoints) {
        return generateEmptyTimeSeriesData(period);
    }
    
    // 如果现有数据点数量超过所需数量，截取最近的数据点
    if (labels.length > requiredPoints) {
        const startIndex = labels.length - requiredPoints;
        return {
            labels: labels.slice(startIndex),
            sales: salesData.slice(startIndex),
            orders: ordersData.slice(startIndex)
        };
    }
    
    // 如果数据点数量正好，直接返回
    return {
        labels: labels,
        sales: salesData,
        orders: ordersData
    };
}

/**
 * 生成空的时间序列数据，用于没有实际销售数据时提供合理的图表数据结构
 * @param {string} period - 时间周期（day, week, month, year）
 * @param {string} startDate - 开始日期（可选）
 * @param {string} endDate - 结束日期（可选）
 * @returns {Object} - 包含labels, sales, orders数组的对象
 */
function generateEmptyTimeSeriesData(period, startDate, endDate) {
    const now = new Date();
    const labels = [];
    const sales = [];
    const orders = [];
    
    // 设置默认的结束日期为今天
    const end = endDate ? new Date(endDate) : now;
    
    // 根据不同的时间周期生成不同数量的数据点
    let start;
    let dateFormat;
    let increment;
    
    switch(period) {
        case 'day':
            // 生成最近24天的数据点
            start = startDate ? new Date(startDate) : new Date(end);
            start.setDate(end.getDate() - 23); // 24天包括今天
            dateFormat = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            increment = date => { date.setDate(date.getDate() + 1); };
            break;
            
        case 'week':
            // 生成最近12周的数据点
            start = startDate ? new Date(startDate) : new Date(end);
            start.setDate(end.getDate() - 11 * 7); // 确保生成12周的数据（包括当前周）
            dateFormat = date => {
                const year = date.getFullYear();
                const weekNumber = getWeekNumber(date);
                return `${year}-week-${weekNumber}`;
            };
            increment = date => { date.setDate(date.getDate() + 7); };
            break;
            
        case 'year':
            // 生成最近12个月的数据点
            start = startDate ? new Date(startDate) : new Date(end);
            start.setMonth(end.getMonth() - 11); // 确保生成12个月的数据（包括当前月）
            // 将日期设置为月初，确保月份计算准确
            start.setDate(1);
            dateFormat = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            increment = date => { date.setMonth(date.getMonth() + 1); };
            break;
            
        case 'month':
        default:
            // 生成最近30天的数据点
            start = startDate ? new Date(startDate) : new Date(end);
            start.setDate(end.getDate() - 29); // 30天包括今天
            dateFormat = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            increment = date => { date.setDate(date.getDate() + 1); };
    }
    
    // 生成时间序列数据
    const current = new Date(start);
    while (current <= end) {
        labels.push(dateFormat(current));
        sales.push(0); // 空销售额
        orders.push(0); // 空订单数
        increment(current);
    }
    
    // 确保至少有一个数据点
    if (labels.length === 0) {
        labels.push(dateFormat(now));
        sales.push(0);
        orders.push(0);
    }
    
    // 确保数据点数量符合要求
    const requiredPoints = period === 'day' ? 24 : 
                          period === 'week' ? 12 : 
                          period === 'month' ? 30 : 
                          period === 'year' ? 12 : 30;
                          
    // 如果数据点不足，在前面补充0值数据点
    if (labels.length < requiredPoints) {
        const missingPoints = requiredPoints - labels.length;
        console.log(`数据点不足，需要补充${missingPoints}个数据点`);
        
        // 创建一个临时日期对象，用于生成缺失的标签
        const tempDate = new Date(start);
        for (let i = 0; i < missingPoints; i++) {
            // 向前移动一个时间单位
            if (period === 'day' || period === 'month') {
                tempDate.setDate(tempDate.getDate() - 1);
            } else if (period === 'week') {
                tempDate.setDate(tempDate.getDate() - 7);
            } else if (period === 'year') {
                tempDate.setMonth(tempDate.getMonth() - 1);
            }
            
            // 在数组前面插入新的数据点
            labels.unshift(dateFormat(tempDate));
            sales.unshift(0);
            orders.unshift(0);
        }
    }
    
    console.log(`生成了${labels.length}个数据点，周期为${period}`);
    return { labels, sales, orders };
}

/**
 * 获取日期所在的周数
 * @param {Date} date - 日期对象
 * @returns {number} - 周数
 */
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

/**
 * 确保数据点数量符合当前周期的要求
 * @param {Array} labels - 标签数组
 * @param {Array} salesData - 销售额数组
 * @param {Array} ordersData - 订单数数组
 * @param {string} period - 时间周期（day, week, month, year）
 * @returns {Object} - 包含labels, sales, orders数组的对象
 */
function ensureDataPointsCount(labels, salesData, ordersData, period) {
    // 如果数据为空，直接生成空的时间序列数据
    if (!labels || labels.length === 0) {
        return generateEmptyTimeSeriesData(period);
    }
    
    // 根据不同的时间周期，确定所需的数据点数量
    let requiredCount;
    switch(period) {
        case 'day':
            requiredCount = 24; // 24天
            break;
        case 'week':
            requiredCount = 12; // 12周
            break;
        case 'year':
            requiredCount = 12; // 12个月
            break;
        case 'month':
        default:
            requiredCount = 30; // 30天
    }
    
    // 如果数据点数量已经足够，直接返回
    if (labels.length >= requiredCount) {
        // 确保销售额和订单数数组长度与标签一致
        const sales = salesData.slice(0, labels.length);
        const orders = ordersData.slice(0, labels.length);
        
        // 补充缺失的数据
        while (sales.length < labels.length) sales.push(0);
        while (orders.length < labels.length) orders.push(0);
        
        return { labels, sales, orders };
    }
    
    // 如果数据点数量不足，生成空的时间序列数据
    const emptyData = generateEmptyTimeSeriesData(period);
    
    // 将现有数据合并到空数据中
    // 这里假设标签是日期格式，可以通过比较来找到对应位置
    for (let i = 0; i < labels.length; i++) {
        const label = labels[i];
        const index = emptyData.labels.indexOf(label);
        
        if (index !== -1) {
            emptyData.sales[index] = salesData[i] || 0;
            emptyData.orders[index] = ordersData[i] || 0;
        }
    }
    
    return emptyData;
}

// 根据时间周期格式化标签
function formatLabelsForPeriod(labels, period) {
    console.log('安全处理后的标签:', labels);
    // 确保labels是数组且不为空
    if (!labels || !Array.isArray(labels)) {
        console.log('标签不是数组或为空，返回默认标签');
        return ['无数据'];
    }
    
    // 确保所有标签都有值，将null或undefined替换为'无数据'
    const safeLabels = labels.map(label => label || '无数据');
    console.log('安全处理后的标签:', safeLabels);
    
    // 根据不同的时间周期格式化标签
    try {
        switch (period) {
            case 'day':
                // 日期格式：5月20日
                return safeLabels.map(label => {
                    // 确保label是字符串
                    const strLabel = String(label || '无日期');
                    if (strLabel.indexOf('-') !== -1) {
                        try {
                            const parts = strLabel.split('-');
                            if (parts.length >= 3) {
                                // 转换为中文格式：5月20日
                                return `${parseInt(parts[1])}月${parseInt(parts[2])}日`;
                            }
                        } catch (error) {
                            console.warn('格式化日期标签出错:', error);
                        }
                    }
                    return strLabel;
                });
            case 'week':
                // 周格式：第X周
                return safeLabels.map((label, index) => {
                    // 确保label是字符串
                    const strLabel = String(label || '无日期');
                    if (strLabel.indexOf('week') !== -1) {
                        try {
                            // 处理格式如 2025-week-20 的标签
                            const weekParts = strLabel.split('-week-');
                            if (weekParts.length === 2) {
                                return `${weekParts[0]}年第${weekParts[1]}周`;
                            }
                            // 兼容其他格式
                            const parts = strLabel.split('-');
                            if (parts.length >= 3) {
                                return `${parts[0]}年第${parts[2]}周`;
                            }
                        } catch (error) {
                            console.warn('格式化周标签出错:', error);
                        }
                    }
                    return `第${index + 1}周`;
                });
            case 'month':
                // 月份格式：2023年5月
                return safeLabels.map(label => {
                    // 确保label是字符串
                    const strLabel = String(label || '无日期');
                    if (strLabel.indexOf('-') !== -1) {
                        try {
                            const parts = strLabel.split('-');
                            if (parts.length >= 3) {
                                // 如果是完整日期格式 (YYYY-MM-DD)，只显示月日
                                return `${parseInt(parts[1])}月${parseInt(parts[2])}日`;
                            } else if (parts.length >= 2) {
                                // 如果是年月格式 (YYYY-MM)，显示年月
                                return `${parts[0]}年${parseInt(parts[1])}月`;
                            }
                        } catch (error) {
                            console.warn('格式化月份标签出错:', error);
                        }
                    }
                    return strLabel;
                });
            case 'year':
                // 年月格式：2023年5月
                return safeLabels.map(label => {
                    // 确保label是字符串
                    const strLabel = String(label || '无日期');
                    if (strLabel.indexOf('-') !== -1) {
                        try {
                            const parts = strLabel.split('-');
                            if (parts.length >= 2) {
                                // 转换为中文格式：2023年5月
                                return `${parts[0]}年${parseInt(parts[1])}月`;
                            } else {
                                // 如果只有年份
                                return `${parts[0]}年`;
                            }
                        } catch (error) {
                            console.warn('格式化年份标签出错:', error);
                        }
                    }
                    return strLabel;
                });
            default:
                return safeLabels;
        }
    } catch (error) {
        console.error('格式化标签时出现未处理的错误:', error);
        return safeLabels; // 出错时返回原始标签
    }
}



// 渲染分类占比图表
function renderCategoryChart(data) {
    const categoryChartContainer = document.getElementById('categoryChart');
    
    // 确保图表容器存在并设置明确的高度
    if (categoryChartContainer) {
        categoryChartContainer.style.height = '300px';
        categoryChartContainer.style.width = '100%';
    } else {
        console.error('分类占比图表容器不存在');
        return;
    }
    
    const ctx = categoryChartContainer.getContext('2d');
    
    // 检查Chart对象是否可用
    if (typeof window.Chart === 'undefined') {
        console.error('Chart对象未定义，请确保Chart.js已正确加载');
        return;
    }
    
    try {
        console.log('开始处理分类占比数据，原始数据:', data);
        
        // 检查数据格式是否正确，支持API返回的数组格式
        if (!data) {
            console.warn('分类占比数据为空，使用默认数据');
            data = [{ category_name: '无数据', product_count: 100 }];
        } else if (!Array.isArray(data)) {
            console.warn('分类占比数据不是数组格式，尝试转换');
            // 尝试将对象格式转换为数组格式
            if (data.categories && Array.isArray(data.categories)) {
                data = data.categories;
            } else {
                console.error('无法转换分类占比数据格式，使用默认数据');
                data = [{ category_name: '无数据', product_count: 100 }];
            }
        } else if (data.length === 0) {
            console.warn('分类占比数据数组为空，使用默认数据');
            data = [{ category_name: '无数据', product_count: 100 }];
        }
        
        // 从数组格式转换为图表所需的格式，确保每个项目都有有效的名称和数量
        const labels = data.map(item => {
            // 尝试获取分类名称，支持多种属性名
            const name = item.category_name || item.name || item.label || '未命名分类';
            return name;
        });
        
        const values = data.map(item => {
            // 尝试获取商品数量，支持多种属性名
            const count = item.product_count || item.count || item.value || 0;
            return parseFloat(count) || 0; // 确保是数字
        });
        
        console.log('处理后的分类占比数据:', { labels, values });
        
        const chartData = {
            labels: labels,
            values: values
        };
        
        // 销毁现有图表（如果存在）
        try {
            if (window.categoryChart) {
                if (typeof window.categoryChart.destroy === 'function') {
                    window.categoryChart.destroy();
                } else {
                    window.categoryChart = null;
                }
            }
        } catch (error) {
            console.error('销毁旧图表时出错:', error);
            window.categoryChart = null;
        }
        
        // 在图表标题区域添加标题
        const chartTitleElement = document.createElement('div');
        chartTitleElement.className = 'text-center text-danger mb-2';
        chartTitleElement.style.fontSize = '18px';
        chartTitleElement.style.fontWeight = 'bold';
        chartTitleElement.textContent = '商品分类占比图表';
        
        // 查找图表容器的父元素
        const chartParent = categoryChartContainer.parentElement;
        
        // 检查是否已存在标题元素
        const existingTitle = chartParent.querySelector('.text-danger.mb-2');
        if (existingTitle) {
            existingTitle.textContent = '商品分类占比图表';
        } else {
            // 在图表前插入标题
            chartParent.insertBefore(chartTitleElement, categoryChartContainer);
        }
        
        // 创建新图表
        window.categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartData.labels,
                datasets: [{
                    data: chartData.values,
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
                cutout: '70%',
                layout: {
                    padding: {
                        left: 10,
                        right: 25,
                        top: 25,
                        bottom: 25
                    }
                },
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
                }
            }
        });
    } catch (error) {
        console.error('渲染分类占比图表时出错:', error);
    }
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

// 调整布局，将销售趋势图和商品销售占比图上下排列
function adjustChartLayout() {
    // 获取图表容器
    const salesChartCard = document.getElementById('salesChart')?.closest('.card')?.parentElement;
    const categoryChartCard = document.getElementById('categoryChart')?.closest('.card')?.parentElement;
    
    if (!salesChartCard || !categoryChartCard) {
        console.error('找不到图表容器，无法调整布局');
        return;
    }
    
    // 获取父容器
    const parentRow = salesChartCard.parentElement;
    if (!parentRow) return;
    
    // 修改容器样式为占满整行
    salesChartCard.className = 'col-12 mb-4';
    categoryChartCard.className = 'col-12 mb-4';
    
    // 确保销售趋势图在上，商品销售占比图在下
    if (parentRow.contains(salesChartCard) && parentRow.contains(categoryChartCard)) {
        parentRow.insertBefore(salesChartCard, categoryChartCard);
    }
}

// 设置全局函数，供admin-main.js调用
window.loadDashboardData = loadDashboardData;

// 在页面加载完成后调整布局
document.addEventListener('DOMContentLoaded', adjustChartLayout);