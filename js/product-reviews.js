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

console.log('商品评价模块配置:', config);

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
    console.log('开始加载评价数据，商品ID:', state.productId);
    
    try {
        // 显示加载状态
        showLoading(true);
        
        // 调用API获取评价数据
        const response = await getProductReviews(state.productId);
        console.log('API返回的评价数据:', response);
        
        if (response && response.reviews) {
            state.reviews = response.reviews;
            state.ratingStats.total = response.total || state.reviews.length;
            
            console.log(`成功加载${state.reviews.length}条评价，总评价数:`, state.ratingStats.total);
            
            // 检查评价图片
            state.reviews.forEach((review, index) => {
                console.log(`评价${index+1}(ID:${review.review_id})的图片:`, review.images);
            });
            
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
    if (!reviewsContainer) {
        console.error('找不到评价列表容器元素');
        return;
    }
    
    reviewsContainer.innerHTML = '';
    
    // 获取当前页的评价数据
    const startIndex = (state.currentPage - 1) * config.pageSize;
    const endIndex = Math.min(startIndex + config.pageSize, state.filteredReviews.length);
    const currentPageReviews = state.filteredReviews.slice(startIndex, endIndex);
    
    console.log('开始渲染评价列表，评价数量:', currentPageReviews.length);
    
    if (currentPageReviews.length === 0) {
        showNoReviews();
        return;
    }
    
    // 渲染每条评价
    currentPageReviews.forEach((review, index) => {
        console.log(`渲染第${index+1}条评价:`, review.review_id);
        
        const reviewElement = document.createElement('div');
        reviewElement.className = 'review-item';
        reviewElement.dataset.reviewId = review.review_id;
        
        // 用户头像处理
        const avatarUrl = review.avatar_url || config.defaultAvatar;
        console.log(`评价${review.review_id}的头像URL:`, avatarUrl);
        
        // 评价日期格式化
        const reviewDate = formatDate(review.created_at);
        
        // 评价星级HTML
        const starsHtml = generateStarsHTML(review.rating);
        
        // 评价图片HTML
        let imagesHtml = '';
        if (review.images && review.images.length > 0) {
            console.log(`评价${review.review_id}有${review.images.length}张图片:`, review.images);
            
            imagesHtml = '<div class="review-images">';
            review.images.forEach((image, imgIndex) => {
                const imageUrl = getImageUrl(image);
                console.log(`评价${review.review_id}的图片${imgIndex+1}:`, image, '→', imageUrl);
                
                imagesHtml += `
                    <div class="review-image">
                        <img src="${imageUrl}" alt="评价图片${imgIndex+1}" loading="lazy" onerror="this.src='./assets/images/image-not-found.png';console.error('图片加载失败:${imageUrl}');">
                    </div>
                `;
            });
            imagesHtml += '</div>';
        } else {
            console.log(`评价${review.review_id}没有图片`);
        }
        
        // 构建评价HTML
        reviewElement.innerHTML = `
            <div class="review-header">
                <div class="reviewer-info">
                    <div class="reviewer-avatar">
                        <img src="${avatarUrl}" alt="用户头像" loading="lazy" onerror="this.src='${config.defaultAvatar}';">
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
    
    console.log('评价列表渲染完成，添加图片点击事件');
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
    console.log('找到评论图片元素数量:', reviewImages.length);
    
    // 为每个图片添加点击事件
    reviewImages.forEach((img, index) => {
        img.addEventListener('click', function() {
            // 获取当前点击的图片URL
            const imageUrl = this.src;
            console.log('点击的图片URL:', imageUrl);
            
            // 获取当前评价中的所有图片
            const reviewItem = this.closest('.review-item');
            const allImages = Array.from(reviewItem.querySelectorAll('.review-image img'));
            console.log('当前评价中的图片数量:', allImages.length);
            
            // 获取当前图片在评价中的索引
            const currentIndex = allImages.findIndex(image => image.src === imageUrl);
            console.log('当前图片索引:', currentIndex);
            
            // 打开模态框并显示图片
            openImageModal(imageUrl, currentIndex, allImages);
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
    
    if (!modal || !modalImage) {
        console.error('模态框或图片元素不存在');
        return;
    }
    
    console.log('打开模态框，显示图片:', imageUrl);
    
    // 获取所有图片的URL
    const imageUrls = allImages.map(img => img.src);
    console.log('所有图片URL:', imageUrls);
    
    // 设置当前图片数据
    modal.dataset.currentIndex = index;
    modal.dataset.totalImages = imageUrls.length;
    modal.dataset.images = JSON.stringify(imageUrls);
    
    // 显示当前图片
    modalImage.src = imageUrl;
    modalImage.onerror = function() {
        console.error('图片加载失败:', imageUrl);
        this.src = './assets/images/image-not-found.png'; // 设置一个默认的错误图片
    };
    
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
    if (!modal) {
        console.error('找不到模态框元素');
        return;
    }
    
    const currentIndex = parseInt(modal.dataset.currentIndex);
    const images = JSON.parse(modal.dataset.images);
    
    console.log('显示上一张图片，当前索引:', currentIndex, '总图片数:', images.length);
    
    if (currentIndex > 0) {
        const newIndex = currentIndex - 1;
        const imageUrl = images[newIndex];
        
        console.log('切换到上一张图片，新索引:', newIndex, '图片URL:', imageUrl);
        
        // 更新图片
        const modalImage = document.getElementById('modalImage');
        modalImage.src = imageUrl;
        modalImage.onerror = function() {
            console.error('模态框图片加载失败:', imageUrl);
            this.src = './assets/images/image-not-found.png';
        };
        
        // 更新索引
        modal.dataset.currentIndex = newIndex;
        
        // 更新导航按钮状态
        updateModalNavigation(newIndex, images.length);
    } else {
        console.log('已经是第一张图片');
    }
}

/**
 * 显示下一张图片
 */
function showNextImage() {
    const modal = document.getElementById('reviewImageModal');
    if (!modal) {
        console.error('找不到模态框元素');
        return;
    }
    
    const currentIndex = parseInt(modal.dataset.currentIndex);
    const images = JSON.parse(modal.dataset.images);
    
    console.log('显示下一张图片，当前索引:', currentIndex, '总图片数:', images.length);
    
    if (currentIndex < images.length - 1) {
        const newIndex = currentIndex + 1;
        const imageUrl = images[newIndex];
        
        console.log('切换到下一张图片，新索引:', newIndex, '图片URL:', imageUrl);
        
        // 更新图片
        const modalImage = document.getElementById('modalImage');
        modalImage.src = imageUrl;
        modalImage.onerror = function() {
            console.error('模态框图片加载失败:', imageUrl);
            this.src = './assets/images/image-not-found.png';
        };
        
        // 更新索引
        modal.dataset.currentIndex = newIndex;
        
        // 更新导航按钮状态
        updateModalNavigation(newIndex, images.length);
    } else {
        console.log('已经是最后一张图片');
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
    console.log('生成星星HTML，评分:', rating);
    
    let starsHTML = '';
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    
    // 添加实心星星
    for (let i = 0; i < fullStars; i++) {
        starsHTML += '<i class="fas fa-star" style="color: #ffc107;"></i>';
    }
    
    // 添加半星（如果有）
    if (halfStar) {
        starsHTML += '<i class="fas fa-star-half-alt" style="color: #ffc107;"></i>';
    }
    
    // 添加空心星星
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
        starsHTML += '<i class="far fa-star" style="color: #e0e0e0;"></i>';
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
 * @returns {string} 完整的图片URL
 */
function getImageUrl(imagePath) {
    console.log('处理图片名称:', imagePath);
    
    // 检查是否已经是完整URL
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        console.log('已是完整URL，直接返回:', imagePath);
        return imagePath;
    }
    
    // 处理API返回的通用格式图片名称 (review_123_timestamp.jpg)
    // 这种格式是后端在找不到订单号时使用的
    if (imagePath.startsWith('review_')) {
        // 尝试从图片名称中提取评论ID和时间戳
        const match = imagePath.match(/review_(\d+)_(\d+)\.\w+$/);
        if (match) {
            const reviewId = match[1];
            const createdAt = match[2];
            
            // 构建R2存储中的实际图片路径
            // 使用通配符匹配可能的订单号前缀
            // 格式：LB*_review_时间戳_*.jpg
            const newImagePath = `${config.imageBasePath}LB*_review_${createdAt}_*.jpg`;
            console.log('转换API返回的通用格式图片名称:', imagePath, '→', newImagePath);
            return newImagePath;
        }
    }
    
    // 处理API返回的基于订单号的图片名称模式 (LB202505116968_review_1748255231266_*.jpg)
    if (imagePath.startsWith('LB') || (imagePath.includes('_review_') && !imagePath.startsWith('review_'))) {
        // 如果已经包含完整路径，直接返回
        if (imagePath.includes(config.imageBasePath)) {
            return imagePath;
        }
        
        const fullPath = `${config.imageBasePath}${imagePath}`;
        console.log('处理基于订单号的图片名称:', fullPath);
        return fullPath;
    }
    
    // 处理包含通配符的图片路径
    if (imagePath.includes('*')) {
        // 如果已经包含完整路径，直接返回
        if (imagePath.includes(config.imageBasePath)) {
            return imagePath;
        }
        
        const fullPath = `${config.imageBasePath}${imagePath}`;
        console.log('处理包含通配符的图片:', fullPath);
        return fullPath;
    }
    
    // 默认情况：尝试构建一个可能的路径
    // 如果是简单的文件名，假设它可能是R2中的图片
    const fullPath = `${config.imageBasePath}${imagePath}`;
    console.log('使用默认路径:', fullPath);
    return fullPath;
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