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
        const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
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
    // 个人资料设置
    document.querySelector('.setting-card:nth-child(1)').addEventListener('click', () => {
        showProfileSettings();
    });
    
    // 安全设置
    document.querySelector('.setting-card:nth-child(2)').addEventListener('click', () => {
        showSecuritySettings();
    });
    
    // 收货地址设置
    document.querySelector('.setting-card:nth-child(3)').addEventListener('click', () => {
        showAddressSettings();
    });
    
    // 通知设置
    document.querySelector('.setting-card:nth-child(4)').addEventListener('click', () => {
        showNotificationSettings();
    });
}

// 显示个人资料设置
function showProfileSettings() {
    const content = `
        <h3>个人资料设置</h3>
        <form id="profileForm">
            <div class="form-group">
                <label for="nickname">昵称</label>
                <input type="text" id="nickname" name="nickname" required>
            </div>
            <div class="form-group">
                <label for="phone">手机号码</label>
                <input type="tel" id="phone" name="phone" required>
            </div>
            <div class="form-group">
                <label for="bio">个人简介</label>
                <textarea id="bio" name="bio" rows="3"></textarea>
            </div>
            <button type="submit" class="btn-primary">保存修改</button>
        </form>
    `;
    showSettingsModal(content);
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
}

// 显示收货地址设置
function showAddressSettings() {
    const content = `
        <h3>收货地址管理</h3>
        <div id="addressList">
            <!-- 地址列表将通过API动态加载 -->
        </div>
        <button id="addAddressBtn" class="btn-primary">添加新地址</button>
    `;
    showSettingsModal(content);
    loadAddressList();
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