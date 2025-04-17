// 购物车UI相关功能
const API_BASE_URL = 'https://workers.liubaotea.online';

// 更新购物车UI
async function updateCartUI() {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            document.getElementById('cartItemList').innerHTML = '<p>请先登录</p>';
            document.getElementById('emptyCart').style.display = 'block';
            document.getElementById('cartFooter').style.display = 'none';
            return;
        }

        // 从API获取购物车数据
        const response = await fetch(`${API_BASE_URL}/api/cart`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('获取购物车数据失败');
        }

        const cartData = await response.json();
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
            emptyCart.style.display = 'block';
            cartFooter.style.display = 'none';
            cartItemList.innerHTML = '';
            return;
        }

        // 显示购物车商品
        emptyCart.style.display = 'none';
        cartFooter.style.display = 'block';
        
        cartItemList.innerHTML = cartData.map(item => `
            <div class="cart-item" data-id="${item.product_id}">
                <div class="cart-item-image">
                    <img src="/image/Goods/Goods_${item.product_id}.png" alt="${item.name}">
                </div>
                <div class="cart-item-info">
                    <h3>${item.name}</h3>
                    <p class="price">¥${item.price.toFixed(2)}</p>
                    <div class="quantity-controls">
                        <button class="quantity-btn minus" onclick="updateQuantity(${item.product_id}, ${item.quantity - 1})">-</button>
                        <span class="quantity">${item.quantity}</span>
                        <button class="quantity-btn plus" onclick="updateQuantity(${item.product_id}, ${item.quantity + 1})">+</button>
                    </div>
                </div>
                <button class="remove-btn" onclick="removeFromCart(${item.product_id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');

        // 更新总价
        const total = cartData.reduce((sum, item) => sum + item.price * item.quantity, 0);
        document.getElementById('cartTotal').textContent = `¥${total.toFixed(2)}`;

    } catch (error) {
        console.error('更新购物车UI失败:', error);
        alert('更新购物车失败，请刷新页面重试');
    }
}

// 更新商品数量
async function updateQuantity(productId, newQuantity) {
    if (newQuantity < 1) return;
    
    try {
        const token = localStorage.getItem('userToken');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/api/cart/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                productId,
                quantity: newQuantity
            })
        });

        if (!response.ok) {
            throw new Error('更新数量失败');
        }

        // 更新购物车显示
        await updateCartUI();
    } catch (error) {
        console.error('更新商品数量失败:', error);
        alert('更新商品数量失败，请重试');
    }
}

// 导出函数
window.updateCartUI = updateCartUI;
window.updateQuantity = updateQuantity;