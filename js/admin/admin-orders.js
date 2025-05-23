/**
 * 管理后台订单管理模块
 * 处理订单的展示、详情查看和状态更新
 */

// 导入adminAuth模块和API配置
import { adminAuth } from './admin-auth.js';
import adminAPI, { API_BASE_URL, ADMIN_API_BASE_URL } from './admin-api.js';

// 确保API配置可用
console.log('admin-orders.js中的API配置:', { API_BASE_URL, ADMIN_API_BASE_URL });
console.log('admin-orders.js中的adminAPI:', adminAPI);

// 订单列表数据
let ordersData = [];
let ordersCurrentPage = 1;
let ordersTotalPages = 1;
let ordersPageSize = 10;
let ordersSelectedStatus = '';

// 导出为全局变量，供其他模块使用
window.initOrdersPage = initOrdersPage;

// 初始化订单管理页面
async function initOrdersPage() {
    // 检查是否已登录
    if (!adminAuth.check()) return;
    
    try {
        // 加载订单列表
        await loadOrders(1);
        
        // 设置事件监听器
        setupOrdersEventListeners();
    } catch (error) {
        console.error('初始化订单管理页面失败:', error);
        showErrorToast('初始化订单管理页面失败，请稍后重试');
    }
}

// 加载订单列表
async function loadOrders(page, status = '', searchQuery = '') {
    try {
        ordersCurrentPage = page;
        ordersSelectedStatus = status;
        
        // 显示加载状态
        const ordersList = document.getElementById('ordersList');
        ordersList.innerHTML = '<tr><td colspan="7" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">加载中...</span></div></td></tr>';
        
        // 获取订单数据
        const result = await adminAPI.getOrders(page, ordersPageSize, status, searchQuery);
        ordersData = result.orders;
        ordersTotalPages = result.totalPages;
        
        // 更新订单列表
        updateOrdersList();
        
        // 更新分页控件
        updateOrdersPagination();
    } catch (error) {
        console.error('加载订单列表失败:', error);
        const ordersList = document.getElementById('ordersList');
        ordersList.innerHTML = '<tr><td colspan="7" class="text-center text-danger">加载订单列表失败，请稍后重试</td></tr>';
    }
}

// 更新订单列表
function updateOrdersList() {
    const ordersList = document.getElementById('ordersList');
    ordersList.innerHTML = '';
    
    if (ordersData.length === 0) {
        ordersList.innerHTML = '<tr><td colspan="7" class="text-center">暂无订单数据</td></tr>';
        return;
    }
    
    ordersData.forEach(order => {
        const row = document.createElement('tr');
        
        // 格式化日期
        const orderDate = new Date(order.created_at * 1000).toLocaleDateString('zh-CN');
        
        // 订单状态
        const statusBadge = getOrderStatusBadge(order.status);
        
        row.innerHTML = `
            <td>${order.order_id}</td>
            <td>${order.username}</td>
            <td>¥${order.total_amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>${order.items_count || order.item_count || 0} 件商品</td>
            <td>${statusBadge}</td>
            <td>${orderDate}</td>
            <td>
                <div class="btn-group">
                    <button type="button" class="btn btn-sm btn-outline-primary view-order" data-order-id="${order.order_id}">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-secondary update-status" data-order-id="${order.order_id}" data-bs-toggle="dropdown">
                        <i class="bi bi-three-dots"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><a class="dropdown-item update-order-status" href="#" data-order-id="${order.order_id}" data-status="pending">待付款</a></li>
                        <li><a class="dropdown-item update-order-status" href="#" data-order-id="${order.order_id}" data-status="paid">已付款</a></li>
                        <li><a class="dropdown-item update-order-status" href="#" data-order-id="${order.order_id}" data-status="processing">处理中</a></li>
                        <li><a class="dropdown-item update-order-status" href="#" data-order-id="${order.order_id}" data-status="shipped">已发货</a></li>
                        <li><a class="dropdown-item update-order-status" href="#" data-order-id="${order.order_id}" data-status="delivered">已送达</a></li>
                        <li><a class="dropdown-item update-order-status" href="#" data-order-id="${order.order_id}" data-status="completed">已完成</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item update-order-status" href="#" data-order-id="${order.order_id}" data-status="cancelled">已取消</a></li>
                        <li><a class="dropdown-item update-order-status" href="#" data-order-id="${order.order_id}" data-status="refunded">已退款</a></li>
                    </ul>
                </div>
            </td>
        `;
        
        ordersList.appendChild(row);
    });
    
    // 添加事件监听器
    addOrderRowEventListeners();
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

// 更新分页控件
function updateOrdersPagination() {
    const pagination = document.getElementById('ordersPagination');
    pagination.innerHTML = '';
    
    if (ordersTotalPages <= 1) return;
    
    // 上一页按钮
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${ordersCurrentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" data-page="${ordersCurrentPage - 1}">上一页</a>`;
    pagination.appendChild(prevLi);
    
    // 页码按钮
    const startPage = Math.max(1, ordersCurrentPage - 2);
    const endPage = Math.min(ordersTotalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === ordersCurrentPage ? 'active' : ''}`;
        pageLi.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
        pagination.appendChild(pageLi);
    }
    
    // 下一页按钮
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${ordersCurrentPage === ordersTotalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" data-page="${ordersCurrentPage + 1}">下一页</a>`;
    pagination.appendChild(nextLi);
    
    // 添加分页事件监听器
    document.querySelectorAll('#ordersPagination .page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(e.target.getAttribute('data-page'));
            if (page >= 1 && page <= ordersTotalPages) {
                loadOrders(page, ordersSelectedStatus, document.getElementById('orderSearchInput').value);
            }
        });
    });
}

