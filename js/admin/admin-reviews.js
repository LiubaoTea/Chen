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
                        <h5 class="modal-title" id="replyReviewModalLabel">回复用户评价</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="关闭"></button>
                    </div>
                    <div class="modal-body">
                        <form id="replyReviewForm">
                            <input type="hidden" id="replyReviewId">
                            <div class="mb-3">
                                <label for="replyContent" class="form-label">回复内容</label>
                                <textarea class="form-control" id="replyContent" rows="4" placeholder="请输入您的回复内容..."></textarea>
                            </div>
                            <div class="mb-3">
                                <label for="replyImages" class="form-label">上传图片（可选，最多5张）</label>
                                <input class="form-control" type="file" id="replyImages" accept="image/jpeg,image/png" multiple>
                                <div class="form-text">支持JPG/PNG格式，每张图片大小不超过2MB</div>
                                <button type="button" class="btn btn-outline-secondary btn-sm mt-2" id="uploadReplyImagesBtn">
                                    <i class="bi bi-cloud-upload me-1"></i>添加图片
                                </button>
                            </div>
                            <div id="uploadProgressContainer" class="progress mt-3 d-none">
                                <div id="uploadProgress" class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%">0%</div>
                            </div>
                            <div id="replyImagePreview" class="d-flex flex-wrap gap-2 mt-3"></div>
                            
                            <!-- 步骤状态容器 -->
                            <div id="replyStepsContainer" class="d-none mt-4 border rounded p-3 bg-light">
                                <h6 class="mb-3">提交进度</h6>
                                <div class="d-flex flex-column">
                                    <div id="prepareDataStep" class="d-flex align-items-center mb-2">
                                        <div class="step-indicator me-2"></div>
                                        <div>准备数据</div>
                                    </div>
                                    <div id="submitDataStep" class="d-flex align-items-center mb-2">
                                        <div class="step-indicator me-2"></div>
                                        <div>提交到服务器</div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 提交状态显示 -->
                            <div id="replySubmitStatus" class="alert alert-info mt-3 d-none"></div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-danger d-none" id="retrySubmitButton">
                            <i class="bi bi-arrow-repeat me-1"></i>重试
                        </button>
                        <button type="button" class="btn btn-primary" id="submitReplyBtn">
                            <i class="bi bi-send me-1"></i>提交回复
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
        uploadImagesBtn.addEventListener('click', () => {
            // 触发文件选择
            const fileInput = document.getElementById('replyImages');
            if (fileInput) {
                fileInput.click();
            }
        });
    } else {
        console.warn('未找到上传图片按钮元素');
    }
    
    // 监听文件选择变化
    const replyImagesInput = document.getElementById('replyImages');
    if (replyImagesInput) {
        replyImagesInput.addEventListener('change', handleUploadReplyImages);
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
    
    // 确保步骤状态UI存在
    if (!document.getElementById('replyStepsContainer')) {
        console.log('步骤状态UI不存在，正在添加...');
        appendReplyStepsUI();
    }
    
    // 获取表单元素
    const replyForm = document.getElementById('replyReviewForm');
    const replyIdInput = document.getElementById('replyReviewId');
    const replyContent = document.getElementById('replyContent');
    const replyImagePreview = document.getElementById('replyImagePreview');
    const uploadProgressContainer = document.getElementById('uploadProgressContainer');
    const stepsContainer = document.getElementById('replyStepsContainer');
    
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
    
    // 显示步骤容器
    if (stepsContainer) {
        stepsContainer.classList.remove('d-none');
        // 重置步骤状态
        resetStepStatus();
    }
    
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

// 处理上传回复图片
async function handleUploadReplyImages() {
    try {
        const fileInput = document.getElementById('replyImageInput');
        const files = fileInput.files;
        
        if (!files || files.length === 0) {
            console.log('没有选择文件');
            return;
        }
        
        console.log(`选择了 ${files.length} 个文件`);
        
        // 显示上传进度容器
        const uploadProgressContainer = document.getElementById('uploadProgressContainer');
        if (uploadProgressContainer) {
            uploadProgressContainer.classList.remove('d-none');
        }
        
        const imagePreview = document.getElementById('replyImagePreview');
        if (!imagePreview) {
            console.error('找不到图片预览容器');
            return;
        }
        
        // 更新上传状态
        const uploadStatus = document.getElementById('uploadStatus');
        if (uploadStatus) {
            uploadStatus.textContent = `正在处理 ${files.length} 张图片...`;
            uploadStatus.classList.remove('text-danger');
            uploadStatus.classList.add('text-info');
        }
        
        // 检查每个文件是否符合要求（JPG/PNG格式且小于2MB）
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileName = file.name;
            const fileSize = file.size;
            const fileType = file.type;
            
            console.log(`处理文件 #${i+1}: ${fileName}, 大小: ${fileSize} bytes, 类型: ${fileType}`);
            
            // 检查文件类型
            if (fileType !== 'image/jpeg' && fileType !== 'image/png') {
                console.error(`文件 ${fileName} 不是有效的图片格式（JPG/PNG）`);
                showWarningToast(`文件 ${fileName} 不是有效的图片格式，仅支持JPG和PNG`);
                continue;
            }
            
            // 检查文件大小
            if (fileSize > 2 * 1024 * 1024) { // 2MB
                console.error(`文件 ${fileName} 超过大小限制（2MB）`);
                showWarningToast(`文件 ${fileName} 超过大小限制（2MB）`);
                continue;
            }
            
            // 更新上传状态
            if (uploadStatus) {
                uploadStatus.textContent = `正在处理: ${fileName}`;
            }
            
            try {
                // 创建图片预览
                createImagePreview(file, replyImagesData.length, imagePreview);
                
                // 获取文件扩展名
                const extension = fileName.split('.').pop().toLowerCase();
                
                // 将图片数据添加到replyImagesData数组
                replyImagesData.push({
                    file: file,
                    file_name: fileName,
                    file_size: fileSize,
                    mime_type: fileType,
                    extension: extension,
                    object_key: '', // 将在上传后设置
                    upload_status: 'pending'
                });
                
                console.log(`文件 ${fileName} 已添加到上传队列，当前队列长度: ${replyImagesData.length}`);
            } catch (error) {
                console.error(`处理文件 ${fileName} 时出错:`, error);
                showWarningToast(`处理文件 ${fileName} 失败: ${error.message}`);
            }
        }
        
        // 清空文件输入框，允许重复选择相同文件
        fileInput.value = '';
        
        // 更新上传状态
        if (uploadStatus) {
            uploadStatus.textContent = `已准备 ${replyImagesData.length} 张图片`;
            uploadStatus.classList.remove('text-info');
            uploadStatus.classList.add('text-success');
        }
        
        // 显示上传图片数量指示器
        const imagesCounter = document.getElementById('replyImagesCounter');
        if (imagesCounter) {
            imagesCounter.textContent = replyImagesData.length;
            imagesCounter.classList.remove('d-none');
        }
        
    } catch (error) {
        console.error('上传图片出错:', error);
        showErrorToast('上传图片失败: ' + error.message);
    }
}

