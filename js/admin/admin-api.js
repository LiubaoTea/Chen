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
            return data;
        } catch (error) {
            console.error('获取销售趋势数据出错:', error);
            throw error; // 不再返回模拟数据，而是将错误抛出，让调用者处理
        }
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
    
    // 获取商品销售分布数据（使用分类占比数据作为替代）
    getProductSalesDistribution: async (startDate, endDate) => {
        try {
            // 构建API URL，添加日期参数
            let url = `${ADMIN_API_BASE_URL}/api/admin/products/sales-distribution`;
            if (startDate) url += `?startDate=${startDate}`;
            if (endDate) url += `${startDate ? '&' : '?'}endDate=${endDate}`;
            
            console.log('发送商品销售分布请求，URL:', url);
            
            try {
                // 尝试调用专门的销售分布API
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        ...adminAuth.getHeaders(),
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('成功获取商品销售分布数据:', data);
                    return data;
                }
                
                // 如果API返回错误，使用分类占比数据作为替代
                console.warn('商品销售分布API不可用，使用分类占比数据作为替代');
            } catch (apiError) {
                console.warn('商品销售分布API调用失败，使用分类占比数据作为替代:', apiError);
            }
            
            // 使用分类占比数据作为替代
            const categoryData = await adminAPI.getCategoryDistribution();
            
            // 转换数据格式以适应销售分布图表
            const salesDistributionData = categoryData.map(category => ({
                name: category.category_name || category.name || '未分类',
                value: category.product_count || category.count || 0,
                percentage: category.percentage || 0
            }));
            
            console.log('成功获取商品销售分布数据(使用分类占比替代):', salesDistributionData);
            return salesDistributionData;
        } catch (error) {
            console.error('获取商品销售分布数据出错:', error);
            throw error;
        }
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
    }
};

// 创建adminAPI对象的实例
const adminAPI = adminAPIObject;

// 导出API配置和adminAPI对象
export { API_BASE_URL, ADMIN_API_BASE_URL };
export default adminAPIObject;

// 确保全局可访问adminAPI
if (typeof window !== 'undefined') {
    window.adminAPI = adminAPIObject;
}

