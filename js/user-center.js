import { API_BASE_URL } from './config.js';
import { checkAuthStatus } from './auth.js';
import { AddressEditor } from './address-editor.js';

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
async function loadOrders() {
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
                            <button onclick="viewOrderDetail('${order.order_id}')">查看详情</button>
                        </div>
                    </div>
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
                           pattern="\+[0-9]{11,}" placeholder="+86开头的手机号">
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

// 显示地址设置
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
        
        // 创建地址列表容器
        contentArea.innerHTML = `
            <h3>收货地址</h3>
            <div class="address-list">
                ${addresses.map(address => `
                    <div class="address-item ${address.is_default ? 'default' : ''}">
                        <div class="address-info">
                            <p><strong>${address.recipient_name}</strong> ${address.contact_phone}</p>
                            <p>${address.region} ${address.full_address}</p>
                            <p>${address.postal_code || ''}</p>
                        </div>
                        <div class="address-actions">
                            ${!address.is_default ? `
                                <button onclick="setDefaultAddress('${address.id}')">设为默认</button>
                            ` : ''}
                            <button onclick="editAddress('${address.id}')">编辑</button>
                            <button onclick="deleteAddress('${address.id}')">删除</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="add-address-container">
                <button class="add-address-btn" onclick="showAddressEditor()">添加新地址</button>
            </div>
        `;

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .address-list {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            .address-item {
                position: relative;
                background: #FFF;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 2px 6px rgba(139, 69, 19, 0.1);
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
        `;
        document.head.appendChild(style);
    } catch (error) {
        console.error('加载地址列表失败:', error);
        contentArea.innerHTML = '<div class="error">加载地址列表失败，请重试</div>';
    }
}

// 初始化地址编辑器
let addressEditor;

// 显示地址编辑器
window.showAddressEditor = function() {
    if (!addressEditor) {
        addressEditor = new AddressEditor(document.getElementById('addressEditorContainer').querySelector('.address-editor-content'));
    }
    addressEditor.resetForm();
    addressEditor.show();
}

// 设置默认地址
window.setDefaultAddress = async function(addressId) {
    try {
        const token = localStorage.getItem('userToken');
        const response = await fetch(`${API_BASE_URL}/api/user/addresses/${addressId}/default`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('设置默认地址失败');
        }

        alert('默认地址设置成功');
        await showAddressSettings(); // 刷新地址列表
    } catch (error) {
        console.error('设置默认地址失败:', error);
        alert('设置默认地址失败，请重试');
    }
}

// 显示地址编辑器
window.showAddressEditor = function() {
    if (!addressEditor) {
        addressEditor = new AddressEditor(document.getElementById('addressEditorContainer').querySelector('.address-editor-content'));
    }
    addressEditor.resetForm();
    addressEditor.show();
}

// 编辑地址
window.editAddress = async function(addressId) {
    try {
        if (!addressEditor) {
            addressEditor = new AddressEditor(document.getElementById('addressEditorContainer').querySelector('.address-editor-content'));
        }
        
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
        addressEditor.show();
    } catch (error) {
        console.error('编辑地址失败:', error);
        alert('获取地址信息失败，请重试');
    }
}

// 设置默认地址
window.setDefaultAddress = async function(addressId) {
    try {
        const token = localStorage.getItem('userToken');
        const response = await fetch(`${API_BASE_URL}/api/user/addresses/${addressId}/default`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('设置默认地址失败');
        }

        alert('默认地址设置成功');
        await showAddressSettings(); // 刷新地址列表
    } catch (error) {
        console.error('设置默认地址失败:', error);
        alert('设置默认地址失败，请重试');
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
async function viewOrderDetail(orderId) {
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
        
        let orderDetailHTML = `
            <div class="order-detail">
                <h3>订单详情</h3>
                <div class="order-info">
                    <p><strong>订单号:</strong> ${orderDetail.order_id}</p>
                    <p><strong>下单时间:</strong> ${new Date(orderDetail.created_at * 1000).toLocaleString()}</p>
                    <p><strong>订单状态:</strong> ${getOrderStatus(orderDetail.status)}</p>
                    <p><strong>订单金额:</strong> ¥${orderDetail.total_amount.toFixed(2)}</p>
                </div>
                <div class="order-items">
                    <h4>商品列表</h4>
                    ${orderDetail.items.map(item => `
                        <div class="order-item">
                            <div class="item-info">
                                <p><strong>${item.product_name}</strong></p>
                                <p>数量: ${item.quantity}</p>
                                <p>单价: ¥${item.price.toFixed(2)}</p>
                                <p>小计: ¥${(item.quantity * item.price).toFixed(2)}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="order-address">
                    <h4>收货信息</h4>
                    <p><strong>收货人:</strong> ${orderDetail.shipping_address.recipient_name}</p>
                    <p><strong>联系电话:</strong> ${orderDetail.shipping_address.contact_phone}</p>
                    <p><strong>收货地址:</strong> ${orderDetail.shipping_address.region} ${orderDetail.shipping_address.full_address}</p>
                    <p><strong>邮政编码:</strong> ${orderDetail.shipping_address.postal_code || '未提供'}</p>
                </div>
            </div>
        `;
        
        contentArea.innerHTML = orderDetailHTML;
    } catch (error) {
        console.error('获取订单详情失败:', error);
        document.getElementById('contentArea').innerHTML = 
            '<div class="error-message">获取订单详情失败，请稍后重试</div>';
    }
}