// 创建图片预览
function createImagePreview(file, index, container) {
    return new Promise((resolve, reject) => {
        try {
            console.log(`开始创建第 ${index + 1} 张图片预览: ${file.name}`);
            
            // 创建预览容器
            const previewItem = document.createElement('div');
            previewItem.className = 'image-preview-item position-relative me-2 mb-2';
            previewItem.dataset.index = index;
            
            // 创建图片元素
            const img = document.createElement('img');
            img.className = 'img-thumbnail preview-image';
            img.alt = `预览图片 ${index + 1}`;
            img.style.maxWidth = '100px';
            img.style.maxHeight = '100px';
            img.style.objectFit = 'cover';
            
            // 添加删除按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-sm btn-danger position-absolute top-0 end-0 rounded-circle p-0';
            deleteBtn.style.width = '20px';
            deleteBtn.style.height = '20px';
            deleteBtn.style.lineHeight = '1';
            deleteBtn.style.fontSize = '10px';
            deleteBtn.innerHTML = '<i class="bi bi-x"></i>';
            deleteBtn.title = '删除图片';
            
            // 图片加载完成后解析Promise
            img.onload = () => {
                console.log(`图片 ${index + 1} 预览加载完成`);
                resolve();
            };
            
            // 图片加载失败
            img.onerror = (e) => {
                console.error(`图片 ${index + 1} 预览加载失败:`, e);
                reject(new Error('无法加载图片预览'));
            };
            
            // 设置删除按钮点击事件
            deleteBtn.addEventListener('click', () => {
                // 从预览容器中移除
                container.removeChild(previewItem);
                
                // 从数据数组中移除
                if (replyImagesData[index]) {
                    console.log(`删除第 ${index + 1} 张图片: ${replyImagesData[index].file_name}`);
                    replyImagesData.splice(index, 1);
                    
                    // 更新索引
                    const remainingPreviews = container.querySelectorAll('.image-preview-item');
                    remainingPreviews.forEach((item, i) => {
                        item.dataset.index = i;
                    });
                    
                    // 更新计数器
                    const counter = document.getElementById('replyImagesCounter');
                    if (counter) {
                        if (replyImagesData.length === 0) {
                            counter.classList.add('d-none');
                        } else {
                            counter.textContent = replyImagesData.length;
                        }
                    }
                }
            });
            
            // 读取文件内容并创建预览
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
                
                // 获取图片的base64数据（不含前缀）
                const base64Data = e.target.result.split(',')[1];
                
                // 如果还没有为这个图片设置对象键，则根据实际文件生成
                if (!replyImagesData[index] || !replyImagesData[index].object_key) {
                    const extension = file.name.split('.').pop().toLowerCase();
                    const timestamp = Math.floor(Date.now() / 1000);
                    const randomStr = Math.random().toString(36).substring(2, 10);
                    
                    // 尝试获取当前回复的评价ID
                    const reviewIdElement = document.getElementById('replyReviewId');
                    const reviewId = reviewIdElement ? reviewIdElement.value : 'temp';
                    
                    // 尝试获取管理员ID
                    let adminId = 'admin';
                    try {
                        adminId = adminAuth.getAdminId() || 'admin';
                    } catch (e) {
                        console.warn('获取adminId失败，使用默认值');
                    }
                    
                    // 构建对象键
                    const objectKey = `image/Admin-Replies/${reviewId}/${adminId}_${timestamp}_${randomStr}.${extension}`;
                    
                    // 更新图片数据
                    if (replyImagesData[index]) {
                        replyImagesData[index].object_key = objectKey;
                        replyImagesData[index].extension = extension;
                    }
                    
                    console.log(`为图片 ${index + 1} 生成的对象键: ${objectKey}`);
                }
            };
            reader.onerror = () => {
                console.error(`读取图片 ${index + 1} 文件失败`);
                reject(new Error('读取图片文件失败'));
            };
            
            // 开始读取文件
            reader.readAsDataURL(file);
            
            // 添加元素到DOM
            previewItem.appendChild(img);
            previewItem.appendChild(deleteBtn);
            container.appendChild(previewItem);
            
        } catch (error) {
            console.error(`创建图片 ${index + 1} 预览时出错:`, error);
            reject(error);
        }
    });
}

