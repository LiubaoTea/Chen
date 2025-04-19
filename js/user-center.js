import { API_BASE_URL } from './config.js';
import { checkAuthStatus } from './auth.js';

// 用户中心功能实现

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 检查用户登录状态
    if (!checkAuthStatus()) return;

    // 获取并显示用户信息
    loadUserInfo();
    
    // 初始化设置卡片点击事件
    initSettingCards();
    
    // 初始化退出登录按钮
    initLogoutButton();
});

// 加载用户信息
async function loadUserInfo() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/user`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('userToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('获取用户信息失败');
        }
        
        const userData = await response.json();
        
        // 更新用户信息显示
        document.getElementById('username').textContent = userData.username;
        document.getElementById('userEmail').textContent = userData.email;
        
        // 加载用户订单列表
        loadOrders();
    } catch (error) {
        console.error('加载用户信息失败:', error);
        alert('加载用户信息失败，请重新登录');
        window.location.href = 'login.html';
    }
}

// 加载用户订单
async function loadOrders() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/orders`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('userToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('获取订单列表失败');
        }
        
        const orders = await response.json();
        const orderList = document.getElementById('orderList');
        
        // 清空现有订单列表
        orderList.innerHTML = '';
        
        // 添加订单列表项
        orders.forEach(order => {
            const orderItem = document.createElement('li');
            orderItem.className = 'order-item';
            orderItem.innerHTML = `
                <div class="order-info">
                    <h4>订单号: ${order.orderNumber}</h4>
                    <p>下单时间: ${new Date(order.orderDate).toLocaleDateString()}</p>
                    <p>订单状态: ${getOrderStatus(order.status)}</p>
                </div>
                <div class="order-actions">
                    <button onclick="viewOrderDetail('${order.orderNumber}')">查看详情</button>
                </div>
            `;
            orderList.appendChild(orderItem);
        });
    } catch (error) {
        console.error('加载订单列表失败:', error);
        alert('加载订单列表失败，请稍后重试');
    }
}

// 获取订单状态描述
function getOrderStatus(status) {
    const statusMap = {
        'pending': '待付款',
        'paid': '已付款',
        'shipping': '已发货',
        'completed': '已完成',
        'cancelled': '已取消'
    };
    return statusMap[status] || status;
}

// 查看订单详情
function viewOrderDetail(orderNumber) {
    // 跳转到订单详情页面
    window.location.href = `order-detail.html?orderNumber=${orderNumber}`;
}

// 初始化设置卡片点击事件
function initSettingCards() {
    const settingCards = document.querySelectorAll('.setting-card');
    settingCards.forEach((card, index) => {
        card.addEventListener('click', () => {
            // 跳转到账户设置页面
            window.location.href = 'account-settings.html';
        });
    });
}

// 显示个人资料设置
async function showProfileSettings() {
    try {
        const userData = await getUserInfo();
        const content = `
            <h3>个人资料设置</h3>
            <form id="profileForm">
                <div class="form-group">
                    <label for="nickname">昵称</label>
                    <input type="text" id="nickname" name="nickname" value="${userData.username}" required>
                </div>
                <div class="form-group">
                    <label for="phone">手机号码</label>
                    <input type="tel" id="phone" name="phone" value="${userData.phone || ''}" required>
                </div>
                <div class="form-group">
                    <label for="bio">个人简介</label>
                    <textarea id="bio" name="bio" rows="3">${userData.bio || ''}</textarea>
                </div>
                <button type="submit" class="btn-primary">保存修改</button>
            </form>
        `;
        showSettingsModal(content);

        // 添加表单提交事件
        const form = document.getElementById('profileForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const formData = new FormData(form);
                const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                    },
                    body: JSON.stringify(Object.fromEntries(formData))
                });

                if (!response.ok) throw new Error('更新个人资料失败');
                alert('个人资料更新成功');
                location.reload();
            } catch (error) {
                console.error('更新个人资料失败:', error);
                alert('更新个人资料失败，请重试');
            }
        });
    } catch (error) {
        console.error('加载个人资料失败:', error);
        alert('加载个人资料失败，请重试');
    }
}

