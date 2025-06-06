/**
 * 管理后台评价管理模块
 * 处理评价的展示、审核和回复
 */

// 导入adminAuth模块和API配置
import { adminAuth } from './admin-auth.js';
import adminAPI, { API_BASE_URL, ADMIN_API_BASE_URL } from './admin-api.js';

// 确保API配置可用
console.log('admin-reviews.js中的API配置:', { API_BASE_URL, ADMIN_API_BASE_URL });
console.log('admin-reviews.js中的adminAPI:', adminAPI);

// 评价列表数据
let reviewsData = [];
let reviewsCurrentPage = 1;
let reviewsTotalPages = 1;
let reviewsPageSize = 10;
let reviewsSelectedStatus = '';
let reviewsSelectedRating = '';

// 全局变量，用于存储要上传的图片
let replyImagesData = [];

// 导出为全局变量，供其他模块使用
window.initReviewsPage = initReviewsPage;
window.refreshReviewsData = loadReviews;
window.adminReviews = { init: initReviewsPage, refresh: loadReviews };

// 添加加载遮罩层样式
function addLoadingOverlayStyles() {
    // 检查样式是否已存在
    if (document.getElementById('loadingOverlayStyles')) {
        return;
    }
    
    const styleElement = document.createElement('style');
    styleElement.id = 'loadingOverlayStyles';
    styleElement.textContent = `
        .spinner-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
            display: none;
        }
        .spinner-container {
            background-color: #fff;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(0, 0, 0, 0.1);
            border-radius: 50%;
            border-top-color: #007bff;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        .spinner-message {
            margin-top: 15px;
            font-weight: 500;
        }
        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }
        .preview-item {
            display: inline-block;
            position: relative;
            margin: 10px;
        }
        .preview-item img {
            max-width: 100px;
            max-height: 100px;
            border-radius: 4px;
        }
        .remove-image {
            position: absolute;
            top: -5px;
            right: -5px;
            background-color: #dc3545;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            text-align: center;
            line-height: 20px;
            cursor: pointer;
        }
    `;
    document.head.appendChild(styleElement);
    console.log('已添加加载遮罩层样式');
}

// 初始化评价管理页面
async function initReviewsPage() {
    // 检查是否已登录
    if (!adminAuth.check()) return;
    
    try {
        console.log('正在初始化评价管理页面...');
        
        // 添加加载遮罩层样式
        addLoadingOverlayStyles();
        
        // 确保模态框存在
        appendReviewsModals();
        
        // 加载评价列表
        await loadReviews(1);
        
        // 设置事件监听器
        setupReviewsEventListeners();
        
        console.log('评价管理页面初始化完成');
    } catch (error) {
        console.error('初始化评价管理页面失败:', error);
        showErrorToast('初始化评价管理页面失败，请稍后重试');
    }
}

// 辅助函数：检查DOM元素是否存在
function elementExists(id) {
    return document.getElementById(id) !== null;
}

// 辅助函数：获取DOM元素，如果不存在则打印警告
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`未找到元素: #${id}`);
    }
    return element;
}

// 确保模态框和必要的DOM元素存在
function appendReviewsModals() {
    // 检查是否已经添加了模态框
    if (document.getElementById('reviewDetailModal') && document.getElementById('replyReviewModal')) {
        console.log('评价模态框已存在，无需重复添加');
        return;
    }
    
    // 添加回复评价模态框
    appendReplyReviewModal();
    
    // 检查页面结构是否已加载
    const reviewsList = document.getElementById('reviewsList');
    const reviewsPagination = document.getElementById('reviewsPagination');
    
    if (!reviewsList || !reviewsPagination) {
        loadReviewsPageStructure();
    }
    
    console.log('已检查并补充所需的DOM元素');
}

