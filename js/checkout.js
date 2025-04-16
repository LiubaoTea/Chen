// API基础URL
const API_BASE_URL = 'https://workers.liubaotea.online';

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 检查用户是否登录
    const token = localStorage.getItem('userToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // 初始化各个功能模块
    await loadAddresses();
    await loadOrderItems();
    initPaymentMethods();
    initSubmitOrder();
});

// 加载收货地址列表
async function loadAddresses() {
    try {
        const token = localStorage.getItem('userToken');
        const response = await fetch(`${API_BASE_URL}/api/addresses`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('获取地址列表失败');
        }

        const addresses = await response.json();
        const addressList = document.getElementById('addressList');
        
        if (addresses.length === 0) {
            addressList.innerHTML = '<p>暂无收货地址，请先添加收货地址</p>';
            return;
        }

        addressList.innerHTML = addresses.map((address, index) => `
            <div class="address-card ${index === 0 ? 'selected' : ''}" data-id="${address.id}">
                <h3>${address.name} ${address.phone}</h3>
                <p>${address.province}${address.city}${address.district}${address.detail}</p>
            </div>
        `).join('');

        // 添加地址选择事件
        const addressCards = addressList.querySelectorAll('.address-card');
        addressCards.forEach(card => {
            card.addEventListener('click', () => {
                addressCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
            });
        });
    } catch (error) {
        console.error('加载地址失败:', error);
        alert('加载地址失败，请刷新页面重试');
    }
}

// 加载订单商品
async function loadOrderItems() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('product');
        const quantity = urlParams.get('quantity');

        let items;
        if (productId && quantity) {
            // 直接购买商品
            const response = await fetch(`${API_BASE_URL}/api/products/${productId}`);
            if (!response.ok) {
                throw new Error('获取商品信息失败');
            }
            const product = await response.json();
            items = [{
                product_id: product.product_id,
                name: product.name,
                price: product.price,
                quantity: parseInt(quantity),
                image_url: `/image/Goods/Goods_${product.product_id}.png`
            }];
        } else {
            // 从购物车结算
            const token = localStorage.getItem('userToken');
            const response = await fetch(`${API_BASE_URL}/api/cart`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error('获取购物车信息失败');
            }
            items = await response.json();
        }

        // 显示订单商品
        const orderItems = document.getElementById('orderItems');
        orderItems.innerHTML = items.map(item => `
            <div class="order-item">
                <div class="item-image">
                    <img src="${item.image_url}" alt="${item.name}">
                </div>
                <div class="item-details">
                    <div class="item-name">${item.name}</div>
                    <div class="item-price">¥${item.price.toFixed(2)}</div>
                    <div class="item-quantity">数量：${item.quantity}</div>
                </div>
            </div>
        `).join('');

        // 计算订单金额
        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const shipping = subtotal >= 199 ? 0 : 10; // 满199包邮
        const total = subtotal + shipping;

        // 更新订单总结
        document.getElementById('subtotal').textContent = `¥${subtotal.toFixed(2)}`;
        document.getElementById('shipping').textContent = `¥${shipping.toFixed(2)}`;
        document.getElementById('total').textContent = `¥${total.toFixed(2)}`;

    } catch (error) {
        console.error('加载订单商品失败:', error);
        alert('加载订单商品失败，请刷新页面重试');
    }
}

// 初始化支付方式选择
function initPaymentMethods() {
    const paymentMethods = document.querySelectorAll('.payment-method');
    paymentMethods.forEach(method => {
        method.addEventListener('click', () => {
            paymentMethods.forEach(m => m.classList.remove('selected'));
            method.classList.add('selected');
        });
    });

    // 默认选择第一个支付方式
    paymentMethods[0].classList.add('selected');
}

// 初始化提交订单按钮
function initSubmitOrder() {
    const submitBtn = document.getElementById('submitOrder');
    submitBtn.addEventListener('click', async () => {
        try {
            // 获取选中的地址
            const selectedAddress = document.querySelector('.address-card.selected');
            if (!selectedAddress) {
                alert('请选择收货地址');
                return;
            }

            // 获取选中的支付方式
            const selectedPayment = document.querySelector('.payment-method.selected');
            if (!selectedPayment) {
                alert('请选择支付方式');
                return;
            }

            // 获取订单信息
            const addressId = selectedAddress.dataset.id;
            const paymentMethod = selectedPayment.dataset.method;
            const total = parseFloat(document.getElementById('total').textContent.slice(1));

            // 创建订单
            const token = localStorage.getItem('userToken');
            const response = await fetch(`${API_BASE_URL}/api/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    addressId,
                    paymentMethod,
                    total
                })
            });

            if (!response.ok) {
                throw new Error('创建订单失败');
            }

            const order = await response.json();

            // 跳转到支付页面
            window.location.href = `payment.html?orderId=${order.id}&method=${paymentMethod}`;

        } catch (error) {
            console.error('提交订单失败:', error);
            alert('提交订单失败，请稍后重试');
        }
    });
}