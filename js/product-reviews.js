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
async function initProductReviews(productId) {
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
        console.log('正在获取商品评价数据，商品ID:', productId);
        const result = await getProductReviews(productId);
        console.log('获取到的评价数据结构:', result);
        
        // 检查API返回的数据结构
        if (!result) {
            console.error('API返回的数据为空');
            document.getElementById('reviewsList').innerHTML = '<div class="no-reviews">暂无评价</div>';
            // 即使没有评价数据，也显示评分分布
            updateReviewsSummary(0, {1: 0, 2: 0, 3: 0, 4: 0, 5: 0});
            return;
        }
        
        // 处理可能的数据结构差异
        let reviews = [];
        if (result.reviews && Array.isArray(result.reviews)) {
            reviews = result.reviews;
        } else if (Array.isArray(result)) {
            reviews = result;
        } else if (typeof result === 'object') {
            // 尝试从对象中提取评价数组
            const possibleArrays = Object.values(result).filter(val => Array.isArray(val));
            if (possibleArrays.length > 0) {
                // 使用最长的数组作为评价数据
                reviews = possibleArrays.reduce((longest, current) => 
                    current.length > longest.length ? current : longest, []);
            }
        }
        
        // 过滤评价状态
        reviews = reviews.filter(review => {
            // 检查状态字段，可能是status或review_status
            const status = review.status || review.review_status;
            // 接受approved或published状态的评价
            return status === 'approved' || status === 'published';
        });
        
        // 如果没有评价数据
        if (reviews.length === 0) {
            console.log('没有找到评价数据或数据格式不正确');
            document.getElementById('reviewsList').innerHTML = '<div class="no-reviews">暂无评价</div>';
            updateReviewsSummary(0, {});
            return;
        }
        
        console.log('评价数据数量:', reviews.length);
        console.log('第一条评价数据示例:', reviews[0]);
        
        reviewsData = reviews;
        reviewsTotalPages = Math.ceil(reviewsData.length / reviewsPageSize);
        
        // 根据筛选条件过滤评价
        let filteredReviews = reviewsData;
        if (filter !== 'all') {
            if (filter === 'with-images') {
                // 检查多种可能的图片字段
                filteredReviews = reviewsData.filter(review => {
                    // 检查images字段
                    if (review.images && (Array.isArray(review.images) ? review.images.length > 0 : review.images)) {
                        return true;
                    }
                    // 检查review_images字段
                    if (review.review_images && (Array.isArray(review.review_images) ? review.review_images.length > 0 : review.review_images)) {
                        return true;
                    }
                    return false;
                });
            } else {
                const ratingFilter = parseInt(filter);
                // 检查多种可能的评分字段
                filteredReviews = reviewsData.filter(review => {
                    const rating = review.rating || review.review_rating || 0;
                    return rating === ratingFilter;
                });
            }
        }
        
        console.log('过滤后的评价数量:', filteredReviews.length);
        
        // 计算分页数据
        const startIndex = (page - 1) * reviewsPageSize;
        const endIndex = Math.min(startIndex + reviewsPageSize, filteredReviews.length);
        const pageReviews = filteredReviews.slice(startIndex, endIndex);
        
        console.log('当前页评价数量:', pageReviews.length);
        
        // 更新评价列表
        updateReviewsList(pageReviews);
        
        // 更新评价摘要 - 确保即使没有评价也显示评分分布
        const ratingDistribution = reviewsData.length > 0 ? calculateRatingDistribution(reviewsData) : {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
        updateReviewsSummary(reviewsData.length, ratingDistribution);
        
        // 更新分页控件
        updateReviewsPagination(filteredReviews.length);
    } catch (error) {
        console.error('加载商品评价失败:', error);
        document.getElementById('reviewsList').innerHTML = '<div class="no-reviews">暂无评价</div>';
        // 即使加载失败，也显示评分分布
        updateReviewsSummary(0, {1: 0, 2: 0, 3: 0, 4: 0, 5: 0});
    }
}