// 添加回复评价的模态框
function appendReplyReviewModal() {
    // 检查是否已存在模态框
    if (document.getElementById('replyReviewModal')) return;
    
    // 创建模态框HTML
    const modalHTML = `
        <div class="modal fade" id="replyReviewModal" tabindex="-1" aria-labelledby="replyReviewModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="replyReviewModalLabel">回复评价</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="关闭"></button>
                    </div>
                    <div class="modal-body">
                        <form id="replyReviewForm">
                            <input type="hidden" id="replyReviewId">
                            <div class="mb-3">
                                <label for="replyContent" class="form-label">回复内容</label>
                                <textarea class="form-control" id="replyContent" rows="5" placeholder="请输入回复内容..."></textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">上传图片（最多5张，每张不超过2MB）</label>
                                <div class="input-group">
                                    <input type="file" class="form-control" id="replyImages" accept="image/*" multiple>
                                    <button class="btn btn-outline-secondary" type="button" id="uploadReplyImagesBtn">
                                        <i class="bi bi-cloud-arrow-up me-1"></i>准备图片
                                    </button>
                                </div>
                                <div class="form-text">支持JPG、PNG格式</div>
                            </div>
                            <div id="replyImagePreview" class="mt-3"></div>
                            <div id="uploadProgressContainer" class="d-none">
                                <label class="form-label">上传进度</label>
                                <div class="progress">
                                    <div id="uploadProgress" class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                                </div>
                            </div>
                            <div id="replySubmitStatus" class="alert alert-info mt-3 d-none">
                                提交中，请稍候...
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-primary" id="submitReplyBtn">
                            <span class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
                            <span class="btn-text">提交回复</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="modal fade" id="reviewDetailModal" tabindex="-1" aria-labelledby="reviewDetailModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="reviewDetailModalLabel">评价详情</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="关闭"></button>
                    </div>
                    <div class="modal-body" id="reviewDetailContent">
                        <!-- 评价详情内容将通过JS动态加载 -->
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-success" id="approveReviewBtn">
                            <i class="bi bi-check-circle me-1"></i>通过评价
                        </button>
                        <button type="button" class="btn btn-danger" id="rejectReviewBtn">
                            <i class="bi bi-x-circle me-1"></i>拒绝评价
                        </button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 将模态框添加到页面
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// 加载评价列表
async function loadReviews(page, status = '', rating = '', searchQuery = '') {
    try {
        reviewsCurrentPage = page;
        reviewsSelectedStatus = status;
        reviewsSelectedRating = rating;
        
        // 检查评价管理页面是否已加载
        if (!document.getElementById('reviewsTable')) {
            loadReviewsPageStructure();
        }
        
        // 显示加载状态
        const reviewsList = document.getElementById('reviewsList');
        reviewsList.innerHTML = '<tr><td colspan="8" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">加载中...</span></div></td></tr>';
        
        // 获取评价数据
        const result = await adminAPI.getReviews(page, reviewsPageSize, status, rating, searchQuery);
        reviewsData = result.reviews;
        reviewsTotalPages = result.totalPages;
        
        // 更新评价列表
        updateReviewsList();
        
        // 更新分页控件
        updateReviewsPagination();
    } catch (error) {
        console.error('加载评价列表失败:', error);
        const reviewsList = document.getElementById('reviewsList');
        reviewsList.innerHTML = '<tr><td colspan="8" class="text-center text-danger">加载评价列表失败，请稍后重试</td></tr>';
    }
}

// 加载评价管理页面结构
function loadReviewsPageStructure() {
    const reviewsSection = document.getElementById('reviews');
    
    // 确保容器存在
    if (!reviewsSection) {
        console.error('评价管理容器不存在');
        return;
    }
    
    // 添加评价管理页面HTML
    reviewsSection.innerHTML = `
        <div class="container-fluid px-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2 class="fs-4 my-3">评价管理</h2>
                <div class="d-flex">
                    <button id="refreshReviewsBtn" class="btn btn-sm btn-outline-secondary me-2">
                        <i class="bi bi-arrow-clockwise"></i> 刷新
                    </button>
                    <button id="exportReviewsBtn" class="btn btn-sm btn-outline-secondary">
                        <i class="bi bi-download"></i> 导出
                    </button>
                </div>
            </div>
            
            <div class="card mb-4">
                <div class="card-header bg-light">
                    <div class="row align-items-center">
                        <div class="col-md-3 mb-2 mb-md-0">
                            <select id="reviewStatusFilter" class="form-select form-select-sm">
                                <option value="">全部状态</option>
                                <option value="pending">待审核</option>
                                <option value="approved">已通过</option>
                                <option value="rejected">已拒绝</option>
                            </select>
                        </div>
                        <div class="col-md-3 mb-2 mb-md-0">
                            <select id="reviewRatingFilter" class="form-select form-select-sm">
                                <option value="">全部评分</option>
                                <option value="5">5星</option>
                                <option value="4">4星</option>
                                <option value="3">3星</option>
                                <option value="2">2星</option>
                                <option value="1">1星</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <form id="reviewSearchForm" class="d-flex">
                                <input type="text" id="reviewSearchInput" class="form-control form-control-sm me-2" placeholder="搜索评价内容、商品名称或用户名...">
                                <button type="submit" class="btn btn-sm btn-primary">
                                    <i class="bi bi-search"></i>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0" id="reviewsTable">
                            <thead class="bg-light">
                                <tr>
                                    <th>商品</th>
                                    <th>用户</th>
                                    <th>评分</th>
                                    <th>评价内容</th>
                                    <th>图片</th>
                                    <th>评价时间</th>
                                    <th>状态</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody id="reviewsList">
                                <!-- 评价数据将通过JS动态加载 -->
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="card-footer">
                    <nav aria-label="评价分页">
                        <ul id="reviewsPagination" class="pagination pagination-sm justify-content-center mb-0">
                            <!-- 分页控件将通过JS动态加载 -->
                        </ul>
                    </nav>
                </div>
            </div>
        </div>
    `;
}

// 更新评价列表
function updateReviewsList() {
    const reviewsList = document.getElementById('reviewsList');
    if (!reviewsList) {
        console.error('未找到评价列表容器');
        return;
    }
    
    reviewsList.innerHTML = '';
    
    if (reviewsData.length === 0) {
        reviewsList.innerHTML = '<tr><td colspan="8" class="text-center">暂无评价数据</td></tr>';
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
        
        // 评价内容限制为10个字，超出部分显示省略号
        const contentPreview = review.content ? 
            (review.content.length > 10 ? review.content.substring(0, 10) + '...' : review.content) : 
            '无评价内容';
        
        // 评价图片 - 只显示第一张
        const firstImage = review.images && review.images.length > 0 ? review.images[0] : '';
        console.log('评价图片URL:', firstImage); // 添加日志跟踪图片URL
        
        // 添加R2域名前缀（如果图片路径不包含完整的URL）
        let imageUrl = firstImage;
        if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = `https://r2liubaotea.liubaotea.online/${imageUrl}`;
            console.log('添加域名前缀后的图片URL:', imageUrl);
        }
        
        const imageHtml = firstImage ? 
            `<img src="${imageUrl}" class="review-image-thumbnail" alt="评价图片" data-bs-toggle="modal" data-bs-target="#reviewDetailModal" data-review-id="${review.review_id}" onerror="console.error('图片加载失败:', this.src); this.src='../image/liubaotea_logo.png'; this.classList.add('img-error');">` : 
            '<div class="no-image">无图片</div>';
        
        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <img src="${review.product_image || '../image/liubaotea_logo.png'}" class="product-thumbnail me-2" alt="${review.product_name}">
                    <div>${review.product_name}</div>
                </div>
            </td>
            <td>${review.username}</td>
            <td><div class="review-stars">${stars}</div></td>
            <td><div class="review-content-preview">${contentPreview}</div></td>
            <td><div class="review-image-container">${imageHtml}</div></td>
            <td>${reviewDate}</td>
            <td>${statusBadge}</td>
            <td>
                <div class="action-buttons">
                    <button type="button" class="btn btn-sm btn-outline-primary view-review" data-review-id="${review.review_id}">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-secondary reply-review" data-review-id="${review.review_id}">
                        <i class="bi bi-reply"></i>
                    </button>
                    <div class="btn-group">
                        <button type="button" class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="bi bi-three-dots"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><a class="dropdown-item approve-review" href="#" data-review-id="${review.review_id}">通过评价</a></li>
                            <li><a class="dropdown-item reject-review" href="#" data-review-id="${review.review_id}">拒绝评价</a></li>
                        </ul>
                    </div>
                </div>
            </td>
        `;
        
        reviewsList.appendChild(row);
    });
    
    // 绑定评价操作按钮事件
    bindReviewActionEvents();
}

// 绑定评价操作按钮事件
function bindReviewActionEvents() {
    console.log('正在绑定评价操作按钮事件...');
    
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
    
    console.log('评价操作按钮事件绑定完成');
}

// 更新分页控件
function updateReviewsPagination() {
    const pagination = document.getElementById('reviewsPagination');
    pagination.innerHTML = '';
    
    if (reviewsTotalPages <= 1) {
        return;
    }
    
    // 上一页按钮
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${reviewsCurrentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" aria-label="上一页"><i class="bi bi-chevron-left"></i></a>`;
    pagination.appendChild(prevLi);
    
    if (reviewsCurrentPage > 1) {
        prevLi.addEventListener('click', (e) => {
            e.preventDefault();
            loadReviews(reviewsCurrentPage - 1, reviewsSelectedStatus, reviewsSelectedRating);
        });
    }
    
    // 页码按钮
    const maxPages = 5; // 最多显示的页码数
    let startPage = Math.max(1, reviewsCurrentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(reviewsTotalPages, startPage + maxPages - 1);
    
    if (endPage - startPage + 1 < maxPages) {
        startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === reviewsCurrentPage ? 'active' : ''}`;
        pageLi.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        pagination.appendChild(pageLi);
        
        if (i !== reviewsCurrentPage) {
            pageLi.addEventListener('click', (e) => {
                e.preventDefault();
                loadReviews(i, reviewsSelectedStatus, reviewsSelectedRating);
            });
        }
    }
    
    // 下一页按钮
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${reviewsCurrentPage === reviewsTotalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" aria-label="下一页"><i class="bi bi-chevron-right"></i></a>`;
    pagination.appendChild(nextLi);
    
    if (reviewsCurrentPage < reviewsTotalPages) {
        nextLi.addEventListener('click', (e) => {
            e.preventDefault();
            loadReviews(reviewsCurrentPage + 1, reviewsSelectedStatus, reviewsSelectedRating);
        });
    }
}

