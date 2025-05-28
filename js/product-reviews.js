/**
 * 商品评价模块
 * 负责加载、渲染和交互处理商品评价数据
 */

import { getProductReviews } from './api-extended.js';

// 评价模块配置
const config = {
    pageSize: 5,         // 每页显示评价数量
    imageBasePath: 'https://r2liubaotea.liubaotea.online/image/Product-Reviews/', // R2存储图片路径
    defaultAvatar: './assets/avatars/test_avatars.png', // 默认用户头像，使用项目中的图片
    ratingTexts: ['很差', '较差', '一般', '不错', '很好'] // 评分对应文本
};

// 当前状态
let state = {
    productId: null,      // 当前商品ID
    currentPage: 1,       // 当前页码
    totalPages: 1,        // 总页数
    reviews: [],          // 所有评价数据
    filteredReviews: [],  // 筛选后的评价数据
    currentFilter: 'all', // 当前筛选条件
    isLoading: false,     // 加载状态
    ratingStats: {        // 评分统计
        average: 0,
        total: 0,
        distribution: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    }
};

/**
 * 初始化商品评价模块
 * @param {string|number} productId - 商品ID
 */
export async function initProductReviews(productId) {
    if (!productId) {
        console.error('初始化商品评价失败：缺少商品ID');
        return;
    }
    
    state.productId = productId;
    
    // 初始化事件监听
    initEventListeners();
    
    // 加载评价数据
    await loadReviews();
}

/**
 * 初始化事件监听
 */
function initEventListeners() {
    // 筛选按钮点击事件
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filter = button.dataset.filter;
            applyFilter(filter);
            
            // 更新激活状态
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });
    
    // 模态框关闭按钮
    const closeModal = document.querySelector('.close-modal');
    if (closeModal) {
        closeModal.addEventListener('click', closeImageModal);
    }
    
    // 模态框背景点击关闭
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', closeImageModal);
    }
    
    // 图片导航按钮
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', showPreviousImage);
        nextBtn.addEventListener('click', showNextImage);
    }
}

/**
 * 加载商品评价数据
 */
async function loadReviews() {
    try {
        // 显示加载状态
        showLoading(true);
        
        // 调用API获取评价数据
        const response = await getProductReviews(state.productId);
        
        if (response && response.reviews) {
            state.reviews = response.reviews;
            state.ratingStats.total = response.total || state.reviews.length;
            
            // 计算评分统计
            calculateRatingStats();
            
            // 应用默认筛选
            applyFilter('all');
            
            // 更新UI
            updateRatingSummary();
        } else {
            // 处理无评价情况
            showNoReviews();
        }
    } catch (error) {
        console.error('加载商品评价失败:', error);
        showError('加载评价失败，请稍后再试');
    } finally {
        // 隐藏加载状态
        showLoading(false);
    }
}

/**
 * 计算评分统计数据
 */
function calculateRatingStats() {
    if (!state.reviews.length) return;
    
    // 重置分布数据
    state.ratingStats.distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
    
    // 计算各评分数量
    state.reviews.forEach(review => {
        const rating = review.rating;
        if (rating >= 1 && rating <= 5) {
            state.ratingStats.distribution[rating]++;
        }
    });
    
    // 计算平均分
    const totalScore = state.reviews.reduce((sum, review) => sum + review.rating, 0);
    state.ratingStats.average = totalScore / state.reviews.length;
}

/**
 * 更新评分摘要UI
 */
function updateRatingSummary() {
    // 更新平均分
    const ratingValueEl = document.querySelector('.rating-value');
    if (ratingValueEl) {
        ratingValueEl.textContent = state.ratingStats.average.toFixed(1);
    }
    
    // 更新评价数量
    const ratingCountEl = document.querySelector('.rating-count');
    if (ratingCountEl) {
        ratingCountEl.textContent = `(${state.ratingStats.total}条评价)`;
    }
    
    // 更新星级显示
    updateStarsDisplay(document.querySelector('.stars-container'), state.ratingStats.average);
    
    // 更新评分分布
    const total = state.ratingStats.total;
    if (total > 0) {
        for (let i = 5; i >= 1; i--) {
            const count = state.ratingStats.distribution[i] || 0;
            const percent = total > 0 ? Math.round((count / total) * 100) : 0;
            
            const progressBar = document.querySelector(`.rating-bar:nth-child(${6-i}) .progress-bar`);
            const percentText = document.querySelector(`.rating-bar:nth-child(${6-i}) .rating-percent`);
            
            if (progressBar) progressBar.style.width = `${percent}%`;
            if (percentText) percentText.textContent = `${percent}%`;
        }
    }
}

