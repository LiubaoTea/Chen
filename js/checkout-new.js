// 导入API配置
import { API_BASE_URL } from './config.js';

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initCheckout();
});

// 初始化结算页面
function initCheckout() {
    initNavigation();
    loadAddresses();
    loadOrderItems();
    initPaymentMethods();
    initRemarkInput();
    initAddressModal();
}

// 初始化导航切换
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const section = item.getAttribute('data-section');
            
            // 更新导航项的激活状态
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // 更新内容区域的显示状态
            contentSections.forEach(content => {
                if (content.id === `${section}-section`) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
        });
    });
}

// 加载收货地址列表
async function loadAddresses() {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/addresses`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('获取地址列表失败');
        }

        const addresses = await response.json();
        renderAddresses(addresses);
    } catch (error) {
        console.error('加载地址失败:', error);
        alert('加载地址失败，请刷新页面重试');
    }
}

// 渲染地址列表
function renderAddresses(addresses) {
    const addressList = document.getElementById('addressList');
    if (!addressList) return;

    addressList.innerHTML = addresses.map(address => `
        <div class="address-card" data-id="${address.id}">
            <div class="address-card-header">
                <span class="address-card-name">${address.name}</span>
                <span class="address-card-phone">${address.phone}</span>
            </div>
            <div class="address-card-content">
                ${address.province}${address.city}${address.district}${address.address}
            </div>
            <div class="address-card-actions">
                <button class="edit-address" data-id="${address.id}">
                    <i class="fas fa-edit"></i> 编辑
                </button>
                <button class="delete-address" data-id="${address.id}">
                    <i class="fas fa-trash"></i> 删除
                </button>
            </div>
        </div>
    `).join('');

    // 添加地址卡片的点击事件
    const addressCards = addressList.querySelectorAll('.address-card');
    addressCards.forEach(card => {
        card.addEventListener('click', () => {
            addressCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            updateSelectedAddress(card.dataset.id);
        });
    });

    // 添加编辑和删除按钮的事件监听
    initAddressCardActions();
}

// 初始化地址卡片的操作按钮
function initAddressCardActions() {
    // 编辑地址
    document.querySelectorAll('.edit-address').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const addressId = btn.dataset.id;
            openAddressModal(addressId);
        });
    });

    // 删除地址
    document.querySelectorAll('.delete-address').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const addressId = btn.dataset.id;
            if (confirm('确定要删除这个地址吗？')) {
                await deleteAddress(addressId);
            }
        });
    });
}

// 更新选中的地址
function updateSelectedAddress(addressId) {
    const selectedCard = document.querySelector(`.address-card[data-id="${addressId}"]`);
    if (selectedCard) {
        const addressInfo = {
            name: selectedCard.querySelector('.address-card-name').textContent,
            phone: selectedCard.querySelector('.address-card-phone').textContent,
            address: selectedCard.querySelector('.address-card-content').textContent
        };
        document.getElementById('selectedAddressInfo').innerHTML = `
            <div class="selected-address-info">
                <p><strong>${addressInfo.name}</strong> ${addressInfo.phone}</p>
                <p>${addressInfo.address}</p>
            </div>
        `;
    }
}

// 初始化地址编辑弹窗
function initAddressModal() {
    const addAddressBtn = document.getElementById('addAddress');
    const addressModal = document.getElementById('addressModal');
    const closeModal = document.getElementById('closeAddressModal');
    const cancelBtn = document.getElementById('cancelAddress');
    const addressForm = document.getElementById('addressForm');

    // 打开新增地址弹窗
    addAddressBtn.addEventListener('click', () => {
        openAddressModal();
    });

    // 关闭弹窗
    [closeModal, cancelBtn].forEach(btn => {
        btn.addEventListener('click', () => {
            addressModal.style.display = 'none';
        });
    });

    // 提交表单
    addressForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveAddress(new FormData(addressForm));
        addressModal.style.display = 'none';
    });
}

// 打开地址编辑弹窗
async function openAddressModal(addressId = null) {
    const addressModal = document.getElementById('addressModal');
    const addressForm = document.getElementById('addressForm');

    // 重置表单
    addressForm.reset();

    if (addressId) {
        // 加载地址信息
        try {
            const address = await getAddressById(addressId);
            if (address) {
                Object.keys(address).forEach(key => {
                    const input = addressForm.elements[key];
                    if (input) {
                        input.value = address[key];
                    }
                });
            }
        } catch (error) {
            console.error('加载地址信息失败:', error);
            alert('加载地址信息失败');
            return;
        }
    }

    addressModal.style.display = 'block';
}

// 保存地址
async function saveAddress(formData) {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        const addressData = {};
        formData.forEach((value, key) => {
            addressData[key] = value;
        });

        const response = await fetch(`${API_BASE_URL}/api/addresses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(addressData)
        });

        if (!response.ok) {
            throw new Error('保存地址失败');
        }

        await loadAddresses();
    } catch (error) {
        console.error('保存地址失败:', error);
        alert('保存地址失败，请重试');
    }
}