// 显示警告提示
function showWarningToast(message) {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    const toastId = 'toast-' + Date.now();
    
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white bg-warning border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-exclamation-triangle me-2"></i>${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="关闭"></button>
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 4000 });
    toast.show();
    
    // 自动移除
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

// 处理提交回复
async function handleSubmitReply() {
    console.log('开始执行handleSubmitReply函数');
    
    // 获取当前正在回复的评价ID
    const reviewId = document.getElementById('replyReviewId').value;
    console.log('准备回复评价，ID:', reviewId);
    
    if (!reviewId) {
        console.error('未找到评价ID，无法提交回复');
        showErrorToast('评价ID不存在，请刷新页面后重试');
        return;
    }
    
    // 显示回复进度指示器
    showReplyProgressIndicator();
    
    // 重置步骤状态
    resetStepStatus();
    
    try {
        // 更新步骤状态：准备数据
        updateStepStatus('prepareDataStep', 'processing');
        
        // 获取回复内容
        const replyContent = document.getElementById('replyContent').value.trim();
        
        // 验证回复内容
        if (!replyContent) {
            console.error('回复内容为空');
            showErrorToast('回复内容不能为空');
            updateStepStatus('prepareDataStep', 'error');
            hideReplyProgressIndicator(false);
            return;
        }
        
        // 获取管理员信息
        const adminToken = localStorage.getItem('admin_token');
        if (!adminToken) {
            console.error('未找到管理员令牌，无法提交回复');
            showErrorToast('管理员认证信息已过期，请重新登录');
            updateStepStatus('prepareDataStep', 'error');
            hideReplyProgressIndicator(false);
            return;
        }
        
        // 尝试解析token获取管理员ID
        let adminId;
        try {
            // adminToken格式为Base64编码的JSON字符串
            const tokenData = JSON.parse(atob(adminToken));
            adminId = parseInt(tokenData.adminId, 10);
            console.log('从令牌解析的管理员ID:', adminId);
            
            if (isNaN(adminId) || adminId <= 0) {
                console.error('从令牌解析的管理员ID无效:', adminId);
                throw new Error('令牌中管理员ID无效');
            }
        } catch (tokenError) {
            console.error('解析管理员令牌失败:', tokenError);
            
            // 尝试从localStorage直接获取
            const storedAdminId = localStorage.getItem('admin_id');
            if (storedAdminId) {
                adminId = parseInt(storedAdminId, 10);
                console.log('从localStorage获取的管理员ID:', adminId);
            }
        }
        
        // 如果上述方法都失败，尝试使用adminAuth获取
        if (!adminId || isNaN(adminId) || adminId <= 0) {
            try {
                adminId = parseInt(adminAuth.getAdminId(), 10);
                console.log('从adminAuth获取的管理员ID:', adminId);
            } catch (authError) {
                console.error('从adminAuth获取管理员ID失败:', authError);
            }
        }
        
        // 检查是否有有效的管理员ID
        if (!adminId || isNaN(adminId) || adminId <= 0) {
            console.error('无法获取有效的管理员ID');
            showErrorToast('无法获取管理员ID，请重新登录后再试');
            updateStepStatus('prepareDataStep', 'error');
            hideReplyProgressIndicator(false);
            return;
        }
        
        console.log('最终使用的管理员ID:', adminId);
        console.log('回复内容:', replyContent);
        console.log('回复图片数量:', replyImagesData.length);
        
        // 更新步骤状态：准备数据完成
        updateStepStatus('prepareDataStep', 'success');
        
        // 更新步骤状态：发送请求
        updateStepStatus('submitDataStep', 'processing');
        
        // 发送请求 - 使用直接的URL路径，确保请求能够准确命中路由
        console.log('开始发送API请求...');
        const apiUrl = `${ADMIN_API_BASE_URL}/api/admin/reviews/${reviewId}/reply`;
        console.log('请求URL:', apiUrl);
        
        // 开始显示网络活动指示器
        const networkIndicator = document.getElementById('networkActivityIndicator');
        if (networkIndicator) {
            networkIndicator.classList.remove('d-none');
        }
        
        // 设置超时，确保请求不会无限期挂起
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
        
        try {
            let response;
            
            // 根据是否有图片选择不同的提交方式
            if (replyImagesData && replyImagesData.length > 0) {
                console.log('使用FormData方式提交包含图片的回复');
                
                // 创建FormData对象
                const formData = new FormData();
                formData.append('review_id', reviewId);
                formData.append('reply_content', replyContent);
                
                // 如果有图片数据，添加到FormData
                if (replyImagesData.length > 0) {
                    // 将图片数据转换为JSON字符串并添加到FormData
                    const imagesJson = JSON.stringify(replyImagesData.map(img => ({
                        file_name: img.file_name || 'image.jpg',
                        file_size: img.file_size || 0,
                        mime_type: img.mime_type || 'image/jpeg',
                        object_key: img.object_key || '',
                        extension: (img.file_name || '').split('.').pop() || 'jpg'
                    })));
                    
                    formData.append('images', imagesJson);
                    console.log('图片数据JSON:', imagesJson);
                }
                
                // 打印FormData内容日志
                console.log('FormData内容:');
                for (const pair of formData.entries()) {
                    console.log(pair[0] + ': ' + pair[1]);
                }
                
                // 发送FormData格式请求
                response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${adminToken}`
                        // 不要设置Content-Type，让浏览器自动设置带boundary的multipart/form-data
                    },
                    body: formData,
                    signal: controller.signal
                });
            } else {
                console.log('使用JSON方式提交纯文本回复');
                
                // 准备JSON数据
                const jsonData = {
                    review_id: parseInt(reviewId, 10),
                    reply_content: replyContent,
                    images: []
                };
                
                console.log('JSON请求数据:', JSON.stringify(jsonData, null, 2));
                
                // 发送JSON格式请求
                response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${adminToken}`
                    },
                    body: JSON.stringify(jsonData),
                    signal: controller.signal
                });
            }
            
            // 清除超时
            clearTimeout(timeoutId);
            
            console.log('API响应状态码:', response.status);
            console.log('API响应状态文本:', response.statusText);
            
            // 尝试获取响应头信息
            console.log('API响应头:');
            response.headers.forEach((value, name) => {
                console.log(`${name}: ${value}`);
            });
            
            // 解析响应
            let responseData;
            const responseText = await response.text();
            console.log('API响应原始文本:', responseText);
            
            try {
                if (responseText) {
                    responseData = JSON.parse(responseText);
                    console.log('API响应解析后的JSON数据:', responseData);
                } else {
                    console.warn('API返回了空响应');
                    responseData = { message: '服务器返回了空响应' };
                }
            } catch (parseError) {
                console.error('解析API响应JSON失败:', parseError);
                console.log('非JSON响应内容:', responseText);
                throw new Error('服务器返回了无效的数据格式');
            }
            
            if (!response.ok) {
                const errorMessage = responseData?.error || responseData?.message || `提交回复失败，HTTP状态码: ${response.status}`;
                console.error('API响应错误:', errorMessage);
                throw new Error(errorMessage);
            }
            
            // 更新步骤状态：发送请求成功
            updateStepStatus('submitDataStep', 'success');
            
            // 成功处理
            console.log('回复提交成功:', responseData);
            
            // 延迟关闭模态框，让用户看到成功状态
            setTimeout(() => {
                // 关闭模态框
                const modal = bootstrap.Modal.getInstance(document.getElementById('replyReviewModal'));
                if (modal) {
                    modal.hide();
                } else {
                    console.warn('未找到模态框实例，无法自动关闭');
                }
                
                // 隐藏进度指示器
                hideReplyProgressIndicator(true);
                
                // 隐藏网络活动指示器
                if (networkIndicator) {
                    networkIndicator.classList.add('d-none');
                }
                
                // 显示成功提示
                showSuccessToast('回复提交成功');
                
                // 刷新评价列表
                console.log('正在刷新评价列表...');
                loadReviews(reviewsCurrentPage, reviewsSelectedStatus, reviewsSelectedRating);
            }, 1000);
            
        } catch (fetchError) {
            // 清除超时
            clearTimeout(timeoutId);
            
            // 处理网络错误
            if (fetchError.name === 'AbortError') {
                console.error('请求超时:', fetchError);
                throw new Error('请求超时，请检查网络连接后重试');
            } else {
                console.error('网络请求失败:', fetchError);
                throw fetchError;
            }
        } finally {
            // 隐藏网络活动指示器
            if (networkIndicator) {
                networkIndicator.classList.add('d-none');
            }
        }
        
    } catch (error) {
        console.error('提交回复时发生错误:', error);
        console.error('错误堆栈:', error.stack);
        
        // 更新步骤状态：发生错误
        if (document.getElementById('submitDataStep').classList.contains('processing')) {
            updateStepStatus('submitDataStep', 'error');
        } else {
            updateStepStatus('prepareDataStep', 'error');
        }
        
        // 隐藏进度指示器，显示错误状态
        hideReplyProgressIndicator(false);
        
        // 显示错误提示
        showErrorToast(`提交回复失败: ${error.message}`);
        
        // 添加重试按钮
        const retryButton = document.getElementById('retrySubmitButton');
        if (retryButton) {
            retryButton.classList.remove('d-none');
            retryButton.onclick = handleSubmitReply;
        }
    }
}

