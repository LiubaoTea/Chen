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
        
        // 主CDN源
        const primaryCDN = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
        // 备用CDN源
        const fallbackCDN = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js';
        
        chartScript.src = primaryCDN;
        
        chartScript.onload = () => {
            window.Chart = Chart;
            resolve(window.Chart);
        };
        
        chartScript.onerror = () => {
            console.log('主CDN加载失败，尝试备用CDN');
            chartScript.src = fallbackCDN;
            
            chartScript.onerror = () => {
                console.error('所有CDN源加载失败');
                reject(new Error('无法加载Chart.js库'));
            };
        };
        
        document.head.appendChild(chartScript);
    });
}

// 加载仪表盘数据
async function loadDashboardData() {
    // 检查是否已登录
    if (!adminAuth.check()) return;
    
    try {
        // 确保Chart.js已加载
        await initializeChart();
        
        // 获取仪表盘统计数据
        const statsData = await adminAPI.getDashboardStats();
        updateDashboardStats(statsData);
        
        // 获取最近订单
        const recentOrders = await adminAPI.getRecentOrders(5);
        updateRecentOrders(recentOrders);
        
        // 获取热销商品
        const topProducts = await adminAPI.getTopProducts(5);
        updateTopProducts(topProducts);
        
        // 初始化时间周期选择器
        initPeriodSelector();
        
        // 获取销售趋势数据
        const salesTrend = await adminAPI.getSalesTrend(currentPeriod, true);
        // 确保在渲染图表前window.salesChart为null
        if (window.salesChart) {
            try {
                if (window.salesChart instanceof Chart) {
                    window.salesChart.destroy();
                }
            } catch (error) {
                console.warn('销毁旧图表失败:', error);
            } finally {
                window.salesChart = null;
            }
        }
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
        salesChartContainer.style.height = '350px';
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
        
        // 根据当前周期生成完整的时间序列
        const endDate = new Date();
        let startDate = new Date();
        let xAxisTitle = '';
        
        switch(currentPeriod) {
            case 'day':
                startDate.setDate(endDate.getDate() - 24); // 最近24天
                xAxisTitle = '日期';
                break;
            case 'week':
                startDate.setDate(endDate.getDate() - 9 * 7); // 最近10周
                xAxisTitle = '周';
                break;
            case 'month':
                // 设置为当年的1月
                startDate = new Date(endDate.getFullYear(), 0, 1);
                xAxisTitle = '月份';
                break;
            case 'year':
                startDate.setFullYear(endDate.getFullYear() - 1); // 最近1年
                xAxisTitle = '月份';
                break;
            default:
                startDate.setDate(endDate.getDate() - 24); // 默认显示最近24天
                xAxisTitle = '日期';
        }
        
        // 生成完整的时间序列
        const completeLabels = [];
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            let label = '';
            switch(currentPeriod) {
                case 'day':
                    label = currentDate.toISOString().split('T')[0];
                    break;
                case 'week':
                    // 使用ISO周数计算方法，确保周数计算准确
                    const firstDayOfYear = new Date(currentDate.getFullYear(), 0, 1);
                    const pastDaysOfYear = (currentDate - firstDayOfYear) / 86400000;
                    const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
                    label = `${currentDate.getFullYear()}-week-${weekNumber.toString().padStart(2, '0')}`;
                    break;
                case 'month':
                case 'year':
                    label = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
                    break;
            }
            completeLabels.push(label);
            
            // 更新日期
            switch(currentPeriod) {
                case 'day':
                    currentDate.setDate(currentDate.getDate() + 1);
                    break;
                case 'week':
                    currentDate.setDate(currentDate.getDate() + 7);
                    break;
                case 'month':
                case 'year':
                    currentDate.setMonth(currentDate.getMonth() + 1);
                    break;
            }
        }
        
        // 初始化完整的销售数据和订单数据数组
        const completeSalesData = new Array(completeLabels.length).fill(0);
        const completeOrdersData = new Array(completeLabels.length).fill(0);
        
        // 处理API返回的数据
        if (data && Array.isArray(data)) {
            console.log('处理数组格式的销售趋势数据:', data);
            data.forEach(item => {
                const label = item.time_period;
                const dataIndex = completeLabels.indexOf(label);
                if (dataIndex !== -1) {
                    completeSalesData[dataIndex] = parseFloat(item.sales_amount) || 0;
                    completeOrdersData[dataIndex] = parseInt(item.orders_count) || 0;
                }
            });
        } else if (data && data.labels && Array.isArray(data.labels)) {
            console.log('处理对象格式的销售趋势数据:', data);
            
            // 检查数据是否来自1970年（错误数据）
            const hasInvalidData = data.labels.some(label => label.startsWith('1970'));
            if (hasInvalidData) {
                console.warn('检测到无效的历史数据（1970年），将使用当前生成的时间序列');
                // 使用已生成的空数据继续，不处理API返回的数据
            } else {
                // 直接使用API返回的数据填充到我们的完整数据集中
                data.labels.forEach((label, index) => {
                    // 尝试在我们生成的标签中找到匹配项
                    let dataIndex = completeLabels.indexOf(label);
                    
                    // 如果找不到精确匹配，尝试查找包含相同年月的标签
                    if (dataIndex === -1 && label.includes('-')) {
                        const labelParts = label.split('-');
                        const yearMonth = labelParts.slice(0, 2).join('-'); // 获取年-月部分
                        
                        // 查找包含相同年月的标签
                        dataIndex = completeLabels.findIndex(l => l.startsWith(yearMonth));
                    }
                    
                    if (dataIndex !== -1) {
                        // 确保数据是数字
                        const salesValue = parseFloat(data.sales[index]) || 0;
                        const ordersValue = parseInt(data.orders[index]) || 0;
                        
                        completeSalesData[dataIndex] = salesValue;
                        completeOrdersData[dataIndex] = ordersValue;
                    } else if (currentPeriod === 'month' && label.includes('-')) {
                        // 对于月视图，尝试匹配月份
                        const labelParts = label.split('-');
                        const month = parseInt(labelParts[1]);
                        const year = parseInt(labelParts[0]);
                        
                        // 只处理当年的数据
                        if (year === endDate.getFullYear()) {
                            // 查找当年对应月份的索引
                            const monthIndex = completeLabels.findIndex(l => {
                                const parts = l.split('-');
                                return parts[0] === labelParts[0] && parts[1] === labelParts[1];
                            });
                            
                            if (monthIndex !== -1) {
                                completeSalesData[monthIndex] = parseFloat(data.sales[index]) || 0;
                                completeOrdersData[monthIndex] = parseInt(data.orders[index]) || 0;
                            }
                        }
                    }
                });
            }
        } else if (!data) {
            console.warn('销售趋势数据为空，将显示空图表');
            // 即使没有数据，也会显示图表，因为completeLabels和completeSalesData已经初始化为0
        }
        
        // 格式化标签显示
        const formattedLabels = completeLabels.map(label => {
            if (currentPeriod === 'year' && label.includes('-')) {
                const parts = label.split('-');
                return parts[0] + '年' + parts[1] + '月';
            } else if (currentPeriod === 'month' && label.includes('-')) {
                const parts = label.split('-');
                return parts[1] + '月'; // 只显示月份，不显示年份，简化显示
            } else if (currentPeriod === 'week' && label.includes('week')) {
                const parts = label.split('-');
                return parts[0] + '年第' + parts[2] + '周';
            } else if (currentPeriod === 'day' && label.includes('-')) {
                try {
                    const date = new Date(label);
                    if (!isNaN(date.getTime())) {
                        return (date.getMonth() + 1) + '月' + date.getDate() + '日';
                    }
                } catch (error) {
                    console.warn('日期格式化错误:', error, label);
                }
            }
            return label;
        });
        
        // 对于月视图，特殊处理API返回的数据
        if (currentPeriod === 'month' && data && data.labels && Array.isArray(data.labels)) {
            // 检查是否有当前年份的数据
            const currentYear = endDate.getFullYear();
            data.labels.forEach((label, index) => {
                if (label.includes('-')) {
                    const parts = label.split('-');
                    const year = parseInt(parts[0]);
                    const month = parseInt(parts[1]);
                    
                    // 如果是当年的数据
                    if (year === currentYear) {
                        // 找到对应月份在completeLabels中的索引
                        const monthLabel = `${year}-${month.toString().padStart(2, '0')}`;
                        const monthIndex = completeLabels.findIndex(l => l.startsWith(monthLabel));
                        
                        if (monthIndex !== -1) {
                            // 更新销售额和订单数
                            completeSalesData[monthIndex] = parseFloat(data.sales[index]) || 0;
                            completeOrdersData[monthIndex] = parseInt(data.orders[index]) || 0;
                        }
                    }
                }
            });
        }
        
        // 安全销毁现有图表（如果存在）
        if (window.salesChart instanceof Chart) {
            try {
                window.salesChart.destroy();
            } catch (error) {
                console.error('销毁销售趋势图表时出错:', error);
            }
        } else if (window.salesChart) {
            // 如果salesChart存在但不是Chart实例，直接清除画布
            try {
                const canvas = document.getElementById('salesChart');
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            } catch (error) {
                console.error('清除画布时出错:', error);
            }
        }
        
        // 确保window.salesChart为null，以便创建新图表
        window.salesChart = null;
        
        // 获取周期文本
        const periodText = {
            day: '日',
            week: '周',
            month: '月',
            year: '年'
        }[currentPeriod] || '';
        
        // 调整图表容器大小，确保有合适的显示高度
        salesChartContainer.style.height = '400px'; // 增加高度以适应全宽显示
        
        // 创建新图表
        window.salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: formattedLabels,
                datasets: [{
                    label: `${periodText}销售额`,
                    data: completeSalesData,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                    pointBorderColor: 'rgba(54, 162, 235, 1)',
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: 'rgba(54, 162, 235, 1)',
                    pointHoverBorderColor: 'rgba(54, 162, 235, 1)',
                    pointHitRadius: 10,
                    fill: true,
                    tension: 0.1,
                    yAxisID: 'y'
                }, {
                    label: `${periodText}订单数`,
                    data: completeOrdersData,
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: 'rgba(255, 99, 132, 1)',
                    pointBorderColor: 'rgba(255, 99, 132, 1)',
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: 'rgba(255, 99, 132, 1)',
                    pointHoverBorderColor: 'rgba(255, 99, 132, 1)',
                    pointHitRadius: 10,
                    fill: false,
                    tension: 0.1,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000
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
                        ticks: {
                            maxRotation: 45,
                            minRotation: 0,
                            autoSkip: true, // 自动跳过部分标签以避免拥挤
                            maxTicksLimit: currentPeriod === 'month' ? 12 : (currentPeriod === 'week' ? 10 : 24) // 根据周期限制标签数量
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
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)',
                            drawBorder: true
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
                // 日期格式：05-20
                return safeLabels.map(label => {
                    // 确保label是字符串
                    const strLabel = String(label || '无日期');
                    if (strLabel.indexOf('-') !== -1) {
                        try {
                            const parts = strLabel.split('-');
                            if (parts.length >= 3) {
                                return `${parts[1]}-${parts[2]}`;
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
                // 月份格式：2023-05
                return safeLabels.map(label => {
                    // 确保label是字符串
                    const strLabel = String(label || '无日期');
                    if (strLabel.indexOf('-') !== -1) {
                        try {
                            const parts = strLabel.split('-');
                            if (parts.length >= 2) {
                                return `${parts[0]}年${parts[1]}月`;
                            }
                        } catch (error) {
                            console.warn('格式化月份标签出错:', error);
                        }
                    }
                    return strLabel;
                });
            case 'year':
                // 年份格式：2023年
                return safeLabels.map(label => {
                    // 确保label是字符串
                    const strLabel = String(label || '无日期');
                    if (strLabel.indexOf('-') !== -1) {
                        try {
                            return `${strLabel.split('-')[0]}年`;
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
        
        // 安全销毁现有图表（如果存在）
        if (window.categoryChart instanceof Chart) {
            try {
                window.categoryChart.destroy();
            } catch (error) {
                console.error('销毁分类占比图表时出错:', error);
            }
        } else if (window.categoryChart) {
            // 如果categoryChart存在但不是Chart实例，直接清除画布
            try {
                const canvas = document.getElementById('categoryChart');
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            } catch (error) {
                console.error('清除画布时出错:', error);
            }
        }
        
        // 确保window.categoryChart为null，以便创建新图表
        window.categoryChart = null;
        
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