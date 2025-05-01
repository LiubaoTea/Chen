/**
 * 管理后台评价管理模块
 * 处理评价的展示、审核和回复
 */

// 评价列表数据
let reviewsData = [];
let currentPage = 1;
let totalPages = 1;
let pageSize = 10;
let selectedStatus = '';
let selectedRating = '';

// 初始化评价管理页面
async function initReviewsPage() {
    // 检查是否已登录
    if (!adminAuth.check()) return;
    
    try {
        // 加载评价列表
        await loadReviews(1);
        
        // 设置事件监听器
        setupReviewsEventListeners();
    } catch (error) {
        console.error('初始化评价管理页面失败:', error);
        showErrorToast('初始化评价管理页面失败，请稍后重试');
    }
}

// 加载评价列表
async function loadReviews(page, status = '', rating = '', searchQuery = '') {
    try {
        currentPage = page;
        selectedStatus = status;
        selectedRating = rating;
        
        // 显示加载状态
        const reviewsList = document.getElementById('reviewsList');
        reviewsList.innerHTML = '<tr><td colspan="7" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">加载中...</span></div></td></tr>';
        
        // 获取评价数据
        const result = await adminAPI.getReviews(page, pageSize, status, rating, searchQuery);
        reviewsData = result.reviews;
        totalPages = result.totalPages;
        
        // 更新评价列表
        updateReviewsList();
        
        // 更新分页控件
        updateReviewsPagination();
    } catch (error) {
        console.error('加载评价列表失败:', error);
        const reviewsList = document.getElementById('reviewsList');
        reviewsList.innerHTML = '<tr><td colspan="7" class="text-center text-danger">加载评价列表失败，请稍后重试</td></tr>';
    }
}