// 设置事件监听器
function setupReviewsEventListeners() {
    console.log('正在设置评价管理事件监听器...');

    // 状态筛选
    const statusFilter = document.getElementById('reviewStatusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            const status = e.target.value;
            loadReviews(1, status, reviewsSelectedRating);
        });
    } else {
        console.warn('未找到状态筛选元素');
    }
    
    // 评分筛选
    const ratingFilter = document.getElementById('reviewRatingFilter');
    if (ratingFilter) {
        ratingFilter.addEventListener('change', (e) => {
            const rating = e.target.value;
            loadReviews(1, reviewsSelectedStatus, rating);
        });
    } else {
        console.warn('未找到评分筛选元素');
    }
    
    // 搜索表单
    const searchForm = document.getElementById('reviewSearchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const searchInput = document.getElementById('reviewSearchInput');
            if (searchInput) {
                const searchQuery = searchInput.value.trim();
                loadReviews(1, reviewsSelectedStatus, reviewsSelectedRating, searchQuery);
            }
        });
    } else {
        console.warn('未找到搜索表单元素');
    }
    
    // 刷新按钮
    const refreshBtn = document.getElementById('refreshReviewsBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadReviews(reviewsCurrentPage, reviewsSelectedStatus, reviewsSelectedRating);
        });
    } else {
        console.warn('未找到刷新按钮元素');
    }
    
    // 导出按钮
    const exportBtn = document.getElementById('exportReviewsBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', handleExportReviews);
    } else {
        console.warn('未找到导出按钮元素');
    }
    
    // 模态框中的通过评价按钮
    const approveBtn = document.getElementById('approveReviewBtn');
    if (approveBtn) {
        approveBtn.addEventListener('click', () => {
            const reviewId = approveBtn.getAttribute('data-review-id');
            if (reviewId) {
                handleApproveReview(reviewId);
            }
        });
    } else {
        console.warn('未找到通过评价按钮元素');
    }
    
    // 模态框中的拒绝评价按钮
    const rejectBtn = document.getElementById('rejectReviewBtn');
    if (rejectBtn) {
        rejectBtn.addEventListener('click', () => {
            const reviewId = rejectBtn.getAttribute('data-review-id');
            if (reviewId) {
                handleRejectReview(reviewId);
            }
        });
    } else {
        console.warn('未找到拒绝评价按钮元素');
    }
    
    // 提交回复按钮
    const submitReplyBtn = document.getElementById('submitReplyBtn');
    if (submitReplyBtn) {
        submitReplyBtn.addEventListener('click', handleSubmitReply);
    } else {
        console.warn('未找到提交回复按钮元素');
    }
    
    // 上传回复图片按钮
    const uploadImagesBtn = document.getElementById('uploadReplyImagesBtn');
    if (uploadImagesBtn) {
        uploadImagesBtn.addEventListener('click', handleUploadReplyImages);
    } else {
        console.warn('未找到上传图片按钮元素');
    }
    
    // 监听文件选择变化
    const replyImagesInput = document.getElementById('replyImages');
    if (replyImagesInput) {
        replyImagesInput.addEventListener('change', handleReplyImagesSelected);
    } else {
        console.warn('未找到图片上传输入框元素');
    }
    
    console.log('事件监听器设置完成');
}

