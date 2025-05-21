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

// 销售趋势图表实例
let salesChart = null;

// 确保Chart.js全局可用
function initializeChart() {
    return new Promise((resolve, reject) => {
        // 检查Chart对象是否已经可用
        if (typeof window.Chart !== 'undefined') {
            resolve(window.Chart);
            return;
        }

        // 如果Chart对象不可用，创建并加载Chart.js脚本
        const chartScript = document.createElement('script');
        
        // 本地文件路径 (使用UMD版本)
        const localPath = '../js/lib/chart.umd.js';
        // 主CDN源 (使用UMD版本)
        const primaryCDN = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.umd.min.js';
        // 备用CDN源 (使用UMD版本)
        const fallbackCDN = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.umd.min.js';
        // 第二备用CDN源
        const secondFallbackCDN = 'https://unpkg.com/chart.js@3.9.1/dist/chart.umd.min.js';
        
        // 首先尝试加载本地文件
        console.log('尝试加载本地Chart.js文件:', localPath);
        chartScript.src = localPath;
        
        chartScript.onload = () => {
            console.log('本地Chart.js文件加载成功');
            window.Chart = Chart;
            resolve(window.Chart);
        };
        
        chartScript.onerror = () => {
            console.warn('本地Chart.js文件加载失败，尝试主CDN');
            chartScript.src = primaryCDN;
            
            chartScript.onload = () => {
                console.log('主CDN Chart.js加载成功');
                window.Chart = Chart;
                resolve(window.Chart);
            };
            
            chartScript.onerror = () => {
                console.warn('主CDN加载失败，尝试备用CDN');
                chartScript.src = fallbackCDN;
                
                chartScript.onload = () => {
                    console.log('备用CDN Chart.js加载成功');
                    window.Chart = Chart;
                    resolve(window.Chart);
                };
                
                chartScript.onerror = () => {
                    console.warn('备用CDN加载失败，尝试第二备用CDN');
                    chartScript.src = secondFallbackCDN;
                    
                    chartScript.onload = () => {
                        console.log('第二备用CDN Chart.js加载成功');
                        window.Chart = Chart;
                        resolve(window.Chart);
                    };
                    
                    chartScript.onerror = () => {
                        console.error('所有Chart.js源加载失败');
                        reject(new Error('无法加载Chart.js库'));
                    };
                };
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
        // 直接调用renderSalesChart函数，该函数内部会处理图表的销毁和重建
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

// 渲染销售趋势图表函数的声明提前到这里
// 这样可以确保在引用之前已经定义
function renderSalesChart(data) {
    const salesChartContainer = document.getElementById('salesChart');
    
    // 确保图表容器存在并设置明确的高度
    if (salesChartContainer) {
        salesChartContainer.style.height = '400px'; // 增加高度以适应全宽显示
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
        
        // 检查数据是否有效
        if (!data || (!Array.isArray(data) && (!data.labels || !Array.isArray(data.labels)))) {
            console.warn('销售趋势数据格式不正确或为空');
            data = { labels: [], sales: [], orders: [] };
        }
        
        // 处理数据
        let originalLabels = [];
        let originalSalesData = [];
        let originalOrdersData = [];
        
        // 根据数据格式处理
        if (Array.isArray(data)) {
            // 处理数组格式的数据
            originalLabels = data.map(item => item.time_period);
            originalSalesData = data.map(item => parseFloat(item.sales_amount) || 0);
            originalOrdersData = data.map(item => parseInt(item.orders_count) || 0);
        } else if (data.labels && Array.isArray(data.labels)) {
            // 处理对象格式的数据
            originalLabels = data.labels;
            originalSalesData = data.sales.map(val => parseFloat(val) || 0);
            originalOrdersData = data.orders.map(val => parseInt(val) || 0);
        }
        
        // 过滤掉1970年的无效数据
        const validDataIndices = originalLabels.map((label, index) => {
            if (typeof label === 'string' && label.startsWith('1970')) {
                return -1; // 标记为无效
            }
            return index; // 有效数据索引
        }).filter(index => index !== -1);
        
        // 只保留有效数据
        originalLabels = validDataIndices.map(index => originalLabels[index]);
        originalSalesData = validDataIndices.map(index => originalSalesData[index]);
        originalOrdersData = validDataIndices.map(index => originalOrdersData[index]);
        
        // 根据当前周期限制数据量并格式化显示标签
        let periodText = '';
        let xAxisTitle = '';
        
        // 生成完整的日期序列和对应的数据
        let displayLabels = [];
        let salesData = [];
        let ordersData = [];
        
        // 根据不同的时间周期生成完整的日期序列
        switch(currentPeriod) {
            case 'day':
                // 日表显示最近24天的完整日期序列
                periodText = '日';
                xAxisTitle = '日期';
                
                // 生成最近24天的完整日期序列
                const today = new Date();
                const dayLabels = [];
                
                // 如果有原始数据，找出最早和最晚的日期
                let earliestDate = today;
                let latestDate = today;
                
                if (originalLabels.length > 0) {
                    // 解析所有有效日期
                    const validDates = originalLabels
                        .map(label => new Date(label))
                        .filter(date => !isNaN(date.getTime()));
                    
                    if (validDates.length > 0) {
                        // 找出最早和最晚的日期
                        earliestDate = new Date(Math.min(...validDates.map(d => d.getTime())));
                        latestDate = new Date(Math.max(...validDates.map(d => d.getTime())));
                    }
                }
                
                // 确保至少显示24天的数据
                const dayRange = Math.max(
                    Math.ceil((latestDate - earliestDate) / (24 * 60 * 60 * 1000)) + 1,
                    24
                );
                
                // 生成完整的日期序列
                for (let i = 0; i < dayRange; i++) {
                    const date = new Date(latestDate);
                    date.setDate(date.getDate() - i);
                    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD格式
                    dayLabels.unshift(dateStr);
                }
                
                // 只保留最近24天
                if (dayLabels.length > 24) {
                    dayLabels.splice(0, dayLabels.length - 24);
                }
                
                // 为每个日期填充销售数据
                displayLabels = dayLabels.map(dateStr => {
                    const index = originalLabels.findIndex(label => label === dateStr);
                    if (index !== -1) {
                        salesData.push(originalSalesData[index]);
                        ordersData.push(originalOrdersData[index]);
                    } else {
                        salesData.push(0);
                        ordersData.push(0);
                    }
                    
                    // 格式化日期显示
                    try {
                        const date = new Date(dateStr);
                        return (date.getMonth() + 1) + '月' + date.getDate() + '日';
                    } catch (error) {
                        console.warn('日期格式化错误:', error, dateStr);
                        return dateStr;
                    }
                });
                break;
                
            case 'week':
                // 周表显示最近10周的完整周序列
                periodText = '周';
                xAxisTitle = '周';
                
                // 如果有原始数据，找出最早和最晚的日期
                let earliestWeekDate = new Date();
                let latestWeekDate = new Date();
                
                if (originalLabels.length > 0) {
                    // 尝试解析所有有效日期
                    const validDates = originalLabels
                        .map(label => {
                            try {
                                return new Date(label);
                            } catch (e) {
                                // 尝试解析 YYYY-week-WW 格式
                                if (label.includes('week')) {
                                    const parts = label.split('-week-');
                                    const year = parseInt(parts[0]);
                                    const week = parseInt(parts[1]);
                                    // 简单估算该周的日期（不精确但足够用于排序）
                                    const date = new Date(year, 0, 1);
                                    date.setDate(date.getDate() + (week - 1) * 7);
                                    return date;
                                }
                                return null;
                            }
                        })
                        .filter(date => date && !isNaN(date.getTime()));
                    
                    if (validDates.length > 0) {
                        // 找出最早和最晚的日期
                        earliestWeekDate = new Date(Math.min(...validDates.map(d => d.getTime())));
                        latestWeekDate = new Date(Math.max(...validDates.map(d => d.getTime())));
                    }
                }
                
                // 确保至少显示10周的数据
                const weekRange = Math.max(
                    Math.ceil((latestWeekDate - earliestWeekDate) / (7 * 24 * 60 * 60 * 1000)) + 1,
                    10
                );
                
                // 生成完整的周序列
                const weekLabels = [];
                for (let i = 0; i < weekRange; i++) {
                    const date = new Date(latestWeekDate);
                    date.setDate(date.getDate() - (i * 7));
                    
                    // 计算周数
                    const startOfYear = new Date(date.getFullYear(), 0, 1);
                    const days = Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000));
                    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
                    
                    // 使用标准格式存储，便于后续查找
                    const weekStr = `${date.getFullYear()}-week-${weekNumber}`;
                    weekLabels.unshift(weekStr);
                }
                
                // 只保留最近10周
                if (weekLabels.length > 10) {
                    weekLabels.splice(0, weekLabels.length - 10);
                }
                
                // 为每个周填充销售数据
                displayLabels = weekLabels.map(weekStr => {
                    // 查找原始数据中是否有匹配的周
                    const index = originalLabels.findIndex(label => {
                        // 尝试多种匹配方式
                        if (label === weekStr) return true;
                        
                        try {
                            // 尝试将原始标签解析为日期，然后计算周数进行比较
                            const date = new Date(label);
                            if (!isNaN(date.getTime())) {
                                const startOfYear = new Date(date.getFullYear(), 0, 1);
                                const days = Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000));
                                const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
                                const compareWeekStr = `${date.getFullYear()}-week-${weekNumber}`;
                                return compareWeekStr === weekStr;
                            }
                        } catch (e) {}
                        
                        return false;
                    });
                    
                    if (index !== -1) {
                        salesData.push(originalSalesData[index]);
                        ordersData.push(originalOrdersData[index]);
                    } else {
                        salesData.push(0);
                        ordersData.push(0);
                    }
                    
                    // 格式化周显示
                    const parts = weekStr.split('-week-');
                    return `${parts[0]}年第${parts[1]}周`;
                });
                break;
                
            case 'month':
                // 月表显示当年12个月的完整月份序列
                periodText = '月';
                xAxisTitle = '月份';
                
                // 获取当前年份
                const currentYear = new Date().getFullYear();
                
                // 生成当年12个月的完整月份序列
                const monthLabels = [];
                for (let month = 1; month <= 12; month++) {
                    monthLabels.push(`${currentYear}-${month.toString().padStart(2, '0')}`);
                }
                
                // 为每个月份填充销售数据
                displayLabels = monthLabels.map(monthStr => {
                    // 查找原始数据中是否有匹配的月份
                    const index = originalLabels.findIndex(label => {
                        // 尝试多种匹配方式
                        if (label === monthStr) return true;
                        
                        // 检查是否为YYYY-MM格式
                        if (label.startsWith(monthStr.substring(0, 7))) return true;
                        
                        // 检查是否为YYYY-MM-DD格式
                        if (label.startsWith(monthStr.substring(0, 7) + '-')) return true;
                        
                        // 检查是否为YYYY年MM月格式
                        const yearMonth = monthStr.split('-');
                        if (label.includes(`${yearMonth[0]}年${parseInt(yearMonth[1])}月`)) return true;
                        
                        return false;
                    });
                    
                    if (index !== -1) {
                        salesData.push(originalSalesData[index]);
                        ordersData.push(originalOrdersData[index]);
                    } else {
                        salesData.push(0);
                        ordersData.push(0);
                    }
                    
                    // 格式化月份显示
                    const parts = monthStr.split('-');
                    return `${parts[0]}年${parseInt(parts[1])}月`;
                });
                break;
                
            case 'year':
                // 年表显示最近5年的完整年份序列
                periodText = '年';
                xAxisTitle = '年份';
                
                // 获取当前年份
                const thisYear = new Date().getFullYear();
                
                // 生成最近5年的完整年份序列
                const yearLabels = [];
                for (let i = 0; i < 5; i++) {
                    yearLabels.push(`${thisYear - 4 + i}`);
                }
                
                // 为每个年份填充销售数据
                displayLabels = yearLabels.map(yearStr => {
                    // 查找原始数据中是否有匹配的年份
                    const index = originalLabels.findIndex(label => {
                        // 尝试多种匹配方式
                        if (label === yearStr) return true;
                        if (label.startsWith(yearStr + '-')) return true;
                        if (label.includes(yearStr + '年')) return true;
                        return false;
                    });
                    
                    if (index !== -1) {
                        salesData.push(originalSalesData[index]);
                        ordersData.push(originalOrdersData[index]);
                    } else {
                        salesData.push(0);
                        ordersData.push(0);
                    }
                    
                    // 年份显示不需要特殊格式化
                    return yearStr + '年';
                });
                break;
                
            default:
                periodText = '';
                xAxisTitle = '时间';
                // 使用原始数据
                displayLabels = originalLabels;
                salesData = originalSalesData;
                ordersData = originalOrdersData;
        }
        
        // 确保数据长度一致
        const maxLength = Math.max(displayLabels.length, salesData.length, ordersData.length);
        while (displayLabels.length < maxLength) displayLabels.push('无数据');
        while (salesData.length < maxLength) salesData.push(0);
        while (ordersData.length < maxLength) ordersData.push(0);
        
        // 始终显示图表，无论是否有实际数据
        const hasRealData = true;
        
        // 销售额和订单数量的最大值，用于设置Y轴刻度
        const maxSales = Math.max(...salesData, 1); // 至少为1，避免全0数据时的刻度问题
        const maxOrders = Math.max(...ordersData, 1); // 至少为1，避免全0数据时的刻度问题
        
        // 销售额Y轴的最大值（向上取整到最接近的整数）
        const salesYAxisMax = Math.ceil(maxSales * 1.1);
        // 订单数量Y轴的最大值（向上取整到最接近的整数）
        const ordersYAxisMax = Math.ceil(maxOrders * 1.1);
        
        // 销售额Y轴的刻度步长
        const salesYAxisStepSize = Math.ceil(salesYAxisMax / 5);
        // 订单数量Y轴的刻度步长
        const ordersYAxisStepSize = Math.ceil(ordersYAxisMax / 5);
        
        // 销售额格式化函数
        const salesFormatter = value => `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        // 订单数量格式化函数
        const ordersFormatter = value => value.toLocaleString('zh-CN');
        
        // 销售额图表配置
        const chartConfig = {
            type: 'line',
            data: {
                labels: displayLabels,
                datasets: [
                    {
                        label: `${periodText}销售额`,
                        data: salesData,
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 2,
                        tension: 0.4,
                        yAxisID: 'y',
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        fill: true,
                        pointBackgroundColor: 'rgba(75, 192, 192, 1)',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2
                    },
                    {
                        label: `${periodText}订单数`,
                        data: ordersData,
                        backgroundColor: 'rgba(255, 159, 64, 0.2)',
                        borderColor: 'rgba(255, 159, 64, 1)',
                        borderWidth: 2,
                        tension: 0.4,
                        yAxisID: 'y1',
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        fill: true,
                        pointBackgroundColor: 'rgba(255, 159, 64, 1)',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                },
                layout: {
                    padding: {
                        top: 20,
                        right: 20,
                        bottom: 20,
                        left: 20
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: `${periodText}销售趋势图表`,
                        font: {
                            size: 20,
                            weight: 'bold',
                            family: '"Microsoft YaHei", sans-serif'
                        },
                        padding: {
                            top: 20,
                            bottom: 20
                        },
                        color: '#333'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        titleColor: '#333',
                        bodyColor: '#666',
                        borderColor: 'rgba(0, 0, 0, 0.1)',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 6,
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    if (context.datasetIndex === 0) {
                                        label += salesFormatter(context.parsed.y);
                                    } else {
                                        label += ordersFormatter(context.parsed.y) + ' 单';
                                    }
                                }
                                return label;
                            }
                        }
                    },
                    legend: {
                        position: 'top',
                        align: 'center',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 14,
                                family: '"Microsoft YaHei", sans-serif'
                            },
                            color: '#666'
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
                                weight: 'bold',
                                family: '"Microsoft YaHei", sans-serif'
                            },
                            padding: {top: 15, bottom: 5},
                            color: '#666'
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: displayLabels.length > 12 ? 12 : displayLabels.length,
                            font: {
                                size: 12,
                                family: '"Microsoft YaHei", sans-serif'
                            },
                            color: '#666'
                        },
                        grid: {
                            display: true,
                            drawBorder: true,
                            drawOnChartArea: true,
                            drawTicks: true,
                            color: 'rgba(0, 0, 0, 0.05)',
                            borderDash: [5, 5]
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
                                weight: 'bold',
                                family: '"Microsoft YaHei", sans-serif'
                            },
                            color: '#666'
                        },
                        ticks: {
                            callback: function(value) {
                                return salesFormatter(value);
                            },
                            stepSize: salesYAxisStepSize,
                            font: {
                                size: 12,
                                family: '"Microsoft YaHei", sans-serif'
                            },
                            color: '#666',
                            padding: 8
                        },
                        min: 0,
                        max: salesYAxisMax,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            borderDash: [5, 5]
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '订单数量 (单)',
                            font: {
                                size: 14,
                                weight: 'bold',
                                family: '"Microsoft YaHei", sans-serif'
                            },
                            color: '#666'
                        },
                        ticks: {
                            callback: function(value) {
                                return ordersFormatter(value);
                            },
                            stepSize: ordersYAxisStepSize,
                            font: {
                                size: 12,
                                family: '"Microsoft YaHei", sans-serif'
                            },
                            color: '#666',
                            padding: 8
                        },
                        min: 0,
                        max: ordersYAxisMax,
                        grid: {
                            drawOnChartArea: false,
                            color: 'rgba(0, 0, 0, 0.05)',
                            borderDash: [5, 5]
                        }
                    }
                }
            }
        };
        
        // 销毁旧图表（如果存在）
        if (salesChart instanceof Chart) {
            try {
                salesChart.destroy();
            } catch (error) {
                console.warn('销毁旧图表失败:', error);
            } finally {
                salesChart = null;
            }
        }
        
        // 创建新图表
        salesChart = new Chart(ctx, chartConfig);
        console.log(`${periodText}销售趋势图表已渲染`);
    } catch (error) {
        console.error('渲染销售趋势图表失败:', error);
    }
}

// 导出为全局变量，供其他模块使用
window.loadDashboardData = loadDashboardData;
window.adminDashboard = { 
    init: loadDashboardData, 
    refresh: loadDashboardData,
    renderSalesChart: renderSalesChart // 导出renderSalesChart函数
};

// 确保renderSalesChart函数全局可用
window.renderSalesChart = renderSalesChart;

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
                
                // 直接调用renderSalesChart函数，确保使用新版本的双Y轴图表
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

// 渲染销售趋势图表函数已移至文件顶部
// 此处不再需要重复定义

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
        
        // 生成随机颜色，确保有足够的颜色
        const generateColors = (count) => {
            const baseColors = [
                '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b',
                '#5a5c69', '#6f42c1', '#fd7e14', '#20c9a6', '#858796'
            ];
            
            // 如果基础颜色足够，直接返回
            if (count <= baseColors.length) {
                return baseColors.slice(0, count);
            }
            
            // 否则生成额外的随机颜色
            const colors = [...baseColors];
            for (let i = baseColors.length; i < count; i++) {
                const r = Math.floor(Math.random() * 200) + 55; // 55-255
                const g = Math.floor(Math.random() * 200) + 55; // 55-255
                const b = Math.floor(Math.random() * 200) + 55; // 55-255
                colors.push(`rgb(${r}, ${g}, ${b})`);
            }
            return colors;
        };
        
        // 生成背景颜色和悬停颜色
        const backgroundColor = generateColors(labels.length);
        const hoverBackgroundColor = backgroundColor.map(color => {
            // 将颜色调暗一点作为悬停颜色
            if (color.startsWith('#')) {
                return color; // 简单起见，保持原色
            } else if (color.startsWith('rgb')) {
                return color.replace('rgb', 'rgba').replace(')', ', 0.8)');
            }
            return color;
        });
        
        // 销毁旧图表（如果存在）
        if (window.categoryChart instanceof Chart) {
            try {
                window.categoryChart.destroy();
            } catch (error) {
                console.warn('销毁旧图表失败:', error);
            } finally {
                window.categoryChart = null;
            }
        }
        
        // 图表配置
        const chartConfig = {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: backgroundColor,
                    hoverBackgroundColor: hoverBackgroundColor,
                    borderWidth: 1,
                    hoverBorderColor: 'rgba(234, 236, 244, 1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    title: {
                        display: true,
                        text: '商品分类占比',
                        font: {
                            size: 16
                        }
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw;
                                const total = context.dataset.data.reduce((acc, data) => acc + data, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        };
        
        // 创建新图表
        window.categoryChart = new Chart(ctx, chartConfig);
        console.log('分类占比图表已渲染');
    } catch (error) {
        console.error('渲染分类占比图表失败:', error);
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