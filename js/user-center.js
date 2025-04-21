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

// 显示收货地址设置
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
        contentArea.innerHTML = `
            <h3>收货地址管理</h3>
            <button id="addAddressBtn" class="add-btn">添加新地址</button>
            <div class="address-list">
                ${addresses.length === 0 ? '<p>暂无收货地址</p>' : ''}
                ${addresses.map(address => `
                    <div class="address-item ${address.is_default ? 'default' : ''}">
                        <div class="address-info">
                            <p><strong>${address.recipient_name}</strong> ${address.contact_phone}</p>
                            <p>${address.region} ${address.full_address}</p>
                            <p>${address.postal_code || ''}</p>
                        </div>
                        <div class="address-actions">
                            ${!address.is_default ? `<button class="set-default" data-id="${address.address_id}">设为默认</button>` : ''}
                            <button class="edit" data-id="${address.address_id}">编辑</button>
                            <button class="delete" data-id="${address.address_id}">删除</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // 添加新地址按钮事件
        document.getElementById('addAddressBtn').addEventListener('click', () => {
            showAddressForm();
        });

        // 绑定地址操作事件
        document.querySelectorAll('.address-actions button').forEach(button => {
            button.addEventListener('click', async (e) => {
                const addressId = e.target.dataset.id;
                if (e.target.classList.contains('set-default')) {
                    await setDefaultAddress(addressId);
                } else if (e.target.classList.contains('edit')) {
                    await showAddressForm(addressId);
                } else if (e.target.classList.contains('delete')) {
                    await deleteAddress(addressId);
                }
            });
        });
    } catch (error) {
        console.error('加载地址列表失败:', error);
        contentArea.innerHTML = '<div class="error">加载地址列表失败，请重试</div>';
    }
}
// 显示地址表单（新增/编辑）
async function showAddressForm(addressId = null) {
    let address = null;
    const addressData = await import('../src/utils/data.json', { assert: { type: 'json' } });

    if (addressId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/user/addresses/${addressId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                }
            });
            if (response.ok) {
                address = await response.json();
            }
        } catch (error) {
            console.error('获取地址详情失败:', error);
        }
    }

    // 创建模态框遮罩
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    document.body.appendChild(overlay);

    // 创建地址编辑模态框
    const modal = document.createElement('div');
    modal.className = 'address-modal';
    modal.innerHTML = `
        <h3 class="address-modal-title">${addressId ? '编辑地址' : '新增地址'}</h3>
        <form id="addressForm" class="address-form">
            <div class="form-group">
                <label for="recipientName">收货人姓名</label>
                <input type="text" id="recipientName" name="recipient_name" value="${address?.recipient_name || ''}" required>
            </div>
            <div class="form-group">
                <label for="contactPhone">联系电话</label>
                <input type="tel" id="contactPhone" name="contact_phone" value="${address?.contact_phone || ''}" required>
            </div>
            <div class="form-group">
                <label>所在地区</label>
                <div class="region-selects">
                    <select id="province" required>
                        <option value="">请选择省份</option>
                        ${Object.entries(addressData.default[86]).map(([code, name]) => 
                            `<option value="${code}">${name}</option>`
                        ).join('')}
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
                <label for="fullAddress">详细地址</label>
                <textarea id="fullAddress" name="full_address" required>${address?.full_address || ''}</textarea>
            </div>
            <div class="form-group">
                <label for="postalCode">邮政编码</label>
                <input type="text" id="postalCode" name="postal_code" value="${address?.postal_code || ''}">
            </div>
            <div class="form-group default-checkbox">
                <input type="checkbox" id="isDefault" name="is_default" ${address?.is_default ? 'checked' : ''}>
                <label for="isDefault">设为默认地址</label>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">${addressId ? '保存修改' : '添加地址'}</button>
                <button type="button" class="btn btn-secondary" id="cancelBtn">取消</button>
            </div>
        </form>
    `;
    document.body.appendChild(modal);

    // 初始化省市区联动
    const provinceSelect = document.getElementById('province');
    const citySelect = document.getElementById('city');
    const districtSelect = document.getElementById('district');

    // 省份变化时更新城市
    provinceSelect.addEventListener('change', () => {
        const provinceCode = provinceSelect.value;
        citySelect.innerHTML = '<option value="">请选择城市</option>';
        districtSelect.innerHTML = '<option value="">请选择区县</option>';

        if (provinceCode && addressData.default[provinceCode]) {
            Object.entries(addressData.default[provinceCode]).forEach(([code, name]) => {
                citySelect.innerHTML += `<option value="${code}">${name}</option>`;
            });
        }
    });

    // 城市变化时更新区县
    citySelect.addEventListener('change', () => {
        const cityCode = citySelect.value;
        districtSelect.innerHTML = '<option value="">请选择区县</option>';

        if (cityCode && addressData.default[cityCode]) {
            Object.entries(addressData.default[cityCode]).forEach(([code, name]) => {
                districtSelect.innerHTML += `<option value="${code}">${name}</option>`;
            });
        }
    });

    // 如果是编辑模式，设置已选择的地区
    if (address && address.region) {
        const [province, city, district] = address.region.split(' ');
        
        // 设置省份
        const provinceOption = Array.from(provinceSelect.options)
            .find(option => option.text === province);
        if (provinceOption) {
            provinceSelect.value = provinceOption.value;
            provinceSelect.dispatchEvent(new Event('change'));

            // 设置城市
            setTimeout(() => {
                const cityOption = Array.from(citySelect.options)
                    .find(option => option.text === city);
                if (cityOption) {
                    citySelect.value = cityOption.value;
                    citySelect.dispatchEvent(new Event('change'));

                    // 设置区县
                    setTimeout(() => {
                        const districtOption = Array.from(districtSelect.options)
                            .find(option => option.text === district);
                        if (districtOption) {
                            districtSelect.value = districtOption.value;
                        }
                    }, 100);
                }
            }, 100);
        }
    }

    // 表单提交处理
    document.getElementById('addressForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('userToken');
            if (!token) {
                alert('登录已过期，请重新登录');
                window.location.href = 'login.html';
                return;
            }

            const formData = new FormData(e.target);
            const province = provinceSelect.options[provinceSelect.selectedIndex].text;
            const city = citySelect.options[citySelect.selectedIndex].text;
            const district = districtSelect.options[districtSelect.selectedIndex].text;

            if (!province || !city || !district) {
                alert('请完整选择所在地区');
                return;
            }

            const addressData = {
                recipient_name: formData.get('recipient_name'),
                contact_phone: formData.get('contact_phone'),
                region: `${province} ${city} ${district}`,
                full_address: formData.get('full_address'),
                postal_code: formData.get('postal_code'),
                is_default: formData.get('is_default') === 'on'
            };

            const response = await fetch(`${API_BASE_URL}/api/user/addresses${addressId ? `/${addressId}` : ''}`, {
                method: addressId ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(addressData)
            });

            if (!response.ok) {
                throw new Error(addressId ? '更新地址失败' : '添加地址失败');
            }

            alert(addressId ? '地址更新成功' : '地址添加成功');
            closeAddressModal();
            showAddressSettings();
        } catch (error) {
            console.error('地址操作失败:', error);
            alert('操作失败，请重试');
        }
    });

    // 关闭模态框
    function closeAddressModal() {
        document.body.removeChild(modal);
        document.body.removeChild(overlay);
    }

    // 取消按钮事件
    document.getElementById('cancelBtn').addEventListener('click', closeAddressModal);

    // 点击遮罩层关闭模态框
    overlay.addEventListener('click', closeAddressModal);
}

