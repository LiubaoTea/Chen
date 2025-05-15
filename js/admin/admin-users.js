/**
 * 管理后台用户管理模块
 * 处理用户的展示、详情查看和状态管理
 */

// 导入adminAuth模块和API配置
import { adminAuth } from './admin-auth.js';
import adminAPI, { API_BASE_URL, ADMIN_API_BASE_URL } from './admin-api.js';

// 确保API配置可用
console.log('admin-users.js中的API配置:', { API_BASE_URL, ADMIN_API_BASE_URL });
console.log('admin-users.js中的adminAPI:', adminAPI);

// 导入通用工具函数
import './admin-utils.js';
// 使用全局的showSuccessToast和showErrorToast函数

// 用户列表数据
let usersData = [];
let usersCurrentPage = 1;
let usersTotalPages = 1;
let usersPageSize = 10;

// 导出为全局变量，供其他模块使用
window.initUsersPage = initUsersPage;

// 初始化用户管理页面
async function initUsersPage() {
    // 检查是否已登录
    if (!adminAuth.check()) return;
    
    try {
        // 加载用户列表
        await loadUsers(1);
        
        // 设置事件监听器
        setupUsersEventListeners();
    } catch (error) {
        console.error('初始化用户管理页面失败:', error);
        window.showErrorToast('初始化用户管理页面失败，请稍后重试');
    }
}

// 加载用户列表
async function loadUsers(page, searchQuery = '') {
    try {
        usersCurrentPage = page;
        
        // 显示加载状态
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = '<tr><td colspan="6" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">加载中...</span></div></td></tr>';
        
        // 获取用户数据
        const result = await adminAPI.getUsers(page, usersPageSize, searchQuery);
        usersData = result.users;
        usersTotalPages = result.totalPages;
        
        // 更新用户列表
        updateUsersList();
        
        // 更新分页控件
        updateUsersPagination();
    } catch (error) {
        console.error('加载用户列表失败:', error);
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = '<tr><td colspan="6" class="text-center text-danger">加载用户列表失败，请稍后重试</td></tr>';
    }
}