/**
 * 更新星级显示
 * @param {HTMLElement} container - 星级容器元素
 * @param {number} rating - 评分值
 */
function updateStarsDisplay(container, rating) {
    if (!container) return;
    
    const stars = container.querySelectorAll('i');
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;
    
    stars.forEach((star, index) => {
        star.className = ''; // 清除现有类
        
        if (index < fullStars) {
            star.className = 'fas fa-star'; // 实心星
        } else if (index === fullStars && hasHalfStar) {
            star.className = 'fas fa-star-half-alt'; // 半星
        } else {
            star.className = 'far fa-star'; // 空心星
        }
    });
}

/**
 * 应用评价筛选
 * @param {string} filter - 筛选条件
 */
function applyFilter(filter) {
    state.currentFilter = filter;
    state.currentPage = 1; // 重置页码
    
    // 根据筛选条件过滤评价
    if (filter === 'all') {
        state.filteredReviews = [...state.reviews];
    } else if (filter === 'has-image') {
        state.filteredReviews = state.reviews.filter(review => 
            review.images && review.images.length > 0
        );
    } else {
        // 按星级筛选
        const rating = parseInt(filter);
        if (rating >= 1 && rating <= 5) {
            state.filteredReviews = state.reviews.filter(review => 
                review.rating === rating
            );
        }
    }
    
    // 更新总页数
    state.totalPages = Math.ceil(state.filteredReviews.length / config.pageSize);
    
    // 渲染评价列表
    renderReviewsList();
    
    // 渲染分页
    renderPagination();
}

/**
 * 渲染评价列表
 */
function renderReviewsList() {
    const reviewsContainer = document.querySelector('.reviews-list');
    reviewsContainer.innerHTML = '';
    
    // 获取当前页的评价数据
    const startIndex = (state.currentPage - 1) * config.pageSize;
    const endIndex = Math.min(startIndex + config.pageSize, state.filteredReviews.length);
    const currentPageReviews = state.filteredReviews.slice(startIndex, endIndex);
    
    if (currentPageReviews.length === 0) {
        showNoReviews();
        return;
    }
    
    // 渲染每条评价
    currentPageReviews.forEach(review => {
        const reviewElement = document.createElement('div');
        reviewElement.className = 'review-item';
        
        // 用户头像处理
        const avatarUrl = review.avatar_url || config.defaultAvatar;
        
        // 评价日期格式化
        const reviewDate = formatDate(review.created_at);
        
        // 评价星级HTML
        const starsHtml = generateStarsHTML(review.rating);
        
        // 评价图片HTML
        let imagesHtml = '';
        if (review.images && review.images.length > 0) {
            imagesHtml = '<div class="review-images">';
            review.images.forEach(image => {
                const imageUrl = getImageUrl(image);
                imagesHtml += `
                    <div class="review-image">
                        <img src="${imageUrl}" alt="评价图片" loading="lazy">
                    </div>
                `;
            });
            imagesHtml += '</div>';
        }
        
        // 构建评价HTML
        reviewElement.innerHTML = `
            <div class="review-header">
                <div class="reviewer-info">
                    <div class="reviewer-avatar">
                        <img src="${avatarUrl}" alt="用户头像" loading="lazy">
                    </div>
                    <div>
                        <div class="reviewer-name">${review.username || '匿名用户'}</div>
                        <div class="review-date">${reviewDate}</div>
                    </div>
                </div>
            </div>
            <div class="review-rating">${starsHtml}</div>
            <div class="review-content">${review.review_content || ''}</div>
            ${imagesHtml}
        `;
        
        reviewsContainer.appendChild(reviewElement);
    });
    
    // 添加图片点击事件
    addImageClickHandlers();
    
    // 渲染分页
    renderPagination();
}