// 设置订单管理页面的事件监听器
function setupOrdersEventListeners() {
    // 状态筛选
    document.getElementById('orderStatusFilter').addEventListener('change', (e) => {
        loadOrders(1, e.target.value, document.getElementById('orderSearchInput').value);
    });
    
    // 搜索订单
    document.getElementById('orderSearchForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const searchQuery = document.getElementById('orderSearchInput').value;
        loadOrders(1, ordersSelectedStatus, searchQuery);
    });
}

// 为订单行添加事件监听器
function addOrderRowEventListeners() {
    // 查看订单详情按钮
    document.querySelectorAll('.view-order').forEach(button => {
        button.addEventListener('click', (e) => {
            const orderId = e.currentTarget.getAttribute('data-order-id');
            viewOrderDetails(orderId);
        });
    });
    
    // 更新订单状态
    document.querySelectorAll('.update-order-status').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const orderId = e.currentTarget.getAttribute('data-order-id');
            const status = e.currentTarget.getAttribute('data-status');
            updateOrderStatus(orderId, status);
        });
    });
}

// 查看订单详情
async function viewOrderDetails(orderId) {
    try {
        // 显示加载状态
        document.getElementById('orderDetailContent').innerHTML = `
            <div class="text-center p-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">加载中...</span>
                </div>
                <p class="mt-3">正在加载订单详情...</p>
            </div>
        `;
        
        // 显示模态框
        const orderDetailModal = new bootstrap.Modal(document.getElementById('orderDetailModal'));
        orderDetailModal.show();
        
        // 获取订单详情
        const orderDetails = await adminAPI.getOrderDetails(orderId);
        
        // 更新模态框标题
        document.getElementById('orderDetailModalLabel').textContent = `订单详情 #${orderId}`;
        
        // 格式化日期
        const orderDate = new Date(orderDetails.created_at * 1000).toLocaleString('zh-CN');
        
        // 订单状态
        const statusBadge = getOrderStatusBadge(orderDetails.status);
        
        // 构建订单项列表
        let orderItemsHtml = '';
        orderDetails.items.forEach(item => {
            orderItemsHtml += `
                <div class="d-flex justify-content-between align-items-center mb-2 p-2 border-bottom">
                    <div class="d-flex align-items-center">
                        <img src="${item.image_url || '../image/placeholder.png'}" alt="${item.name}" class="order-item-image me-3" style="width: 50px; height: 50px; object-fit: cover;">
                        <div>
                            <h6 class="mb-0">${item.name}</h6>
                            <small class="text-muted">单价: ¥${(item.price || item.unit_price || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</small>
                        </div>
                    </div>
                    <div class="text-end">
                        <div>数量: ${item.quantity}</div>
                        <div>小计: ¥${((item.price || item.unit_price || 0) * item.quantity).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                </div>
            `;
        });
        
        // 构建收货地址信息
        const address = orderDetails.address || orderDetails.shipping_address || {};
        const addressHtml = address ? `
            <p class="mb-1">${address.recipient_name || ''} ${address.contact_phone || address.recipient_phone || ''}</p>
            <p class="mb-1">${address.region || ''}</p>
            <p class="mb-0">${address.full_address || address.address_detail || ''}</p>
        ` : '<p class="mb-0">无收货地址信息</p>';
        
        // 更新模态框内容
        document.getElementById('orderDetailContent').innerHTML = `
            <div class="row mb-4">
                <div class="col-md-6">
                    <h5>基本信息</h5>
                    <table class="table table-sm">
                        <tr>
                            <th>订单编号:</th>
                            <td>${orderDetails.order_id}</td>
                        </tr>
                        <tr>
                            <th>下单时间:</th>
                            <td>${orderDate}</td>
                        </tr>
                        <tr>
                            <th>订单状态:</th>
                            <td>${statusBadge}</td>
                        </tr>
                        <tr>
                            <th>支付方式:</th>
                            <td>${orderDetails.payment_method || '未支付'}</td>
                        </tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h5>客户信息</h5>
                    <table class="table table-sm">
                        <tr>
                            <th>用户名:</th>
                            <td>${orderDetails.username}</td>
                        </tr>
                        <tr>
                            <th>用户ID:</th>
                            <td>${orderDetails.user_id}</td>
                        </tr>
                        <tr>
                            <th>联系电话:</th>
                            <td>${address.recipient_phone || '未提供'}</td>
                        </tr>
                    </table>
                </div>
            </div>
            
            <div class="row mb-4">
                <div class="col-12">
                    <h5>收货地址</h5>
                    <div class="p-3 bg-light rounded">
                        ${addressHtml}
                    </div>
                </div>
            </div>
            
            <div class="row mb-4">
                <div class="col-12">
                    <h5>订单商品</h5>
                    <div class="border rounded p-3">
                        ${orderItemsHtml}
                        <div class="d-flex justify-content-end mt-3">
                            <div class="text-end">
                                <div>商品总额: ¥${(orderDetails.subtotal || calculateSubtotal(orderDetails.items)).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                <div>运费: ¥${(orderDetails.shipping_fee || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                <div class="fs-5 fw-bold">订单总额: ¥${(orderDetails.total_amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-12">
                    <h5>订单备注</h5>
                    <div class="p-3 bg-light rounded">
                        ${orderDetails.note || '无备注'}
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('加载订单详情失败:', error);
        document.getElementById('orderDetailContent').innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                加载订单详情失败: ${error.message || '请稍后重试'}
            </div>
        `;
    }
}