// 更新步骤状态
function updateStepStatus(stepId, status) {
    const step = document.getElementById(stepId);
    if (!step) return;
    
    // 移除所有状态类
    step.classList.remove('active', 'completed');
    
    // 添加新状态
    step.classList.add(status);
}

// 重置所有步骤状态
function resetStepStatus() {
    const steps = document.querySelectorAll('.submit-step');
    steps.forEach(step => {
        step.classList.remove('active', 'completed');
    });
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

// 添加步骤状态显示功能
function appendReplyStepsUI() {
    const replyModalContent = document.querySelector('#replyReviewModal .modal-content');
    if (!replyModalContent || document.getElementById('replyStepsContainer')) return;
    
    const stepsHTML = `
    <div id="replyStepsContainer" class="d-none mb-3 mt-2">
        <h6>提交进度:</h6>
        <div class="steps-container">
            <div id="prepareDataStep" class="step submit-step">
                <span class="step-icon"><i class="bi bi-check-circle"></i></span>
                <span class="step-text">准备数据</span>
            </div>
            <div id="submitDataStep" class="step submit-step">
                <span class="step-icon"><i class="bi bi-check-circle"></i></span>
                <span class="step-text">提交数据</span>
            </div>
        </div>
    </div>
    `;
    
    // 添加提交步骤UI
    const modalBody = replyModalContent.querySelector('.modal-body');
    if (modalBody) {
        modalBody.insertAdjacentHTML('afterbegin', stepsHTML);
    }
    
    // 添加必要的CSS样式
    if (!document.getElementById('reply-steps-styles')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'reply-steps-styles';
        styleElement.textContent = `
            .steps-container {
                display: flex;
                margin: 10px 0;
                padding: 5px;
                background: #f8f9fa;
                border-radius: 5px;
            }
            .step {
                display: flex;
                align-items: center;
                margin-right: 20px;
                padding: 5px;
                border-radius: 4px;
                color: #6c757d;
            }
            .step.processing {
                color: #007bff;
                animation: pulse 1.5s infinite;
            }
            .step.success {
                color: #28a745;
            }
            .step.error {
                color: #dc3545;
            }
            .step-icon {
                margin-right: 5px;
            }
            @keyframes pulse {
                0% { opacity: 0.7; }
                50% { opacity: 1; }
                100% { opacity: 0.7; }
            }
        `;
        document.head.appendChild(styleElement);
    }
}

// 确保在初始化时调用
document.addEventListener('DOMContentLoaded', () => {
    // 如果已经有这个函数的调用，则不需要再次添加
    if (typeof initReviewsPage === 'function') {
        const originalInitReviewsPage = initReviewsPage;
        
        initReviewsPage = async function() {
            await originalInitReviewsPage();
            appendReplyStepsUI();
        };
    }
});

// 添加回复进度指示器
function showReplyProgressIndicator() {
    console.log('显示回复进度指示器');
    
    // 确保submitReplyBtn存在
    const submitBtn = document.getElementById('submitReplyBtn');
    if (submitBtn) {
        // 保存原始文本
        if (!submitBtn.hasAttribute('data-original-text')) {
            submitBtn.setAttribute('data-original-text', submitBtn.innerHTML);
        }
        
        // 更新按钮文本和状态
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>提交中...';
    }
    
    // 显示提交状态信息
    const submitStatus = document.getElementById('replySubmitStatus');
    if (submitStatus) {
        submitStatus.classList.remove('d-none', 'alert-success', 'alert-danger');
        submitStatus.classList.add('alert-info');
        submitStatus.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                <div>正在提交回复，请稍候...</div>
            </div>
        `;
    }
    
    // 显示全局加载遮罩
    showLoadingOverlay('正在提交回复...');
    
    // 禁用表单元素
    const replyForm = document.getElementById('replyReviewForm');
    if (replyForm) {
        const formElements = replyForm.querySelectorAll('input, textarea, button');
        formElements.forEach(element => {
            if (element.id !== 'submitReplyBtn') {  // 排除已经处理过的提交按钮
                element.disabled = true;
            }
        });
    }
}

// 隐藏回复进度指示器
function hideReplyProgressIndicator(success = true) {
    console.log('隐藏回复进度指示器，状态:', success ? 'success' : 'error');
    
    // 恢复提交按钮
    const submitBtn = document.getElementById('submitReplyBtn');
    if (submitBtn) {
        const originalText = submitBtn.getAttribute('data-original-text') || '提交回复';
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
    
    // 更新提交状态信息
    const submitStatus = document.getElementById('replySubmitStatus');
    if (submitStatus) {
        submitStatus.classList.remove('d-none', 'alert-info');
        
        if (success) {
            submitStatus.classList.add('alert-success');
            submitStatus.innerHTML = `
                <div class="d-flex align-items-center">
                    <i class="bi bi-check-circle-fill me-2"></i>
                    <div>回复提交成功!</div>
                </div>
            `;
            
            // 3秒后自动隐藏
            setTimeout(() => {
                submitStatus.classList.add('d-none');
            }, 3000);
        } else {
            submitStatus.classList.add('alert-danger');
            submitStatus.innerHTML = `
                <div class="d-flex align-items-center">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    <div>回复提交失败，请检查网络连接后重试</div>
                </div>
            `;
        }
    }
    
    // 隐藏全局加载遮罩
    hideLoadingOverlay();
    
    // 启用表单元素
    const replyForm = document.getElementById('replyReviewForm');
    if (replyForm) {
        const formElements = replyForm.querySelectorAll('input, textarea, button');
        formElements.forEach(element => {
            element.disabled = false;
        });
    }
}

// 在页面加载时添加网络活动指示器
function appendNetworkActivityIndicator() {
    if (!document.getElementById('networkActivityIndicator')) {
        const indicator = document.createElement('div');
        indicator.id = 'networkActivityIndicator';
        indicator.className = 'd-none position-fixed top-0 start-0 end-0 p-2 bg-primary text-white text-center';
        indicator.style.zIndex = '9999';
        indicator.innerHTML = '<div class="d-flex justify-content-center align-items-center"><div class="spinner-border spinner-border-sm me-2" role="status"></div><span>正在与服务器通信...</span></div>';
        document.body.appendChild(indicator);
    }
}

// 在初始化页面时调用
function initPageElements() {
    // 添加网络活动指示器
    appendNetworkActivityIndicator();
    
    // 添加模态框和其他元素
    appendReviewsModals();
    appendReplyStepsUI();
}

// 在页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initPageElements();
});