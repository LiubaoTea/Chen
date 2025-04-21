// 导入API基础URL
import { API_BASE_URL } from './config.js';

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
    
    // 初始化各个功能模块
    initOrderRemark();

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
    const contentSections = document.querySelectorAll('.nav-content');

    // 初始化时隐藏所有内容区域
    contentSections.forEach(section => section.style.display = 'none');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const sectionId = item.getAttribute('data-section');
            const targetSection = document.getElementById(`${sectionId}-section`);

            // 如果点击的是当前激活的导航项，则收起内容
            if (item.classList.contains('active')) {
                item.classList.remove('active');
                if (targetSection) targetSection.style.display = 'none';
            } else {
                // 移除所有导航项的active类
                navItems.forEach(nav => nav.classList.remove('active'));
                // 为当前点击的导航项添加active类
                item.classList.add('active');

                // 隐藏所有内容区域
                contentSections.forEach(section => section.style.display = 'none');
                // 显示对应的内容区域
                if (targetSection) targetSection.style.display = 'block';
            }
        });
    });

    // 默认显示第一个导航项的内容
    const firstNavItem = navItems[0];
    if (firstNavItem) {
        firstNavItem.classList.add('active');
        const firstSectionId = firstNavItem.getAttribute('data-section');
        const firstSection = document.getElementById(`${firstSectionId}-section`);
        if (firstSection) {
            firstSection.style.display = 'block';
        }
    }
}