// 更新订单状态
async function updateOrderStatus(orderId, status) {
    try {
        // 确认更新
        if (!confirm(`确定要将订单 #${orderId} 的状态更新为"${getStatusText(status)}"吗？`)) {
            return;
        }
        
        // 更新状态
        await adminAPI.updateOrderStatus(orderId, status);
        
        // 显示成功提示
        showSuccessToast(`订单 #${orderId} 状态已更新为"${getStatusText(status)}"`);
        
        // 重新加载订单列表
        await loadOrders(ordersCurrentPage, ordersSelectedStatus, document.getElementById('orderSearchInput').value);
    } catch (error) {
        console.error('更新订单状态失败:', error);
        showErrorToast('更新订单状态失败: ' + error.message);
    }
}

// 获取状态文本
function getStatusText(status) {
    switch (status) {
        case 'pending': return '待付款';
        case 'paid': return '已付款';
        case 'processing': return '处理中';
        case 'shipped': return '已发货';
        case 'delivered': return '已送达';
        case 'completed': return '已完成';
        case 'cancelled': return '已取消';
        case 'refunded': return '已退款';
        default: return '未知状态';
    }
}

// 显示成功提示
function showSuccessToast(message) {
    // 实现提示功能，可以使用Bootstrap的Toast组件
    alert(message);
}

// 显示错误提示
function showErrorToast(message) {
    // 实现提示功能，可以使用Bootstrap的Toast组件
    alert(message);
}

// 计算订单商品总额
function calculateSubtotal(items) {
    if (!items || !Array.isArray(items)) return 0;
    
    return items.reduce((sum, item) => {
        const price = item.price || item.unit_price || 0;
        const quantity = item.quantity || 1;
        return sum + (price * quantity);
    }, 0);
}

// 导出模块
window.adminOrders = {
    init: initOrdersPage
};