// 更新评价列表
function updateReviewsList(reviews) {
    console.log('开始更新评价列表，评价数量:', reviews.length);
    console.log('评价数据详情:', reviews);
    
    const reviewsList = document.getElementById('reviewsList');
    reviewsList.innerHTML = '';
    
    if (reviews.length === 0) {
        console.log('评价列表为空');
        reviewsList.innerHTML = '<div class="no-reviews">暂无评价</div>';
        // 不要立即返回，继续执行以确保评分分布显示
    }
    
    reviews.forEach(review => {
        // 创建评价项元素
        const reviewItem = document.createElement('div');
        reviewItem.className = 'review-item';
        
        // 格式化日期
        const reviewDate = new Date(review.created_at * 1000).toLocaleDateString('zh-CN');
        
        // 评分星级
        const stars = getStarRating(review.rating);
        
        // 检查评论数据结构
        console.log('处理评论:', review);
        console.log('评论ID:', review.review_id);
        console.log('评论内容:', review.review_content || review.content);
        
        // 评价图片 - 处理可能的字段名差异和缺失情况
        let imagesHtml = '';
        // 尝试从不同可能的字段获取图片数据
        let reviewImages = review.images || review.review_images || [];
        console.log('原始评论图片数据类型:', typeof reviewImages, reviewImages);
        
        if (reviewImages) {
            console.log('评论图片数据:', reviewImages);
            // 检查是否为字符串（可能是JSON字符串）
            if (typeof reviewImages === 'string') {
                try {
                    // 尝试解析JSON字符串
                    const parsedImages = JSON.parse(reviewImages);
                    if (Array.isArray(parsedImages) && parsedImages.length > 0) {
                        reviewImages = parsedImages;
                    } else if (typeof parsedImages === 'string') {
                        // 如果解析出来是单个字符串
                        reviewImages = [parsedImages];
                    } else if (parsedImages && typeof parsedImages === 'object') {
                        // 如果解析出来是对象，尝试提取图片URL
                        reviewImages = Object.values(parsedImages).filter(val => typeof val === 'string');
                    }
                } catch (e) {
                    // 如果不是有效的JSON，可能是单个图片文件名
                    console.log('评论图片不是有效的JSON:', e);
                    reviewImages = [reviewImages];
                }
            }
            
            // 确保reviewImages是数组
            if (!Array.isArray(reviewImages)) {
                reviewImages = [reviewImages];
            }
            
            // 过滤掉空值
            reviewImages = reviewImages.filter(img => img);
            
            if (reviewImages.length > 0) {
                imagesHtml = `<div class="review-images">${reviewImages.map((img, index) => {
                    // 确保图片URL是完整的
                    let imgUrl = img;
                    if (typeof imgUrl !== 'string') {
                        console.warn('图片URL不是字符串:', imgUrl);
                        return '';
                    }
                    
                    // 清理URL
                    imgUrl = imgUrl.trim();
                    if (!imgUrl) return '';
                    
                    if (!imgUrl.startsWith('http')) {
                        // 如果不是完整URL，添加R2存储域名前缀
                        console.log('原始图片URL:', imgUrl);
                        
                        // 检查是否是以订单号开头的图片命名格式（如LB202505116968_review_1748255231266_ld5ckm.jpg）
                        if (imgUrl.match(/^LB[0-9]+_review_/) || imgUrl.match(/^[0-9]{10,}_review_/)) {
                            // 符合命名规则，直接添加完整路径
                            imgUrl = `https://r2liubaotea.liubaotea.online/image/Product-Reviews/${imgUrl}`;
                        }
                        // 清理路径中可能的重复部分
                        else if (imgUrl.includes('image/') && imgUrl.includes('Product-Reviews/')) {
                            // 已经包含完整路径，只需添加域名
                            imgUrl = `https://r2liubaotea.liubaotea.online/${imgUrl}`;
                        } else if (imgUrl.includes('Product-Reviews/')) {
                            // 包含Product-Reviews路径但没有image前缀
                            imgUrl = `https://r2liubaotea.liubaotea.online/image/${imgUrl}`;
                        } else if (imgUrl.includes('review_')) {
                            // 包含review_关键字，可能是评价图片
                            imgUrl = `https://r2liubaotea.liubaotea.online/image/Product-Reviews/${imgUrl}`;
                        } else {
                            // 只有文件名，添加完整路径
                            imgUrl = `https://r2liubaotea.liubaotea.online/image/Product-Reviews/${imgUrl}`;
                        }
                        
                        console.log('构建的图片URL:', imgUrl);
                    }
                    
                    console.log(`处理图片 ${index}:`, imgUrl);
                    return `<img src="${imgUrl}" class="review-image" data-index="${index}" data-review-id="${review.review_id || review.id || ''}" onerror="this.onerror=null;this.src='./images/image-placeholder.png';">`;
                }).filter(html => html).join('')}</div>`;
            }
        }
        
        // 商家回复 - 处理可能的字段名差异
        let replyHtml = '';
        const replyData = review.reply || review.review_reply;
        
        if (replyData) {
            console.log('评论回复数据:', replyData);
            // 检查是否为字符串（可能是JSON字符串）
            if (typeof replyData === 'string') {
                try {
                    // 尝试解析JSON字符串
                    const parsedReply = JSON.parse(replyData);
                    if (parsedReply && (parsedReply.content || parsedReply.reply_content)) {
                        const replyContent = parsedReply.content || parsedReply.reply_content;
                        const replyDate = parsedReply.created_at ? new Date(parsedReply.created_at * 1000).toLocaleDateString('zh-CN') : '未知';
                        
                        replyHtml = `<div class="review-reply">
                            <div class="reply-header"><i class="fas fa-store"></i>商家回复：</div>
                            <div class="reply-content">${replyContent}</div>
                            <div class="reply-date">回复时间：${replyDate}</div>
                        </div>`;
                    }
                } catch (e) {
                    console.log('评论回复不是有效的JSON:', e);
                    // 如果不是有效的JSON，可能是简单的回复内容
                    replyHtml = `<div class="review-reply">
                        <div class="reply-header"><i class="fas fa-store"></i>商家回复：</div>
                        <div class="reply-content">${replyData}</div>
                    </div>`;
                }
            } else if (typeof replyData === 'object') {
                // 已经是对象
                const replyContent = replyData.content || replyData.reply_content || '';
                let replyDate = '未知';
                
                if (replyData.created_at) {
                    replyDate = new Date(replyData.created_at * 1000).toLocaleDateString('zh-CN');
                } else if (replyData.reply_time) {
                    replyDate = new Date(replyData.reply_time * 1000).toLocaleDateString('zh-CN');
                }
                
                replyHtml = `<div class="review-reply">
                    <div class="reply-header"><i class="fas fa-store"></i>商家回复：</div>
                    <div class="reply-content">${replyContent}</div>
                    <div class="reply-date">回复时间：${replyDate}</div>
                </div>`;
            }
        }
        
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
            <div class="review-content">${review.content || review.review_content || ''}</div>
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
    console.log('更新评价摘要，总评价数:', totalReviews);
    console.log('评分分布数据:', ratingDistribution);
    
    // 更新评价数量
    const reviewCountElement = document.querySelector('.review-count');
    if (reviewCountElement) {
        reviewCountElement.textContent = `(${totalReviews})`;
    } else {
        console.warn('未找到评价数量元素 .review-count');
    }
    
    // 计算平均评分
    let averageRating = 0;
    if (totalReviews > 0) {
        let totalRating = 0;
        let totalRatingCount = 0;
        
        // 计算总评分和总评分数
        for (let i = 1; i <= 5; i++) {
            const count = ratingDistribution[i] || 0;
            totalRating += i * count;
            totalRatingCount += count;
        }
        
        averageRating = totalRatingCount > 0 ? totalRating / totalRatingCount : 0;
        console.log('计算的平均评分:', averageRating, '总评分:', totalRating, '总评分数:', totalRatingCount);
    }
    
    // 更新平均评分
    const averageRatingElement = document.querySelector('.average-rating');
    if (averageRatingElement) {
        averageRatingElement.textContent = averageRating.toFixed(1);
    } else {
        console.warn('未找到平均评分元素 .average-rating');
    }
    
    // 更新评分星级
    const ratingStarsElement = document.querySelector('.rating-stars');
    if (ratingStarsElement) {
        ratingStarsElement.innerHTML = getStarRating(Math.round(averageRating));
    } else {
        console.warn('未找到评分星级元素 .rating-stars');
    }
    
    // 更新评分分布
    console.log('更新评分分布，总评价数:', totalReviews);
    console.log('评分分布详情:', ratingDistribution);
    
    // 确保每个评分都有一个默认值
    for (let i = 1; i <= 5; i++) {
        if (ratingDistribution[i] === undefined) {
            ratingDistribution[i] = 0;
        }
    }
    
    // 直接使用选择器获取所有评分条
    const ratingBars = document.querySelectorAll('.rating-bar');
    if (!ratingBars || ratingBars.length === 0) {
        console.warn('未找到评分分布元素 .rating-bar');
        return;
    }
    
    console.log('找到评分条数量:', ratingBars.length);
    
    // 检查DOM结构
    const firstBar = ratingBars[0];
    if (firstBar) {
        console.log('评分条DOM结构:', firstBar.outerHTML);
    }
    
    // 遍历所有评分条
    for (let i = 0; i < 5; i++) {
        const rating = 5 - i; // 5星在最上面，所以是5-i
        const count = ratingDistribution[rating] || 0;
        const percent = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
        
        console.log(`${rating}星评分: ${count}条, 占比: ${percent}%`);
        
        // 检查是否有足够的评分条元素
        if (i >= ratingBars.length) {
            console.warn(`评分条元素不足，缺少${rating}星评分条`);
            continue;
        }
        
        // 获取当前评分条的进度条和百分比文本元素
        const progressBar = ratingBars[i].querySelector('.progress-bar');
        const percentText = ratingBars[i].querySelector('.rating-percent');
        const countElement = ratingBars[i].querySelector('.rating-count');
        
        if (progressBar) {
            // 设置实际百分比宽度
            const displayWidth = `${percent}%`;
            progressBar.style.width = displayWidth;
            console.log(`设置${rating}星评分条宽度:`, displayWidth);
            
            // 确保进度条可见
            progressBar.style.display = 'block';
        } else {
            console.warn(`未找到${rating}星评分的进度条元素`);
        }
        
        if (percentText) {
            percentText.textContent = `${percent}%`;
            console.log(`设置${rating}星评分百分比:`, `${percent}%`);
        } else {
            console.warn(`未找到${rating}星评分的百分比元素`);
        }
        
        if (countElement) {
            countElement.textContent = count;
            console.log(`设置${rating}星评分数量:`, count);
        } else {
            console.warn(`未找到${rating}星评分的数量元素`);
        }
        
        // 确保评分行可见
        ratingBars[i].style.display = 'flex';
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
export { initProductReviews };

// 为了兼容性，也提供默认导出
export default {
    initProductReviews: initProductReviews
};