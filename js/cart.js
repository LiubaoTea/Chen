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

// 初始化购物车
function initCart() {
    const cartToggle = document.getElementById('cartToggle');
    const cartSidebar = document.getElementById('cartSidebar');
    const cartOverlay = document.getElementById('cartOverlay');
    const closeCart = document.getElementById('closeCart');
    const clearCart = document.getElementById('clearCart');
    const checkout = document.getElementById('checkout');

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
    if (clearCart) {
        clearCart.addEventListener('click', async function() {
            try {
                await clearCartItems();
                await updateCartUI();
            } catch (error) {
                console.error('清空购物车失败:', error);
            }
        });
    }

    // 结算按钮
    if (checkout) {
        checkout.addEventListener('click', function() {
            const checkoutModal = document.getElementById('checkoutModal');
            const checkoutOverlay = document.getElementById('checkoutOverlay');
            if (checkoutModal && checkoutOverlay) {
                checkoutModal.classList.add('active');
                checkoutOverlay.classList.add('active');
                updateCheckoutUI();
            }
        });
    }

    // 初始化购物车UI
    updateCartUI();
}

// 更新购物车UI
async function updateCartUI() {
    try {
        const cartData = await getCartStatus();
        const cartItemList = document.getElementById('cartItemList');
        const emptyCart = document.getElementById('emptyCart');
        const cartFooter = document.getElementById('cartFooter');
        const cartCount = document.querySelector('.cart-count');

        // 更新购物车图标数量
        if (cartCount) {
            const totalQuantity = cartData.reduce((sum, item) => sum + item.quantity, 0);
            cartCount.textContent = totalQuantity;
            cartCount.style.display = totalQuantity > 0 ? 'block' : 'none';
        }

        // 如果购物车为空
        if (cartData.length === 0) {
            if (emptyCart) emptyCart.style.display = 'block';
            if (cartFooter) cartFooter.style.display = 'none';
            if (cartItemList) cartItemList.innerHTML = '';
            return;
        }

        // 显示购物车商品
        if (emptyCart) emptyCart.style.display = 'none';
        if (cartFooter) cartFooter.style.display = 'block';
        
        if (cartItemList) {
            cartItemList.innerHTML = cartData.map(item => `
                <div class="cart-item" data-id="${item.cart_id}">
                    <div class="cart-item-image">
                        <img src="${item.image_url}" alt="${item.name}">
                    </div>
                    <div class="cart-item-info">
                        <h3>${item.name}</h3>
                        <p class="price">¥${item.price.toFixed(2)}</p>
                        <div class="quantity-controls">
                            <button class="quantity-btn minus" data-cart-id="${item.cart_id}">-</button>
                            <input type="number" value="${item.quantity}" min="1" max="99" data-cart-id="${item.cart_id}">
                            <button class="quantity-btn plus" data-cart-id="${item.cart_id}">+</button>
                        </div>
                    </div>
                    <button class="remove-btn" data-cart-id="${item.cart_id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('');

            // 添加事件监听器
            addCartItemEventListeners();
        }

        // 更新总价
        const total = cartData.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const totalPrice = document.querySelector('.total-price');
        if (totalPrice) {
            totalPrice.textContent = `¥${total.toFixed(2)}`;
        }

    } catch (error) {
        console.error('更新购物车UI失败:', error);
        if (error.message !== '未登录') {
            alert('更新购物车失败，请刷新页面重试');
        }
    }
}

// 添加购物车商品事件监听器
function addCartItemEventListeners() {
    const cartItemList = document.getElementById('cartItemList');
    if (!cartItemList) return;

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
    cartItemList.querySelectorAll('.remove-btn').forEach(button => {
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
        
        // 显示成功提示
        alert('成功加入购物车！');
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
    } catch (error) {
        console.error('更新购物车商品数量失败:', error);
        alert('更新购物车商品数量失败，请稍后重试');
    }
}

// 清空购物车
async function clearCartItems() {
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

// 导出函数到全局作用域
window.showCart = showCart;
window.hideCart = hideCart;
window.updateCartUI = updateCartUI;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateCartItemQuantity = updateCartItemQuantity;
window.clearCartItems = clearCartItems;
window.initCart = initCart;