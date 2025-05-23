import { API_BASE_URL } from './config.js';
import { checkAuthStatus } from './auth.js';

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 检查用户登录状态
        if (!checkAuthStatus()) {
            window.location.href = 'login.html';
            return;
        }

        // 获取并显示用户信息
        await loadUserInfo();
        
        // 初始化导航菜单
        initNavMenu();
        
        // 初始化退出登录按钮
        initLogoutButton();
    } catch (error) {
        console.error('初始化失败:', error);
        window.location.href = 'login.html';
    }
});

// 加载用户信息
async function loadUserInfo() {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            throw new Error('未找到登录凭证');
        }

        const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '获取用户信息失败');
        }
        
        const userData = await response.json();
        
        // 更新用户信息显示
        document.getElementById('username').textContent = userData.username || '未设置';
        document.getElementById('userEmail').textContent = userData.email || '未设置';
        document.getElementById('userId').textContent = userData.user_id || '未知';
        document.getElementById('userPhone').textContent = userData.phone_number || '未设置';
        
        return userData;
    } catch (error) {
        console.error('加载用户信息失败:', error);
        document.getElementById('username').textContent = '加载失败';
        document.getElementById('userEmail').textContent = '加载失败';
        document.getElementById('userId').textContent = '加载失败';
        document.getElementById('userPhone').textContent = '加载失败';
        
        if (error.message.includes('登录凭证')) {
            localStorage.removeItem('userToken');
            window.location.href = 'login.html';
        }
    }
}

// 加载用户订单
window.loadOrders = async function() {
    try {
        const token = localStorage.getItem('userToken');
        const response = await fetch(`${API_BASE_URL}/api/orders`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('获取订单列表失败');
        }
        
        const orders = await response.json();
        const contentArea = document.getElementById('contentArea');
        
        let orderListHTML = `
            <h3>我的订单</h3>
            <div class="order-list">
        `;
        
        if (orders.length === 0) {
            orderListHTML += '<div class="empty-message">暂无订单记录</div>';
        } else {
            orders.forEach(order => {
                orderListHTML += `
                    <div class="order-item">
                        <div class="order-info">
                            <h4>订单号: ${order.order_id}</h4>
                            <p>下单时间: ${new Date(order.created_at * 1000).toLocaleString()}</p>
                            <p>订单状态: ${getOrderStatus(order.status)}</p>
                            <p>订单金额: ¥${order.total_amount.toFixed(2)}</p>
                        </div>
                        <div class="order-actions">
                            <button class="view-btn" onclick="viewOrderDetail('${order.order_id}')">查看详情</button>
                            <button class="delete-btn" onclick="deleteOrder('${order.order_id}')">删除订单</button>
                        </div>
                    </div>
                    <style>
                        .order-actions {
                            display: flex;
                            flex-direction: column;
                            gap: 10px;
                        }
                        .view-btn {
                            background-color: #8B4513;
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 4px;
                            cursor: pointer;
                        }
                        .view-btn:hover {
                            background-color: #6B4423;
                        }
                        .delete-btn {
                            background-color: #DC3545;
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 4px;
                            cursor: pointer;
                        }
                        .delete-btn:hover {
                            background-color: #C82333;
                        }
                    </style>
                `;

            });
        }
        
        orderListHTML += '</div>';
        contentArea.innerHTML = orderListHTML;
    } catch (error) {
        console.error('加载订单列表失败:', error);
        document.getElementById('contentArea').innerHTML = 
            '<div class="error-message">加载订单列表失败，请稍后重试</div>';
    }
}

