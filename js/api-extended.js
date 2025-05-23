// API交互函数库扩展

// 导入API基础URL
import { API_BASE_URL } from './config.js';

// 用户地址管理API
async function addUserAddress(addressData) {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            throw new Error('未登录');
        }

        const response = await fetch(`${API_BASE_URL}/api/user/addresses`, {
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

        const response = await fetch(`${API_BASE_URL}/api/user/addresses`, {
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

        const response = await fetch(`${API_BASE_URL}/api/user/addresses/${addressId}`, {
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

        const response = await fetch(`${API_BASE_URL}/api/user/addresses/${addressId}`, {
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

        const response = await fetch(`${API_BASE_URL}/api/product-reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(reviewData)
        });

        // 检查响应状态
        if (!response.ok) {
            // 尝试解析错误响应
            let errorMessage = '添加评价失败';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (parseError) {
                // 如果响应不是JSON格式，直接使用响应文本
                const errorText = await response.text();
                errorMessage = errorText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        // 尝试解析成功响应
        try {
            const data = await response.json();
            return data;
        } catch (parseError) {
            // 如果响应不是JSON格式但状态码是成功的，返回一个基本成功对象
            return { success: true, message: '评价提交成功' };
        }
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