// 处理查看评价详情
async function handleViewReview(e) {
    const reviewId = e.currentTarget.getAttribute('data-review-id');
    
    try {
        console.log(`正在获取评价详情，ID: ${reviewId}`);
        
        // 确保模态框存在
        if (!document.getElementById('reviewDetailModal')) {
            console.log('评价详情模态框不存在，正在添加...');
            appendReviewsModals();
        }
        
        // 获取详情内容容器
        const reviewDetailContent = document.getElementById('reviewDetailContent');
        if (!reviewDetailContent) {
            console.error('未找到评价详情内容容器');
            showErrorToast('评价详情组件加载失败，请刷新页面后重试');
            return;
        }
        
        // 显示加载状态
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
        const approveBtn = document.getElementById('approveReviewBtn');
        const rejectBtn = document.getElementById('rejectReviewBtn');
        
        if (approveBtn) approveBtn.setAttribute('data-review-id', reviewId);
        if (rejectBtn) rejectBtn.setAttribute('data-review-id', reviewId);
        
        // 根据评价状态显示/隐藏按钮
        if (review.status === 'approved') {
            if (approveBtn) approveBtn.style.display = 'none';
            if (rejectBtn) rejectBtn.style.display = 'inline-block';
        } else if (review.status === 'rejected') {
            if (approveBtn) approveBtn.style.display = 'inline-block';
            if (rejectBtn) rejectBtn.style.display = 'none';
        } else {
            if (approveBtn) approveBtn.style.display = 'inline-block';
            if (rejectBtn) rejectBtn.style.display = 'inline-block';
        }
        
        // 格式化日期
        const reviewDate = new Date(review.created_at * 1000).toLocaleString('zh-CN');
        
        // 评分星级
        const stars = getStarRating(review.rating);
        
        // 评价图片区域 - 改为单独区块
        const imagesSection = review.images && review.images.length > 0 ? 
            `<div class="card mt-3">
                <div class="card-header bg-light">
                    <h6 class="mb-0"><i class="bi bi-images me-2"></i>评价图片 (${review.images.length}张)</h6>
                </div>
                <div class="card-body">
                    <div class="review-images-gallery">
                        ${review.images.map(img => {
                            console.log('详情页评价图片URL:', img);
                            // 添加R2域名前缀（如果图片路径不包含完整的URL）
                            let imageUrl = img;
                            if (imageUrl && !imageUrl.startsWith('http')) {
                                imageUrl = `https://r2liubaotea.liubaotea.online/${imageUrl}`;
                                console.log('详情页添加域名前缀后的图片URL:', imageUrl);
                            }
                            return `
                                <div class="review-image-item">
                                    <img src="${imageUrl}" class="img-fluid rounded" alt="评价图片" 
                                        onerror="console.error('详情页图片加载失败:', this.src); this.src='../image/liubaotea_logo.png'; this.classList.add('img-error');">
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>` : '';
        
        // 商家回复
        const replyHtml = review.reply ? 
            `<div class="card mt-3">
                <div class="card-header bg-light">
                    <h6 class="mb-0"><i class="bi bi-shop me-2"></i>商家回复</h6>
                </div>
                <div class="card-body">
                    <p class="mb-1">${review.reply.content}</p>
                    ${review.reply.images && review.reply.images.length > 0 ? 
                        `<div class="mt-3">
                            <h6 class="text-muted mb-2">回复图片：</h6>
                            <div class="d-flex flex-wrap gap-2">
                                ${review.reply.images.map(img => {
                                    console.log('回复图片URL:', img);
                                    // 添加R2域名前缀（如果图片路径不包含完整的URL）
                                    let imageUrl = img;
                                    if (imageUrl && !imageUrl.startsWith('http')) {
                                        imageUrl = `https://r2liubaotea.liubaotea.online/${imageUrl}`;
                                        console.log('回复图片添加域名前缀后的URL:', imageUrl);
                                    }
                                    return `
                                        <img src="${imageUrl}" class="img-thumbnail" style="max-width: 100px; max-height: 100px;" alt="回复图片"
                                            onerror="console.error('回复图片加载失败:', this.src); this.src='../image/liubaotea_logo.png'; this.classList.add('img-error');">
                                    `;
                                }).join('')}
                            </div>
                        </div>` : ''
                    }
                    <div class="mt-2 d-flex justify-content-between">
                        <small class="text-muted">回复者：${review.reply.admin_username || '管理员'}</small>
                        <small class="text-muted">回复时间：${new Date(review.reply.created_at * 1000).toLocaleString('zh-CN')}</small>
                    </div>
                </div>
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
            
            <div class="card">
                <div class="card-header bg-light d-flex justify-content-between align-items-center">
                    <h6 class="mb-0"><i class="bi bi-chat-left-text me-2"></i>评价内容</h6>
                    <div class="review-stars">${stars}</div>
                </div>
                <div class="card-body">
                    <p>${review.content || '该用户未留下文字评价'}</p>
                </div>
            </div>
            
            ${imagesSection}
            ${replyHtml}
            
            ${!review.reply ? `
                <div class="mt-3">
                    <button type="button" class="btn btn-primary btn-sm reply-from-detail" data-review-id="${reviewId}">
                        <i class="bi bi-reply me-1"></i>回复此评价
                    </button>
                </div>
            ` : ''}
        `;
        
        // 添加评价详情页面的回复按钮事件
        const replyBtn = reviewDetailContent.querySelector('.reply-from-detail');
        if (replyBtn) {
            replyBtn.addEventListener('click', () => {
                const reviewDetailModal = bootstrap.Modal.getInstance(document.getElementById('reviewDetailModal'));
                if (reviewDetailModal) {
                    reviewDetailModal.hide();
                    setTimeout(() => {
                        handleReplyReview({ currentTarget: { getAttribute: () => reviewId } });
                    }, 500); // 延迟500毫秒，等待模态框完全关闭
                } else {
                    handleReplyReview({ currentTarget: { getAttribute: () => reviewId } });
                }
            });
        }
        
        // 显示模态框
        const reviewDetailModalEl = document.getElementById('reviewDetailModal');
        if (reviewDetailModalEl) {
            const reviewDetailModal = new bootstrap.Modal(reviewDetailModalEl);
            reviewDetailModal.show();
        } else {
            console.error('未找到评价详情模态框元素');
            showErrorToast('无法显示评价详情，请刷新页面后重试');
        }
    } catch (error) {
        console.error('获取评价详情失败:', error);
        showErrorToast('获取评价详情失败，请稍后重试');
    }
}

