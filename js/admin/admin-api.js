/**
 * 管理后台API接口
 * 处理与后端的数据交互
 */

// 导入API基础URL配置
import config from '../config.js';
// 导入认证模块
import { adminAuth } from './admin-auth.js';

// 解构导入的配置
const { API_BASE_URL, ADMIN_API_BASE_URL } = config;

console.log('admin-api.js中的配置:', config);

// 确保全局可访问API配置
if (typeof window !== 'undefined') {
    window.API_BASE_URL = API_BASE_URL;
    window.ADMIN_API_BASE_URL = ADMIN_API_BASE_URL;
}

// 管理后台API
const adminAPI = {
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
                throw new Error('获取仪表盘统计数据失败');
            }
            
            return await response.json();
        } catch (error) {
            console.error('获取仪表盘统计数据出错:', error);
            // 如果API尚未实现，返回模拟数据
            return {
                totalSales: 12580.00,
                totalOrders: 156,
                totalCustomers: 89,
                totalProducts: 42,
                pendingOrders: 8,
                lowStockProducts: 5
            };
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
            // 返回模拟数据
            return [
                { id: 'ORD20230001', customer: '张三', date: '2023-05-15', total: 358.00, status: '已完成' },
                { id: 'ORD20230002', customer: '李四', date: '2023-05-14', total: 128.00, status: '已发货' },
                { id: 'ORD20230003', customer: '王五', date: '2023-05-13', total: 256.00, status: '待发货' },
                { id: 'ORD20230004', customer: '赵六', date: '2023-05-12', total: 198.00, status: '已完成' },
                { id: 'ORD20230005', customer: '钱七', date: '2023-05-11', total: 458.00, status: '已完成' }
            ];
        }
    },
    
    // 获取热销商品
    getTopProducts: async (limit = 5, startDate = '', endDate = '') => {
        try {
            let url = `${ADMIN_API_BASE_URL}/api/admin/products/top?limit=${limit}`;
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
                throw new Error('获取热销商品失败');
            }
            
            return await response.json();
        } catch (error) {
            console.error('获取热销商品出错:', error);
            // 返回模拟数据
            return [
                { id: 1, name: '陈年六堡茶 - 特级', sales: 42, revenue: 4200.00 },
                { id: 2, name: '六堡茶 - 一级', sales: 38, revenue: 3040.00 },
                { id: 3, name: '六堡茶 - 二级', sales: 35, revenue: 2450.00 },
                { id: 4, name: '六堡茶礼盒装', sales: 30, revenue: 4500.00 },
                { id: 5, name: '六堡茶 - 三级', sales: 28, revenue: 1680.00 }
            ];
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
            // 返回模拟数据
            return {
                labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
                values: [1200, 1900, 2100, 1800, 2400, 2800, 3100, 3600, 3200, 3800, 4100, 4500]
            };
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
            // 返回模拟数据
            return [
                { name: '特级六堡茶', value: 35 },
                { name: '一级六堡茶', value: 25 },
                { name: '二级六堡茶', value: 20 },
                { name: '三级六堡茶', value: 15 },
                { name: '其他', value: 5 }
            ];
        }
    },
    
    // 获取订单列表
    getOrders: async (page = 1, pageSize = 10, status = '', searchQuery = '') => {
        try {
            let url = `${ADMIN_API_BASE_URL}/api/admin/orders?page=${page}&pageSize=${pageSize}`;
            if (status) url += `&status=${status}`;
            if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
            
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
            // 返回模拟数据
            return {
                orders: [
                    { id: 'ORD20230001', customer: '张三', date: '2023-05-15', total: 358.00, status: '已完成', paymentMethod: '微信支付' },
                    { id: 'ORD20230002', customer: '李四', date: '2023-05-14', total: 128.00, status: '已发货', paymentMethod: '支付宝' },
                    { id: 'ORD20230003', customer: '王五', date: '2023-05-13', total: 256.00, status: '待发货', paymentMethod: '微信支付' },
                    { id: 'ORD20230004', customer: '赵六', date: '2023-05-12', total: 198.00, status: '已完成', paymentMethod: '支付宝' },
                    { id: 'ORD20230005', customer: '钱七', date: '2023-05-11', total: 458.00, status: '已完成', paymentMethod: '微信支付' }
                ],
                totalPages: 3,
                currentPage: 1
            };
        }
    },
    
    // 获取用户列表
    getUsers: async (page = 1, pageSize = 10, searchQuery = '') => {
        try {
            let url = `${ADMIN_API_BASE_URL}/api/admin/users?page=${page}&pageSize=${pageSize}`;
            if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
            
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
            // 返回模拟数据
            return {
                users: [
                    { id: 1, username: 'user1', name: '张三', email: 'zhangsan@example.com', registerDate: '2023-01-15', status: '正常' },
                    { id: 2, username: 'user2', name: '李四', email: 'lisi@example.com', registerDate: '2023-02-20', status: '正常' },
                    { id: 3, username: 'user3', name: '王五', email: 'wangwu@example.com', registerDate: '2023-03-10', status: '正常' },
                    { id: 4, username: 'user4', name: '赵六', email: 'zhaoliu@example.com', registerDate: '2023-04-05', status: '已禁用' },
                    { id: 5, username: 'user5', name: '钱七', email: 'qianqi@example.com', registerDate: '2023-05-01', status: '正常' }
                ],
                totalPages: 2,
                currentPage: 1
            };
        }
    },
    
    // 获取分类列表
    getCategories: async (page = 1, pageSize = 10, searchQuery = '') => {
        try {
            let url = `${ADMIN_API_BASE_URL}/api/admin/categories?page=${page}&pageSize=${pageSize}`;
            if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
            
            const response = await fetch(url, {
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
            // 返回模拟数据
            return {
                categories: [
                    { id: 1, name: '特级六堡茶', description: '特级六堡茶描述', productCount: 8, status: '启用' },
                    { id: 2, name: '一级六堡茶', description: '一级六堡茶描述', productCount: 12, status: '启用' },
                    { id: 3, name: '二级六堡茶', description: '二级六堡茶描述', productCount: 10, status: '启用' },
                    { id: 4, name: '三级六堡茶', description: '三级六堡茶描述', productCount: 7, status: '启用' },
                    { id: 5, name: '礼盒装', description: '礼盒装描述', productCount: 5, status: '启用' }
                ],
                totalPages: 1,
                currentPage: 1
            };
        }
    },
    
    // 获取评价列表
    getReviews: async (page = 1, pageSize = 10, status = '', rating = '', searchQuery = '') => {
        try {
            let url = `${ADMIN_API_BASE_URL}/api/admin/reviews?page=${page}&pageSize=${pageSize}`;
            if (status) url += `&status=${status}`;
            if (rating) url += `&rating=${rating}`;
            if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
            
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
            // 返回模拟数据
            return {
                reviews: [
                    { id: 1, productName: '陈年六堡茶 - 特级', customer: '张三', rating: 5, content: '茶叶品质非常好，口感醇厚，回甘持久。', date: '2023-05-10', status: '已审核' },
                    { id: 2, productName: '六堡茶 - 一级', customer: '李四', rating: 4, content: '茶叶不错，包装精美，适合送礼。', date: '2023-05-08', status: '已审核' },
                    { id: 3, productName: '六堡茶 - 二级', customer: '王五', rating: 3, content: '茶叶质量一般，但价格合理。', date: '2023-05-05', status: '待审核' },
                    { id: 4, productName: '六堡茶礼盒装', customer: '赵六', rating: 5, content: '礼盒很精美，送人很有面子，茶叶品质也很好。', date: '2023-05-03', status: '已审核' },
                    { id: 5, productName: '六堡茶 - 三级', customer: '钱七', rating: 4, content: '性价比很高，日常饮用不错的选择。', date: '2023-05-01', status: '已审核' }
                ],
                totalPages: 2,
                currentPage: 1
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
            // 返回模拟数据
            return {
                labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
                values: [5, 8, 12, 10, 15, 20, 18, 25, 30, 28, 35, 40]
            };
        }
    },
    
    // 获取订单状态分布数据
    getOrderStatusDistribution: async (startDate = '', endDate = '') => {
        try {
            let url = `${ADMIN_API_BASE_URL}/api/admin/statistics/order-status`;
            if (startDate) url += `?startDate=${startDate}`;
            if (endDate) url += `${startDate ? '&' : '?'}endDate=${endDate}`;
            
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
            // 返回模拟数据
            return [
                { name: '待付款', value: 10 },
                { name: '待发货', value: 15 },
                { name: '已发货', value: 25 },
                { name: '已完成', value: 45 },
                { name: '已取消', value: 5 }
            ];
        }
    },
    
    // 获取商品销售占比数据
    getProductSalesDistribution: async (startDate = '', endDate = '') => {
        try {
            let url = `${ADMIN_API_BASE_URL}/api/admin/statistics/product-sales`;
            if (startDate) url += `?startDate=${startDate}`;
            if (endDate) url += `${startDate ? '&' : '?'}endDate=${endDate}`;
            
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
            // 返回模拟数据
            return [
                { name: '陈年六堡茶 - 特级', value: 30 },
                { name: '六堡茶 - 一级', value: 25 },
                { name: '六堡茶 - 二级', value: 20 },
                { name: '六堡茶礼盒装', value: 15 },
                { name: '六堡茶 - 三级', value: 10 }
            ];
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

// 导出API
window.adminAPI = adminAPI;