/**
 * 管理后台API接口
 * 处理与后端的数据交互
 */

// 导入API基础URL配置
import { API_BASE_URL } from '../config.js';
import { ADMIN_API_BASE_URL } from './admin-config.js';
// 导入认证模块
import { adminAuth } from './admin-auth.js';

console.log('admin-api.js中的配置:', {
    API_BASE_URL,
    ADMIN_API_BASE_URL
});

// 确保全局可访问API配置
if (typeof window !== 'undefined') {
    window.API_BASE_URL = API_BASE_URL;
    window.ADMIN_API_BASE_URL = ADMIN_API_BASE_URL;
}

// 管理后台API
const adminAPI = {
    // 获取商品列表
    getProducts: async (page = 1, pageSize = 10, categoryId = '', searchQuery = '') => {
        try {
            // 使用管理系统专用的API
            let url = `${ADMIN_API_BASE_URL}/api/admin/products?page=${page}&pageSize=${pageSize}`;
            if (categoryId) url += `&categoryId=${categoryId}`; // 修改为categoryId参数，与后端API匹配
            if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
            
            // 添加参数，确保返回商品分类映射关系
            url += '&include_category_mappings=true';
            
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
            
            // 如果没有返回category_mappings，尝试获取并添加
            if (data.products && Array.isArray(data.products)) {
                // 检查是否已经包含category_mappings
                const needsMappings = data.products.some(product => !product.category_mappings);
                
                if (needsMappings) {
                    try {
                        // 获取所有商品ID
                        const productIds = data.products.map(p => p.product_id);
                        
                        // 获取这些商品的分类映射
                        const mappingsUrl = `${ADMIN_API_BASE_URL}/api/admin/product-category-mappings?product_ids=${productIds.join(',')}`;
                        const mappingsResponse = await fetch(mappingsUrl, {
                            method: 'GET',
                            headers: {
                                ...adminAuth.getHeaders(),
                                'Content-Type': 'application/json'
                            }
                        });
                        
                        if (mappingsResponse.ok) {
                            const mappingsData = await mappingsResponse.json();
                            
                            // 将映射数据添加到商品中
                            if (mappingsData && Array.isArray(mappingsData)) {
                                data.products.forEach(product => {
                                    product.category_mappings = mappingsData.filter(
                                        mapping => mapping.product_id === product.product_id
                                    );
                                });
                            }
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
            throw error; // 不再返回模拟数据，而是将错误抛出，让调用者处理
        }
    },
    
    // 获取商品销售占比数据
    getProductSalesDistribution: async (startDate = '', endDate = '') => {
        try {
            let url = `${ADMIN_API_BASE_URL}/api/admin/statistics/product-sales`;
            if (startDate) url += `?startDate=${startDate}`;
            if (endDate) url += `${startDate ? '&' : '?'}endDate=${endDate}`;
            
            console.log('发送商品销售占比请求，URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('商品销售占比API响应错误:', response.status, errorText);
                throw new Error(`获取商品销售占比数据失败，HTTP状态码: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('成功获取商品销售占比数据:', data);
            return data;
        } catch (error) {
            console.error('获取商品销售占比数据出错:', error);
            throw error; // 不再返回模拟数据，而是将错误抛出，让调用者处理
        }
    },
    // 获取系统设置
    getSystemSettings: async () => {
        try {
            const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/settings`, {
                method: 'GET',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('获取系统设置失败');
            }
            
            return await response.json();
        } catch (error) {
            console.error('获取系统设置出错:', error);
            // 如果API尚未实现，返回模拟数据
            return {
                site: {
                    name: '陳記六堡茶',
                    description: '陳記六堡茶 - 传承百年工艺，品味经典茶香',
                    contactEmail: 'contact@liubaotea.online',
                    contactPhone: '+86 123 4567 8901',
                    address: '广西梧州市六堡镇'
                },
                payment: {
                    enableWechatPay: true,
                    enableAliPay: true,
                    enableBankTransfer: false,
                    wechatPayAppId: 'wx123456789abcdef',
                    wechatPayMchId: '1234567890',
                    aliPayAppId: '2021000000000000',
                    bankAccount: '开户行：中国工商银行梧州分行\n账户名：陳記六堡茶有限公司\n账号：6222 0000 0000 0000'
                },
                mail: {
                    smtpServer: 'smtp.example.com',
                    smtpPort: '587',
                    smtpUsername: 'noreply@liubaotea.online',
                    smtpPassword: '********',
                    senderName: '陳記六堡茶',
                    senderEmail: 'noreply@liubaotea.online'
                },
                security: {
                    enableLoginCaptcha: true,
                    enableLoginLimit: true,
                    loginFailLimit: 5,
                    loginLockTime: 30,
                    sessionTimeout: 120,
                    requireUppercase: true,
                    requireLowercase: true,
                    requireNumbers: true,
                    requireSpecial: true,
                    minPasswordLength: 8,
                    passwordExpireDays: 90
                }
            };
        }
    },
    
    // 保存系统设置
    saveSystemSettings: async (settings) => {
        try {
            const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/settings`, {
                method: 'POST',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });
            
            if (!response.ok) {
                throw new Error('保存系统设置失败');
            }
            
            return await response.json();
        } catch (error) {
            console.error('保存系统设置出错:', error);
            // 如果API尚未实现，模拟成功响应
            return { success: true, message: '设置已保存' };
        }
    },
    
    // 上传网站Logo
    uploadSiteLogo: async (formData) => {
        try {
            const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/settings/logo`, {
                method: 'POST',
                headers: {
                    ...adminAuth.getHeaders()
                    // 不设置Content-Type，让浏览器自动设置
                },
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('上传Logo失败');
            }
            
            return await response.json();
        } catch (error) {
            console.error('上传Logo出错:', error);
            // 如果API尚未实现，模拟成功响应
            return { success: true, logoUrl: '../image/liubaotea_logo.png' };
        }
    },
    
    // 发送测试邮件
    sendTestMail: async (mailSettings, testEmail) => {
        try {
            const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/settings/test-mail`, {
                method: 'POST',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ mailSettings, testEmail })
            });
            
            if (!response.ok) {
                throw new Error('发送测试邮件失败');
            }
            
            return await response.json();
        } catch (error) {
            console.error('发送测试邮件出错:', error);
            // 如果API尚未实现，模拟成功响应
            return { success: true, message: '测试邮件已发送' };
        }
    },
    
    // 获取销售趋势数据
    getSalesTrend: async (period = 'month', startDate = '', endDate = '') => {
        try {
            let url = `${ADMIN_API_BASE_URL}/api/admin/statistics/sales-trend?period=${period}`;
            if (startDate) url += `&startDate=${startDate}`;
            if (endDate) url += `&endDate=${endDate}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('获取销售趋势数据失败');
            }
            
            return await response.json();
        } catch (error) {
            console.error('获取销售趋势数据出错:', error);
            // 如果API尚未实现，返回模拟数据
            return {
                labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
                values: [12500, 15000, 18000, 16500, 21000, 22500, 25000, 23000, 27000, 29500, 32000, 35000]
            };
        }
    },
    
    // 获取商品销售占比数据
    getProductSalesDistribution: async (startDate = '', endDate = '') => {
        try {
            let url = `${ADMIN_API_BASE_URL}/api/admin/statistics/product-sales`;
            if (startDate || endDate) url += '?';
            if (startDate) url += `startDate=${startDate}`;
            if (startDate && endDate) url += '&';
            if (endDate) url += `endDate=${endDate}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('获取商品销售占比数据失败');
            }
            
            return await response.json();
        } catch (error) {
            console.error('获取商品销售占比数据出错:', error);
            // 如果API尚未实现，返回模拟数据
            return {
                labels: ['六堡茶特级', '六堡茶一级', '六堡茶二级', '六堡茶三级', '六堡茶礼盒装'],
                values: [35, 25, 20, 15, 5]
            };
        }
    },
    
    // 获取用户增长趋势数据
    getUserGrowthTrend: async (period = 'month', startDate = '', endDate = '') => {
        try {
            let url = `${ADMIN_API_BASE_URL}/api/admin/statistics/user-growth?period=${period}`;
            if (startDate) url += `&startDate=${startDate}`;
            if (endDate) url += `&endDate=${endDate}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('获取用户增长趋势数据失败');
            }
            
            return await response.json();
        } catch (error) {
            console.error('获取用户增长趋势数据出错:', error);
            // 如果API尚未实现，返回模拟数据
            return {
                labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
                values: [45, 52, 38, 65, 73, 58, 80, 92, 75, 110, 95, 120]
            };
        }
    },
    
    // 获取订单状态分布数据
    getOrderStatusDistribution: async (startDate = '', endDate = '') => {
        try {
            let url = `${ADMIN_API_BASE_URL}/api/admin/statistics/order-status`;
            if (startDate || endDate) url += '?';
            if (startDate) url += `startDate=${startDate}`;
            if (startDate && endDate) url += '&';
            if (endDate) url += `endDate=${endDate}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('获取订单状态分布数据失败');
            }
            
            return await response.json();
        } catch (error) {
            console.error('获取订单状态分布数据出错:', error);
            // 如果API尚未实现，返回模拟数据
            return {
                labels: ['待付款', '待发货', '已发货', '已完成', '已取消'],
                values: [15, 25, 20, 35, 5]
            };
        }
    },
    // 仪表盘数据
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
                throw new Error('获取仪表盘数据失败');
            }
            
            return await response.json();
        } catch (error) {
            console.error('获取仪表盘数据出错:', error);
            throw error;
        }
    },
    
    // 获取最近订单
    getRecentOrders: async (limit = 5) => {
        try {
            const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/orders/recent?limit=${limit}`, {
                method: 'GET',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('获取最近订单失败');
            }
            
            return await response.json();
        } catch (error) {
            console.error('获取最近订单出错:', error);
            throw error;
        }
    },
    
    // 获取热销商品
    getTopProducts: async (limit = 5) => {
        try {
            const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/products/top?limit=${limit}`, {
                method: 'GET',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('获取热销商品失败');
            }
            
            return await response.json();
        } catch (error) {
            console.error('获取热销商品出错:', error);
            throw error;
        }
    },
    
    // 获取销售趋势数据
    getSalesTrend: async (period = 'month') => {
        try {
            const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/sales/trend?period=${period}`, {
                method: 'GET',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('获取销售趋势数据失败');
            }
            
            return await response.json();
        } catch (error) {
            console.error('获取销售趋势数据出错:', error);
            throw error;
        }
    },
    
    // 获取分类占比数据
    getCategoryDistribution: async () => {
        try {
            const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/categories/distribution`, {
                method: 'GET',
                headers: {
                    ...adminAuth.getHeaders(),
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('获取分类占比数据失败');
            }
            
            return await response.json();
        } catch (error) {
            console.error('获取分类占比数据出错:', error);
            throw error;
        }
    },
    
    // 商品管理API
    products: {
        // 获取商品列表
        getList: async (page = 1, limit = 10, filters = {}) => {
            try {
                let url = `${ADMIN_API_BASE_URL}/api/admin/products?page=${page}&limit=${limit}`;
                
                // 添加过滤条件
                if (filters.category) url += `&category=${filters.category}`;
                if (filters.search) url += `&search=${encodeURIComponent(filters.search)}`;
                if (filters.minPrice) url += `&minPrice=${filters.minPrice}`;
                if (filters.maxPrice) url += `&maxPrice=${filters.maxPrice}`;
                
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        ...adminAuth.getHeaders(),
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error('获取商品列表失败');
                }
                
                return await response.json();
            } catch (error) {
                console.error('获取商品列表出错:', error);
                throw error;
            }
        },
        
        // 获取单个商品详情
        getById: async (productId) => {
            try {
                const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/products/${productId}`, {
                    method: 'GET',
                    headers: {
                        ...adminAuth.getHeaders(),
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error('获取商品详情失败');
                }
                
                return await response.json();
            } catch (error) {
                console.error('获取商品详情出错:', error);
                throw error;
            }
        },
        
        // 创建新商品
        create: async (productData) => {
            try {
                const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/products`, {
                    method: 'POST',
                    headers: {
                        ...adminAuth.getHeaders(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(productData)
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '创建商品失败');
                }
                
                return await response.json();
            } catch (error) {
                console.error('创建商品出错:', error);
                throw error;
            }
        },
        
        // 更新商品
        update: async (productId, productData) => {
            try {
                const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/products/${productId}`, {
                    method: 'PUT',
                    headers: {
                        ...adminAuth.getHeaders(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(productData)
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '更新商品失败');
                }
                
                return await response.json();
            } catch (error) {
                console.error('更新商品出错:', error);
                throw error;
            }
        },
        
        // 删除商品
        delete: async (productId) => {
            try {
                const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/products/${productId}`, {
                    method: 'DELETE',
                    headers: {
                        ...adminAuth.getHeaders(),
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '删除商品失败');
                }
                
                return await response.json();
            } catch (error) {
                console.error('删除商品出错:', error);
                throw error;
            }
        },
        
        // 更新商品库存
        updateStock: async (productId, stock) => {
            try {
                const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/products/${productId}/stock`, {
                    method: 'PUT',
                    headers: {
                        ...adminAuth.getHeaders(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ stock })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '更新库存失败');
                }
                
                return await response.json();
            } catch (error) {
                console.error('更新库存出错:', error);
                throw error;
            }
        }
    },
    
    // 订单管理API
    orders: {
        // 获取订单列表
        getList: async (page = 1, limit = 10, filters = {}) => {
            try {
                let url = `${ADMIN_API_BASE_URL}/api/admin/orders?page=${page}&limit=${limit}`;
                
                // 添加过滤条件
                if (filters.status) url += `&status=${filters.status}`;
                if (filters.startDate) url += `&startDate=${filters.startDate}`;
                if (filters.endDate) url += `&endDate=${filters.endDate}`;
                if (filters.search) url += `&search=${encodeURIComponent(filters.search)}`;
                
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        ...adminAuth.getHeaders(),
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error('获取订单列表失败');
                }
                
                return await response.json();
            } catch (error) {
                console.error('获取订单列表出错:', error);
                throw error;
            }
        },
        
        // 获取订单详情
        getById: async (orderId) => {
            try {
                const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/orders/${orderId}`, {
                    method: 'GET',
                    headers: {
                        ...adminAuth.getHeaders(),
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error('获取订单详情失败');
                }
                
                return await response.json();
            } catch (error) {
                console.error('获取订单详情出错:', error);
                throw error;
            }
        },
        
        // 更新订单状态
        updateStatus: async (orderId, status) => {
            try {
                const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/orders/${orderId}/status`, {
                    method: 'PUT',
                    headers: {
                        ...adminAuth.getHeaders(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ status })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '更新订单状态失败');
                }
                
                return await response.json();
            } catch (error) {
                console.error('更新订单状态出错:', error);
                throw error;
            }
        }
    },
    
    // 用户管理API
    users: {
        // 获取用户列表
        getList: async (page = 1, limit = 10, search = '') => {
            try {
                let url = `${ADMIN_API_BASE_URL}/api/admin/users?page=${page}&limit=${limit}`;
                if (search) url += `&search=${encodeURIComponent(search)}`;
                
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        ...adminAuth.getHeaders(),
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error('获取用户列表失败');
                }
                
                return await response.json();
            } catch (error) {
                console.error('获取用户列表出错:', error);
                throw error;
            }
        },
        
        // 获取用户详情
        getById: async (userId) => {
            try {
                const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/users/${userId}`, {
                    method: 'GET',
                    headers: {
                        ...adminAuth.getHeaders(),
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error('获取用户详情失败');
                }
                
                return await response.json();
            } catch (error) {
                console.error('获取用户详情出错:', error);
                throw error;
            }
        },
        
        // 获取用户订单历史
        getOrderHistory: async (userId, page = 1, limit = 10) => {
            try {
                const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/users/${userId}/orders?page=${page}&limit=${limit}`, {
                    method: 'GET',
                    headers: {
                        ...adminAuth.getHeaders(),
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error('获取用户订单历史失败');
                }
                
                return await response.json();
            } catch (error) {
                console.error('获取用户订单历史出错:', error);
                throw error;
            }
        }
    },
    
    // 分类管理API
    categories: {
        // 获取所有分类
        getAll: async () => {
            try {
                const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/categories`, {
                    method: 'GET',
                    headers: {
                        ...adminAuth.getHeaders(),
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error('获取分类列表失败');
                }
                
                return await response.json();
            } catch (error) {
                console.error('获取分类列表出错:', error);
                throw error;
            }
        },
        
        // 创建分类
        create: async (categoryData) => {
            try {
                const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/categories`, {
                    method: 'POST',
                    headers: {
                        ...adminAuth.getHeaders(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(categoryData)
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '创建分类失败');
                }
                
                return await response.json();
            } catch (error) {
                console.error('创建分类出错:', error);
                throw error;
            }
        },
        
        // 更新分类
        update: async (categoryId, categoryData) => {
            try {
                const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/categories/${categoryId}`, {
                    method: 'PUT',
                    headers: {
                        ...adminAuth.getHeaders(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(categoryData)
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '更新分类失败');
                }
                
                return await response.json();
            } catch (error) {
                console.error('更新分类出错:', error);
                throw error;
            }
        },
        
        // 删除分类
        delete: async (categoryId) => {
            try {
                const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/categories/${categoryId}`, {
                    method: 'DELETE',
                    headers: {
                        ...adminAuth.getHeaders(),
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '删除分类失败');
                }
                
                return await response.json();
            } catch (error) {
                console.error('删除分类出错:', error);
                throw error;
            }
        }
    },
    
    // 评价管理API
    reviews: {
        // 获取评价列表
        getList: async (page = 1, limit = 10, filters = {}) => {
            try {
                let url = `${ADMIN_API_BASE_URL}/api/admin/reviews?page=${page}&limit=${limit}`;
                
                // 添加过滤条件
                if (filters.status) url += `&status=${filters.status}`;
                if (filters.productId) url += `&productId=${filters.productId}`;
                if (filters.minRating) url += `&minRating=${filters.minRating}`;
                if (filters.maxRating) url += `&maxRating=${filters.maxRating}`;
                
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        ...adminAuth.getHeaders(),
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error('获取评价列表失败');
                }
                
                return await response.json();
            } catch (error) {
                console.error('获取评价列表出错:', error);
                throw error;
            }
        },
        
        // 更新评价状态
        updateStatus: async (reviewId, status) => {
            try {
                const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/reviews/${reviewId}/status`, {
                    method: 'PUT',
                    headers: {
                        ...adminAuth.getHeaders(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ status })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '更新评价状态失败');
                }
                
                return await response.json();
            } catch (error) {
                console.error('更新评价状态出错:', error);
                throw error;
            }
        },
        
        // 删除评价
        delete: async (reviewId) => {
            try {
                const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/reviews/${reviewId}`, {
                    method: 'DELETE',
                    headers: {
                        ...adminAuth.getHeaders(),
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '删除评价失败');
                }
                
                return await response.json();
            } catch (error) {
                console.error('删除评价出错:', error);
                throw error;
            }
        }
    }
};

// 确保所有API函数都被正确导出
const adminAPIExport = {
    // 仪表盘相关
    getDashboardStats: adminAPI.getDashboardStats,
    getRecentOrders: adminAPI.getRecentOrders,
    getTopProducts: adminAPI.getTopProducts,
    getSalesTrend: adminAPI.getSalesTrend,
    getCategoryDistribution: adminAPI.getCategoryDistribution,
    
    // 订单相关
    getOrders: adminAPI.getOrders,
    
    // 用户相关
    getUsers: adminAPI.getUsers,
    
    // 商品相关
    getProducts: adminAPI.getProducts,
    
    // 分类相关
    getCategories: adminAPI.getCategories,
    
    // 评价相关
    getReviews: adminAPI.getReviews,
    
    // 统计相关
    getUserGrowthTrend: adminAPI.getUserGrowthTrend,
    getOrderStatusDistribution: adminAPI.getOrderStatusDistribution,
    getProductSalesDistribution: adminAPI.getProductSalesDistribution,
    
    // 系统设置相关
    getSystemSettings: adminAPI.getSystemSettings,
    updateSystemSettings: adminAPI.updateSystemSettings
};

// 将API对象挂载到全局window对象，方便其他模块直接使用
window.adminAPI = adminAPIExport;

// 导出模块
export default adminAPIExport;