// 更新评价列表
function updateReviewsList() {
    const reviewsList = document.getElementById('reviewsList');
    reviewsList.innerHTML = '';
    
    if (reviewsData.length === 0) {
        reviewsList.innerHTML = '<tr><td colspan="7" class="text-center">暂无评价数据</td></tr>';
        return;
    }
    
    reviewsData.forEach(review => {
        const row = document.createElement('tr');
        
        // 格式化日期
        const reviewDate = new Date(review.created_at * 1000).toLocaleDateString('zh-CN');
        
        // 评分星级
        const stars = getStarRating(review.rating);
        
        // 评价状态
        const statusBadge = getReviewStatusBadge(review.status);
        
        // 评价图片
        const imagesHtml = review.images && review.images.length > 0 ? 
            `<div class="review-images">${review.images.map(img => `<img src="${img}" class="review-image-thumbnail" data-bs-toggle="modal" data-bs-target="#reviewDetailModal" data-review-id="${review.id}">`).join('')}</div>` : '';
        
        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <img src="${review.product_image || '../image/liubaotea_logo.png'}" class="product-thumbnail me-2" alt="${review.product_name}">
                    <div>${review.product_name}</div>
                </div>
            </td>
            <td>${review.username}</td>
            <td><div class="review-stars">${stars}</div></td>
            <td>
                <div class="review-content">${review.content}</div>
                ${imagesHtml}
            </td>
            <td>${reviewDate}</td>
            <td>${statusBadge}</td>
            <td>
                <div class="action-buttons">
                    <button type="button" class="btn btn-sm btn-outline-primary view-review" data-review-id="${review.id}">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-secondary reply-review" data-review-id="${review.id}">
                        <i class="bi bi-reply"></i>
                    </button>
                    <div class="btn-group">
                        <button type="button" class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="bi bi-three-dots"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><a class="dropdown-item approve-review" href="#" data-review-id="${review.id}">通过评价</a></li>
                            <li><a class="dropdown-item reject-review" href="#" data-review-id="${review.id}">拒绝评价</a></li>
                        </ul>
                    </div>
                </div>
            </td>
        `;
        
        reviewsList.appendChild(row);
    });
    
    // 添加查看按钮事件
    document.querySelectorAll('.view-review').forEach(button => {
        button.addEventListener('click', handleViewReview);
    });
    
    // 添加回复按钮事件
    document.querySelectorAll('.reply-review').forEach(button => {
        button.addEventListener('click', handleReplyReview);
    });
    
    // 添加通过评价事件
    document.querySelectorAll('.approve-review').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            handleApproveReview(e.currentTarget.getAttribute('data-review-id'));
        });
    });
    
    // 添加拒绝评价事件
    document.querySelectorAll('.reject-review').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            handleRejectReview(e.currentTarget.getAttribute('data-review-id'));
        });
    });
    
    // 添加图片点击事件
    document.querySelectorAll('.review-image-thumbnail').forEach(img => {
        img.addEventListener('click', (e) => {
            const reviewId = e.currentTarget.getAttribute('data-review-id');
            handleViewReview({ currentTarget: { getAttribute: () => reviewId } });
        });
    });
}

// 更新分页控件
function updateReviewsPagination() {
    const pagination = document.getElementById('reviewsPagination');
    pagination.innerHTML = '';
    
    if (totalPages <= 1) {
        return;
    }
    
    // 上一页按钮
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" aria-label="上一页"><i class="bi bi-chevron-left"></i></a>`;
    pagination.appendChild(prevLi);
    
    if (currentPage > 1) {
        prevLi.addEventListener('click', (e) => {
            e.preventDefault();
            loadReviews(currentPage - 1, selectedStatus, selectedRating);
        });
    }
    
    // 页码按钮
    const maxPages = 5; // 最多显示的页码数
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);
    
    if (endPage - startPage + 1 < maxPages) {
        startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
        pageLi.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        pagination.appendChild(pageLi);
        
        if (i !== currentPage) {
            pageLi.addEventListener('click', (e) => {
                e.preventDefault();
                loadReviews(i, selectedStatus, selectedRating);
            });
        }
    }
    
    // 下一页按钮
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" aria-label="下一页"><i class="bi bi-chevron-right"></i></a>`;
    pagination.appendChild(nextLi);
    
    if (currentPage < totalPages) {
        nextLi.addEventListener('click', (e) => {
            e.preventDefault();
            loadReviews(currentPage + 1, selectedStatus, selectedRating);
        });
    }
}

// 设置事件监听器
function setupReviewsEventListeners() {
    // 状态筛选
    document.getElementById('reviewStatusFilter').addEventListener('change', (e) => {
        const status = e.target.value;
        loadReviews(1, status, selectedRating);
    });
    
    // 评分筛选
    document.getElementById('reviewRatingFilter').addEventListener('change', (e) => {
        const rating = e.target.value;
        loadReviews(1, selectedStatus, rating);
    });
    
    // 搜索表单
    document.getElementById('reviewSearchForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const searchQuery = document.getElementById('reviewSearchInput').value.trim();
        loadReviews(1, selectedStatus, selectedRating, searchQuery);
    });
    
    // 刷新按钮
    document.getElementById('refreshReviewsBtn').addEventListener('click', () => {
        loadReviews(currentPage, selectedStatus, selectedRating);
    });
    
    // 导出按钮
    document.getElementById('exportReviewsBtn').addEventListener('click', handleExportReviews);
    
    // 模态框中的通过评价按钮
    document.getElementById('approveReviewBtn').addEventListener('click', () => {
        const reviewId = document.getElementById('approveReviewBtn').getAttribute('data-review-id');
        if (reviewId) {
            handleApproveReview(reviewId);
        }
    });
    
    // 模态框中的拒绝评价按钮
    document.getElementById('rejectReviewBtn').addEventListener('click', () => {
        const reviewId = document.getElementById('rejectReviewBtn').getAttribute('data-review-id');
        if (reviewId) {
            handleRejectReview(reviewId);
        }
    });
    
    // 提交回复按钮
    document.getElementById('submitReplyBtn').addEventListener('click', handleSubmitReply);
}