// 显示安全设置
function showSecuritySettings() {
    const content = `
        <h3>安全设置</h3>
        <form id="securityForm">
            <div class="form-group">
                <label for="oldPassword">当前密码</label>
                <input type="password" id="oldPassword" name="oldPassword" required>
            </div>
            <div class="form-group">
                <label for="newPassword">新密码</label>
                <input type="password" id="newPassword" name="newPassword" required>
            </div>
            <div class="form-group">
                <label for="confirmPassword">确认新密码</label>
                <input type="password" id="confirmPassword" name="confirmPassword" required>
            </div>
            <button type="submit" class="btn-primary">修改密码</button>
        </form>
    `;
    showSettingsModal(content);

    // 添加表单提交事件
    const form = document.getElementById('securityForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = form.newPassword.value;
        const confirmPassword = form.confirmPassword.value;

        if (newPassword !== confirmPassword) {
            alert('两次输入的密码不一致');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/user/password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                },
                body: JSON.stringify({
                    oldPassword: form.oldPassword.value,
                    newPassword: newPassword
                })
            });

            if (!response.ok) throw new Error('修改密码失败');
            alert('密码修改成功，请重新登录');
            localStorage.removeItem('userToken');
            window.location.href = 'login.html';
        } catch (error) {
            console.error('修改密码失败:', error);
            alert('修改密码失败，请重试');
        }
    });
}


// 显示收货地址设置
async function showAddressSettings() {
    const content = `
        <h3>收货地址管理</h3>
        <div id="addressList">
            <!-- 地址列表将通过API动态加载 -->
        </div>
        <button id="addAddressBtn" class="btn-primary">添加新地址</button>
    `;
    showSettingsModal(content);
    await loadAddressList();

    // 添加新地址按钮事件
    document.getElementById('addAddressBtn').addEventListener('click', showAddAddressForm);
}

