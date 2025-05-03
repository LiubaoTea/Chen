/**
 * 管理后台API接口
 * 处理与后端的数据交互
 */

// 导入API基础URL配置
import config from '../config.js';

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