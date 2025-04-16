// 购物车功能实现

// 获取购物车状态
async function getCartStatus() {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            throw new Error('未登录');
        }

        const response = await fetch(`${API_BASE_URL}/api/cart`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '获取购物车状态失败');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('获取购物车状态失败:', error);
        throw error;
    }
}

// 更新购物车图标数量
async function updateCartCount() {
    try {
        const cartData = await getCartStatus();
        const cartCount = cartData.items.reduce((total, item) => total + item.quantity, 0);
        
        // 更新购物车图标上的数量显示
        const cartCountElement = document.querySelector('.cart-count');
        if (cartCountElement) {
            cartCountElement.textContent = cartCount;
            cartCountElement.style.display = cartCount > 0 ? 'block' : 'none';
        }
    } catch (error) {
        console.error('更新购物车数量失败:', error);
        // 如果是未登录错误，不显示错误提示
        if (error.message !== '未登录') {
            alert('更新购物车状态失败，请稍后重试');
        }
    }
}

// 添加商品到购物车
async function addToCart(productId, quantity = 1) {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            // 未登录时跳转到登录页面
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/cart/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                productId,
                quantity
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '添加到购物车失败');
        }

        // 更新购物车状态
        await updateCartCount();
        
        // 显示成功提示
        alert('成功加入购物车！');
    } catch (error) {
        console.error('添加到购物车失败:', error);
        alert('添加到购物车失败，请稍后重试');
    }
}

// 从购物车中移除商品
async function removeFromCart(productId) {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            throw new Error('未登录');
        }

        const response = await fetch(`${API_BASE_URL}/api/cart/remove`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ productId })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '从购物车移除商品失败');
        }

        // 更新购物车状态
        await updateCartCount();
    } catch (error) {
        console.error('从购物车移除商品失败:', error);
        alert('从购物车移除商品失败，请稍后重试');
    }
}

// 更新购物车中商品数量
async function updateCartItemQuantity(productId, quantity) {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            throw new Error('未登录');
        }

        const response = await fetch(`${API_BASE_URL}/api/cart/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                productId,
                quantity
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '更新购物车商品数量失败');
        }

        // 更新购物车状态
        await updateCartCount();
    } catch (error) {
        console.error('更新购物车商品数量失败:', error);
        alert('更新购物车商品数量失败，请稍后重试');
    }
}

// 清空购物车
async function clearCart() {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            throw new Error('未登录');
        }

        const response = await fetch(`${API_BASE_URL}/api/cart/clear`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '清空购物车失败');
        }

        // 更新购物车状态
        await updateCartCount();
    } catch (error) {
        console.error('清空购物车失败:', error);
        alert('清空购物车失败，请稍后重试');
    }
}

// 页面加载完成后初始化购物车状态
document.addEventListener('DOMContentLoaded', () => {
    // 更新购物车图标数量
    updateCartCount();
});