// 处理查看评价详情
async function handleViewReview(e) {
    const reviewId = e.currentTarget.getAttribute('data-review-id');
    
    try {
        // 显示加载状态
        const reviewDetailContent = document.getElementById('reviewDetailContent');
        reviewDetailContent.innerHTML = `
            <div class="text-center p-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">加载中...</span>
                </div>
                <p class="mt-3">正在加载评价详情...</p>
            </div>
        `;
        
        // 获取评价详情
        const review = await adminAPI.getReviewById(reviewId);
        
        // 设置模态框按钮的数据属性
        document.getElementById('approveReviewBtn').setAttribute('data-review-id', reviewId);
        document.getElementById('rejectReviewBtn').setAttribute('data-review-id', reviewId);
        
        // 根据评价状态显示/隐藏按钮
        if (review.status === 'approved') {
            document.getElementById('approveReviewBtn').style.display = 'none';
            document.getElementById('rejectReviewBtn').style.display = 'inline-block';
        } else if (review.status === 'rejected') {
            document.getElementById('approveReviewBtn').style.display = 'inline-block';
            document.getElementById('rejectReviewBtn').style.display = 'none';
        } else {
            document.getElementById('approveReviewBtn').style.display = 'inline-block';
            document.getElementById('rejectReviewBtn').style.display = 'inline-block';
        }
        
        // 格式化日期
        const reviewDate = new Date(review.created_at * 1000).toLocaleString('zh-CN');
        
        // 评分星级
        const stars = getStarRating(review.rating);
        
        // 评价图片
        const imagesHtml = review.images && review.images.length > 0 ? 
            `<div class="mt-3">
                <h6>评价图片：</h6>
                <div class="d-flex flex-wrap gap-2">
                    ${review.images.map(img => `<img src="${img}" class="img-thumbnail" style="max-width: 150px; max-height: 150px;" alt="评价图片">`).join('')}
                </div>
            </div>` : '';
        
        // 商家回复
        const replyHtml = review.reply ? 
            `<div class="mt-3 p-3 bg-light rounded">
                <h6 class="mb-2"><i class="bi bi-shop me-1"></i>商家回复：</h6>
                <p class="mb-1">${review.reply.content}</p>
                <small class="text-muted">回复时间：${new Date(review.reply.created_at * 1000).toLocaleString('zh-CN')}</small>
            </div>` : '';
        
        // 更新评价详情内容
        reviewDetailContent.innerHTML = `
            <div class="row mb-3">
                <div class="col-md-6">
                    <div class="d-flex align-items-center mb-3">
                        <img src="${review.product_image || '../image/liubaotea_logo.png'}" class="me-3" style="width: 80px; height: 80px; object-fit: cover;" alt="${review.product_name}">
                        <div>
                            <h5>${review.product_name}</h5>
                            <div class="text-muted">商品ID: ${review.product_id}</div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-2">
                        <strong>评价用户：</strong> ${review.username}
                    </div>
                    <div class="mb-2">
                        <strong>评价时间：</strong> ${reviewDate}
                    </div>
                    <div class="mb-2">
                        <strong>评价状态：</strong> ${getReviewStatusBadge(review.status)}
                    </div>
                </div>
            </div>
            <div class="row mb-3">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h6 class="mb-0">评价内容</h6>
                            <div class="review-stars">${stars}</div>
                        </div>
                        <div class="card-body">
                            <p>${review.content}</p>
                            ${imagesHtml}
                        </div>
                    </div>
                </div>
            </div>
            ${replyHtml}
        `;
        
        // 显示模态框
        const reviewDetailModal = new bootstrap.Modal(document.getElementById('reviewDetailModal'));
        reviewDetailModal.show();
    } catch (error) {
        console.error('获取评价详情失败:', error);
        showErrorToast('获取评价详情失败，请稍后重试');
    }
}

// 处理回复评价
function handleReplyReview(e) {
    const reviewId = e.currentTarget.getAttribute('data-review-id');
    
    // 设置回复表单的评价ID
    document.getElementById('replyReviewId').value = reviewId;
    document.getElementById('replyContent').value = '';
    
    // 显示回复模态框
    const replyModal = new bootstrap.Modal(document.getElementById('replyReviewModal'));
    replyModal.show();
}

// 处理提交回复
async function handleSubmitReply() {
    const reviewId = document.getElementById('replyReviewId').value;
    const content = document.getElementById('replyContent').value.trim();
    
    if (!content) {
        showErrorToast('请输入回复内容');
        return;
    }
    
    const submitBtn = document.getElementById('submitReplyBtn');
    
    try {
        // 显示加载状态
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 提交中...';
        submitBtn.disabled = true;
        
        // 提交回复
        await adminAPI.replyReview(reviewId, content);
        
        // 关闭模态框
        const replyModal = bootstrap.Modal.getInstance(document.getElementById('replyReviewModal'));
        replyModal.hide();
        
        // 重新加载评价列表
        await loadReviews(currentPage, selectedStatus, selectedRating);
        
        // 显示成功提示
        showSuccessToast('回复提交成功');
    } catch (error) {
        console.error('提交回复失败:', error);
        showErrorToast('提交回复失败: ' + (error.message || '请稍后重试'));
    } finally {
        // 恢复按钮状态
        submitBtn.innerHTML = '提交回复';
        submitBtn.disabled = false;
    }
}

