// API基础URL
const API_BASE_URL = 'https://workers.liubaotea.online';

// 生成订单编号
function generateOrderNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `LB${year}${month}${day}${random}`;
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 检查用户是否登录
    const token = localStorage.getItem('userToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // 生成并显示订单编号
    const orderNumber = generateOrderNumber();
    document.getElementById('orderNumber').textContent = `订单编号：${orderNumber}`;

    // 初始化各个功能模块
    await loadAddresses();
    await loadOrderItems();
    initPaymentMethods();
    initSubmitOrder();
    initNavigation();
});

// 初始化导航切换功能
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // 移除所有导航项的active类
            navItems.forEach(nav => nav.classList.remove('active'));
            // 为当前点击的导航项添加active类
            item.classList.add('active');

            // 隐藏所有内容区域
            contentSections.forEach(section => section.classList.remove('active'));
            // 显示对应的内容区域
            const sectionId = item.getAttribute('data-section');
            document.getElementById(`${sectionId}-section`).classList.add('active');
        });
    });
}

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
        
        // 添加新增地址按钮
        let addressHtml = `
            <div class="address-card add-address">
                <i class="fas fa-plus"></i>
                <p>添加新地址</p>
            </div>
        `;

        // 添加现有地址
        addressHtml += addresses.map((address, index) => `
            <div class="address-card ${index === 0 ? 'selected' : ''}" data-id="${address.id}">
                <h3>${address.name} ${address.phone}</h3>
                <p>${address.province}${address.city}${address.district}${address.detail}</p>
                <div class="address-actions">
                    <button class="edit-address" data-id="${address.id}">
                        <i class="fas fa-edit"></i> 编辑
                    </button>
                    <button class="delete-address" data-id="${address.id}">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </div>
            </div>
        `).join('');

        addressList.innerHTML = addressHtml;

        // 添加地址选择事件
        const addressCards = addressList.querySelectorAll('.address-card:not(.add-address)');
        addressCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // 如果点击的是操作按钮，不触发选择事件
                if (e.target.closest('.address-actions')) return;
                
                addressCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
            });
        });

        // 添加新增地址事件
        const addAddressBtn = addressList.querySelector('.add-address');
        if (addAddressBtn) {
            addAddressBtn.addEventListener('click', showAddressModal);
        }

        // 添加编辑和删除事件
        addressList.querySelectorAll('.edit-address').forEach(btn => {
            btn.addEventListener('click', () => editAddress(btn.dataset.id));
        });

        addressList.querySelectorAll('.delete-address').forEach(btn => {
            btn.addEventListener('click', () => deleteAddress(btn.dataset.id));
        });

    } catch (error) {
        console.error('加载地址失败:', error);
        alert('加载地址失败，请刷新页面重试');
    }
}

// 显示地址编辑模态框
function showAddressModal(address = null) {
    // 检查是否已存在模态框
    let modal = document.getElementById('addressModal');
    if (modal) {
        modal.remove();
    }

    const modalHtml = `
        <div class="modal" id="addressModal" style="position: fixed; top: 0; right: 0; bottom: 0; width: 400px; background: white; box-shadow: -2px 0 5px rgba(0,0,0,0.1); overflow-y: auto; z-index: 1000;">
            <div class="modal-content" style="padding: 20px;">
                <h2>${address ? '编辑地址' : '新增地址'}</h2>
                <form id="addressForm">
                    <div class="form-group">
                        <label>收货人姓名</label>
                        <input type="text" name="name" value="${address ? address.name : ''}" required>
                    </div>
                    <div class="form-group">
                        <label>手机号码</label>
                        <input type="tel" name="phone" value="${address ? address.phone : ''}" required>
                    </div>
                    <div class="form-group">
                        <label>省份</label>
                        <input type="text" name="province" value="${address ? address.province : ''}" required>
                    </div>
                    <div class="form-group">
                        <label>城市</label>
                        <input type="text" name="city" value="${address ? address.city : ''}" required>
                    </div>
                    <div class="form-group">
                        <label>区/县</label>
                        <input type="text" name="district" value="${address ? address.district : ''}" required>
                    </div>
                    <div class="form-group">
                        <label>详细地址</label>
                        <input type="text" name="detail" value="${address ? address.detail : ''}" required>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-cancel">取消</button>
                        <button type="submit" class="btn-submit">${address ? '保存' : '添加'}</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    modal = document.getElementById('addressModal');
    const form = document.getElementById('addressForm');

    // 关闭模态框
    modal.querySelector('.btn-cancel').addEventListener('click', () => {
        modal.remove();
    });

    // 提交表单
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const addressData = Object.fromEntries(formData.entries());

        try {
            const token = localStorage.getItem('userToken');
            const url = address
                ? `${API_BASE_URL}/api/addresses/${address.id}`
                : `${API_BASE_URL}/api/addresses`;

            const response = await fetch(url, {
                method: address ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(addressData)
            });

            if (!response.ok) {
                throw new Error(address ? '更新地址失败' : '添加地址失败');
            }

            modal.remove();
            await loadAddresses(); // 重新加载地址列表

        } catch (error) {
            console.error('保存地址失败:', error);
            alert('保存地址失败，请重试');
        }
    });
}

// 编辑地址
async function editAddress(addressId) {
    try {
        const token = localStorage.getItem('userToken');
        const response = await fetch(`${API_BASE_URL}/api/addresses/${addressId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('获取地址信息失败');
        }

        const address = await response.json();
        showAddressModal(address);

    } catch (error) {
        console.error('编辑地址失败:', error);
        alert('获取地址信息失败，请重试');
    }
}

// 删除地址
async function deleteAddress(addressId) {
    if (!confirm('确定要删除这个地址吗？')) return;

    try {
        const token = localStorage.getItem('userToken');
        const response = await fetch(`${API_BASE_URL}/api/addresses/${addressId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('删除地址失败');
        }

        await loadAddresses(); // 重新加载地址列表

    } catch (error) {
        console.error('删除地址失败:', error);
        alert('删除地址失败，请重试');
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