// 处理回复评价
function handleReplyReview(e) {
    const reviewId = e.currentTarget.getAttribute('data-review-id');
    
    console.log(`准备回复评价，ID: ${reviewId}`);
    
    // 确保回复模态框存在
    if (!document.getElementById('replyReviewModal')) {
        console.log('回复评价模态框不存在，正在添加...');
        appendReviewsModals();
    }
    
    // 获取表单元素
    const replyForm = document.getElementById('replyReviewForm');
    const replyIdInput = document.getElementById('replyReviewId');
    const replyContent = document.getElementById('replyContent');
    const replyImagePreview = document.getElementById('replyImagePreview');
    const uploadProgressContainer = document.getElementById('uploadProgressContainer');
    
    // 检查关键元素是否存在
    if (!replyForm || !replyIdInput || !replyContent || !replyImagePreview || !uploadProgressContainer) {
        console.error('回复评价表单元素不完整');
        showErrorToast('回复评价功能加载失败，请刷新页面后重试');
        return;
    }
    
    // 重置表单和图片数据
    replyForm.reset();
    replyIdInput.value = reviewId;
    replyContent.value = '';
    replyImagePreview.innerHTML = '';
    replyImagesData = [];
    
    // 隐藏进度条
    uploadProgressContainer.classList.add('d-none');
    
    // 显示回复模态框
    const replyModalEl = document.getElementById('replyReviewModal');
    if (replyModalEl) {
        const replyModal = new bootstrap.Modal(replyModalEl);
        replyModal.show();
    } else {
        console.error('未找到回复评价模态框元素');
        showErrorToast('无法打开回复窗口，请刷新页面后重试');
    }
}

