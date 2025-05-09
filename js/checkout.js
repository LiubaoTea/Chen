// 导入API基础URL和地址编辑器
import { API_BASE_URL } from './config.js';
import { AddressEditor } from './address-editor.js';

// 生成订单编号
function generateOrderNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `LB${year}${month}${day}${random}`;
}

let addressEditor;

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

    // 初始化地址编辑器
    addressEditor = new AddressEditor(document.getElementById('addressEditorContainer'));

    // 监听地址更新事件
    document.addEventListener('addressUpdated', () => {
        loadAddresses();
    });

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
        // 检查浏览器是否支持localStorage
        if (!window.localStorage) {
            throw new Error('浏览器不支持本地存储，请关闭无痕模式');
        }
        
        const token = localStorage.getItem('userToken');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/user/addresses`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }).catch(error => {
            console.error('地址加载失败:', error);
            alert(`地址加载失败: ${error.message}`);
            throw error;
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
            <div class="address-card ${index === 0 ? 'selected' : ''}" data-id="${address.address_id}">
                <div class="address-radio">
                    <input type="radio" name="address" ${index === 0 ? 'checked' : ''} id="address_${address.address_id}">
                    <label for="address_${address.address_id}"></label>
                </div>
                <div class="address-content">
                    <h3>${address.recipient_name} ${address.contact_phone}</h3>
                    <p>${address.region} ${address.full_address}</p>
                    <p>邮政编码：${address.postal_code || '无'}</p>
                </div>
                <div class="address-actions" style="width: 100%; margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;">
                    <button class="edit-address" data-id="${address.address_id}">
                        <i class="fas fa-edit"></i> 编辑
                    </button>
                    <button class="delete-address" data-id="${address.address_id}">
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
            addAddressBtn.addEventListener('click', () => {
                addressEditor.resetForm();
                // resetForm方法内部并没有调用show方法，需要在这里调用
                addressEditor.show();
            });
        }

        // 添加编辑和删除事件
        addressList.querySelectorAll('.edit-address').forEach(btn => {
            btn.addEventListener('click', async () => {
                const addressId = btn.dataset.id;
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
                    addressEditor.editAddress(address);
                    addressEditor.show(); // 显示地址编辑器
                } catch (error) {
                    console.error('编辑地址失败:', error);
                    alert('获取地址信息失败，请重试');
                }
            });
        });

        addressList.querySelectorAll('.delete-address').forEach(btn => {
            btn.addEventListener('click', () => deleteAddress(btn.dataset.id));
        });

    } catch (error) {
        console.error('获取地址列表失败:', {
            error: error.message,
            browser: navigator.userAgent,
            timestamp: new Date().toISOString()
        });
        alert('地址加载失败，请检查控制台日志');
        console.error('地址加载失败详情:', {
            error: error.message,
            api: `${API_BASE_URL}/api/user/addresses`,
            authHeader: localStorage.getItem('userToken') ? '存在' : '缺失',
            localStorageSupport: !!window.localStorage
        });
        
        if (error.message.includes('401')) {
            localStorage.removeItem('userToken');
            window.location.href = 'login.html';
        } else {
            alert(`加载失败: ${error.message}`);
        }
    }
}



// 编辑地址
async function editAddress(addressId) {
    try {
        const token = localStorage.getItem('userToken');
        const response = await fetch(`${API_BASE_URL}/api/user/addresses/${addressId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
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
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
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

// 这个函数已在下方重新定义，删除此处的重复定义

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
            const token = localStorage.getItem('userToken');
            if (!token) {
                window.location.href = 'login.html';
                return;
            }
            
            const response = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error('获取商品信息失败');
            }
            const product = await response.json();
            items = [{
                product_id: product.product_id,
                name: product.name,
                price: product.price,
                quantity: parseInt(quantity),
                image_url: `../image/Goods/Goods_${product.product_id}.png`
            }];
        } else {
            // 从购物车结算
            const token = localStorage.getItem('userToken');
            const response = await fetch(`${API_BASE_URL}/api/cart`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }).catch(error => {
                console.error('购物车请求失败:', error);
                alert('无法连接服务器，请检查网络状态');
                throw error;
            });
            if (!response.ok) {
                throw new Error('获取购物车信息失败');
            }
            items = await response.json();
            
            if (!items || items.length === 0) {
                document.getElementById('orderItems').innerHTML = 
                    '<div class="empty-cart">购物车为空，请先添加商品</div>';
                return;
            }
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
            const total = parseFloat(document.getElementById('total').textContent.slice(1));

            // 获取所有选中的商品
            const selectedItems = Array.from(document.querySelectorAll('.order-item input[type="checkbox"]:checked'))
                .map(checkbox => {
                    const itemDiv = checkbox.closest('.order-item');
                    return {
                        product_id: parseInt(itemDiv.dataset.id),
                        quantity: parseInt(itemDiv.querySelector('.item-quantity').textContent.split('：')[1]),
                        unit_price: parseFloat(itemDiv.querySelector('.item-price').textContent.slice(1))
                    };
                });

            if (selectedItems.length === 0) {
                alert('请至少选择一件商品');
                return;
            }

            // 创建订单
            const token = localStorage.getItem('userToken');
            const addressId = selectedAddress.dataset.id;
            const orderRemark = document.getElementById('orderRemark').value.trim();
            const orderNumber = document.getElementById('orderNumber').textContent.split('：')[1];

            const response = await fetch(`${API_BASE_URL}/api/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    order_id: orderNumber,
                    address_id: addressId,
                    total_amount: total,
                    status: 'pending',
                    remark: orderRemark,
                    order_items: selectedItems.map(item => ({
                        product_id: item.product_id,
                        quantity: item.quantity,
                        unit_price: item.unit_price
                    }))
                })
            });

            if (!response.ok) {
                throw new Error('创建订单失败');
            }

            const order = await response.json();

            // 将订单信息存储到localStorage中，以便payment页面获取
            const checkoutData = {
                orderNumber: orderNumber,
                paymentMethod: selectedPayment.dataset.method === 'alipay' ? '支付宝' : '微信支付',
                totalAmount: total.toFixed(2)
            };
            localStorage.setItem('checkoutData', JSON.stringify(checkoutData));
            
            // 跳转到支付页面
            window.location.href = `payment.html?orderId=${order.order_id}&method=${selectedPayment.dataset.method}`;

        } catch (error) {
            console.error('提交订单失败:', error);
            alert('提交订单失败，请稍后重试');
        }
    });
}