/**
 * 渲染分页控件
 */
function renderPagination() {
    const paginationEl = document.querySelector('.reviews-pagination');
    if (!paginationEl) return;
    
    // 如果总页数小于等于1，不显示分页
    if (state.totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // 上一页按钮
    paginationHTML += `
        <button class="pagination-btn prev ${state.currentPage === 1 ? 'disabled' : ''}">
            上一页
        </button>
    `;
    
    // 页码按钮
    const maxVisiblePages = 5;
    let startPage = Math.max(1, state.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(state.totalPages, startPage + maxVisiblePages - 1);
    
    // 调整起始页，确保显示足够的页码
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // 第一页
    if (startPage > 1) {
        paginationHTML += `
            <button class="pagination-btn" data-page="1">1</button>
        `;
        
        if (startPage > 2) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
    }
    
    // 页码按钮
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="pagination-btn ${i === state.currentPage ? 'active' : ''}" data-page="${i}">
                ${i}
            </button>
        `;
    }
    
    // 最后一页
    if (endPage < state.totalPages) {
        if (endPage < state.totalPages - 1) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
        
        paginationHTML += `
            <button class="pagination-btn" data-page="${state.totalPages}">${state.totalPages}</button>
        `;
    }
    
    // 下一页按钮
    paginationHTML += `
        <button class="pagination-btn next ${state.currentPage === state.totalPages ? 'disabled' : ''}">
            下一页
        </button>
    `;
    
    // 更新DOM
    paginationEl.innerHTML = paginationHTML;
    
    // 添加分页事件
    addPaginationHandlers();
}

/**
 * 添加分页事件处理
 */
function addPaginationHandlers() {
    const paginationEl = document.querySelector('.reviews-pagination');
    if (!paginationEl) return;
    
    // 页码按钮点击
    const pageButtons = paginationEl.querySelectorAll('.pagination-btn[data-page]');
    pageButtons.forEach(button => {
        button.addEventListener('click', () => {
            const page = parseInt(button.dataset.page);
            if (page !== state.currentPage) {
                state.currentPage = page;
                renderReviewsList();
                scrollToReviews();
            }
        });
    });
    
    // 上一页按钮
    const prevButton = paginationEl.querySelector('.pagination-btn.prev');
    if (prevButton && !prevButton.classList.contains('disabled')) {
        prevButton.addEventListener('click', () => {
            if (state.currentPage > 1) {
                state.currentPage--;
                renderReviewsList();
                renderPagination();
                scrollToReviews();
            }
        });
    }
    
    // 下一页按钮
    const nextButton = paginationEl.querySelector('.pagination-btn.next');
    if (nextButton && !nextButton.classList.contains('disabled')) {
        nextButton.addEventListener('click', () => {
            if (state.currentPage < state.totalPages) {
                state.currentPage++;
                renderReviewsList();
                renderPagination();
                scrollToReviews();
            }
        });
    }
}

/**
 * 滚动到评价区域
 */
function scrollToReviews() {
    const reviewsContainer = document.querySelector('.reviews-container');
    if (reviewsContainer) {
        reviewsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * 添加图片点击事件处理
 */
function addImageClickHandlers() {
    const reviewImages = document.querySelectorAll('.review-image img');
    
    // 为每个图片添加点击事件
    reviewImages.forEach((img, index) => {
        img.addEventListener('click', function() {
            // 获取当前点击的图片URL
            const imageUrl = this.src;
            
            // 获取当前评价中的所有图片
            const reviewItem = this.closest('.review-item');
            const allImages = Array.from(reviewItem.querySelectorAll('.review-image img'));
            
            // 获取当前图片在评价中的索引
            const currentIndex = allImages.findIndex(image => image.src === imageUrl);
            
            // 确保图片已经加载完成
            if (this.complete && this.naturalWidth > 0) {
                // 打开模态框并显示图片
                openImageModal(imageUrl, currentIndex, allImages);
            } else {
                // 如果图片未加载完成，等待加载完成后再打开模态框
                this.onload = () => {
                    openImageModal(imageUrl, currentIndex, allImages);
                };
                
                // 如果图片加载失败，显示错误信息
                this.onerror = () => {
                    console.error('图片加载失败:', imageUrl);
                    alert('图片加载失败，请稍后再试');
                };
            }
        });
    });
}

/**
 * 打开图片模态框
 * @param {string} imageUrl - 当前点击的图片URL
 * @param {number} index - 当前图片索引
 * @param {Array} allImages - 当前评价中的所有图片元素
 */
function openImageModal(imageUrl, index, allImages) {
    const modal = document.getElementById('reviewImageModal');
    const modalImage = document.getElementById('modalImage');
    
    if (!modal || !modalImage) return;
    
    // 获取所有图片的URL
    const imageUrls = allImages.map(img => img.src);
    
    // 设置当前图片数据
    modal.dataset.currentIndex = index;
    modal.dataset.totalImages = imageUrls.length;
    modal.dataset.images = JSON.stringify(imageUrls);
    
    // 显示当前图片
    modalImage.src = imageUrl;
    
    // 显示模态框
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // 防止背景滚动
    
    // 更新导航按钮状态
    updateModalNavigation(index, imageUrls.length);
}

/**
 * 关闭图片模态框
 */
function closeImageModal() {
    const modal = document.getElementById('reviewImageModal');
    if (!modal) return;
    
    modal.style.display = 'none';
    document.body.style.overflow = ''; // 恢复背景滚动
}

/**
 * 显示上一张图片
 */
function showPreviousImage() {
    const modal = document.getElementById('reviewImageModal');
    const modalImage = document.getElementById('modalImage');
    
    if (!modal || !modalImage) return;
    
    const currentIndex = parseInt(modal.dataset.currentIndex);
    const images = JSON.parse(modal.dataset.images);
    
    if (currentIndex > 0) {
        const newIndex = currentIndex - 1;
        modal.dataset.currentIndex = newIndex;
        modalImage.src = images[newIndex];
        
        // 更新导航按钮状态
        updateModalNavigation(newIndex, images.length);
    }
}

/**
 * 显示下一张图片
 */
function showNextImage() {
    const modal = document.getElementById('reviewImageModal');
    const modalImage = document.getElementById('modalImage');
    
    if (!modal || !modalImage) return;
    
    const currentIndex = parseInt(modal.dataset.currentIndex);
    const images = JSON.parse(modal.dataset.images);
    
    if (currentIndex < images.length - 1) {
        const newIndex = currentIndex + 1;
        modal.dataset.currentIndex = newIndex;
        modalImage.src = images[newIndex];
        
        // 更新导航按钮状态
        updateModalNavigation(newIndex, images.length);
    }
}

/**
 * 更新模态框导航按钮状态
 * @param {number} currentIndex - 当前图片索引
 * @param {number} totalImages - 图片总数
 */
function updateModalNavigation(currentIndex, totalImages) {
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    
    if (prevBtn) {
        prevBtn.disabled = currentIndex === 0;
        prevBtn.style.opacity = currentIndex === 0 ? '0.5' : '1';
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentIndex === totalImages - 1;
        nextBtn.style.opacity = currentIndex === totalImages - 1 ? '0.5' : '1';
    }
}

/**
 * 生成星级HTML
 * @param {number} rating - 评分
 * @returns {string} 星级HTML
 */
function generateStarsHTML(rating) {
    let starsHTML = '';
    
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            starsHTML += '<i class="fas fa-star"></i>'; // 实心星
        } else if (i - 0.5 <= rating) {
            starsHTML += '<i class="fas fa-star-half-alt"></i>'; // 半星
        } else {
            starsHTML += '<i class="far fa-star"></i>'; // 空心星
        }
    }
    
    return starsHTML;
}

/**
 * 获取评分对应的文本描述
 * @param {number} rating - 评分
 * @returns {string} 评分文本
 */
function getRatingText(rating) {
    const index = Math.min(Math.max(Math.floor(rating) - 1, 0), 4);
    return config.ratingTexts[index];
}

/**
 * 获取图片URL
 * @param {string} imagePath - 图片路径
 */
function getImageUrl(imagePath) {
    // 检查是否已经是完整URL
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }
    
    // 处理包含通配符*的图片名称格式，这通常是后端API返回的格式
    // 例如：LB202505116968_review_1748255247_*.jpg
    if (imagePath.includes('*')) {
        // 直接使用R2基础路径，保留通配符格式
        // 在R2存储中，通配符可以匹配到实际的图片文件
        return `${config.imageBasePath}${imagePath}`;
    }
    
    // 处理旧格式的图片名称 (review_7_1748255247.jpg)
    // 尝试从旧格式中提取review_id和created_at
    const oldFormatMatch = imagePath.match(/review_(\d+)_(\d+)\.jpg/);
    if (oldFormatMatch) {
        const reviewId = oldFormatMatch[1];
        const createdAt = oldFormatMatch[2];
        
        // 查找当前评论列表中匹配的评论
        const matchingReview = state.reviews.find(r => 
            r.review_id.toString() === reviewId && 
            r.created_at.toString() === createdAt
        );
        
        // 如果找到匹配的评论且有订单号，构建新的图片路径
        if (matchingReview && matchingReview.order_number) {
            // 使用订单号构建图片路径，添加通配符匹配随机字符串部分
            return `${config.imageBasePath}${matchingReview.order_number}_review_${createdAt}_*.jpg`;
        }
        
        // 如果没有找到匹配的评论或没有订单号，尝试使用LB前缀的通配符格式
        // 这样可以在R2存储中匹配到以LB开头的订单号相关图片
        return `${config.imageBasePath}LB*_review_${createdAt}_*.jpg`;
    }
    
    // 处理订单号开头的图片名称格式 (LB202505116968_review_1748255231266_ld5ckm.jpg)
    if (imagePath.startsWith('LB') || imagePath.includes('_review_')) {
        return `${config.imageBasePath}${imagePath}`;
    }
    
    // 默认返回完整路径
    return `${config.imageBasePath}${imagePath}`;
}

/**
 * 格式化日期
 * @param {number|string} timestamp - 时间戳或日期字符串
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(timestamp) {
    if (!timestamp) return '';
    
    let date;
    
    // 处理时间戳（秒或毫秒）
    if (typeof timestamp === 'number' || /^\d+$/.test(timestamp)) {
        // 转换为毫秒时间戳（如果是秒，则乘以1000）
        const milliseconds = timestamp.toString().length === 10 
            ? timestamp * 1000 
            : Number(timestamp);
        date = new Date(milliseconds);
    } else {
        // 处理日期字符串
        date = new Date(timestamp);
    }
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
        return '';
    }
    
    // 格式化日期：YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

/**
 * 显示加载状态
 * @param {boolean} isLoading - 是否正在加载
 */
function showLoading(isLoading) {
    const reviewsListEl = document.querySelector('.reviews-list');
    if (!reviewsListEl) return;
    
    if (isLoading) {
        reviewsListEl.innerHTML = `
            <div class="loading-reviews">
                <div class="spinner"></div>
                <p>正在加载评价...</p>
            </div>
        `;
    }
}

/**
 * 显示无评价提示
 */
function showNoReviews() {
    const reviewsListEl = document.querySelector('.reviews-list');
    if (!reviewsListEl) return;
    
    reviewsListEl.innerHTML = `
        <div class="no-reviews">
            <p>暂无评价</p>
        </div>
    `;
    
    // 重置评分摘要
    const ratingValueEl = document.querySelector('.rating-value');
    if (ratingValueEl) ratingValueEl.textContent = '0.0';
    
    const ratingCountEl = document.querySelector('.rating-count');
    if (ratingCountEl) ratingCountEl.textContent = '(0条评价)';
    
    // 重置评分分布
    const progressBars = document.querySelectorAll('.progress-bar');
    const percentTexts = document.querySelectorAll('.rating-percent');
    
    progressBars.forEach(bar => bar.style.width = '5%');
    percentTexts.forEach(text => text.textContent = '0%');
}

/**
 * 显示错误信息
 * @param {string} message - 错误信息
 */
function showError(message) {
    const reviewsListEl = document.querySelector('.reviews-list');
    if (!reviewsListEl) return;
    
    reviewsListEl.innerHTML = `
        <div class="no-reviews">
            <p>${message}</p>
        </div>
    `;
}