// 处理回复图片选择
function handleReplyImagesSelected(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // 限制最多上传5张图片
    if (files.length > 5) {
        showErrorToast('最多只能上传5张图片');
        e.target.value = '';
        return;
    }
    
    // 清空之前的预览
    document.getElementById('replyImagePreview').innerHTML = '';
    replyImagesData = [];
    
    // 处理每个选中的图片
    Array.from(files).forEach((file, index) => {
        // 检查文件类型
        if (!file.type.match('image.*')) {
            showErrorToast(`文件 "${file.name}" 不是有效的图片格式`);
            return;
        }
        
        // 检查文件大小（最大2MB）
        if (file.size > 2 * 1024 * 1024) {
            showErrorToast(`文件 "${file.name}" 大小超过2MB限制`);
            return;
        }
        
        // 创建预览
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.innerHTML = `
                <img src="${e.target.result}" alt="预览图片 ${index + 1}">
                <div class="remove-image" data-index="${index}">
                    <i class="bi bi-x"></i>
                </div>
            `;
            document.getElementById('replyImagePreview').appendChild(previewItem);
            
            // 添加删除按钮事件
            previewItem.querySelector('.remove-image').addEventListener('click', function() {
                const imageIndex = parseInt(this.getAttribute('data-index'));
                // 从预览和数据中删除
                this.parentElement.remove();
                replyImagesData = replyImagesData.filter((_, i) => i !== imageIndex);
            });
        };
        
        // 读取文件
        reader.readAsDataURL(file);
        
        // 保存文件数据
        replyImagesData.push({
            file: file,
            extension: file.name.split('.').pop().toLowerCase(),
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type
        });
    });
}

