// API交互函数库

// API基础URL，根据实际部署环境修改
const API_BASE_URL = 'https://liubaotea.cyuan52.workers.dev';

// 用户注册
async function registerUser(username, email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || '注册失败');
        }

        return data;
    } catch (error) {
        console.error('注册错误:', error);
        throw error;
    }
}

// 用户登录
async function loginUser(username, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || '登录失败');
        }

        // 保存用户信息到本地存储
        localStorage.setItem('userToken', data.token);
        localStorage.setItem('username', data.username);
        localStorage.setItem('userEmail', data.email);

        return data;
    } catch (error) {
        console.error('登录错误:', error);
        throw error;
    }
}

// 获取用户信息
async function getUserInfo() {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            throw new Error('未登录');
        }

        const response = await fetch(`${API_BASE_URL}/api/user`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || '获取用户信息失败');
        }

        return data;
    } catch (error) {
        console.error('获取用户信息错误:', error);
        throw error;
    }
}

// 获取商品列表
async function getProducts(filters = {}) {
    try {
        // 构建查询参数
        const params = new URLSearchParams();
        if (filters.category) params.append('category', filters.category);
        if (filters.minPrice) params.append('minPrice', filters.minPrice);
        if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
        if (filters.year) params.append('year', filters.year);

        const url = `${API_BASE_URL}/api/products${params.toString() ? '?' + params.toString() : ''}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || '获取商品列表失败');
        }

        return data;
    } catch (error) {
        console.error('获取商品列表错误:', error);
        throw error;
    }
}

// 获取商品详情
async function getProductDetails(productId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/products/${productId}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || '获取商品详情失败');
        }

        return data;
    } catch (error) {
        console.error('获取商品详情错误:', error);
        throw error;
    }
}

// 创建订单
async function createOrder(items, shippingInfo, totalAmount) {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            throw new Error('未登录');
        }

        const response = await fetch(`${API_BASE_URL}/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ items, shippingInfo, totalAmount })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || '创建订单失败');
        }

        return data;
    } catch (error) {
        console.error('创建订单错误:', error);
        throw error;
    }
}

// 获取用户订单列表
async function getUserOrders() {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            throw new Error('未登录');
        }

        const response = await fetch(`${API_BASE_URL}/api/orders`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || '获取订单列表失败');
        }

        return data;
    } catch (error) {
        console.error('获取订单列表错误:', error);
        throw error;
    }
}

// 获取订单详情
async function getOrderDetails(orderId) {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            throw new Error('未登录');
        }

        const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || '获取订单详情失败');
        }

        return data;
    } catch (error) {
        console.error('获取订单详情错误:', error);
        throw error;
    }
}

// 退出登录
function logout() {
    localStorage.removeItem('userToken');
    localStorage.removeItem('username');
    localStorage.removeItem('userEmail');
    window.location.href = 'login.html';
}