// 删除订单
// 创建自定义确认对话框
function createConfirmDialog(message, onConfirm, onCancel) {
    // 创建对话框容器
    const dialogOverlay = document.createElement('div');
    dialogOverlay.className = 'confirm-dialog-overlay';
    
    const dialogBox = document.createElement('div');
    dialogBox.className = 'confirm-dialog-box';
    
    // 添加消息内容
    const messageElement = document.createElement('p');
    messageElement.className = 'confirm-dialog-message';
    messageElement.textContent = message;
    
    // 添加按钮容器
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'confirm-dialog-buttons';
    
    // 取消按钮
    const cancelButton = document.createElement('button');
    cancelButton.className = 'confirm-dialog-button cancel';
    cancelButton.textContent = '取消';
    cancelButton.onclick = () => {
        document.body.removeChild(dialogOverlay);
        if (onCancel) onCancel();
    };
    
    // 确认按钮
    const confirmButton = document.createElement('button');
    confirmButton.className = 'confirm-dialog-button confirm';
    confirmButton.textContent = '确认删除';
    confirmButton.onclick = () => {
        document.body.removeChild(dialogOverlay);
        if (onConfirm) onConfirm();
    };
    
    // 组装对话框
    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(confirmButton);
    dialogBox.appendChild(messageElement);
    dialogBox.appendChild(buttonContainer);
    dialogOverlay.appendChild(dialogBox);
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
        .confirm-dialog-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        
        .confirm-dialog-box {
            background-color: #FFF9F0;
            border-radius: 8px;
            padding: 25px;
            width: 90%;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(139, 69, 19, 0.2);
            border: 1px solid #D2691E;
        }
        
        .confirm-dialog-message {
            color: #6B4423;
            font-size: 16px;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .confirm-dialog-buttons {
            display: flex;
            justify-content: center;
            gap: 15px;
        }
        
        .confirm-dialog-button {
            padding: 10px 20px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
        }
        
        .confirm-dialog-button.cancel {
            background-color: #E0E0E0;
            color: #6B4423;
        }
        
        .confirm-dialog-button.cancel:hover {
            background-color: #D0D0D0;
            transform: translateY(-2px);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .confirm-dialog-button.confirm {
            background-color: #DC3545;
            color: white;
        }
        
        .confirm-dialog-button.confirm:hover {
            background-color: #C82333;
            transform: translateY(-2px);
            box-shadow: 0 2px 4px rgba(139, 69, 19, 0.2);
        }
    `;
    
    // 添加到文档
    document.head.appendChild(style);
    document.body.appendChild(dialogOverlay);
}

window.deleteOrder = async function(orderId) {
    createConfirmDialog('确定要删除这个订单吗？此操作不可恢复。', async () => {
        try {
            const token = localStorage.getItem('userToken');
            // 使用正确的API路径
            const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('删除订单失败');
            }

            // 创建成功提示
            const successMessage = document.createElement('div');
            successMessage.className = 'success-message';
            successMessage.textContent = '订单已成功删除';
            successMessage.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: #4CAF50;
                color: white;
                padding: 15px 25px;
                border-radius: 6px;
                z-index: 1000;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            `;
            document.body.appendChild(successMessage);
            
            // 3秒后移除提示
            setTimeout(() => {
                document.body.removeChild(successMessage);
            }, 3000);
            
            // 重新加载订单列表
            await loadOrders();
        } catch (error) {
            console.error('删除订单失败:', error);
            
            // 创建错误提示
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            errorMessage.textContent = '删除订单失败，请稍后重试';
            errorMessage.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: #DC3545;
                color: white;
                padding: 15px 25px;
                border-radius: 6px;
                z-index: 1000;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            `;
            document.body.appendChild(errorMessage);
            
            // 3秒后移除提示
            setTimeout(() => {
                document.body.removeChild(errorMessage);
            }, 3000);
        }
    });
}

// 获取订单状态描述
function getOrderStatus(status) {
    const statusMap = {
        'pending': '待付款',
        'paid': '已付款',
        'shipped': '已发货',
        'delivered': '已送达',
        'cancelled': '已取消'
    };
    return statusMap[status] || status;
}

// 查看订单详情
window.viewOrderDetail = async function(orderId) {
    try {
        const token = localStorage.getItem('userToken');
        const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('获取订单详情失败');
        }
        
        const orderDetail = await response.json();
        const contentArea = document.getElementById('contentArea');
        
        // 计算商品总金额（不含运费）
        let productTotal = 0;
        if (orderDetail.items && orderDetail.items.length > 0) {
            orderDetail.items.forEach(item => {
                productTotal += item.unit_price * item.quantity;
            });
        }
        
        // 计算运费（总金额减去商品金额）
        const shippingFee = orderDetail.total_amount - productTotal;
        
        let orderDetailHTML = `
            <div class="order-detail">
                <h3>订单详情</h3>
                <div class="order-info">
                    <p><strong>订单号:</strong> ${orderDetail.order_id}</p>
                    <p><strong>下单时间:</strong> ${new Date(orderDetail.created_at * 1000).toLocaleString()}</p>
                    <p><strong>订单状态:</strong> ${getOrderStatus(orderDetail.status)}</p>
                    <p><strong>商品金额:</strong> ¥${productTotal.toFixed(2)}</p>
                    <p><strong>运费金额:</strong> ¥${shippingFee.toFixed(2)}</p>
                    <p><strong>订单总金额:</strong> ¥${orderDetail.total_amount.toFixed(2)}</p>
                </div>
                <h4>订单商品</h4>
                <div class="order-items">
        `;
        
        if (orderDetail.items && orderDetail.items.length > 0) {
            orderDetail.items.forEach(item => {
                // 构建商品图片URL - 使用R2存储中的图片
                const imageUrl = `${API_BASE_URL}/image/Goods/Goods_${item.product_id}.png`;
                
                orderDetailHTML += `
                    <div class="order-item">
                        <div class="item-image">
                            <img src="${imageUrl}" alt="${item.product_name}">
                        </div>
                        <div class="item-info">
                            <h5>${item.product_name}</h5>
                            <p>单价: ¥${item.unit_price.toFixed(2)}</p>
                            <p>数量: ${item.quantity}</p>
                            <p>小计: ¥${(item.unit_price * item.quantity).toFixed(2)}</p>
                        </div>
                    </div>
                `;
            });
        } else {
            orderDetailHTML += '<p>暂无商品信息</p>';
        }
        
        orderDetailHTML += `
                </div>
                <div class="order-actions">
                    <button onclick="window.loadOrders()">返回订单列表</button>
        `;
        
        // 如果订单状态为待付款，添加立即付款按钮
        if (orderDetail.status === 'pending') {
            orderDetailHTML += `
                    <button class="pay-now-btn" onclick="window.location.href='payment.html?order_id=${orderDetail.order_id}'">立即付款</button>
            `;
        }
        
        // 如果订单状态为已送达，添加立即评价按钮
        if (orderDetail.status === 'delivered' && orderDetail.items && orderDetail.items.length > 0) {
            // 获取第一个商品ID作为评价对象
            const productId = orderDetail.items[0].product_id;
            const orderItemId = orderDetail.items[0].id || '';
            orderDetailHTML += `
                    <button class="review-now-btn" onclick="window.location.href='submit-review.html?order_id=${orderDetail.order_id}&product_id=${productId}&order_item_id=${orderItemId}&return_url=user-center.html'">立即评价</button>
            `;
        }
        
        orderDetailHTML += `
                </div>
            </div>
        `;
        
        contentArea.innerHTML = orderDetailHTML;
        
        // 添加订单商品项的样式
        const style = document.createElement('style');
        style.textContent = `
            .order-detail {
                padding: 20px;
                background: #FFF;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .order-info {
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid #e0e0e0;
            }
            .order-info p {
                margin: 8px 0;
                color: #333;
            }
            .order-items {
                margin-bottom: 20px;
            }
            .order-item {
                display: flex;
                margin-bottom: 15px;
                padding: 10px;
                border: 1px solid #e0e0e0;
                border-radius: 5px;
                background: #f9f9f9;
            }
            .item-image {
                width: 80px;
                height: 80px;
                margin-right: 15px;
                overflow: hidden;
                border-radius: 4px;
                border: 1px solid #eee;
            }
            .item-image img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            .item-info {
                flex: 1;
            }
            .item-info h5 {
                margin: 0 0 8px 0;
                color: #8B4513;
            }
            .item-info p {
                margin: 4px 0;
                color: #666;
            }
            .order-actions {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 20px;
            }
            .order-actions button {
                padding: 8px 16px;
                background: #8B4513;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }
            .order-actions button:hover {
                background: #6B4423;
            }
            .pay-now-btn {
                background-color: #D2691E !important;
                color: white;
                border: none;
                padding: 8px 16px;
                cursor: pointer;
                border-radius: 4px;
            }
            .pay-now-btn:hover {
                background-color: #A0522D !important;
            }
            .review-now-btn {
                background-color: #4CAF50 !important;
                color: white;
                border: none;
                padding: 8px 16px;
                cursor: pointer;
                border-radius: 4px;
            }
            .review-now-btn:hover {
                background-color: #3e8e41 !important;
            }
        `;
        document.head.appendChild(style);
    } catch (error) {
        console.error('加载订单详情失败:', error);
        document.getElementById('contentArea').innerHTML = 
            '<div class="error-message">加载订单详情失败，请稍后重试</div>';
    }
}

// 初始化导航菜单
function initNavMenu() {
    const navItems = document.querySelectorAll('.nav-item');
    const contentArea = document.getElementById('contentArea');

    navItems.forEach(item => {
        item.addEventListener('click', async () => {
            // 移除所有导航项的active类
            navItems.forEach(nav => nav.classList.remove('active'));
            // 添加当前项的active类
            item.classList.add('active');

            const section = item.getAttribute('data-section');
            contentArea.innerHTML = '<div class="loading">加载中...</div>';
            
            try {
                switch(section) {
                    case 'orders':
                        await loadOrders();
                        break;
                    case 'profile':
                        await showProfileSettings();
                        break;
                    case 'security':
                        await showSecuritySettings();
                        break;
                    case 'address':
                        await showAddressSettings();
                        break;
                    case 'notification':
                        await showNotificationSettings();
                        break;
                }
            } catch (error) {
                console.error('加载内容失败:', error);
                contentArea.innerHTML = '<div class="error">加载失败，请重试</div>';
            }
        });
    });

    // 默认加载订单列表
    document.querySelector('[data-section="orders"]').click();
}

// 注意：商品评价功能已移至product-reviews.html和product-reviews.js中统一管理            });
       

// 显示成功消息
function showSuccessMessage(message) {
    const successMessage = document.createElement('div');
    successMessage.className = 'success-message';
    successMessage.textContent = message;
    successMessage.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: #4CAF50;
        color: white;
        padding: 15px 25px;
        border-radius: 6px;
        z-index: 1000;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    `;
    document.body.appendChild(successMessage);
    
    // 3秒后移除提示
    setTimeout(() => {
        document.body.removeChild(successMessage);
    }, 3000);
}

// 显示错误消息
function showErrorMessage(message) {
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.textContent = message;
    errorMessage.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: #DC3545;
        color: white;
        padding: 15px 25px;
        border-radius: 6px;
        z-index: 1000;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    `;
    document.body.appendChild(errorMessage);
    
    // 3秒后移除提示
    setTimeout(() => {
        document.body.removeChild(errorMessage);
    }, 3000);
}



// 显示个人资料设置
async function showProfileSettings() {
    const contentArea = document.getElementById('contentArea');
    try {
        const token = localStorage.getItem('userToken');
        const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('获取个人资料失败');
        }

        const profile = await response.json();
        contentArea.innerHTML = `
            <h3>个人资料</h3>
            <form id="profileForm" class="settings-form">
                <div class="form-group">
                    <label for="username">用户名</label>
                    <input type="text" id="username" name="username" value="${profile.username}" required>
                </div>
                <div class="form-group">
                    <label for="email">邮箱</label>
                    <input type="email" id="email" name="email" value="${profile.email}" required>
                </div>
                <div class="form-group">
                    <label for="phone">手机号码</label>
                    <input type="tel" id="phone" name="phone" value="${profile.phone_number || ''}" 
                           pattern="^(\\+86|1)[3-9]\\d{9}$" placeholder="+86或1开头的11位手机号">
                </div>
                <button type="submit" class="submit-btn">保存修改</button>
            </form>
        `;

        // 绑定表单提交事件
        document.getElementById('profileForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const formData = new FormData(e.target);
                const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        username: formData.get('username'),
                        email: formData.get('email'),
                        phone_number: formData.get('phone')
                    })
                });

                if (!response.ok) {
                    throw new Error('更新个人资料失败');
                }

                alert('个人资料更新成功');
                loadUserInfo(); // 重新加载用户信息
            } catch (error) {
                console.error('更新个人资料失败:', error);
                alert('更新失败，请重试');
            }
        });
    } catch (error) {
        console.error('加载个人资料失败:', error);
        contentArea.innerHTML = '<div class="error">加载个人资料失败，请重试</div>';
    }
}

// 显示安全设置
async function showSecuritySettings() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <h3>安全设置</h3>
        <form id="securityForm" class="settings-form">
            <div class="form-group">
                <label for="currentPassword">当前密码</label>
                <input type="password" id="currentPassword" name="currentPassword" required>
            </div>
            <div class="form-group">
                <label for="newPassword">新密码</label>
                <input type="password" id="newPassword" name="newPassword" required>
            </div>
            <div class="form-group">
                <label for="confirmPassword">确认新密码</label>
                <input type="password" id="confirmPassword" name="confirmPassword" required>
            </div>
            <button type="submit" class="submit-btn">修改密码</button>
        </form>
    `;

    // 绑定表单提交事件
    document.getElementById('securityForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');

        if (newPassword !== confirmPassword) {
            alert('两次输入的密码不一致');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/user/security`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                },
                body: JSON.stringify({
                    current_password: formData.get('currentPassword'),
                    new_password: newPassword
                })
            });

            if (!response.ok) {
                throw new Error('修改密码失败');
            }

            alert('密码修改成功，请重新登录');
            localStorage.removeItem('userToken');
            window.location.href = 'login.html';
        } catch (error) {
            console.error('修改密码失败:', error);
            alert('修改失败，请重试');
        }
    });
}

// 显示收货地址设置
// 声明省市区数据变量
let addressData = {};

// 初始化省市区选择器
function initAddressSelector() {
    const provinceSelect = document.getElementById('province');
    const citySelect = document.getElementById('city');
    const districtSelect = document.getElementById('district');

    // 加载省份数据
    const provinces = addressData['86'];
    for (const code in provinces) {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = provinces[code];
        provinceSelect.appendChild(option);
    }

    // 省份选择事件
    provinceSelect.addEventListener('change', () => {
        citySelect.innerHTML = '<option value="">请选择城市</option>';
        districtSelect.innerHTML = '<option value="">请选择区县</option>';
        
        const cities = addressData[provinceSelect.value];
        if (cities) {
            for (const code in cities) {
                const option = document.createElement('option');
                option.value = code;
                option.textContent = cities[code];
                citySelect.appendChild(option);
            }
        }
    });

    // 城市选择事件
    citySelect.addEventListener('change', () => {
        districtSelect.innerHTML = '<option value="">请选择区县</option>';
        
        const districts = addressData[citySelect.value];
        if (districts) {
            for (const code in districts) {
                const option = document.createElement('option');
                option.value = code;
                option.textContent = districts[code];
                districtSelect.appendChild(option);
            }
        }
    });
}

// 显示地址表单
async function showAddressForm(addressId = null) {
    const formContainer = document.getElementById('addressFormContainer');
    const formTitle = document.getElementById('addressFormTitle');
    
    // 重置表单
    document.getElementById('addressForm').reset();
    document.getElementById('addressId').value = '';
    
    // 初始化地址选择器
    import('./address-selector.js')
        .then(module => {
            module.initAddressSelector();
        })
        .catch(error => {
            console.error('加载地址选择器失败:', error);
        });
    
    if (addressId) {
        formTitle.textContent = '编辑地址';
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
            
            // 填充表单数据
            document.getElementById('addressId').value = addressId;
            document.getElementById('recipient_name').value = address.recipient_name;
            document.getElementById('contact_phone').value = address.contact_phone;
            document.getElementById('full_address').value = address.full_address;
            document.getElementById('postal_code').value = address.postal_code || '';
            document.getElementById('is_default').checked = address.is_default;
            
            // 解析并设置地区信息
            const [province, city, district] = address.region.split(' ');
            document.getElementById('province').value = province;
            // 等待地址选择器初始化完成后再设置值
            setTimeout(() => {
                const provinceSelect = document.getElementById('province');
                provinceSelect.dispatchEvent(new Event('change'));
                
                setTimeout(() => {
                    const citySelect = document.getElementById('city');
                    citySelect.value = city;
                    citySelect.dispatchEvent(new Event('change'));
                    
                    setTimeout(() => {
                        const districtSelect = document.getElementById('district');
                        districtSelect.value = district;
                    }, 100);
                }, 100);
            }, 100);
        } catch (error) {
            console.error('加载地址信息失败:', error);
            alert('加载地址信息失败，请重试');
            return;
        }
    } else {
        formTitle.textContent = '添加新地址';
    }
    
    // 显示表单
    formContainer.classList.add('show');
    
    // 添加遮罩层
    let overlay = document.getElementById('addressOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'addressOverlay';
        overlay.className = 'address-overlay';
        document.body.appendChild(overlay);
    }
    overlay.classList.add('show');
}

// 处理地址表单提交
async function handleAddressFormSubmit(e) {
    e.preventDefault();
    
    const formData = {
        recipient_name: document.getElementById('recipient_name').value.trim(),
        contact_phone: document.getElementById('contact_phone').value.trim(),
        region: [
            document.getElementById('province').options[document.getElementById('province').selectedIndex].text,
            document.getElementById('city').options[document.getElementById('city').selectedIndex].text,
            document.getElementById('district').options[document.getElementById('district').selectedIndex].text
        ].join(' '),
        full_address: document.getElementById('full_address').value.trim(),
        postal_code: document.getElementById('postal_code').value.trim(),
        is_default: document.getElementById('is_default').checked ? 1 : 0
    };

    // 表单验证
    if (!formData.recipient_name) {
        alert('请输入收货人姓名');
        return;
    }
    if (!formData.contact_phone) {
        alert('请输入联系电话');
        return;
    }
    if (!formData.region.split(' ').every(part => part && part !== '请选择省份' && part !== '请选择城市' && part !== '请选择区县')) {
        alert('请选择完整的地区信息');
        return;
    }
    if (!formData.full_address) {
        alert('请输入详细地址');
        return;
    }

    const addressId = document.getElementById('addressId').value;
    const token = localStorage.getItem('userToken');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/user/addresses${addressId ? `/${addressId}` : ''}`, {
            method: addressId ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '保存地址失败');
        }

        // 保存成功后自动关闭编辑界面
        hideAddressForm();
        await showAddressSettings();
        
        // 显示成功提示
        alert(addressId ? '地址更新成功' : '地址添加成功');
    } catch (error) {
        console.error('保存地址失败:', error);
        alert('保存地址失败，请重试');
    }
}

async function showAddressSettings() {
    const contentArea = document.getElementById('contentArea');
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
        
        // 创建地址编辑表单的HTML
        const addressFormHtml = `
            <div id="addressFormContainer" class="address-form-container">
                <div class="address-modal-header">
                    <h3 id="addressFormTitle">添加新地址</h3>
                    <button type="button" class="close-modal" onclick="hideAddressForm()"><i class="fas fa-times"></i></button>
                </div>
                <form id="addressForm" class="settings-form">
                    <input type="hidden" id="addressId">
                    <div class="form-group">
                        <label for="recipient_name">收货人姓名</label>
                        <input type="text" id="recipient_name" name="recipient_name" required>
                    </div>
                    <div class="form-group">
                        <label for="contact_phone">联系电话</label>
                        <input type="tel" id="contact_phone" name="contact_phone" required>
                    </div>
                    <div class="form-group address-select-group">
                        <label>所在地区</label>
                        <div class="address-selectors">
                            <select id="province" required>
                                <option value="">请选择省份</option>
                            </select>
                            <select id="city" required>
                                <option value="">请选择城市</option>
                            </select>
                            <select id="district" required>
                                <option value="">请选择区县</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="full_address">详细地址</label>
                        <textarea id="full_address" name="full_address" required></textarea>
                    </div>
                    <div class="form-group">
                        <label for="postal_code">邮政编码</label>
                        <input type="text" id="postal_code" name="postal_code" placeholder="选填">
                    </div>
                    <div class="default-address-container">
                        <input type="checkbox" id="is_default" name="is_default">
                        <label class="checkbox-text">设为默认地址</label>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="submit-btn">保存</button>
                        <button type="button" class="cancel-btn" onclick="hideAddressForm()">取消</button>
                    </div>
                </form>
            </div>
        `;
        
        contentArea.innerHTML = `
            <h3>收货地址管理</h3>
            ${addressFormHtml}
            <div class="address-list">
                ${addresses.length === 0 ? '<p>暂无收货地址</p>' : ''}
                ${addresses.map(address => `
                    <div class="address-item ${address.is_default ? 'default' : ''}">
                        <div class="address-info">
                            <p><strong>${address.recipient_name}</strong> ${address.contact_phone}</p>
                            <p>${address.region} ${address.full_address} ${address.postal_code ? `邮编：${address.postal_code}` : ''}</p>
                        </div>
                        <div class="address-actions">
                            <button class="address-btn set-default" data-id="${address.address_id}">设为默认</button>
                            <button class="address-btn edit" data-id="${address.address_id}">编辑</button>
                            <button class="address-btn delete" data-id="${address.address_id}">删除</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <button id="addAddressBtn" class="add-address-btn">添加新地址</button>
        `;

        // 绑定地址操作事件
        document.querySelectorAll('.address-actions button').forEach(button => {
            button.addEventListener('click', async (e) => {
                const addressId = e.target.dataset.id;
                if (e.target.classList.contains('set-default')) {
                    try {
                        const addressId = e.target.dataset.id;
                        const response = await fetch(`${API_BASE_URL}/api/user/addresses/${addressId}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                recipient_name: e.target.closest('.address-item').querySelector('strong').textContent,
                                contact_phone: e.target.closest('.address-item').querySelector('p').textContent.split(' ')[1],
                                region: e.target.closest('.address-item').querySelector('p:nth-child(2)').textContent.split(' ').slice(0, 3).join(' '),
                                full_address: e.target.closest('.address-item').querySelector('p:nth-child(2)').textContent.split(' ')[3],
                                postal_code: e.target.closest('.address-item').querySelector('p:nth-child(2)').textContent.match(/邮编：(\d+)/)?.[1] || '',
                                is_default: true
                            })
                        });
                        if (!response.ok) {
                            throw new Error('设置默认地址失败');
                        }
                        await showAddressSettings();
                    } catch (error) {
                        console.error('设置默认地址失败:', error);
                        alert('设置默认地址失败，请重试');
                    }
                } else if (e.target.classList.contains('edit')) {
                    showAddressForm(addressId);
                } else if (e.target.classList.contains('delete')) {
                    if (confirm('确定要删除这个地址吗？')) {
                        try {
                            const response = await fetch(`${API_BASE_URL}/api/user/addresses/${addressId}`, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${token}`
                                }
                            });
                            if (!response.ok) {
                                throw new Error('删除地址失败');
                            }
                            await showAddressSettings();
                        } catch (error) {
                            console.error('删除地址失败:', error);
                            alert('删除地址失败，请重试');
                        }
                    }
                }
            });
        });

        // 添加新地址按钮事件
        document.getElementById('addAddressBtn').addEventListener('click', () => {
            showAddressForm();
        });

        // 初始化省市区选择器
        import('./address-selector.js')
            .then(module => {
                module.initAddressSelector();
            })
            .catch(error => {
                console.error('加载地址选择器失败:', error);
            });

        // 绑定地址表单提交事件
        document.getElementById('addressForm').addEventListener('submit', handleAddressFormSubmit);

        // 初始化取消按钮事件
        window.hideAddressForm = () => {
            document.getElementById('addressFormContainer').classList.remove('show');
            const overlay = document.getElementById('addressOverlay');
            if (overlay) {
                overlay.classList.remove('show');
            }
        };
        
        // 添加点击外部区域关闭功能
        document.addEventListener('click', (e) => {
            const formContainer = document.getElementById('addressFormContainer');
            const overlay = document.getElementById('addressOverlay');
            if (formContainer && formContainer.classList.contains('show') && 
                !formContainer.contains(e.target) && 
                e.target !== document.getElementById('addAddressBtn') &&
                !e.target.classList.contains('edit')) {
                hideAddressForm();
            }
        });

        // 为地址列表添加样式
        const style = document.createElement('style');
        style.textContent = `
            .address-form-container {
                position: fixed;
                top: 0;
                right: 0;
                width: 350px;
                height: 100vh;
                background: #FFF9F0;
                padding: 20px;
                margin-bottom: 0;
                z-index: 1001;
                overflow-y: auto;
                box-shadow: -4px 0 15px rgba(139, 69, 19, 0.2);
                transform: translateX(100%);
                transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            
            .address-form-container.show {
                transform: translateX(0);
            }
            
            .address-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 1px solid #D2691E;
            }
            
            .close-modal {
                background: none;
                border: none;
                color: #8B4513;
                cursor: pointer;
                font-size: 1.2em;
            }
            
            .address-overlay {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 1000;
            }
            
            .address-overlay.show {
                display: block;
            }
            .select-container {
                display: flex;
                gap: 10px;
            }
            .select-container select {
                flex: 1;
                padding: 8px;
                border: 1px solid #D2691E;
                border-radius: 4px;
            }
            .form-actions {
                display: flex;
                gap: 10px;
                margin-top: 20px;
            }
            .submit-btn, .cancel-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }
            .submit-btn {
                background: #8B4513;
                color: #FFF;
            }
            .cancel-btn {
                background: #6B4423;
                color: #FFF;
            }
            .checkbox-container {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .checkbox-text {
                color: #6B4423;
            }
            
            .address-list {
                display: flex;
                flex-direction: column;
                gap: 15px;
                margin-top: 20px;
            }
            .address-item {
                border: 1px solid #D2691E;
                border-radius: 8px;
                padding: 15px;
                background: #FFF;
                position: relative;
            }
            .address-item.default {
                border: 2px solid #8B4513;
                background: #FFF9F0;
            }
            .address-item.default::after {
                content: '默认';
                position: absolute;
                top: 10px;
                right: 10px;
                background: #8B4513;
                color: #FFF;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 12px;
            }
            .address-actions {
                margin-top: 10px;
                display: flex;
                gap: 10px;
            }
            .address-actions button {
                padding: 5px 10px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            .address-actions .set-default {
                background: #D2691E;
                color: #FFF;
            }
            .address-actions .edit {
                background: #8B4513;
                color: #FFF;
            }
            .address-actions .delete {
                background: #DC3545;
                color: #FFF;
            }
            .add-address-btn {
                margin-top: 20px;
                padding: 10px 20px;
                background: #8B4513;
                color: #FFF;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            .add-address-btn:hover {
                background: #6B4423;
            }
        `;
        document.head.appendChild(style);
    } catch (error) {
        console.error('加载地址列表失败:', error);
        contentArea.innerHTML = '<div class="error">加载地址列表失败，请重试</div>';
    }
}

// 显示通知设置
async function showNotificationSettings() {
    const contentArea = document.getElementById('contentArea');
    try {
        const token = localStorage.getItem('userToken');
        const response = await fetch(`${API_BASE_URL}/api/user/settings`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('获取通知设置失败');
        }

        const settings = await response.json();
        const notificationPrefs = JSON.parse(settings.notification_prefs || '{}');

        contentArea.innerHTML = `
            <h3>通知设置</h3>
            <form id="notificationForm" class="settings-form">
                <div class="form-group">
                    <label>
                        <input type="checkbox" name="email" ${notificationPrefs.email ? 'checked' : ''}>
                        接收邮件通知
                    </label>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" name="sms" ${notificationPrefs.sms ? 'checked' : ''}>
                        接收短信通知
                    </label>
                </div>
                <button type="submit" class="submit-btn">保存设置</button>
            </form>
        `;

        // 绑定表单提交事件
        document.getElementById('notificationForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const formData = new FormData(e.target);
                const response = await fetch(`${API_BASE_URL}/api/user/settings`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        notification_prefs: JSON.stringify({
                            email: formData.get('email') === 'on',
                            sms: formData.get('sms') === 'on'
                        })
                    })
                });

                if (!response.ok) {
                    throw new Error('更新通知设置失败');
                }

                alert('通知设置更新成功');
            } catch (error) {
                console.error('更新通知设置失败:', error);
                alert('更新失败，请重试');
            }
        });
    } catch (error) {
        console.error('加载通知设置失败:', error);
        contentArea.innerHTML = '<div class="error">加载通知设置失败，请重试</div>';
    }
}

// 查看订单详情
// 将viewOrderDetail函数设置为全局可访问，以便HTML中的onclick事件可以调用它
// 此处已删除重复的viewOrderDetail函数实现，使用文件前部的完整实现

// 显示设置模态框
function showSettingsModal(content) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            ${content}
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 关闭按钮事件
    modal.querySelector('.close').onclick = () => {
        document.body.removeChild(modal);
    };
    
    // 点击模态框外部关闭
    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
}

// 初始化退出登录按钮
function initLogoutButton() {
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'logout-btn';
    logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i>退出登录';
    logoutBtn.onclick = () => {
        if (confirm('确定要退出登录吗？')) {
            localStorage.removeItem('userToken');
            localStorage.removeItem('username');
            localStorage.removeItem('userEmail');
            window.location.href = 'login.html';
        }
    };

    // 将退出按钮添加到导航菜单底部
    const navMenu = document.querySelector('.nav-menu');
    navMenu.appendChild(logoutBtn);
}

// 获取用户信息
async function getUserInfo() {
    const token = localStorage.getItem('userToken');
    if (!token) {
        throw new Error('未找到登录凭证');
    }

    const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '获取用户信息失败');
    }
    
    return await response.json();
}

// 获取用户地址列表
async function getUserAddresses() {
    const token = localStorage.getItem('userToken');
    const response = await fetch(`${API_BASE_URL}/api/user/addresses`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    if (!response.ok) {
        throw new Error('获取地址列表失败');
    }
    
    return await response.json();
}

// 添加用户地址
async function addUserAddress(addressData) {
    const token = localStorage.getItem('userToken');
    const response = await fetch(`${API_BASE_URL}/api/user/addresses`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(addressData)
    });
    
    if (!response.ok) {
        throw new Error('添加地址失败');
    }
    
    return await response.json();
}

// 更新用户地址
async function updateUserAddress(addressId, addressData) {
    const token = localStorage.getItem('userToken');
    const response = await fetch(`${API_BASE_URL}/api/user/addresses/${addressId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(addressData)
    });
    
    if (!response.ok) {
        throw new Error('更新地址失败');
    }
    
    return await response.json();
}

// 删除用户地址
async function deleteUserAddress(addressId) {
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
    
    return true;
}