// 加载地址列表
async function loadAddressList() {
    try {
        const addresses = await getUserAddresses();
        const addressList = document.getElementById('addressList');
        
        if (!addresses || addresses.length === 0) {
            addressList.innerHTML = '<p>暂无收货地址</p>';
            return;
        }

        addressList.innerHTML = addresses.map(address => `
            <div class="address-item ${address.is_default ? 'default' : ''}">
                <div class="address-info">
                    <p><strong>${address.recipient_name}</strong> ${address.contact_phone}</p>
                    <p>${address.region} ${address.full_address}</p>
                    <p>邮编：${address.postal_code}</p>
                </div>
                <div class="address-actions">
                    ${!address.is_default ? `<button class="btn-text" onclick="setDefaultAddress(${address.address_id})">设为默认</button>` : ''}
                    <button class="btn-text" onclick="editAddress(${address.address_id})">编辑</button>
                    <button class="btn-text" onclick="deleteAddress(${address.address_id})">删除</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('加载地址列表失败:', error);
        document.getElementById('addressList').innerHTML = '<p class="error">加载地址列表失败，请重试</p>';
    }
}

// 显示添加地址表单
function showAddAddressForm() {
    const content = `
        <h3>添加新地址</h3>
        <form id="addressForm">
            <div class="form-group">
                <label for="recipientName">收货人姓名</label>
                <input type="text" id="recipientName" name="recipient_name" required>
            </div>
            <div class="form-group">
                <label for="contactPhone">联系电话</label>
                <input type="tel" id="contactPhone" name="contact_phone" required>
            </div>
            <div class="form-group">
                <label for="region">所在地区</label>
                <input type="text" id="region" name="region" required>
            </div>
            <div class="form-group">
                <label for="fullAddress">详细地址</label>
                <textarea id="fullAddress" name="full_address" required></textarea>
            </div>
            <div class="form-group">
                <label for="postalCode">邮政编码</label>
                <input type="text" id="postalCode" name="postal_code" required>
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" name="is_default"> 设为默认地址
                </label>
            </div>
            <button type="submit" class="btn-primary">保存地址</button>
        </form>
    `;
    showSettingsModal(content);

    // 添加表单提交事件
    const form = document.getElementById('addressForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData(form);
            const addressData = Object.fromEntries(formData);
            addressData.is_default = formData.get('is_default') === 'on';

            await addUserAddress(addressData);
            alert('添加地址成功');
            showAddressSettings(); // 重新加载地址列表
        } catch (error) {
            console.error('添加地址失败:', error);
            alert('添加地址失败，请重试');
        }
    });
}

// 设置默认地址
async function setDefaultAddress(addressId) {
    try {
        await updateUserAddress(addressId, { is_default: true });
        await loadAddressList(); // 重新加载地址列表
    } catch (error) {
        console.error('设置默认地址失败:', error);
        alert('设置默认地址失败，请重试');
    }
}

// 编辑地址
async function editAddress(addressId) {
    try {
        const addresses = await getUserAddresses();
        const address = addresses.find(a => a.address_id === addressId);
        if (!address) throw new Error('地址不存在');

        const content = `
            <h3>编辑地址</h3>
            <form id="addressForm">
                <div class="form-group">
                    <label for="recipientName">收货人姓名</label>
                    <input type="text" id="recipientName" name="recipient_name" value="${address.recipient_name}" required>
                </div>
                <div class="form-group">
                    <label for="contactPhone">联系电话</label>
                    <input type="tel" id="contactPhone" name="contact_phone" value="${address.contact_phone}" required>
                </div>
                <div class="form-group">
                    <label for="region">所在地区</label>
                    <input type="text" id="region" name="region" value="${address.region}" required>
                </div>
                <div class="form-group">
                    <label for="fullAddress">详细地址</label>
                    <textarea id="fullAddress" name="full_address" required>${address.full_address}</textarea>
                </div>
                <div class="form-group">
                    <label for="postalCode">邮政编码</label>
                    <input type="text" id="postalCode" name="postal_code" value="${address.postal_code}" required>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" name="is_default" ${address.is_default ? 'checked' : ''}> 设为默认地址
                    </label>
                </div>
                <button type="submit" class="btn-primary">保存修改</button>
            </form>
        `;
        showSettingsModal(content);

        // 添加表单提交事件
        const form = document.getElementById('addressForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const formData = new FormData(form);
                const addressData = Object.fromEntries(formData);
                addressData.is_default = formData.get('is_default') === 'on';

                await updateUserAddress(addressId, addressData);
                alert('更新地址成功');
                showAddressSettings(); // 重新加载地址列表
            } catch (error) {
                console.error('更新地址失败:', error);
                alert('更新地址失败，请重试');
            }
        });
    } catch (error) {
        console.error('加载地址信息失败:', error);
        alert('加载地址信息失败，请重试');
    }
}

// 删除地址
async function deleteAddress(addressId) {
    if (!confirm('确定要删除这个地址吗？')) return;
    
    try {
        await deleteUserAddress(addressId);
        alert('删除地址成功');
        await loadAddressList(); // 重新加载地址列表
    } catch (error) {
        console.error('删除地址失败:', error);
        alert('删除地址失败，请重试');
    }
}


// 显示通知设置
function showNotificationSettings() {
    const content = `
        <h3>通知设置</h3>
        <form id="notificationForm">
            <div class="form-group">
                <label>
                    <input type="checkbox" name="orderNotification" checked>
                    订单状态通知
                </label>
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" name="promotionNotification" checked>
                    促销活动通知
                </label>
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" name="systemNotification" checked>
                    系统消息通知
                </label>
            </div>
            <button type="submit" class="btn-primary">保存设置</button>
        </form>
    `;
    showSettingsModal(content);
}

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
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // 清除本地存储的用户信息
            localStorage.removeItem('userToken');
            // 跳转到登录页面
            window.location.href = 'login.html';
        });
    }
}