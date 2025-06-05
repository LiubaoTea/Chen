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
        reviewsCurrentPage = page;
        reviewsSelectedStatus = status;
        reviewsSelectedRating = rating;
        
        // 显示加载状态
        const reviewsList = document.getElementById('reviewsList');
        reviewsList.innerHTML = '<tr><td colspan="7" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">加载中...</span></div></td></tr>';
        
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
        reviewsList.innerHTML = '<tr><td colspan="7" class="text-center text-danger">加载评价列表失败，请稍后重试</td></tr>';
    }
}

// 更新评价列表
function updateReviewsList() {
    const reviewsList = document.getElementById('reviewsList');
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
        const imageHtml = firstImage ? 
            `<img src="${firstImage}" class="review-image-thumbnail" alt="评价图片" data-bs-toggle="modal" data-bs-target="#reviewDetailModal" data-review-id="${review.review_id}">` : 
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
    // 状态筛选
    document.getElementById('reviewStatusFilter').addEventListener('change', (e) => {
        const status = e.target.value;
        loadReviews(1, status, reviewsSelectedRating);
    });
    
    // 评分筛选
    document.getElementById('reviewRatingFilter').addEventListener('change', (e) => {
        const rating = e.target.value;
        loadReviews(1, reviewsSelectedStatus, rating);
    });
    
    // 搜索表单
    document.getElementById('reviewSearchForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const searchQuery = document.getElementById('reviewSearchInput').value.trim();
        loadReviews(1, reviewsSelectedStatus, reviewsSelectedRating, searchQuery);
    });
    
    // 刷新按钮
    document.getElementById('refreshReviewsBtn').addEventListener('click', () => {
        loadReviews(reviewsCurrentPage, reviewsSelectedStatus, reviewsSelectedRating);
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
    
    // 上传回复图片按钮
    document.getElementById('uploadReplyImagesBtn').addEventListener('click', handleUploadReplyImages);
    
    // 监听文件选择变化
    document.getElementById('replyImages').addEventListener('change', handleReplyImagesSelected);
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
        
        // 评价图片区域 - 改为单独区块
        const imagesSection = review.images && review.images.length > 0 ? 
            `<div class="card mt-3">
                <div class="card-header bg-light">
                    <h6 class="mb-0"><i class="bi bi-images me-2"></i>评价图片 (${review.images.length}张)</h6>
                </div>
                <div class="card-body">
                    <div class="review-images-gallery">
                        ${review.images.map(img => `
                            <div class="review-image-item">
                                <img src="${img}" class="img-fluid rounded" alt="评价图片">
                            </div>
                        `).join('')}
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
                                ${review.reply.images.map(img => `
                                    <img src="${img}" class="img-thumbnail" style="max-width: 100px; max-height: 100px;" alt="回复图片">
                                `).join('')}
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
                reviewDetailModal.hide();
                handleReplyReview({ currentTarget: { getAttribute: () => reviewId } });
            });
        }
        
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
    
    // 重置表单和图片数据
    document.getElementById('replyReviewForm').reset();
    document.getElementById('replyReviewId').value = reviewId;
    document.getElementById('replyContent').value = '';
    document.getElementById('replyImagePreview').innerHTML = '';
    replyImagesData = [];
    
    // 隐藏进度条
    document.getElementById('uploadProgressContainer').classList.add('d-none');
    
    // 显示回复模态框
    const replyModal = new bootstrap.Modal(document.getElementById('replyReviewModal'));
    replyModal.show();
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
    
    try {
        // 显示上传进度
        const progressContainer = document.getElementById('uploadProgressContainer');
        const progressBar = document.getElementById('uploadProgress');
        progressContainer.classList.remove('d-none');
        progressBar.style.width = '0%';
        progressBar.setAttribute('aria-valuenow', '0');
        
        // 模拟上传进度
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 5;
            if (progress <= 90) {
                progressBar.style.width = `${progress}%`;
                progressBar.setAttribute('aria-valuenow', progress.toString());
            }
        }, 100);
        
        // 上传完成后，隐藏进度条并显示成功提示
        setTimeout(() => {
            clearInterval(progressInterval);
            progressBar.style.width = '100%';
            progressBar.setAttribute('aria-valuenow', '100');
            
            setTimeout(() => {
                progressContainer.classList.add('d-none');
                showSuccessToast('图片已准备就绪，请点击"提交回复"完成回复');
            }, 500);
        }, 2000);
        
    } catch (error) {
        console.error('上传回复图片失败:', error);
        showErrorToast('上传图片失败: ' + (error.message || '请稍后重试'));
        document.getElementById('uploadProgressContainer').classList.add('d-none');
    }
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
        const replyData = await adminAPI.replyReview(reviewId, content, replyImagesData);
        
        // 关闭模态框
        const replyModal = bootstrap.Modal.getInstance(document.getElementById('replyReviewModal'));
        replyModal.hide();
        
        // 重置图片数据
        replyImagesData = [];
        
        // 重新加载评价列表
        await loadReviews(reviewsCurrentPage, reviewsSelectedStatus, reviewsSelectedRating);
        
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

// 设置全局函数，供admin-main.js调用
window.refreshReviewsData = loadReviews;