// 删除地址
async function deleteAddress(addressId) {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/addresses/${addressId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('删除地址失败');
        }

        await loadAddresses();
    } catch (error) {
        console.error('删除地址失败:', error);
        alert('删除地址失败，请重试');
    }
}

// 加载订单商品
async function loadOrderItems() {
    try {
        const cartItems = await getCartItems();
        renderOrderItems(cartItems);
        updateOrderSummary(cartItems);
    } catch (error) {
        console.error('加载订单商品失败:', error);
        alert('加载订单商品失败，请刷新页面重试');
    }
}

// 获取购物车商品
async function getCartItems() {
    const token = localStorage.getItem('userToken');
    if (!token) {
        window.location.href = 'login.html';
        return [];
    }

    const response = await fetch(`${API_BASE_URL}/api/cart`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('获取购物车商品失败');
    }

    return await response.json();
}

// 渲染订单商品
function renderOrderItems(items) {
    const orderItems = document.getElementById('orderItems');
    const selectedItemsInfo = document.getElementById('selectedItemsInfo');

    if (orderItems) {
        orderItems.innerHTML = items.map(item => `
            <div class="order-item">
                <div class="order-item-image">
                    <img src="https://r2liubaotea.liubaotea.online/image/Goods/Goods_${item.product_id}.png" alt="${item.name}">
                </div>
                <div class="order-item-info">
                    <div class="order-item-name">${item.name}</div>
                    <div class="order-item-price">¥${item.price.toFixed(2)} × ${item.quantity}</div>
                </div>
            </div>
        `).join('');
    }

    if (selectedItemsInfo) {
        selectedItemsInfo.innerHTML = items.map(item => `
            <div class="summary-item">
                <span>${item.name}</span>
                <span>¥${item.price.toFixed(2)} × ${item.quantity}</span>
            </div>
        `).join('');
    }
}

// 初始化支付方式
function initPaymentMethods() {
    const paymentMethods = document.querySelectorAll('.payment-method');
    
    paymentMethods.forEach(method => {
        method.addEventListener('click', () => {
            paymentMethods.forEach(m => m.classList.remove('selected'));
            method.classList.add('selected');
            
            const paymentMethod = method.getAttribute('data-method');
            const paymentInfo = method.querySelector('span').textContent;
            document.getElementById('selectedPaymentInfo').textContent = paymentInfo;
        });
    });
}

// 初始化订单备注输入
function initRemarkInput() {
    const remarkTextarea = document.getElementById('orderRemark');
    const remarkLimit = document.querySelector('.remark-limit');
    const selectedRemarkInfo = document.getElementById('selectedRemarkInfo');

    if (remarkTextarea && remarkLimit) {
        remarkTextarea.addEventListener('input', () => {
            const length = remarkTextarea.value.length;
            remarkLimit.textContent = `${length}/200`;
            selectedRemarkInfo.textContent = remarkTextarea.value || '无';
        });
    }
}

// 更新订单总结
function updateOrderSummary(items) {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = calculateShipping(subtotal); // 根据商品总价计算运费
    const total = subtotal + shipping;

    document.getElementById('subtotal').textContent = `¥${subtotal.toFixed(2)}`;
    document.getElementById('shipping').textContent = `¥${shipping.toFixed(2)}`;
    document.getElementById('total').textContent = `¥${total.toFixed(2)}`;
}

// 计算运费
function calculateShipping(subtotal) {
    // 这里可以根据实际业务需求设置运费计算规则
    return subtotal >= 99 ? 0 : 10;
}

// 提交订单
async function submitOrder() {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        // 收集订单信息
        const orderData = {
            addressId: getSelectedAddressId(),
            paymentMethod: getSelectedPaymentMethod(),
            remark: document.getElementById('orderRemark').value,
            items: await getCartItems()
        };

        // 验证必填信息
        if (!orderData.addressId) {
            alert('请选择收货地址');
            return;
        }
        if (!orderData.paymentMethod) {
            alert('请选择支付方式');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) {
            throw new Error('提交订单失败');
        }

        const result = await response.json();
        // 跳转到支付页面
        window.location.href = `payment.html?orderId=${result.orderId}`;
    } catch (error) {
        console.error('提交订单失败:', error);
        alert('提交订单失败，请重试');
    }
}

// 获取选中的地址ID
function getSelectedAddressId() {
    const selectedAddress = document.querySelector('.address-card.selected');
    return selectedAddress ? selectedAddress.dataset.id : null;
}

// 获取选中的支付方式
function getSelectedPaymentMethod() {
    const selectedPayment = document.querySelector('.payment-method.selected');
    return selectedPayment ? selectedPayment.dataset.method : null;
}

// 导出函数到全局作用域
window.submitOrder = submitOrder;