// 更新用户列表
function updateUsersList() {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '';
    
    if (usersData.length === 0) {
        usersList.innerHTML = '<tr><td colspan="6" class="text-center">暂无用户数据</td></tr>';
        return;
    }
    
    usersData.forEach(user => {
        const row = document.createElement('tr');
        
        // 获取格式化日期
        let registerDate = '未知';
        let lastLoginDate = '从未登录';
        
        try {
            // 使用API返回的格式化日期
            if (user.created_at) {
                try {
                    // 尝试解析ISO格式的时间字符串
                    const date = new Date(user.created_at);
                    if (!isNaN(date.getTime())) {
                        registerDate = date.toLocaleString('zh-CN');
                    }
                } catch (error) {
                    console.error('注册时间解析错误:', error);
                }
            }
            
            // 处理最后登录时间
            if (user.last_login) {
                try {
                    // 尝试解析ISO格式的时间字符串
                    const date = new Date(user.last_login);
                    if (!isNaN(date.getTime())) {
                        lastLoginDate = date.toLocaleString('zh-CN');
                    }
                } catch (error) {
                    console.error('最后登录时间解析错误:', error);
                }
            }
        } catch (error) {
            console.error('日期格式化错误:', error);
        }
        
        // 用户状态
        let statusBadge = '<span class="badge bg-secondary">未知</span>';
        if (user.status === 'active' || user.status === '正常') {
            statusBadge = '<span class="badge bg-success">正常</span>';
        } else if (user.status === 'disabled' || user.status === '禁用' || user.status === '删除') {
            statusBadge = '<span class="badge bg-danger">已禁用</span>';
        }
        
        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <div class="user-avatar me-2">${user.username.charAt(0).toUpperCase()}</div>
                    <div>
                        <div class="fw-bold">${user.username}</div>
                        <small class="text-muted">${user.email || '未设置邮箱'}</small>
                    </div>
                </div>
            </td>
            <td>${user.phone || '未设置手机'}</td>
            <td>${user.orders_count || 0}</td>
            <td>
                <div>注册: ${registerDate}</div>
                <small class="text-muted">最近登录: ${lastLoginDate}</small>
            </td>
            <td>${statusBadge}</td>
            <td>
                <div class="btn-group">
                    <button type="button" class="btn btn-sm btn-outline-primary view-user" data-user-id="${user.user_id}">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-secondary toggle-user-status" data-user-id="${user.user_id}" data-current-status="${user.status}">
                        ${user.status === 'active' ? '<i class="bi bi-lock"></i>' : '<i class="bi bi-unlock"></i>'}
                    </button>
                </div>
            </td>
        `;
        
        usersList.appendChild(row);
    });
    
    // 添加事件监听器
    addUserRowEventListeners();
}

// 更新分页控件
function updateUsersPagination() {
    const pagination = document.getElementById('usersPagination');
    pagination.innerHTML = '';
    
    if (usersTotalPages <= 1) return;
    
    // 上一页按钮
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${usersCurrentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" data-page="${usersCurrentPage - 1}">上一页</a>`;
    pagination.appendChild(prevLi);
    
    // 页码按钮
    const startPage = Math.max(1, usersCurrentPage - 2);
    const endPage = Math.min(usersTotalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === usersCurrentPage ? 'active' : ''}`;
        pageLi.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
        pagination.appendChild(pageLi);
    }
    
    // 下一页按钮
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${usersCurrentPage === usersTotalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" data-page="${usersCurrentPage + 1}">下一页</a>`;
    pagination.appendChild(nextLi);
    
    // 添加分页事件监听器
    addUsersPaginationEventListeners();
}

// 设置用户管理页面的事件监听器
function setupUsersEventListeners() {
    // 搜索用户
    document.getElementById('userSearchForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const searchQuery = document.getElementById('userSearchInput').value;
        loadUsers(1, searchQuery);
    });
}

// 为用户行添加事件监听器
function addUserRowEventListeners() {
    // 查看用户详情按钮
    document.querySelectorAll('.view-user').forEach(button => {
        button.addEventListener('click', (e) => {
            const userId = e.currentTarget.getAttribute('data-user-id');
            viewUserDetails(userId);
        });
    });
    
    // 切换用户状态按钮
    document.querySelectorAll('.toggle-user-status').forEach(button => {
        button.addEventListener('click', (e) => {
            const userId = e.currentTarget.getAttribute('data-user-id');
            const currentStatus = e.currentTarget.getAttribute('data-current-status');
            toggleUserStatus(userId, currentStatus);
        });
    });
}

// 查看用户详情
async function viewUserDetails(userId) {
    try {
        // 显示加载状态
        document.getElementById('userDetailContent').innerHTML = `
            <div class="text-center p-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">加载中...</span>
                </div>
                <p class="mt-3">正在加载用户详情...</p>
            </div>
        `;
        
        // 显示模态框
        const userDetailModal = new bootstrap.Modal(document.getElementById('userDetailModal'));
        userDetailModal.show();
        
        console.log('查看用户详情，用户ID:', userId);
        
        // 获取用户详情
        const userDetails = await adminAPI.getUserDetails(userId);
        
        // 更新模态框标题
        document.getElementById('userDetailModalLabel').textContent = `用户详情 - ${userDetails.username}`;
        
        // 获取格式化日期
        let registerDate = '未知';
        let lastLoginDate = '从未登录';
        
        try {
            // 使用API返回的格式化日期
            if (userDetails.created_at) {
                try {
                    // 尝试解析ISO格式的时间字符串
                    const date = new Date(userDetails.created_at);
                    if (!isNaN(date.getTime()) && date.getFullYear() > 1970) {
                        registerDate = date.toLocaleString('zh-CN');
                    }
                } catch (error) {
                    console.error('注册时间解析错误:', error);
                }
            }
            
            // 处理最后登录时间
            if (userDetails.last_login) {
                try {
                    // 尝试解析ISO格式的时间字符串
                    const date = new Date(userDetails.last_login);
                    if (!isNaN(date.getTime()) && date.getFullYear() > 1970) {
                        lastLoginDate = date.toLocaleString('zh-CN');
                    }
                } catch (error) {
                    console.error('最后登录时间解析错误:', error);
                }
            }
        } catch (dateError) {
            console.error('日期格式化错误:', dateError);
        }
        
        // 用户状态
        let statusBadge = '<span class="badge bg-secondary">未知</span>';
        if (userDetails.status === 'active' || userDetails.status === '正常') {
            statusBadge = '<span class="badge bg-success">正常</span>';
        } else if (userDetails.status === 'disabled' || userDetails.status === '禁用' || userDetails.status === '删除') {
            statusBadge = '<span class="badge bg-danger">已禁用</span>';
        }
        
        // 构建收货地址列表
        let addressesHtml = '<p class="text-muted">暂无收货地址</p>';
        if (userDetails.addresses && userDetails.addresses.length > 0) {
            addressesHtml = '<div class="list-group">';
            userDetails.addresses.forEach(address => {
                const isDefault = address.is_default ? 
                    '<span class="badge bg-primary ms-2">默认</span>' : '';
                
                addressesHtml += `
                    <div class="list-group-item">
                        <div class="d-flex justify-content-between align-items-center">
                            <h6 class="mb-1">${address.recipient_name || ''} ${address.contact_phone || address.recipient_phone || ''} ${isDefault}</h6>
                        </div>
                        <p class="mb-1">${address.region || (address.province || '')+(address.city || '')+(address.district || '')}</p>
                        <small>${address.full_address || address.address_detail || ''}</small>
                    </div>
                `;
            });
            addressesHtml += '</div>';
        }
        
        // 构建订单历史
        let ordersHtml = '<p class="text-muted">暂无订单记录</p>';
        const orderCount = userDetails.order_count || userDetails.orders_count || 0;
        
        if (userDetails.recent_orders && userDetails.recent_orders.length > 0) {
            ordersHtml = '<div class="table-responsive"><table class="table table-sm"><thead><tr><th>订单号</th><th>日期</th><th>金额</th><th>状态</th><th>操作</th></tr></thead><tbody>';
            
            userDetails.recent_orders.forEach(order => {
                // 格式化订单日期
                let orderDate = '未知';
                try {
                    if (order.created_at) {
                        let date;
                        if (typeof order.created_at === 'number') {
                            // 确保时间戳是毫秒级的，如果是秒级的需要转换
                            const timestamp = order.created_at > 10000000000 ? order.created_at : order.created_at * 1000;
                            date = new Date(timestamp);
                        } else if (typeof order.created_at === 'string') {
                            if (!isNaN(parseInt(order.created_at))) {
                                const timestamp = parseInt(order.created_at) > 10000000000 ? parseInt(order.created_at) : parseInt(order.created_at) * 1000;
                                date = new Date(timestamp);
                            } else {
                                date = new Date(order.created_at);
                            }
                        }
                        
                        if (date && !isNaN(date.getTime()) && date.getFullYear() > 1970) {
                            orderDate = date.toLocaleDateString('zh-CN');
                        }
                    }
                } catch (dateError) {
                    console.error('订单日期格式化错误:', dateError);
                }
                
                const statusBadge = getOrderStatusBadge(order.status);
                const totalAmount = parseFloat(order.total_amount) || 0;
                
                ordersHtml += `
                    <tr>
                        <td>${order.order_id}</td>
                        <td>${orderDate}</td>
                        <td>¥${totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>${statusBadge}</td>
                        <td>
                            <button type="button" class="btn btn-sm btn-outline-primary view-order-btn" data-order-id="${order.order_id}">
                                <i class="bi bi-eye"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            ordersHtml += '</tbody></table></div>';
            
            // 如果有更多订单，显示查看全部按钮
            if (orderCount > userDetails.recent_orders.length) {
                ordersHtml += `
                    <div class="text-center mt-2">
                        <a href="#" class="btn btn-sm btn-outline-primary view-all-orders" data-user-id="${userDetails.user_id}">
                            查看全部 ${orderCount} 个订单
                        </a>
                    </div>
                `;
            }
        }
        
        // 更新模态框内容
        document.getElementById('userDetailContent').innerHTML = `
            <div class="row mb-4">
                <div class="col-md-6">
                    <h5>基本信息</h5>
                    <table class="table table-sm">
                        <tr>
                            <th>用户ID:</th>
                            <td>${userDetails.user_id}</td>
                        </tr>
                        <tr>
                            <th>用户名:</th>
                            <td>${userDetails.username}</td>
                        </tr>
                        <tr>
                            <th>邮箱:</th>
                            <td>${userDetails.email || '未设置'}</td>
                        </tr>
                        <tr>
                            <th>手机号:</th>
                            <td>${userDetails.phone || '未设置'}</td>
                        </tr>
                        <tr>
                            <th>状态:</th>
                            <td>${statusBadge}</td>
                        </tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h5>统计信息</h5>
                    <table class="table table-sm">
                        <tr>
                            <th>注册时间:</th>
                            <td>${registerDate}</td>
                        </tr>
                        <tr>
                            <th>最近登录:</th>
                            <td>${lastLoginDate}</td>
                        </tr>
                        <tr>
                            <th>订单总数:</th>
                            <td>${userDetails.orders_count || 0}</td>
                        </tr>
                        <tr>
                            <th>消费总额:</th>
                            <td>¥${(userDetails.total_spent || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                    </table>
                </div>
            </div>
            
            <div class="row mb-4">
                <div class="col-12">
                    <h5>收货地址</h5>
                    <div class="p-3 bg-light rounded">
                        ${addressesHtml}
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-12">
                    <h5>最近订单</h5>
                    <div class="p-3 bg-light rounded">
                        ${ordersHtml}
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('加载用户详情失败:', error);
        document.getElementById('userDetailContent').innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                加载用户详情失败: ${error.message || '请稍后重试'}
            </div>
        `;
        window.showErrorToast('加载用户详情失败: ' + (error.message || '请稍后重试'));
    }
    
    // 添加订单查看按钮事件监听器
    setTimeout(() => {
        // 为订单查看按钮添加事件监听
        document.querySelectorAll('.view-order-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const orderId = e.currentTarget.getAttribute('data-order-id');
                // 关闭用户详情模态框
                const userDetailModal = bootstrap.Modal.getInstance(document.getElementById('userDetailModal'));
                userDetailModal.hide();
                
                // 延迟一下再打开订单详情，避免模态框冲突
                setTimeout(() => {
                    // 调用订单详情查看函数（如果在全局范围内可用）
                    if (typeof viewOrderDetails === 'function') {
                        viewOrderDetails(orderId);
                    } else {
                        // 如果函数不可用，则跳转到订单管理页面
                        window.location.href = 'admin-orders.html?order_id=' + orderId;
                    }
                }, 300);
            });
        });
        
        // 为查看全部订单按钮添加事件监听
        document.querySelectorAll('.view-all-orders').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                const userId = e.currentTarget.getAttribute('data-user-id');
                
                // 显示加载状态
                const ordersContainer = e.currentTarget.closest('.p-3').querySelector('.table-responsive');
                const loadingHtml = `
                    <div class="text-center p-3">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">加载中...</span>
                        </div>
                        <p class="mt-2">正在加载全部订单...</p>
                    </div>
                `;
                ordersContainer.innerHTML = loadingHtml;
                
                // 保存按钮引用，避免使用e.currentTarget（可能会在异步操作后变为null）
                const viewAllOrdersBtn = e.currentTarget;
                
                try {
                    // 获取用户的所有订单
                    const result = await adminAPI.getUserOrders(userId, 1, 1000);
                    
                    if (result && result.orders && result.orders.length > 0) {
                        // 构建订单表格
                        let ordersHtml = '<div class="table-responsive"><table class="table table-sm"><thead><tr><th>订单号</th><th>日期</th><th>金额</th><th>状态</th><th>操作</th></tr></thead><tbody>';
                        
                        result.orders.forEach(order => {
                            // 格式化订单日期
                            let orderDate = '未知';
                            try {
                                if (order.created_at) {
                                    let date;
                                    if (typeof order.created_at === 'number') {
                                        const timestamp = order.created_at > 10000000000 ? order.created_at : order.created_at * 1000;
                                        date = new Date(timestamp);
                                    } else if (typeof order.created_at === 'string') {
                                        if (!isNaN(parseInt(order.created_at))) {
                                            const timestamp = parseInt(order.created_at) > 10000000000 ? parseInt(order.created_at) : parseInt(order.created_at) * 1000;
                                            date = new Date(timestamp);
                                        } else {
                                            date = new Date(order.created_at);
                                        }
                                    }
                                    
                                    if (date && !isNaN(date.getTime()) && date.getFullYear() > 1970) {
                                        orderDate = date.toLocaleDateString('zh-CN');
                                    }
                                }
                            } catch (dateError) {
                                console.error('订单日期格式化错误:', dateError);
                            }
                            
                            const statusBadge = getOrderStatusBadge(order.status);
                            const totalAmount = parseFloat(order.total_amount) || 0;
                            
                            ordersHtml += `
                                <tr>
                                    <td>${order.order_id}</td>
                                    <td>${orderDate}</td>
                                    <td>¥${totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td>${statusBadge}</td>
                                    <td>
                                        <button type="button" class="btn btn-sm btn-outline-primary view-order-btn" data-order-id="${order.order_id}">
                                            <i class="bi bi-eye"></i>
                                        </button>
                                    </td>
                                </tr>
                            `;
                        });
                        
                        ordersHtml += '</tbody></table></div>';
                        ordersContainer.innerHTML = ordersHtml;
                        
                        // 移除查看全部按钮（使用保存的引用）
                        if (viewAllOrdersBtn && viewAllOrdersBtn.parentNode) {
                            viewAllOrdersBtn.parentNode.removeChild(viewAllOrdersBtn);
                        }
                        
                        // 为新加载的订单查看按钮添加事件监听
                        ordersContainer.querySelectorAll('.view-order-btn').forEach(button => {
                            button.addEventListener('click', (e) => {
                                const orderId = e.currentTarget.getAttribute('data-order-id');
                                // 关闭用户详情模态框
                                const userDetailModal = bootstrap.Modal.getInstance(document.getElementById('userDetailModal'));
                                userDetailModal.hide();
                                
                                // 延迟一下再打开订单详情，避免模态框冲突
                                setTimeout(() => {
                                    // 调用订单详情查看函数（如果在全局范围内可用）
                                    if (typeof viewOrderDetails === 'function') {
                                        viewOrderDetails(orderId);
                                    } else {
                                        // 如果函数不可用，则跳转到订单管理页面
                                        window.location.href = 'admin-orders.html?order_id=' + orderId;
                                    }
                                }, 300);
                            });
                        });
                    } else {
                        ordersContainer.innerHTML = '<p class="text-center text-muted">没有找到更多订单</p>';
                    }
                } catch (error) {
                    console.error('加载全部订单失败:', error);
                    ordersContainer.innerHTML = `<div class="alert alert-danger">加载订单失败: ${error.message || '请稍后重试'}</div>`;
                }
            });
        });
    }, 100); // 短暂延迟确保DOM已更新
}

// 切换用户状态（启用/禁用）
async function toggleUserStatus(userId, currentStatus) {
    // 确保状态值与后端API匹配
    // 后端API要求状态值为 'active' 或 'disabled'
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    const actionText = newStatus === 'active' ? '启用' : '禁用';
    
    try {
        // 确认操作
        if (!confirm(`确定要${actionText}该用户吗？`)) {
            return;
        }
        
        console.log('切换用户状态，用户ID:', userId, '当前状态:', currentStatus, '新状态:', newStatus);
        
        // 显示加载状态
        const toggleButtons = document.querySelectorAll(`.toggle-user-status[data-user-id="${userId}"]`);
        toggleButtons.forEach(button => {
            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
        });
        
        try {
            // 更新状态 - 使用修复后的API
            await adminAPI.updateUserStatus(userId, newStatus);
            
            // 显示成功提示
            window.showSuccessToast(`用户已${actionText}`);
            
            // 重新加载用户列表
            await loadUsers(usersCurrentPage, document.getElementById('userSearchInput').value);
        } catch (apiError) {
            console.error('更新用户状态API错误:', apiError);
            
            // 恢复按钮状态
            toggleButtons.forEach(button => {
                button.disabled = false;
                button.innerHTML = currentStatus === 'active' ? '<i class="bi bi-lock"></i>' : '<i class="bi bi-unlock"></i>';
            });
            
            // 检查是否是数据库约束错误
            if (apiError.message && apiError.message.includes('约束')) {
                window.showErrorToast('无法更新用户状态: 该用户有关联数据，请先处理相关数据');
            } else {
                window.showErrorToast('更新用户状态失败: ' + apiError.message);
            }
        }
    } catch (error) {
        console.error('更新用户状态失败:', error);
        window.showErrorToast('更新用户状态失败: ' + error.message);
    }
}

// 获取订单状态徽章
function getOrderStatusBadge(status) {
    let badgeClass = '';
    let statusText = '';
    
    switch (status) {
        case 'pending':
            badgeClass = 'bg-warning';
            statusText = '待付款';
            break;
        case 'paid':
            badgeClass = 'bg-info';
            statusText = '已付款';
            break;
        case 'processing':
            badgeClass = 'bg-primary';
            statusText = '处理中';
            break;
        case 'shipped':
            badgeClass = 'bg-info';
            statusText = '已发货';
            break;
        case 'delivered':
            badgeClass = 'bg-primary';
            statusText = '已送达';
            break;
        case 'completed':
            badgeClass = 'bg-success';
            statusText = '已完成';
            break;
        case 'cancelled':
            badgeClass = 'bg-secondary';
            statusText = '已取消';
            break;
        case 'refunded':
            badgeClass = 'bg-danger';
            statusText = '已退款';
            break;
        default:
            badgeClass = 'bg-secondary';
            statusText = '未知状态';
    }
    
    return `<span class="badge ${badgeClass}">${statusText}</span>`;
}

// 添加用户分页事件监听器
function addUsersPaginationEventListeners() {
    document.querySelectorAll('#usersPagination .page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(e.target.getAttribute('data-page'));
            if (page >= 1 && page <= usersTotalPages) {
                loadUsers(page, document.getElementById('userSearchInput').value);
            }
        });
    });
}

// 导出模块
window.adminUsers = {
    init: initUsersPage
};