// 处理通过评价
async function handleApproveReview(reviewId) {
    try {
        // 显示加载状态
        showLoadingOverlay();
        
        // 调用API通过评价
        await adminAPI.updateReviewStatus(reviewId, 'approved');
        
        // 关闭模态框
        const reviewDetailModal = bootstrap.Modal.getInstance(document.getElementById('reviewDetailModal'));
        if (reviewDetailModal) {
            reviewDetailModal.hide();
        }
        
        // 重新加载评价列表
        await loadReviews(currentPage, selectedStatus, selectedRating);
        
        // 显示成功提示
        showSuccessToast('评价已通过');
    } catch (error) {
        console.error('通过评价失败:', error);
        showErrorToast('通过评价失败: ' + (error.message || '请稍后重试'));
    } finally {
        // 隐藏加载状态
        hideLoadingOverlay();
    }
}

// 处理拒绝评价
async function handleRejectReview(reviewId) {
    try {
        // 显示加载状态
        showLoadingOverlay();
        
        // 调用API拒绝评价
        await adminAPI.updateReviewStatus(reviewId, 'rejected');
        
        // 关闭模态框
        const reviewDetailModal = bootstrap.Modal.getInstance(document.getElementById('reviewDetailModal'));
        if (reviewDetailModal) {
            reviewDetailModal.hide();
        }
        
        // 重新加载评价列表
        await loadReviews(currentPage, selectedStatus, selectedRating);
        
        // 显示成功提示
        showSuccessToast('评价已拒绝');
    } catch (error) {
        console.error('拒绝评价失败:', error);
        showErrorToast('拒绝评价失败: ' + (error.message || '请稍后重试'));
    } finally {
        // 隐藏加载状态
        hideLoadingOverlay();
    }
}

// 处理导出评价
async function handleExportReviews() {
    try {
        // 显示加载状态
        showLoadingOverlay();
        
        // 调用API导出评价
        const result = await adminAPI.exportReviews(selectedStatus, selectedRating);
        
        // 创建下载链接
        const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `reviews_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // 显示成功提示
        showSuccessToast('评价导出成功');
    } catch (error) {
        console.error('导出评价失败:', error);
        showErrorToast('导出评价失败: ' + (error.message || '请稍后重试'));
    } finally {
        // 隐藏加载状态
        hideLoadingOverlay();
    }
}

// 获取评分星级HTML
function getStarRating(rating) {
    const fullStar = '<i class="bi bi-star-fill"></i>';
    const halfStar = '<i class="bi bi-star-half"></i>';
    const emptyStar = '<i class="bi bi-star"></i>';
    
    let stars = '';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
        if (i <= fullStars) {
            stars += fullStar;
        } else if (i === fullStars + 1 && hasHalfStar) {
            stars += halfStar;
        } else {
            stars += emptyStar;
        }
    }
    
    return stars;
}

// 获取评价状态标签
function getReviewStatusBadge(status) {
    switch (status) {
        case 'pending':
            return '<span class="status-badge status-pending">待审核</span>';
        case 'approved':
            return '<span class="status-badge status-approved">已通过</span>';
        case 'rejected':
            return '<span class="status-badge status-rejected">已拒绝</span>';
        default:
            return '<span class="status-badge">未知状态</span>';
    }
}

// 显示加载遮罩
function showLoadingOverlay() {
    let overlay = document.getElementById('loadingOverlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'spinner-overlay';
        overlay.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(overlay);
    }
    
    overlay.style.display = 'flex';
}

// 隐藏加载遮罩
function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// 显示成功提示
function showSuccessToast(message) {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    const toastId = 'toast-' + Date.now();
    
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-check-circle me-2"></i>${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="关闭"></button>
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    toast.show();
    
    // 自动移除
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

// 显示错误提示
function showErrorToast(message) {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    const toastId = 'toast-' + Date.now();
    
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white bg-danger border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-exclamation-circle me-2"></i>${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="关闭"></button>
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
    toast.show();
    
    // 自动移除
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

// 创建Toast容器
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    container.style.zIndex = '1050';
    document.body.appendChild(container);
    return container;
}