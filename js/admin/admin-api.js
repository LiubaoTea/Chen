/**
 * 管理后台API接口
 * 处理与后端的数据交互
 */

// 导入配置和认证模块
import config, { API_BASE_URL } from '../config.js';
import adminConfig, { ADMIN_API_BASE_URL } from './admin-config.js';
import { adminAuth } from './admin-auth.js';

// 确保在控制台可以看到导入的配置
console.log('admin-api.js已加载，使用ES6模块方式');

console.log('admin-api.js中的配置:', {
    API_BASE_URL,
    ADMIN_API_BASE_URL
});

// 定义adminAPI对象
const adminAPIObject = {
    // 导出API配置
    API_BASE_URL,
    ADMIN_API_BASE_URL,
    // 导出辅助函数
    generateSalesTrendFromOrders: null, // 先声明，后面会定义
    generateProductSalesDistribution: null, // 先声明，后面会定义
    // 获取商品列表
    getProducts: async (page = 1, pageSize = 10, categoryId = '', searchQuery = '') => {
        try {
            // 使用管理系统专用的API
            let url = `${ADMIN_API_BASE_URL}/api/admin/products?page=${page}&pageSize=${pageSize}`;
            if (categoryId) url += `&categoryId=${categoryId}`; // 修改为categoryId参数，与后端API匹配
            if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
            
            // 添加参数，确保返回商品分类映射关系
            url += '&include_category_mappings=true';
            // 添加参数，确保返回所有商品（包括ID 1-18的商品）
            url += '&include_all=true';
            
            console.log('发送商品请求，URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('商品API响应错误:', response.status, errorText);
                throw new Error(`获取商品列表失败，HTTP状态码: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('成功获取商品数据:', data);
            
            // 确保返回的商品数据不重复
            if (data.products && Array.isArray(data.products)) {
                // 使用Map按商品ID去重
                const uniqueProductsMap = new Map();
                data.products.forEach(product => {
                    if (!uniqueProductsMap.has(product.product_id)) {
                        uniqueProductsMap.set(product.product_id, product);
                    }
                });
                // 更新为去重后的商品数组
                data.products = Array.from(uniqueProductsMap.values());
                
                // 获取所有商品ID
                const productIds = data.products.map(p => p.product_id);
                
                if (productIds.length > 0) {
                    try {
                        // 获取这些商品的分类映射
                        const mappings = await adminAPI.getProductCategoryMappings(productIds);
                        
                        // 将映射数据添加到商品中
                        if (mappings && Array.isArray(mappings)) {
                            data.products.forEach(product => {
                                product.category_mappings = mappings.filter(
                                    mapping => mapping.product_id === product.product_id
                                );
                            });
                        }
                    } catch (mappingError) {
                        console.warn('获取商品分类映射失败:', mappingError);
                        // 继续处理，不中断主流程
                    }
                }
            }
            
            return data;
        } catch (error) {
            console.error('获取商品列表出错:', error);
            throw error; // 不返回模拟数据，而是将错误抛出，让调用者处理
        }
    },
    
    // 获取商品分类映射
    getProductCategoryMappings: async (productIds) => {
        try {
            if (!productIds || !productIds.length) {
                return [];
            }
            
            // 确保商品ID不重复
            const uniqueProductIds = [...new Set(productIds)];
            
            // 添加参数，确保返回所有商品的分类映射
            const url = `${ADMIN_API_BASE_URL}/api/admin/product-category-mappings?product_ids=${uniqueProductIds.join(',')}&include_all=true`;
            console.log('发送商品分类映射请求，URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('商品分类映射API响应错误:', response.status, errorText);
                throw new Error(`获取商品分类映射失败，HTTP状态码: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('成功获取商品分类映射数据:', data);
            return data;
        } catch (error) {
            console.error('获取商品分类映射出错:', error);
            // 如果API尚未实现，返回空数组
            return [];
        }
    },
    // 获取仪表盘统计数据
    getDashboardStats: async () => {
        try {
            const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/dashboard/stats`, {
                method: 'GET',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('仪表盘API响应错误:', response.status, errorText);
                throw new Error(`获取仪表盘统计数据失败，HTTP状态码: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('成功获取仪表盘数据:', data);
            return data;
        } catch (error) {
            console.error('获取仪表盘统计数据出错:', error);
            throw error; // 不再返回模拟数据，而是将错误抛出，让调用者处理
        }
    },
    
    // 获取最近订单
    getRecentOrders: async (limit = 5) => {
        try {
            const url = `${ADMIN_API_BASE_URL}/api/admin/orders/recent?limit=${limit}`;
            console.log('发送最近订单请求，URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('最近订单API响应错误:', response.status, errorText);
                throw new Error(`获取最近订单失败，HTTP状态码: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('成功获取最近订单数据:', data);
            return data;
        } catch (error) {
            console.error('获取最近订单出错:', error);
            throw error; // 不再返回模拟数据，而是将错误抛出，让调用者处理
        }
    },
    
    // 获取热销商品
    getTopProducts: async (limit = 5, startDate = '', endDate = '') => {
        try {
            let url = `${ADMIN_API_BASE_URL}/api/admin/products/top?limit=${limit}`;
            if (startDate) url += `&startDate=${startDate}`;
            if (endDate) url += `&endDate=${endDate}`;
            
            console.log('发送热销商品请求，URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('热销商品API响应错误:', response.status, errorText);
                throw new Error(`获取热销商品失败，HTTP状态码: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('成功获取热销商品数据:', data);
            return data;
        } catch (error) {
            console.error('获取热销商品出错:', error);
            throw error; // 不再返回模拟数据，而是将错误抛出，让调用者处理
        }
    },
    
    // 获取销售趋势数据
    getSalesTrend: async (period = 'month', startDate = '', endDate = '') => {
        try {
            let url = `${ADMIN_API_BASE_URL}/api/admin/sales/trend?period=${period}`;
            if (startDate) url += `&startDate=${startDate}`;
            if (endDate) url += `&endDate=${endDate}`;
            
            // 添加参数，确保包含所有订单状态（包括待付款和已付款）
            url += '&include_all_status=true';
            
            console.log('发送销售趋势请求，URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('销售趋势API响应错误:', response.status, errorText);
                throw new Error(`获取销售趋势数据失败，HTTP状态码: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('成功获取销售趋势数据:', data);
            
            // 如果API返回的数据为空或无效，尝试从订单数据生成趋势
            if (!data || !data.labels || data.labels.length === 0 || 
                (data.sales && data.sales.every(val => val === 0)) && 
                (data.orders && data.orders.every(val => val === 0))) {
                
                console.log('API返回的销售趋势数据为空，尝试从订单数据生成趋势');
                
                // 获取订单数据来生成趋势
                try {
                    const ordersUrl = `${ADMIN_API_BASE_URL}/api/admin/orders?pageSize=1000`;
                    const ordersResponse = await fetch(ordersUrl, {
                        method: 'GET',
                        headers: {
                            ...adminAuth.getHeaders(),
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (ordersResponse.ok) {
                        const ordersData = await ordersResponse.json();
                        if (ordersData && ordersData.orders && ordersData.orders.length > 0) {
                            // 生成销售趋势数据
                            const trendData = adminAPIObject.generateSalesTrendFromOrders(ordersData.orders, period, startDate, endDate);
                            console.log('从订单数据生成的销售趋势:', trendData);
                            return trendData;
                        }
                    }
                } catch (ordersError) {
                    console.error('从订单数据生成销售趋势失败:', ordersError);
                }
            }
            
            return data;
        } catch (error) {
            console.error('获取销售趋势数据出错:', error);
            throw error; // 不再返回模拟数据，而是将错误抛出，让调用者处理
        }
    },
    
    // 从订单数据生成销售趋势
    generateSalesTrendFromOrders: (orders, period = 'month', startDate = '', endDate = '') => {
        // 如果没有订单数据，返回空趋势
        if (!orders || orders.length === 0) {
            return { labels: [], sales: [], orders: [] };
        }
        
        // 过滤掉1970年的无效数据
        orders = orders.filter(order => {
            if (!order.created_at) return false;
            const orderDate = new Date(order.created_at * 1000);
            return orderDate.getFullYear() > 1970;
        });
        
        // 如果过滤后没有订单数据，返回空趋势
        if (orders.length === 0) {
            return { labels: [], sales: [], orders: [] };
        }
        
        // 解析日期范围
        const start = startDate ? new Date(startDate) : new Date();
        start.setHours(0, 0, 0, 0);
        
        const end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999);
        
        // 根据周期设置日期格式和范围
        let dateFormat;
        let dateRange = [];
        let currentDate = new Date(start);
        
        switch (period) {
            case 'day':
                dateFormat = date => `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
                // 生成日期范围（每天）
                while (currentDate <= end) {
                    dateRange.push(dateFormat(currentDate));
                    currentDate.setDate(currentDate.getDate() + 1);
                }
                break;
                
            case 'week':
                // 修复周数计算逻辑
                dateFormat = date => {
                    const year = date.getFullYear();
                    const weekNumber = getWeekNumber(date);
                    // 返回格式：2023-W32 (符合ISO标准)
                    return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
                };
                
                // 生成日期范围（每周）
                const weekSet = new Set(); // 使用Set避免重复周
                while (currentDate <= end) {
                    const weekKey = dateFormat(currentDate);
                    weekSet.add(weekKey);
                    currentDate.setDate(currentDate.getDate() + 7);
                }
                dateRange = Array.from(weekSet);
                
                // 辅助函数：获取日期所在的周数（ISO标准）
                function getWeekNumber(date) {
                    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
                    const dayNum = d.getUTCDay() || 7;
                    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
                    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
                    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
                }
                break;
                
            case 'year':
                // 按年显示每个月的数据
                dateFormat = date => `${date.getFullYear()}年${(date.getMonth() + 1).toString().padStart(2, '0')}月`;
                
                // 生成日期范围（每月）
                const yearMonthSet = new Set(); // 使用Set避免重复月份
                while (currentDate <= end) {
                    yearMonthSet.add(dateFormat(currentDate));
                    currentDate.setMonth(currentDate.getMonth() + 1);
                }
                dateRange = Array.from(yearMonthSet);
                break;
                
            case 'month':
            default:
                // 确保月视图显示当年12个月
                const currentYear = new Date().getFullYear();
                dateFormat = date => {
                    // 只显示月份名称，不包含年份和日期
                    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
                    return monthNames[date.getMonth()];
                };
                
                // 生成当年12个月的日期范围
                for (let month = 0; month < 12; month++) {
                    const monthDate = new Date(currentYear, month, 1);
                    dateRange.push(dateFormat(monthDate));
                }
                break;
        }
        
        // 初始化销售额和订单数量数组
        const salesMap = {};
        const ordersCountMap = {};
        
        // 初始化每个日期的销售额和订单数量为0
        dateRange.forEach(date => {
            salesMap[date] = 0;
            ordersCountMap[date] = 0;
        });
        
        // 统计每个日期的销售额和订单数量
        orders.forEach(order => {
            // 确保订单有创建时间
            if (!order.created_at) return;
            
            // 转换时间戳为日期对象
            const orderDate = new Date(order.created_at * 1000);
            
            // 跳过1970年的无效数据
            if (orderDate.getFullYear() <= 1970) return;
            
            // 格式化订单日期
            const formattedDate = dateFormat(orderDate);
            
            // 如果该日期在范围内，累加销售额和订单数量
            if (salesMap.hasOwnProperty(formattedDate)) {
                // 累加销售额（包括待付款和已付款的订单）
                salesMap[formattedDate] += order.total_amount || 0;
                
                // 累加订单数量
                ordersCountMap[formattedDate] += 1;
            }
        });
        
        // 转换为数组格式返回
        return {
            labels: dateRange,
            sales: dateRange.map(date => salesMap[date] || 0),
            orders: dateRange.map(date => ordersCountMap[date] || 0)
        };
    },
    
    // 获取分类占比数据
    getCategoryDistribution: async () => {
        try {
            const url = `${ADMIN_API_BASE_URL}/api/admin/categories/distribution`;
            console.log('发送分类占比请求，URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('分类占比API响应错误:', response.status, errorText);
                throw new Error(`获取分类占比数据失败，HTTP状态码: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('成功获取分类占比数据:', data);
            return data;
        } catch (error) {
            console.error('获取分类占比数据出错:', error);
            throw error; // 不再返回模拟数据，而是将错误抛出，让调用者处理
        }
    },
    
    // 获取商品销售分布数据
    getProductSalesDistribution: async (startDate, endDate) => {
        try {
            // 构建API URL，添加日期参数
            let url = `${ADMIN_API_BASE_URL}/api/admin/products/sales-distribution`;
            if (startDate) url += `?startDate=${startDate}`;
            if (endDate) url += `${startDate ? '&' : '?'}endDate=${endDate}`;
            
            // 添加参数，确保包含所有订单状态（包括待付款和已付款）
            url += `${url.includes('?') ? '&' : '?'}include_all_status=true`;
            
            console.log('发送商品销售分布请求，URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('商品销售分布API响应错误:', response.status, errorText);
                throw new Error(`获取商品销售分布数据失败，HTTP状态码: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('成功获取商品销售分布数据:', data);
            
            // 确保数据格式一致
            let formattedData = data.map(item => ({
                name: item.name || item.product_name || '未知商品',
                value: item.value || item.amount || item.sales_amount || 0,
                amount: item.amount || item.sales_amount || item.value || 0,
                sold_count: item.sold_count || 0,
                percentage: item.percentage || 0
            }));
            
            // 检查是否有有效的销售数据
            const hasValidData = formattedData.some(item => 
                item.name !== '无销售数据' && (item.value > 0 || item.amount > 0 || item.sold_count > 0)
            );
            
            // 如果API返回的数据为空或无效，尝试从订单数据生成销售分布
            if (!hasValidData) {
                console.log('API返回的商品销售分布数据为空，尝试从订单数据生成');
                
                try {
                    // 获取订单数据
                    const ordersUrl = `${ADMIN_API_BASE_URL}/api/admin/orders?pageSize=1000`;
                    const ordersResponse = await fetch(ordersUrl, {
                        method: 'GET',
                        headers: {
                            ...adminAuth.getHeaders(),
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (ordersResponse.ok) {
                        const ordersData = await ordersResponse.json();
                        
                        // 获取商品数据
                        const productsUrl = `${ADMIN_API_BASE_URL}/api/admin/products?pageSize=1000`;
                        const productsResponse = await fetch(productsUrl, {
                            method: 'GET',
                            headers: {
                                ...adminAuth.getHeaders(),
                                'Content-Type': 'application/json'
                            }
                        });
                        
                        if (productsResponse.ok && ordersData && ordersData.orders && ordersData.orders.length > 0) {
                            const productsData = await productsResponse.json();
                            
                            // 生成商品销售分布数据
                            const distributionData = adminAPIObject.generateProductSalesDistribution(
                                ordersData.orders, 
                                productsData.products || [], 
                                startDate, 
                                endDate
                            );
                            
                            console.log('从订单数据生成的商品销售分布:', distributionData);
                            return distributionData;
                        }
                    }
                } catch (genError) {
                    console.error('从订单数据生成商品销售分布失败:', genError);
                }
            }
            
            return formattedData;
        } catch (error) {
            console.error('获取商品销售分布数据出错:', error);
            throw error;
        }
    },
    
    // 从订单数据生成商品销售分布
    generateProductSalesDistribution: (orders, products, startDate, endDate) => {
        // 如果没有订单数据，返回默认分布
        if (!orders || orders.length === 0) {
            return [{
                name: '无销售数据',
                value: 0,
                amount: 0,
                sold_count: 0,
                percentage: 100
            }];
        }
        
        // 解析日期范围
        const start = startDate ? new Date(startDate) : new Date(0); // 从1970年开始
        start.setHours(0, 0, 0, 0);
        
        const end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999);
        
        // 创建商品ID到名称的映射
        const productMap = {};
        if (products && products.length > 0) {
            products.forEach(product => {
                productMap[product.product_id] = product.name || product.product_name || `商品#${product.product_id}`;
            });
        }
        
        // 初始化商品销售统计
        const productSales = {};
        
        // 统计每个商品的销售额和销售数量
        orders.forEach(order => {
            // 确保订单有创建时间
            if (!order.created_at) return;
            
            // 转换时间戳为日期对象
            const orderDate = new Date(order.created_at * 1000);
            
            // 检查订单是否在日期范围内
            if (orderDate >= start && orderDate <= end) {
                // 处理订单中的商品
                if (order.items && Array.isArray(order.items)) {
                    order.items.forEach(item => {
                        const productId = item.product_id;
                        const productName = productMap[productId] || item.name || `商品#${productId}`;
                        const quantity = item.quantity || 1;
                        const price = item.price || 0;
                        const amount = price * quantity;
                        
                        // 累加商品销售额和数量
                        if (!productSales[productId]) {
                            productSales[productId] = {
                                name: productName,
                                value: 0,
                                amount: 0,
                                sold_count: 0
                            };
                        }
                        
                        productSales[productId].value += amount;
                        productSales[productId].amount += amount;
                        productSales[productId].sold_count += quantity;
                    });
                }
            }
        });
        
        // 转换为数组格式
        let salesArray = Object.values(productSales);
        
        // 如果没有销售数据，返回默认值
        if (salesArray.length === 0) {
            return [{
                name: '无销售数据',
                value: 0,
                amount: 0,
                sold_count: 0,
                percentage: 100
            }];
        }
        
        // 计算总销售额
        const totalSales = salesArray.reduce((sum, item) => sum + item.amount, 0);
        
        // 计算每个商品的销售百分比
        salesArray = salesArray.map(item => ({
            ...item,
            percentage: totalSales > 0 ? Math.round((item.amount / totalSales) * 100) : 0
        }));
        
        // 按销售额降序排序
        salesArray.sort((a, b) => b.amount - a.amount);
        
        return salesArray;
    },
    
    // 获取订单列表
    getOrders: async (page = 1, pageSize = 10, status = '', searchQuery = '') => {
        try {
            let url = `${ADMIN_API_BASE_URL}/api/admin/orders?page=${page}&pageSize=${pageSize}`;
            if (status) url += `&status=${status}`;
            if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
            
            console.log('发送订单列表请求，URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('订单列表API响应错误:', response.status, errorText);
                throw new Error(`获取订单列表失败，HTTP状态码: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('成功获取订单列表数据:', data);
            return data;
        } catch (error) {
            console.error('获取订单列表出错:', error);
            throw error; // 不再返回模拟数据，而是将错误抛出，让调用者处理
        }
    },
    
    // 获取用户列表
    getUsers: async (page = 1, pageSize = 10, searchQuery = '') => {
        try {
            let url = `${ADMIN_API_BASE_URL}/api/admin/users?page=${page}&pageSize=${pageSize}`;
            if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
            
            console.log('发送用户列表请求，URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('用户列表API响应错误:', response.status, errorText);
                throw new Error(`获取用户列表失败，HTTP状态码: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('成功获取用户列表数据:', data);
            return data;
        } catch (error) {
            console.error('获取用户列表出错:', error);
            throw error; // 不再返回模拟数据，而是将错误抛出，让调用者处理
        }
    },
    
    // 获取分类列表
    getCategories: async (page = 1, pageSize = 10, searchQuery = '') => {
        try {
            // 使用管理系统的categories API
            let url = `${ADMIN_API_BASE_URL}/api/admin/categories?page=${page}&pageSize=${pageSize}`;
            if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
            
            console.log('发送分类请求，URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('分类API响应错误:', response.status, errorText);
                throw new Error(`获取分类列表失败，HTTP状态码: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('成功获取分类数据:', data);
            
            // 处理不同的响应格式：/api/categories直接返回数组，而/api/admin/categories返回{categories:[...]}对象
            const categories = Array.isArray(data) ? data : (data.categories || []);
            
            return {
                categories: categories,
                totalPages: 1, // 目前API不支持分页，所以固定为1页
                currentPage: 1
            };
        } catch (error) {
            console.error('获取分类列表出错:', error);
            throw error; // 不再返回模拟数据，而是将错误抛出，让调用者处理
        }
    },
    
    // 获取分类详情
    getCategoryById: async (categoryId) => {
        try {
            // 使用管理系统的category API
            const url = `${ADMIN_API_BASE_URL}/api/admin/categories/${categoryId}`;
            
            console.log('发送分类详情请求，URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('分类详情API响应错误:', response.status, errorText);
                throw new Error(`获取分类详情失败，HTTP状态码: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('成功获取分类详情:', data);
            
            // 如果返回的是数组（可能是API返回了多个结果），取第一个
            if (Array.isArray(data) && data.length > 0) {
                return data[0];
            }
            
            // 如果返回的是对象，直接返回
            return data;
        } catch (error) {
            console.error('获取分类详情出错:', error);
            throw error;
        }
    },
    
    // 删除商品
    deleteProduct: async (productId) => {
        try {
            console.log('API层 - 开始删除商品，ID:', productId);
            
            // 首先删除商品分类映射关系
            try {
                console.log('API层 - 尝试删除商品分类映射关系');
                const mappingUrl = `${ADMIN_API_BASE_URL}/api/admin/product-category-mappings/${productId}`;
                console.log('API层 - 发送删除映射请求，URL:', mappingUrl);
                
                const mappingResponse = await fetch(mappingUrl, {
                    method: 'DELETE',
                    headers: {
                        ...adminAuth.getHeaders(),
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!mappingResponse.ok) {
                    console.warn('删除商品分类映射失败，继续删除商品:', mappingResponse.status);
                } else {
                    console.log('成功删除商品分类映射');
                }
            } catch (mappingError) {
                console.warn('删除商品分类映射出错，继续删除商品:', mappingError);
                // 继续执行，不中断主流程
            }
            
            // 然后删除商品本身
            const url = `${ADMIN_API_BASE_URL}/api/admin/products/${productId}`;
            console.log('API层 - 发送删除商品请求，URL:', url);
            
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('删除商品API响应错误:', response.status, errorText);
                throw new Error(`删除商品失败，HTTP状态码: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('API层 - 成功删除商品，响应数据:', data);
            return data;
        } catch (error) {
            console.error('API层 - 删除商品出错:', error);
            throw error;
        }
    },
    
    // 获取评价列表
    getReviews: async (page = 1, pageSize = 10, status = '', rating = '', searchQuery = '') => {
        try {
            let url = `${ADMIN_API_BASE_URL}/api/admin/reviews?page=${page}&pageSize=${pageSize}`;
            if (status) url += `&status=${status}`;
            if (rating) url += `&rating=${rating}`;
            if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
            
            console.log('发送评价列表请求，URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('评价列表API响应错误:', response.status, errorText);
                throw new Error(`获取评价列表失败，HTTP状态码: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('成功获取评价列表数据:', data);
            return data;
        } catch (error) {
            console.error('获取评价列表出错:', error);
            throw error; // 不再返回模拟数据，而是将错误抛出，让调用者处理
        }
    },
    
    // 获取用户增长趋势数据
    getUserGrowthTrend: async (period = 'month', startDate = '', endDate = '') => {
        try {
            let url = `${ADMIN_API_BASE_URL}/api/admin/statistics/user-growth?period=${period}`;
            if (startDate) url += `&startDate=${startDate}`;
            if (endDate) url += `&endDate=${endDate}`;
            
            console.log('发送用户增长趋势请求，URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('用户增长趋势API响应错误:', response.status, errorText);
                throw new Error(`获取用户增长趋势数据失败，HTTP状态码: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('成功获取用户增长趋势数据:', data);
            return data;
        } catch (error) {
            console.error('获取用户增长趋势数据出错:', error);
            throw error; // 不再返回模拟数据，而是将错误抛出，让调用者处理
        }
    },
    
    // 获取订单状态分布数据
    getOrderStatusDistribution: async (startDate = '', endDate = '') => {
        try {
            let url = `${ADMIN_API_BASE_URL}/api/admin/statistics/order-status`;
            if (startDate) url += `?startDate=${startDate}`;
            if (endDate) url += `${startDate ? '&' : '?'}endDate=${endDate}`;
            
            console.log('发送订单状态分布请求，URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('订单状态分布API响应错误:', response.status, errorText);
                throw new Error(`获取订单状态分布数据失败，HTTP状态码: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('成功获取订单状态分布数据:', data);
            return data;
        } catch (error) {
            console.error('获取订单状态分布数据出错:', error);
            throw error;
        }
    },

    // 获取系统设置
    getSystemSettings: async () => {
        try {
            const url = `${ADMIN_API_BASE_URL}/api/admin/settings`;
            console.log('发送系统设置请求，URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('系统设置API响应错误:', response.status, errorText);
                throw new Error(`获取系统设置失败，HTTP状态码: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('成功获取系统设置:', data);
            return data;
        } catch (error) {
            console.error('获取系统设置出错:', error);
            // 返回默认设置
            return {
                site: {
                    siteName: '陳記六堡茶',
                    siteDescription: '传承百年工艺，匠心制茶',
                    contactEmail: 'contact@liubaotea.com',
                    contactPhone: '123-456-7890',
                    address: '广西梧州'
                },
                payment: {
                    enableWechatPay: true,
                    enableAliPay: true
                },
                mail: {
                    smtpServer: 'smtp.example.com',
                    smtpPort: 587,
                    smtpUsername: 'notification@liubaotea.com'
                },
                security: {
                    enableTwoFactor: false,
                    sessionTimeout: 30
                }
            };
        }
    },
    
    // 更新系统设置
    updateSystemSettings: async (settings) => {
        try {
            const url = `${ADMIN_API_BASE_URL}/api/admin/settings`;
            console.log('发送更新系统设置请求，URL:', url);
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('更新系统设置API响应错误:', response.status, errorText);
                throw new Error(`更新系统设置失败，HTTP状态码: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('成功更新系统设置:', data);
            return data;
        } catch (error) {
            console.error('更新系统设置出错:', error);
            throw error;
        }
    },
    
    // 获取评价详情
    getReviewById: async (reviewId) => {
        try {
            const url = `${ADMIN_API_BASE_URL}/api/admin/reviews/${reviewId}`;
            console.log('发送评价详情请求，URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('评价详情API响应错误:', response.status, errorText);
                throw new Error(`获取评价详情失败，HTTP状态码: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('成功获取评价详情:', data);
            return data;
        } catch (error) {
            console.error('获取评价详情出错:', error);
            throw error;
        }
    },
    
    // 审核通过评价
    approveReview: async (reviewId) => {
        try {
            const url = `${ADMIN_API_BASE_URL}/api/admin/reviews/${reviewId}/approve`;
            console.log('发送审核通过评价请求，URL:', url);
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('审核通过评价API响应错误:', response.status, errorText);
                throw new Error(`审核通过评价失败，HTTP状态码: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('成功审核通过评价:', data);
            return data;
        } catch (error) {
            console.error('审核通过评价出错:', error);
            throw error;
        }
    },
    
    // 拒绝评价
    rejectReview: async (reviewId) => {
        try {
            const url = `${ADMIN_API_BASE_URL}/api/admin/reviews/${reviewId}/reject`;
            console.log('发送拒绝评价请求，URL:', url);
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('拒绝评价API响应错误:', response.status, errorText);
                throw new Error(`拒绝评价失败，HTTP状态码: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('成功拒绝评价:', data);
            return data;
        } catch (error) {
            console.error('拒绝评价出错:', error);
            throw error;
        }
    },
    
    // 回复评价
    replyReview: async (reviewId, content) => {
        try {
            const url = `${ADMIN_API_BASE_URL}/api/admin/reviews/${reviewId}/reply`;
            console.log('发送回复评价请求，URL:', url);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('回复评价API响应错误:', response.status, errorText);
                throw new Error(`回复评价失败，HTTP状态码: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('成功回复评价:', data);
            return data;
        } catch (error) {
            console.error('回复评价出错:', error);
            throw error;
        }
    },
    
    // 获取用户详情
    getUserDetails: async (userId) => {
        try {
            const url = `${ADMIN_API_BASE_URL}/api/admin/users/${userId}`;
            console.log('发送用户详情请求，URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('用户详情API响应错误:', response.status, errorText);
                throw new Error(`获取用户详情失败，HTTP状态码: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('成功获取用户详情:', data);
            
            // 获取用户的订单数据
            try {
                const userOrders = await adminAPI.getUserOrders(userId);
                if (userOrders && userOrders.orders) {
                    // 添加订单总数
                    data.orders_count = userOrders.total || userOrders.orders.length;
                    // 添加最近订单
                    data.recent_orders = userOrders.orders.slice(0, 5);
                    // 计算消费总额
                    data.total_spent = userOrders.orders.reduce((total, order) => {
                        return total + (parseFloat(order.total_amount) || 0);
                    }, 0);
                }
            } catch (ordersError) {
                console.warn('获取用户订单数据失败:', ordersError);
                // 设置默认值
                data.orders_count = data.orders_count || 0;
                data.recent_orders = data.recent_orders || [];
                data.total_spent = data.total_spent || 0;
            }
            
            return data;
        } catch (error) {
            console.error('获取用户详情出错:', error);
            throw error;
        }
    },
    
    // 更新用户状态
    updateUserStatus: async (userId, status) => {
        try {
            const url = `${ADMIN_API_BASE_URL}/api/admin/users/${userId}/status`;
            console.log('发送更新用户状态请求，URL:', url);
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('更新用户状态API响应错误:', response.status, errorText);
                throw new Error(`更新用户状态失败，HTTP状态码: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('成功更新用户状态:', data);
            return data;
        } catch (error) {
            console.error('更新用户状态出错:', error);
            throw error;
        }
    },
    
    // 获取用户订单
    getUserOrders: async (userId) => {
        try {
            const url = `${ADMIN_API_BASE_URL}/api/admin/users/${userId}/orders`;
            console.log('发送获取用户订单请求，URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('获取用户订单API响应错误:', response.status, errorText);
                throw new Error(`获取用户订单失败，HTTP状态码: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('成功获取用户订单:', data);
            return data;
        } catch (error) {
            console.error('获取用户订单出错:', error);
            throw error;
        }
    },
    
    // 保存系统设置
    saveSystemSettings: async (settings) => {
        try {
            const url = `${ADMIN_API_BASE_URL}/api/admin/settings`;
            console.log('发送保存系统设置请求，URL:', url);
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('保存系统设置API响应错误:', response.status, errorText);
                throw new Error(`保存系统设置失败，HTTP状态码: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('成功保存系统设置:', data);
            return data;
        } catch (error) {
            console.error('保存系统设置出错:', error);
            throw error;
        }
    }
};

// 将辅助函数赋值给adminAPIObject对象本身
adminAPIObject.generateSalesTrendFromOrders = adminAPIObject.generateSalesTrendFromOrders;
adminAPIObject.generateProductSalesDistribution = adminAPIObject.generateProductSalesDistribution;

// 创建adminAPI对象的实例
const adminAPI = adminAPIObject;

// 导出API配置和adminAPI对象
export { API_BASE_URL, ADMIN_API_BASE_URL };
export default adminAPIObject;

// 确保全局可访问adminAPI
if (typeof window !== 'undefined') {
    window.adminAPI = adminAPIObject;
}