// 处理上传回复图片
async function handleUploadReplyImages() {
    const reviewId = document.getElementById('replyReviewId').value;
    const fileInput = document.getElementById('replyImages');
    const files = fileInput.files;
    
    if (!files || files.length === 0) {
        showErrorToast('请先选择要上传的图片');
        return;
    }
    
    console.log('开始处理回复图片，图片数量:', files.length);
    
    try {
        // 获取管理员ID
        const adminId = adminAuth.getAdminId();
        if (!adminId) {
            showErrorToast('未获取到管理员ID，请重新登录');
            return;
        }
        console.log('当前管理员ID:', adminId);
        
        // 显示上传进度
        const progressContainer = document.getElementById('uploadProgressContainer');
        const progressBar = document.getElementById('uploadProgress');
        if (progressContainer && progressBar) {
            progressContainer.classList.remove('d-none');
            progressBar.style.width = '0%';
            progressBar.setAttribute('aria-valuenow', '0');
            progressBar.textContent = '0%';
        }
        
        // 为每个图片生成上传所需的元数据
        const timestamp = Math.floor(Date.now() / 1000);
        
        // 重置之前的图片数据
        replyImagesData = [];
        
        // 为每个图片生成元数据
        Array.from(files).forEach((file, index) => {
            // 生成随机字符串作为文件名的一部分
            const randomStr = Math.random().toString(36).substring(2, 10);
            const extension = file.name.split('.').pop().toLowerCase();
            
            // 构建R2存储路径
            const objectKey = `image/Admin-Replies/${reviewId}/${adminId}_${timestamp}_${randomStr}.${extension}`;
            
            // 保存图片数据
            replyImagesData.push({
                file: file,
                extension: extension,
                file_name: file.name,
                file_size: file.size,
                mime_type: file.type,
                object_key: objectKey,
                admin_id: adminId
            });
            
            console.log(`图片${index}元数据:`, replyImagesData[index]);
        });
        
        // 模拟上传进度
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 5;
            if (progress <= 90) {
                if (progressBar) {
                    progressBar.style.width = `${progress}%`;
                    progressBar.setAttribute('aria-valuenow', progress.toString());
                    progressBar.textContent = `${progress}%`;
                }
            }
        }, 100);
        
        // 模拟网络请求时间（实际环境中这里会进行图片上传）
        setTimeout(() => {
            clearInterval(progressInterval);
            if (progressBar) {
                progressBar.style.width = '100%';
                progressBar.setAttribute('aria-valuenow', '100');
                progressBar.textContent = '100%';
            }
            
            setTimeout(() => {
                if (progressContainer) {
                    progressContainer.classList.add('d-none');
                }
                showSuccessToast('图片已准备就绪，请点击"提交回复"完成回复');
            }, 500);
        }, 2000);
        
        console.log('图片元数据准备完成，总共:', replyImagesData.length, '个图片');
    } catch (error) {
        console.error('处理回复图片失败:', error);
        showErrorToast('处理图片失败: ' + (error.message || '请稍后重试'));
        
        const progressContainer = document.getElementById('uploadProgressContainer');
        if (progressContainer) {
            progressContainer.classList.add('d-none');
        }
    }
}