// 设置默认地址
async function setDefaultAddress(addressId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/user/addresses/${addressId}/default`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('userToken')}`
            }
        });

        if (!response.ok) {
            throw new Error('设置默认地址失败');
        }

        alert('默认地址设置成功');
        showAddressSettings();
    } catch (error) {
        console.error('设置默认地址失败:', error);
        alert('设置失败，请重试');
    }
}

// 删除地址
async function deleteAddress(addressId) {
    if (!confirm('确定要删除这个地址吗？')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/user/addresses/${addressId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('userToken')}`
            }
        });

        if (!response.ok) {
            throw new Error('删除地址失败');
        }

        alert('地址删除成功');
        showAddressSettings();
    } catch (error) {
        console.error('删除地址失败:', error);
        alert('删除失败，请重试');
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

// 这个函数已经在前面定义过，删除这个重复的定义

// 这个函数已经在前面定义过，删除这个重复的定义


// 这个函数已经在前面定义过，删除这个重复的定义

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
                <h4>订单商品</h4>
                <div class="order-items">
        `;
        
        if (orderDetail.items && orderDetail.items.length > 0) {
            orderDetail.items.forEach(item => {
                orderDetailHTML += `
                    <div class="order-item">
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
                    <button onclick="loadOrders()">返回订单列表</button>
                </div>
            </div>
        `;
        
        contentArea.innerHTML = orderDetailHTML;
    } catch (error) {
        console.error('加载订单详情失败:', error);
        document.getElementById('contentArea').innerHTML = 
            '<div class="error-message">加载订单详情失败，请稍后重试</div>';
    }
}

// 这个函数在代码中未被使用，删除它

// 这个函数在代码中未被正确使用，删除它

// 这些函数在代码中未被正确使用，删除它们


// 这个函数已经在前面定义过，删除这个重复的定义

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