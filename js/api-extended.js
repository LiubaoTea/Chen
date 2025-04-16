// 扩展API交互函数库

// API基础URL，与api.js保持一致
const API_BASE_URL = 'https://workers.liubaotea.online';

// 用户地址管理API
async function addUserAddress(addressData) {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            throw new Error('未登录');
        }

        const response = await fetch(`${API_BASE_URL}/api/addresses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(addressData)
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || '添加地址失败');
        }

        return data;
    } catch (error) {
        console.error('添加地址错误:', error);
        throw error;
    }
}

async function getUserAddresses() {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            throw new Error('未登录');
        }

        const response = await fetch(`${API_BASE_URL}/api/addresses`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || '获取地址列表失败');
        }

        return data;
    } catch (error) {
        console.error('获取地址列表错误:', error);
        throw error;
    }
}

async function updateUserAddress(addressId, addressData) {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            throw new Error('未登录');
        }

        const response = await fetch(`${API_BASE_URL}/api/addresses/${addressId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(addressData)
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || '更新地址失败');
        }

        return data;
    } catch (error) {
        console.error('更新地址错误:', error);
        throw error;
    }
}

async function deleteUserAddress(addressId) {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            throw new Error('未登录');
        }

        const response = await fetch(`${API_BASE_URL}/api/addresses/${addressId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || '删除地址失败');
        }

        return data;
    } catch (error) {
        console.error('删除地址错误:', error);
        throw error;
    }
}

// 用户设置API
async function getUserSettings() {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            throw new Error('未登录');
        }

        const response = await fetch(`${API_BASE_URL}/api/settings`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || '获取用户设置失败');
        }

        return data;
    } catch (error) {
        console.error('获取用户设置错误:', error);
        throw error;
    }
}

async function updateUserSettings(settings) {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            throw new Error('未登录');
        }

        const response = await fetch(`${API_BASE_URL}/api/settings`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(settings)
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || '更新用户设置失败');
        }

        return data;
    } catch (error) {
        console.error('更新用户设置错误:', error);
        throw error;
    }
}

// 商品分类API
async function getCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/categories`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || '获取分类列表失败');
        }

        return data;
    } catch (error) {
        console.error('获取分类列表错误:', error);
        throw error;
    }
}

async function getCategoryProducts(categoryId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/categories/${categoryId}/products`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || '获取分类商品失败');
        }

        return data;
    } catch (error) {
        console.error('获取分类商品错误:', error);
        throw error;
    }
}

// 商品评价API
async function addProductReview(reviewData) {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            throw new Error('未登录');
        }

        const response = await fetch(`${API_BASE_URL}/api/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(reviewData)
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || '添加评价失败');
        }

        return data;
    } catch (error) {
        console.error('添加评价错误:', error);
        throw error;
    }
}

async function getProductReviews(productId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/products/${productId}/reviews`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || '获取评价列表失败');
        }

        return data;
    } catch (error) {
        console.error('获取评价列表错误:', error);
        throw error;
    }
}

// 购物会话API
async function getShoppingSession() {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            throw new Error('未登录');
        }

        const response = await fetch(`${API_BASE_URL}/api/shopping-session`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || '获取购物会话失败');
        }

        return data;
    } catch (error) {
        console.error('获取购物会话错误:', error);
        throw error;
    }
}

async function updateShoppingSession(sessionData) {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            throw new Error('未登录');
        }

        const response = await fetch(`${API_BASE_URL}/api/shopping-session`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(sessionData)
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || '更新购物会话失败');
        }

        return data;
    } catch (error) {
        console.error('更新购物会话错误:', error);
        throw error;
    }
}

// 导出所有API函数
export {
    // 用户地址管理
    addUserAddress,
    getUserAddresses,
    updateUserAddress,
    deleteUserAddress,
    
    // 用户设置
    getUserSettings,
    updateUserSettings,
    
    // 商品分类
    getCategories,
    getCategoryProducts,
    
    // 商品评价
    addProductReview,
    getProductReviews,
    
    // 购物会话
    getShoppingSession,
    updateShoppingSession
};