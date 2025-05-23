/**
 * 商品评价模块
 * 处理商品评价的展示和提交
 */

// 导入API函数
import { API_BASE_URL } from './config.js';
import { getProductReviews, addProductReview } from './api-extended.js';
import { showSuccessToast, showErrorToast } from './utils.js';

// 评价列表数据
let reviewsData = [];
let currentProductId = null;
let reviewsCurrentPage = 1;
let reviewsTotalPages = 1;
let reviewsPageSize = 5;
let reviewsSelectedFilter = 'all';

// 初始化评价模块
export async function initProductReviews(productId) {
    if (!productId) return;
    
    currentProductId = productId;
    
    try {
        // 加载评价列表
        await loadProductReviews(productId, 1);
        
        // 设置事件监听器
        setupReviewsEventListeners();
    } catch (error) {
        console.error('初始化商品评价模块失败:', error);
        document.getElementById('reviewsList').innerHTML = '<div class="no-reviews">加载评价失败，请稍后重试</div>';
    }
}

// 加载商品评价
async function loadProductReviews(productId, page = 1, filter = 'all') {
    try {
        reviewsCurrentPage = page;
        reviewsSelectedFilter = filter;
        
        // 显示加载状态
        document.getElementById('reviewsList').innerHTML = '<div class="loading-reviews">加载评价中...</div>';
        
        // 获取评价数据
        const result = await getProductReviews(productId);
        
        // 如果没有评价数据
        if (!result.reviews || result.reviews.length === 0) {
            document.getElementById('reviewsList').innerHTML = '<div class="no-reviews">暂无评价</div>';
            updateReviewsSummary(0, {});
            return;
        }
        
        reviewsData = result.reviews;
        reviewsTotalPages = Math.ceil(reviewsData.length / reviewsPageSize);
        
        // 根据筛选条件过滤评价
        let filteredReviews = reviewsData;
        if (filter !== 'all') {
            if (filter === 'with-images') {
                filteredReviews = reviewsData.filter(review => review.images && review.images.length > 0);
            } else {
                const ratingFilter = parseInt(filter);
                filteredReviews = reviewsData.filter(review => review.rating === ratingFilter);
            }
        }
        
        // 计算分页数据
        const startIndex = (page - 1) * reviewsPageSize;
        const endIndex = Math.min(startIndex + reviewsPageSize, filteredReviews.length);
        const pageReviews = filteredReviews.slice(startIndex, endIndex);
        
        // 更新评价列表
        updateReviewsList(pageReviews);
        
        // 更新评价摘要
        updateReviewsSummary(reviewsData.length, calculateRatingDistribution(reviewsData));
        
        // 更新分页控件
        updateReviewsPagination(filteredReviews.length);
    } catch (error) {
        console.error('加载商品评价失败:', error);
        document.getElementById('reviewsList').innerHTML = '<div class="no-reviews">加载评价失败，请稍后重试</div>';
    }
}

// 更新评价列表
function updateReviewsList(reviews) {
    const reviewsList = document.getElementById('reviewsList');
    reviewsList.innerHTML = '';
    
    if (reviews.length === 0) {
        reviewsList.innerHTML = '<div class="no-reviews">没有符合条件的评价</div>';
        return;
    }
    
    reviews.forEach(review => {
        // 创建评价项元素
        const reviewItem = document.createElement('div');
        reviewItem.className = 'review-item';
        
        // 格式化日期
        const reviewDate = new Date(review.created_at * 1000).toLocaleDateString('zh-CN');
        
        // 评分星级
        const stars = getStarRating(review.rating);
        
        // 评价图片
        const imagesHtml = review.images && review.images.length > 0 ? 
            `<div class="review-images">${review.images.map((img, index) => `<img src="${img}" class="review-image" data-index="${index}" data-review-id="${review.id}">`).join('')}</div>` : '';
        
        // 商家回复
        const replyHtml = review.reply ? 
            `<div class="review-reply">
                <div class="reply-header"><i class="fas fa-store"></i>商家回复：</div>
                <div class="reply-content">${review.reply.content}</div>
                <div class="reply-date">回复时间：${new Date(review.reply.created_at * 1000).toLocaleDateString('zh-CN')}</div>
            </div>` : '';
        
        // 设置评价项内容
        reviewItem.innerHTML = `
            <div class="review-header">
                <div class="reviewer-info">
                    <div class="reviewer-avatar">${review.username.charAt(0).toUpperCase()}</div>
                    <span class="reviewer-name">${review.username}</span>
                    <span class="review-date">${reviewDate}</span>
                </div>
                <div class="review-rating">${stars}</div>
            </div>
            <div class="review-content">${review.content}</div>
            ${imagesHtml}
            ${replyHtml}
        `;
        
        reviewsList.appendChild(reviewItem);
    });
    
    // 添加评价图片点击事件
    document.querySelectorAll('.review-image').forEach(img => {
        img.addEventListener('click', handleReviewImageClick);
    });
}