// 处理提交回复
async function handleSubmitReply() {
    const reviewId = getElement('replyReviewId')?.value;
    const content = getElement('replyContent')?.value?.trim();
    
    if (!content) {
        showErrorToast('请输入回复内容');
        return;
    }
    
    console.log(`开始处理评价回复提交，评价ID: ${reviewId}, 内容长度: ${content.length}字符`);
    
    // 获取提交按钮和按钮内的元素
    const submitBtn = getElement('submitReplyBtn');
    if (!submitBtn) {
        showErrorToast('提交按钮未找到，请刷新页面重试');
        return;
    }
    
    const btnSpinner = submitBtn.querySelector('.spinner-border');
    const btnText = submitBtn.querySelector('.btn-text');
    const submitStatus = getElement('replySubmitStatus');
    
    try {
        // 显示加载状态
        showLoadingOverlay('正在提交回复...');
        
        // 显示状态信息
        if (submitStatus) {
            submitStatus.classList.remove('d-none');
        }
        
        // 禁用提交按钮并显示加载状态
        submitBtn.disabled = true;
        if (btnSpinner) btnSpinner.classList.remove('d-none');
        if (btnText) btnText.textContent = '提交中...';
        
        console.log('准备图片数据:', replyImagesData?.length || 0, '个图片');
        
        // 检查管理员ID
        const adminId = adminAuth.getAdminId();
        if (!adminId) {
            console.error('未获取到管理员ID');
            throw new Error('管理员身份验证失败，请重新登录');
        }
        console.log('当前管理员ID:', adminId);
        
        // 记录replyImagesData对象的实际内容
        console.log('图片数据详情:', JSON.stringify(replyImagesData || []));
        
        // 提交回复时确保使用reply_content字段
        console.log(`发送回复API请求，reviewId: ${reviewId}, content: ${content}`);
        const replyData = await adminAPI.replyReview(reviewId, content, replyImagesData || []);
        console.log('回复API响应结果:', replyData);
        
        // 显示成功提示
        showSuccessToast('回复提交成功');
        
        // 关闭模态框
        setTimeout(() => {
            const replyModal = bootstrap.Modal.getInstance(document.getElementById('replyReviewModal'));
            if (replyModal) {
                replyModal.hide();
                console.log('回复模态框已关闭');
            }
            
            // 重置表单
            const replyForm = getElement('replyReviewForm');
            if (replyForm) replyForm.reset();
            
            const replyImagePreview = getElement('replyImagePreview');
            if (replyImagePreview) replyImagePreview.innerHTML = '';
            
            // 清空已选择的图片数据
            replyImagesData = [];
            
            // 重新加载评价列表
            console.log('重新加载评价列表');
            loadReviews(reviewsCurrentPage, reviewsSelectedStatus, reviewsSelectedRating);
        }, 1000);
    } catch (error) {
        console.error('提交回复失败:', error);
        showErrorToast('提交回复失败: ' + (error.message || '请稍后重试'));
    } finally {
        // 隐藏加载状态
        hideLoadingOverlay();
        
        // 隐藏状态信息
        if (submitStatus) {
            submitStatus.classList.add('d-none');
        }
        
        // 恢复按钮状态
        if (submitBtn) {
            submitBtn.disabled = false;
            if (btnSpinner) btnSpinner.classList.add('d-none');
            if (btnText) btnText.textContent = '提交回复';
        }
    }
}

// 处理通过评价
async function handleApproveReview(reviewId) {
    try {
        console.log('正在通过评价，ID:', reviewId);
        
        // 显示加载状态
        showLoadingOverlay('正在通过评价...');
        
        // 调用API通过评价
        await adminAPI.updateReviewStatus(reviewId, 'approved');
        
        // 关闭模态框
        const reviewDetailModal = bootstrap.Modal.getInstance(document.getElementById('reviewDetailModal'));
        if (reviewDetailModal) {
            reviewDetailModal.hide();
        }
        
        // 重新加载评价列表
        await loadReviews(reviewsCurrentPage, reviewsSelectedStatus, reviewsSelectedRating);
        
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
        console.log('正在拒绝评价，ID:', reviewId);
        
        // 显示加载状态
        showLoadingOverlay('正在拒绝评价...');
        
        // 调用API拒绝评价
        await adminAPI.updateReviewStatus(reviewId, 'rejected');
        
        // 关闭模态框
        const reviewDetailModal = bootstrap.Modal.getInstance(document.getElementById('reviewDetailModal'));
        if (reviewDetailModal) {
            reviewDetailModal.hide();
        }
        
        // 重新加载评价列表
        await loadReviews(reviewsCurrentPage, reviewsSelectedStatus, reviewsSelectedRating);
        
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
        const result = await adminAPI.exportReviews(reviewsSelectedStatus, reviewsSelectedRating);
        
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
function showLoadingOverlay(message = '处理中...') {
    // 确保加载遮罩层样式已添加
    addLoadingOverlayStyles();
    
    let overlay = getElement('loadingOverlay');
    
    if (!overlay) {
        console.log('创建加载遮罩元素');
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'spinner-overlay';
        overlay.innerHTML = `
            <div class="spinner-container">
                <div class="spinner"></div>
                <div class="spinner-message mt-3">${message}</div>
            </div>
        `;
        document.body.appendChild(overlay);
    } else {
        // 如果遮罩已存在，更新消息
        const messageEl = overlay.querySelector('.spinner-message');
        if (messageEl) {
            messageEl.textContent = message;
        }
    }
    
    console.log('显示加载遮罩:', message);
    overlay.style.display = 'flex';
}

// 隐藏加载遮罩
function hideLoadingOverlay() {
    const overlay = getElement('loadingOverlay');
    if (overlay) {
        console.log('隐藏加载遮罩');
        overlay.style.display = 'none';
    } else {
        console.warn('尝试隐藏加载遮罩，但元素不存在');
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

// 设置全局函数，供admin-main.js调用
window.refreshReviewsData = loadReviews;