// 加载收货地址列表
async function loadAddresses() {
    try {
        const token = localStorage.getItem('userToken');
        const response = await fetch(`${API_BASE_URL}/api/user/addresses`, {
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
                <div class="address-radio">
                    <input type="radio" name="address" ${index === 0 ? 'checked' : ''} id="address_${address.id}">
                    <label for="address_${address.id}"></label>
                </div>
                <div class="address-content">
                    <h3>${address.name} ${address.phone}</h3>
                    <p>${address.province}${address.city}${address.district}${address.detail}</p>
                </div>
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
            const radio = card.querySelector('input[type="radio"]');
            card.addEventListener('click', (e) => {
                // 如果点击的是操作按钮，不触发选择事件
                if (e.target.closest('.address-actions')) return;
                
                addressCards.forEach(c => {
                    c.classList.remove('selected');
                    c.querySelector('input[type="radio"]').checked = false;
                });
                card.classList.add('selected');
                radio.checked = true;
                updateOrderSummary();
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



// 编辑地址
async function editAddress(addressId) {
    try {
        const token = localStorage.getItem('userToken');
        const response = await fetch(`${API_BASE_URL}/api/user/addresses/${addressId}`, {
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
        const response = await fetch(`${API_BASE_URL}/api/user/addresses/${addressId}`, {
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

// 初始化订单备注功能
function initOrderRemark() {
    const remarkTextarea = document.getElementById('orderRemark');
    const remarkLimit = document.querySelector('.remark-limit');

    if (remarkTextarea && remarkLimit) {
        remarkTextarea.addEventListener('input', () => {
            const length = remarkTextarea.value.length;
            remarkLimit.textContent = `${length}/200`;
            updateOrderSummary();
        });
    }
}

// 更新订单总结
function updateOrderSummary() {
    const selectedAddress = document.querySelector('.address-card.selected');
    const selectedItems = document.querySelectorAll('.order-item input[type="checkbox"]:checked');
    const selectedPayment = document.querySelector('.payment-method.selected');
    const orderRemark = document.getElementById('orderRemark');

    // 更新收货地址信息
    const addressInfo = document.getElementById('selectedAddressInfo');
    if (selectedAddress && addressInfo) {
        const name = selectedAddress.querySelector('h3').textContent;
        const address = selectedAddress.querySelector('p').textContent;
        addressInfo.innerHTML = `
            <div class="summary-item">
                <i class="fas fa-map-marker-alt"></i>
                <div>
                    <strong>${name}</strong>
                    <p>${address}</p>
                </div>
            </div>
        `;
    }

    // 更新商品信息
    const itemsInfo = document.getElementById('selectedItemsInfo');
    let subtotal = 0;
    if (selectedItems.length > 0 && itemsInfo) {
        const itemsHtml = Array.from(selectedItems).map(checkbox => {
            const item = checkbox.closest('.order-item');
            const name = item.querySelector('.item-name').textContent;
            const price = parseFloat(item.querySelector('.item-price').textContent.slice(1));
            const quantity = parseInt(item.querySelector('.item-quantity').textContent.split('：')[1]);
            const imageUrl = item.querySelector('img').src;
            subtotal += price * quantity;
            return `
                <div class="summary-item">
                    <div class="summary-item-left">
                        <img src="${imageUrl}" alt="${name}" class="summary-image">
                    </div>
                    <div class="summary-item-right">
                        <strong>${name}</strong>
                        <div class="summary-item-meta">
                            <span class="summary-item-price">¥${price.toFixed(2)}</span>
                            <span class="summary-item-quantity">× ${quantity}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        itemsInfo.innerHTML = itemsHtml;
    }

    // 更新支付方式信息
    const paymentInfo = document.getElementById('selectedPaymentInfo');
    if (selectedPayment && paymentInfo) {
        const paymentName = selectedPayment.querySelector('span').textContent;
        const paymentIcon = selectedPayment.querySelector('i').className;
        paymentInfo.innerHTML = `
            <div class="summary-item">
                <div class="summary-item-left">
                    <i class="${paymentIcon}"></i>
                </div>
                <div class="summary-item-right">
                    <strong>${paymentName}</strong>
                </div>
            </div>
        `;
    }

    // 更新订单备注信息
    const remarkInfo = document.getElementById('selectedRemarkInfo');
    if (remarkInfo && orderRemark) {
        const remarkContent = orderRemark.value.trim();
        remarkInfo.innerHTML = remarkContent ? `
            <div class="summary-item">
                <div class="summary-item-left">
                    <i class="fas fa-comment"></i>
                </div>
                <div class="summary-item-right">
                    <strong>订单备注</strong>
                    <p>${remarkContent}</p>
                </div>
            </div>
        ` : '';
    }

    // 更新金额信息
    const shipping = subtotal >= 199 ? 0 : 10; // 满199包邮
    const total = subtotal + shipping;

    document.getElementById('subtotal').textContent = `¥${subtotal.toFixed(2)}`;
    document.getElementById('shipping').textContent = `¥${shipping.toFixed(2)}`;
    document.getElementById('total').textContent = `¥${total.toFixed(2)}`;
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
            <div class="order-item" data-id="${item.product_id}">
                <div class="item-radio">
                    <input type="checkbox" id="product_${item.product_id}" checked>
                </div>
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

        // 添加商品选择事件
        const checkboxes = orderItems.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                updateOrderSummary();
            });
        });

        updateOrderSummary(); // 更新订单总结

        // 更新订单总结
function updateOrderSummary() {
    const selectedAddress = document.querySelector('.address-card.selected');
    const selectedItems = document.querySelectorAll('.order-item.selected');
    const selectedPayment = document.querySelector('.payment-method.selected');

    // 更新收货地址信息
    const addressInfo = document.getElementById('selectedAddressInfo');
    if (selectedAddress && addressInfo) {
        const name = selectedAddress.querySelector('h3').textContent;
        const address = selectedAddress.querySelector('p').textContent;
        addressInfo.innerHTML = `
            <div class="summary-item">
                <i class="fas fa-map-marker-alt"></i>
                <div>
                    <strong>${name}</strong>
                    <p>${address}</p>
                </div>
            </div>
        `;
    }

    // 更新商品信息
    const itemsInfo = document.getElementById('selectedItemsInfo');
    let subtotal = 0;
    if (selectedItems.length > 0 && itemsInfo) {
        const itemsHtml = Array.from(selectedItems).map(item => {
            const name = item.querySelector('.item-name').textContent;
            const price = parseFloat(item.querySelector('.item-price').textContent.slice(1));
            const quantity = parseInt(item.querySelector('.item-quantity').textContent.split('：')[1]);
            const imageUrl = item.querySelector('img').src;
            subtotal += price * quantity;
            return `
                <div class="summary-item">
                    <div class="summary-item-left">
                        <img src="${imageUrl}" alt="${name}" class="summary-image">
                    </div>
                    <div class="summary-item-right">
                        <strong>${name}</strong>
                        <div class="summary-item-meta">
                            <span class="summary-item-price">¥${price.toFixed(2)}</span>
                            <span class="summary-item-quantity">× ${quantity}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        itemsInfo.innerHTML = itemsHtml;
    }

    // 更新支付方式信息
    const paymentInfo = document.getElementById('selectedPaymentInfo');
    if (selectedPayment && paymentInfo) {
        const paymentName = selectedPayment.querySelector('span').textContent;
        const paymentIcon = selectedPayment.querySelector('i').className;
        paymentInfo.innerHTML = `
            <div class="summary-item">
                <div class="summary-item-left">
                    <i class="${paymentIcon}"></i>
                </div>
                <div class="summary-item-right">
                    <strong>${paymentName}</strong>
                </div>
            </div>
        `;
    }

    // 更新订单备注信息
    const remarkInfo = document.getElementById('selectedRemarkInfo');
    if (remarkInfo && orderRemark) {
        const remarkContent = orderRemark.value.trim();
        remarkInfo.innerHTML = remarkContent ? `
            <div class="summary-item">
                <div class="summary-item-left">
                    <i class="fas fa-comment"></i>
                </div>
                <div class="summary-item-right">
                    <strong>订单备注</strong>
                    <p>${remarkContent}</p>
                </div>
            </div>
        ` : '';
    }

    // 更新金额信息
    const shipping = subtotal >= 199 ? 0 : 10; // 满199包邮
    const total = subtotal + shipping;

    document.getElementById('subtotal').textContent = `¥${subtotal.toFixed(2)}`;
    document.getElementById('shipping').textContent = `¥${shipping.toFixed(2)}`;
    document.getElementById('total').textContent = `¥${total.toFixed(2)}`;
}

    } catch (error) {
        console.error('加载订单商品失败:', error);
        alert('加载订单商品失败，请刷新页面重试');
    }
}

// 初始化支付方式选择
function initPaymentMethods() {
    const paymentMethods = document.querySelectorAll('.payment-method');
    paymentMethods.forEach(method => {
        // 为每个支付方式添加radio input
        if (!method.querySelector('input[type="radio"]')) {
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'payment';
            radio.style.display = 'none';
            method.appendChild(radio);
        }

        method.addEventListener('click', () => {
            paymentMethods.forEach(m => {
                m.classList.remove('selected');
                const r = m.querySelector('input[type="radio"]');
                if (r) r.checked = false;
            });
            method.classList.add('selected');
            const radio = method.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
            updateOrderSummary();
        });
    });

    // 默认选择第一个支付方式
    if (paymentMethods.length > 0) {
        paymentMethods[0].classList.add('selected');
        const firstRadio = paymentMethods[0].querySelector('input[type="radio"]');
        if (firstRadio) firstRadio.checked = true;
    }
}

// 初始化备注功能
function initRemark() {
    const remarkTextarea = document.getElementById('orderRemark');
    const remarkLimit = document.querySelector('.remark-limit');

    if (remarkTextarea && remarkLimit) {
        remarkTextarea.addEventListener('input', () => {
            const length = remarkTextarea.value.length;
            remarkLimit.textContent = `${length}/200`;
        });
    }
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
            const remark = document.getElementById('orderRemark')?.value || '';

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
                    total,
                    remark
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