// 更新评价摘要
function updateReviewsSummary(totalReviews, ratingDistribution) {
    // 更新评价数量
    document.querySelector('.review-count').textContent = `(${totalReviews})`;
    
    // 计算平均评分
    let averageRating = 0;
    if (totalReviews > 0) {
        let totalRating = 0;
        for (let i = 1; i <= 5; i++) {
            totalRating += i * (ratingDistribution[i] || 0);
        }
        averageRating = totalRating / totalReviews;
    }
    
    // 更新平均评分
    document.querySelector('.average-rating').textContent = averageRating.toFixed(1);
    
    // 更新评分星级
    document.querySelector('.rating-stars').innerHTML = getStarRating(Math.round(averageRating));
    
    // 更新评分分布
    const ratingBars = document.querySelectorAll('.rating-bar');
    for (let i = 0; i < 5; i++) {
        const rating = 5 - i;
        const count = ratingDistribution[rating] || 0;
        const percent = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
        
        const progressBar = ratingBars[i].querySelector('.progress-bar');
        const percentText = ratingBars[i].querySelector('.rating-percent');
        
        progressBar.style.width = `${percent}%`;
        percentText.textContent = `${percent}%`;
    }
}

// 更新分页控件
function updateReviewsPagination(totalReviews) {
    const pagination = document.getElementById('reviewsPagination');
    pagination.innerHTML = '';
    
    const totalPages = Math.ceil(totalReviews / reviewsPageSize);
    reviewsTotalPages = totalPages;
    
    if (totalPages <= 1) {
        return;
    }
    
    // 上一页按钮
    const prevBtn = document.createElement('button');
    prevBtn.className = `pagination-btn ${reviewsCurrentPage === 1 ? 'disabled' : ''}`;
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    pagination.appendChild(prevBtn);
    
    if (reviewsCurrentPage > 1) {
        prevBtn.addEventListener('click', () => {
            loadProductReviews(currentProductId, reviewsCurrentPage - 1, reviewsSelectedFilter);
        });
    }
    
    // 页码按钮
    const maxPages = 5; // 最多显示的页码数
    let startPage = Math.max(1, reviewsCurrentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);
    
    if (endPage - startPage + 1 < maxPages) {
        startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `pagination-btn ${i === reviewsCurrentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pagination.appendChild(pageBtn);
        
        if (i !== reviewsCurrentPage) {
            pageBtn.addEventListener('click', () => {
                loadProductReviews(currentProductId, i, reviewsSelectedFilter);
            });
        }
    }
    
    // 下一页按钮
    const nextBtn = document.createElement('button');
    nextBtn.className = `pagination-btn ${reviewsCurrentPage === totalPages ? 'disabled' : ''}`;
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    pagination.appendChild(nextBtn);
    
    if (reviewsCurrentPage < totalPages) {
        nextBtn.addEventListener('click', () => {
            loadProductReviews(currentProductId, reviewsCurrentPage + 1, reviewsSelectedFilter);
        });
    }
}

// 设置事件监听器
function setupReviewsEventListeners() {
    // 筛选按钮点击事件
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // 移除所有按钮的active类
            filterBtns.forEach(b => b.classList.remove('active'));
            // 添加当前按钮的active类
            btn.classList.add('active');
            
            // 获取筛选条件
            const filter = btn.getAttribute('data-filter');
            // 重新加载评价列表
            loadProductReviews(currentProductId, 1, filter);
        });
    });
}

// 注意：图片上传和评价提交功能已移至submit-review.js
// 这些函数在此文件中已不再需要

// 处理评价图片点击
function handleReviewImageClick(e) {
    const modal = document.getElementById('reviewImageModal');
    const modalImg = document.getElementById('reviewModalImage');
    
    // 设置模态框图片
    modalImg.src = e.currentTarget.src;
    
    // 显示模态框
    modal.style.display = 'block';
    
    // 关闭模态框事件
    document.querySelector('.close-modal').onclick = function() {
        modal.style.display = 'none';
    };
    
    // 点击模态框背景关闭
    modal.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

// 计算评分分布
function calculateRatingDistribution(reviews) {
    const distribution = {};
    
    reviews.forEach(review => {
        const rating = review.rating;
        distribution[rating] = (distribution[rating] || 0) + 1;
    });
    
    return distribution;
}

// 获取评分星级HTML
function getStarRating(rating) {
    let stars = '';
    
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fas fa-star"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }
    
    return stars;
}

// 导出模块函数
export default {
    init: initProductReviews
};

// 直接导出initProductReviews函数，便于直接导入
export { initProductReviews };