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

// 更新购物车UI
async function updateCartUI() {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            document.getElementById('emptyCart').style.display = 'block';
            document.getElementById('cartItemList').style.display = 'none';
            document.getElementById('cartFooter').style.display = 'none';
            return;
        }

        const cartItems = await getCartStatus();
        const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
        
        // 更新购物车图标上的数量显示
        const cartCountElement = document.querySelector('.cart-count');
        if (cartCountElement) {
            cartCountElement.textContent = cartCount;
            cartCountElement.style.display = cartCount > 0 ? 'block' : 'none';
        }

        const cartItemList = document.getElementById('cartItemList');
        const emptyCart = document.getElementById('emptyCart');
        const cartFooter = document.getElementById('cartFooter');

        if (cartItems.length === 0) {
            emptyCart.style.display = 'block';
            cartItemList.style.display = 'none';
            cartFooter.style.display = 'none';
        } else {
            emptyCart.style.display = 'none';
            cartItemList.style.display = 'block';
            cartFooter.style.display = 'block';
            
            // 清空购物车列表
            cartItemList.innerHTML = '';
            
            // 计算总价
            let totalPrice = 0;
            
            // 添加购物车商品
            cartItems.forEach((item) => {
                const cartItem = document.createElement('div');
                cartItem.className = 'cart-item';
                cartItem.innerHTML = `
                    <div class="cart-item-image">
                        <img src="${item.image_url}" alt="${item.name}">
                    </div>
                    <div class="cart-item-details">
                        <h4 class="cart-item-name">${item.name}</h4>
                        <div class="cart-item-price">¥${item.price.toFixed(2)}</div>
                        <div class="cart-item-quantity">
                            <button class="quantity-btn minus" data-cart-id="${item.cart_id}">-</button>
                            <input type="number" value="${item.quantity}" min="1" max="99" data-cart-id="${item.cart_id}">
                            <button class="quantity-btn plus" data-cart-id="${item.cart_id}">+</button>
                            <button class="remove-item" data-cart-id="${item.cart_id}">删除</button>
                        </div>
                    </div>
                `;
                
                cartItemList.appendChild(cartItem);
                
                // 计算小计
                totalPrice += item.price * item.quantity;
            });
            
            // 更新总价
            document.querySelector('.total-price').textContent = `¥${totalPrice.toFixed(2)}`;
            
            // 添加数量按钮事件
            initCartItemEvents();
        }
    } catch (error) {
        console.error('更新购物车UI失败:', error);
        if (error.message !== '未登录') {
            alert('更新购物车状态失败，请稍后重试');
        }
    }
}

// 初始化购物车商品事件
function initCartItemEvents() {
    const cartItemList = document.getElementById('cartItemList');
    
    // 数量减少按钮
    cartItemList.querySelectorAll('.minus').forEach(button => {
        button.addEventListener('click', async function() {
            const cartId = this.getAttribute('data-cart-id');
            const input = cartItemList.querySelector(`input[data-cart-id="${cartId}"]`);
            const currentQuantity = parseInt(input.value);
            
            if (currentQuantity > 1) {
                await updateCartItemQuantity(cartId, currentQuantity - 1);
                await updateCartUI();
            }
        });
    });
    
    // 数量增加按钮
    cartItemList.querySelectorAll('.plus').forEach(button => {
        button.addEventListener('click', async function() {
            const cartId = this.getAttribute('data-cart-id');
            const input = cartItemList.querySelector(`input[data-cart-id="${cartId}"]`);
            const currentQuantity = parseInt(input.value);
            
            if (currentQuantity < 99) {
                await updateCartItemQuantity(cartId, currentQuantity + 1);
                await updateCartUI();
            }
        });
    });
    
    // 数量输入框
    cartItemList.querySelectorAll('input[type="number"]').forEach(input => {
        input.addEventListener('change', async function() {
            const cartId = this.getAttribute('data-cart-id');
            let value = parseInt(this.value);
            
            if (value < 1) value = 1;
            if (value > 99) value = 99;
            
            await updateCartItemQuantity(cartId, value);
            await updateCartUI();
        });
    });
    
    // 删除按钮
    cartItemList.querySelectorAll('.remove-item').forEach(button => {
        button.addEventListener('click', async function() {
            const cartId = this.getAttribute('data-cart-id');
            await removeFromCart(cartId);
            await updateCartUI();
        });
    });
}

// 添加商品到购物车
async function addToCart(productId, quantity = 1) {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
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

        await updateCartUI();
        alert('成功加入购物车！');
        
        // 显示购物车侧边栏
        const cartSidebar = document.getElementById('cartSidebar');
        const cartOverlay = document.getElementById('cartOverlay');
        if (cartSidebar && cartOverlay) {
            cartSidebar.classList.add('active');
            cartOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    } catch (error) {
        console.error('添加到购物车失败:', error);
        alert('添加到购物车失败，请稍后重试');
    }
}

// 从购物车中移除商品
async function removeFromCart(cartId) {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            throw new Error('未登录');
        }

        const response = await fetch(`${API_BASE_URL}/api/cart/remove`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ cartId })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '从购物车移除商品失败');
        }

        await updateCartUI();
    } catch (error) {
        console.error('从购物车移除商品失败:', error);
        alert('从购物车移除商品失败，请稍后重试');
    }
}

// 更新购物车中商品数量
async function updateCartItemQuantity(cartId, quantity) {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            throw new Error('未登录');
        }

        const response = await fetch(`${API_BASE_URL}/api/cart/update`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                cartId,
                quantity
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '更新购物车商品数量失败');
        }

        await updateCartUI();
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

        await updateCartUI();
    } catch (error) {
        console.error('清空购物车失败:', error);
        alert('清空购物车失败，请稍后重试');
    }
}

// 初始化购物车功能
function initCart() {
    const cartToggle = document.getElementById('cartToggle');
    const cartSidebar = document.getElementById('cartSidebar');
    const cartOverlay = document.getElementById('cartOverlay');
    const closeCart = document.getElementById('closeCart');
    const clearCartBtn = document.getElementById('clearCart');
    
    // 打开购物车
    if (cartToggle && cartSidebar && cartOverlay) {
        cartToggle.addEventListener('click', function(e) {
            e.preventDefault();
            cartSidebar.classList.add('active');
            cartOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            updateCartUI();
        });
    }
    
    // 关闭购物车
    if (closeCart && cartSidebar && cartOverlay) {
        closeCart.addEventListener('click', function() {
            cartSidebar.classList.remove('active');
            cartOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
        
        cartOverlay.addEventListener('click', function() {
            cartSidebar.classList.remove('active');
            cartOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
    
    // 清空购物车
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', async function() {
            if (confirm('确定要清空购物车吗？')) {
                await clearCart();
            }
        });
    }
    
    // 初始化购物车UI
    updateCartUI();
}

// 页面加载完成后初始化购物车
document.addEventListener('DOMContentLoaded', () => {
    initCart();
});

// 导出购物车功能
export {
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    clearCart,
    updateCartUI,
    initCart
};