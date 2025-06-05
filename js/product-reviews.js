/**
 * 商品评价模块
 * 负责加载、渲染和交互处理商品评价数据
 */

import { getProductReviews } from './api-extended.js';

// 评价模块配置
const config = {
    pageSize: 5,         // 每页显示评价数量
    imageBasePath: 'https://r2liubaotea.liubaotea.online/image/Product-Reviews/', // R2存储图片路径
    defaultAvatar: './assets/avatars/test_avatars.png', // 默认用户头像，使用相对路径
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
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;
            
            // 更新活跃状态
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // 应用筛选
            applyFilter(filter);
        });
    });
    
    // 模态框关闭按钮点击事件
    const closeModalBtn = document.querySelector('.close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeImageModal);
    }
    
    // 模态框背景点击事件
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', closeImageModal);
    }
    
    // 模态框导航按钮点击事件
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', showPreviousImage);
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', showNextImage);
    }
    
    // 键盘事件监听（用于模态框导航）
    document.addEventListener('keydown', function(e) {
        const modal = document.getElementById('reviewImageModal');
        if (modal && modal.style.display === 'block') {
            if (e.key === 'ArrowLeft') {
                showPreviousImage();
            } else if (e.key === 'ArrowRight') {
                showNextImage();
            } else if (e.key === 'Escape') {
                closeImageModal();
            }
        }
    });
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
    
    // 根据筛选条件过滤评价
    if (filter === 'all') {
        state.filteredReviews = state.reviews;
    } else if (filter === 'has-image') {
        state.filteredReviews = state.reviews.filter(review => 
            review.images && review.images.length > 0
        );
    } else {
        // 按星级筛选
        const rating = parseInt(filter);
        state.filteredReviews = state.reviews.filter(review => 
            review.rating === rating
        );
    }
    
    // 重置页码
    state.currentPage = 1;
    
    // 计算总页数
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
    const reviewsListEl = document.querySelector('.reviews-list');
    if (!reviewsListEl) return;
    
    // 清空列表
    reviewsListEl.innerHTML = '';
    
    // 获取当前页的评价
    const startIndex = (state.currentPage - 1) * config.pageSize;
    const endIndex = Math.min(startIndex + config.pageSize, state.filteredReviews.length);
    const currentPageReviews = state.filteredReviews.slice(startIndex, endIndex);
    
    // 如果没有评价，显示提示
    if (currentPageReviews.length === 0) {
        showNoReviews();
        return;
    }
    
    // 渲染每条评价
    currentPageReviews.forEach(review => {
        // 创建评价项容器
        const reviewItem = document.createElement('div');
        reviewItem.className = 'review-item';
        
        // 评价头部（用户信息和日期）
        const reviewHeader = document.createElement('div');
        reviewHeader.className = 'review-header';
        
        // 用户信息（头像和名称）
        const reviewerInfo = document.createElement('div');
        reviewerInfo.className = 'reviewer-info';
        
        // 用户头像
        const avatarContainer = document.createElement('div');
        avatarContainer.className = 'reviewer-avatar';
        
        const avatarImg = document.createElement('img');
        // 使用用户头像或默认头像
        avatarImg.src = review.avatar_url || config.defaultAvatar;
        avatarImg.alt = '用户头像';
        avatarImg.onerror = function() {
            // 头像加载失败时使用默认头像
            this.src = config.defaultAvatar;
            // 防止循环触发错误
            this.onerror = null;
        };
        
        avatarContainer.appendChild(avatarImg);
        reviewerInfo.appendChild(avatarContainer);
        
        // 用户名称
        const reviewerName = document.createElement('div');
        reviewerName.className = 'reviewer-name';
        reviewerName.textContent = review.username || '匿名用户';
        reviewerInfo.appendChild(reviewerName);
        
        reviewHeader.appendChild(reviewerInfo);
        
        // 评价日期
        const reviewDate = document.createElement('div');
        reviewDate.className = 'review-date';
        reviewDate.textContent = formatDate(review.created_at);
        reviewHeader.appendChild(reviewDate);
        
        reviewItem.appendChild(reviewHeader);
        
        // 评价星级
        const reviewRating = document.createElement('div');
        reviewRating.className = 'review-rating';
        reviewRating.innerHTML = generateStarsHTML(review.rating);
        reviewItem.appendChild(reviewRating);
        
        // 评价内容
        const reviewContent = document.createElement('div');
        reviewContent.className = 'review-content';
        reviewContent.textContent = review.review_content;
        reviewItem.appendChild(reviewContent);
        
        // 评价图片
        if (review.images && review.images.length > 0) {
            const reviewImages = document.createElement('div');
            reviewImages.className = 'review-images';
            
            review.images.forEach(image => {
                const imageContainer = document.createElement('div');
                imageContainer.className = 'review-image';
                
                const img = document.createElement('img');
                img.src = getImageUrl(image);
                img.alt = '评价图片';
                img.loading = 'lazy'; // 延迟加载
                
                // 添加图片加载错误处理
                img.onerror = function() {
                    console.error(`图片加载失败: ${img.src}`);
                    // 可以在这里设置一个默认的占位图
                    // this.src = '默认占位图URL';
                    // 或者隐藏图片容器
                    imageContainer.style.display = 'none';
                };
                
                imageContainer.appendChild(img);
                reviewImages.appendChild(imageContainer);
            });
            
            reviewItem.appendChild(reviewImages);
        }
        
        reviewsListEl.appendChild(reviewItem);
    });
    
    // 渲染分页
    renderPagination();
    
    // 添加图片点击事件
    addImageClickHandlers();
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
 * 为评论图片添加点击事件
 */
function addImageClickHandlers() {
    const reviewImages = document.querySelectorAll('.review-image img');
    
    reviewImages.forEach(img => {
        img.addEventListener('click', function() {
            // 获取当前点击的图片URL
            const currentImageUrl = this.src;
            console.log(`点击了图片: ${currentImageUrl}`);
            
            // 获取当前评价中的所有图片
            const reviewItem = this.closest('.review-item');
            const allImagesInReview = Array.from(reviewItem.querySelectorAll('.review-image img'));
            const allImageUrls = allImagesInReview.map(img => img.src);
            
            // 获取当前图片在评价中的索引
            const currentIndex = allImageUrls.indexOf(currentImageUrl);
            
            console.log(`当前评价共有 ${allImageUrls.length} 张图片，当前点击的是第 ${currentIndex + 1} 张`);
            
            // 打开图片模态框
            openImageModal(allImageUrls, currentIndex);
        });
    });
}

/**
 * 打开图片模态框
 * @param {Array} images - 图片URL数组
 * @param {number} currentIndex - 当前图片索引
 */
function openImageModal(images, currentIndex) {
    // 获取模态框元素
    const modal = document.getElementById('reviewImageModal');
    const modalImg = document.getElementById('modalImage');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    
    if (!modal || !modalImg) {
        console.error('模态框元素未找到');
        return;
    }
    
    // 设置模态框数据
    modal.dataset.images = JSON.stringify(images);
    modal.dataset.currentIndex = currentIndex;
    
    // 显示当前图片
    const imageUrl = images[currentIndex];
    console.log(`显示模态框图片: ${imageUrl}`);
    
    // 添加图片加载状态处理
    modalImg.src = '';
    modalImg.classList.add('loading');
    
    // 设置图片源并添加加载事件
    modalImg.onload = function() {
        modalImg.classList.remove('loading');
        console.log(`模态框图片加载成功: ${imageUrl}`);
    };
    
    modalImg.onerror = function() {
        modalImg.classList.remove('loading');
        modalImg.classList.add('error');
        console.error(`模态框图片加载失败: ${imageUrl}`);
    };
    
    modalImg.src = imageUrl;
    
    // 更新计数器
    const modalCounter = document.createElement('div');
    modalCounter.className = 'modal-counter';
    modalCounter.textContent = `${currentIndex + 1} / ${images.length}`;
    
    // 添加计数器到模态框
    const modalContent = modal.querySelector('.modal-content');
    const existingCounter = modalContent.querySelector('.modal-counter');
    if (existingCounter) {
        existingCounter.textContent = `${currentIndex + 1} / ${images.length}`;
    } else {
        modalContent.appendChild(modalCounter);
    }
    
    // 更新导航按钮状态
    updateModalNavigation(images, currentIndex);
    
    // 显示模态框
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // 防止背景滚动
}

/**
 * 更新模态框导航按钮状态
 * @param {Array} images - 图片URL数组
 * @param {number} currentIndex - 当前图片索引
 */
function updateModalNavigation(images, currentIndex) {
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    
    if (!prevBtn || !nextBtn) {
        console.error('模态框导航按钮未找到');
        return;
    }
    
    // 更新上一张按钮状态
    if (currentIndex <= 0) {
        prevBtn.classList.add('disabled');
        prevBtn.disabled = true;
    } else {
        prevBtn.classList.remove('disabled');
        prevBtn.disabled = false;
    }
    
    // 更新下一张按钮状态
    if (currentIndex >= images.length - 1) {
        nextBtn.classList.add('disabled');
        nextBtn.disabled = true;
    } else {
        nextBtn.classList.remove('disabled');
        nextBtn.disabled = false;
    }
}

/**
 * 显示上一张图片
 */
function showPreviousImage() {
    const modal = document.getElementById('reviewImageModal');
    if (!modal) return;
    
    const images = JSON.parse(modal.dataset.images || '[]');
    let currentIndex = parseInt(modal.dataset.currentIndex || '0');
    
    if (currentIndex > 0) {
        currentIndex--;
        openImageModal(images, currentIndex);
    }
}

/**
 * 显示下一张图片
 */
function showNextImage() {
    const modal = document.getElementById('reviewImageModal');
    if (!modal) return;
    
    const images = JSON.parse(modal.dataset.images || '[]');
    let currentIndex = parseInt(modal.dataset.currentIndex || '0');
    
    if (currentIndex < images.length - 1) {
        currentIndex++;
        openImageModal(images, currentIndex);
    }
}

/**
 * 关闭图片模态框
 */
function closeImageModal() {
    const modal = document.getElementById('reviewImageModal');
    if (!modal) return;
    
    modal.style.display = 'none';
    document.body.style.overflow = ''; // 恢复背景滚动
    
    // 清除模态框数据
    modal.dataset.images = '[]';
    modal.dataset.currentIndex = '0';
    
    // 清除图片
    const modalImg = document.getElementById('modalImage');
    if (modalImg) {
        modalImg.src = '';
        modalImg.classList.remove('loading', 'error');
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
 * @param {string} imagePath - 图片路径或名称
 * @returns {string} 完整的图片URL
 */
function getImageUrl(imagePath) {
    if (!imagePath) return '';
    
    // 如果已经是完整URL，直接返回
    if (imagePath.startsWith('http')) {
        return imagePath;
    }
    
    // 如果已经包含文件扩展名和通配符，直接拼接基础路径
    if (imagePath.includes('*') && (imagePath.endsWith('.jpg') || imagePath.endsWith('.png') || imagePath.endsWith('.jpeg'))) {
        const fullUrl = `${config.imageBasePath}${imagePath}`;
        console.log(`使用完整图片路径: ${fullUrl}`);
        return fullUrl;
    }
    
    // 处理LB开头的订单号图片名称（例如：LB202505116968_review_1748255231266_*.jpg）
    if (imagePath.startsWith('LB')) {
        // 检查是否已经包含文件扩展名
        if (imagePath.endsWith('.jpg') || imagePath.endsWith('.png') || imagePath.endsWith('.jpeg') || 
            imagePath.endsWith('.gif')) {
            return `${config.imageBasePath}${imagePath}`;
        } else {
            // 添加通配符和扩展名（如果需要）
            const fullUrl = `${config.imageBasePath}${imagePath}_*.jpg`;
            console.log(`处理订单号开头的图片路径: ${fullUrl}`);
            return fullUrl;
        }
    }
    
    // 处理旧格式图片名称（例如：review_7_1748255247_*.jpg 或 *_review_1748255247_*.jpg）
    const reviewMatch = imagePath.match(/review_(\d+)_(\d+)/) || imagePath.match(/_review_(\d+)_/);
    if (reviewMatch) {
        // 如果是旧格式但没有LB前缀，添加LB前缀
        if (!imagePath.startsWith('LB') && imagePath.includes('review_')) {
            imagePath = 'LB' + imagePath;
        }
        
        console.log(`处理评价图片名称: ${imagePath}`);
        
        // 如果已经包含通配符和扩展名，直接使用
        if (imagePath.includes('*') && imagePath.endsWith('.jpg')) {
            const fullUrl = `${config.imageBasePath}${imagePath}`;
            console.log(`使用完整的评价图片路径: ${fullUrl}`);
            return fullUrl;
        }
        
        // 尝试找到匹配的评论
        const matchingReview = state.reviews.find(r => r.review_id && r.review_id.toString() === reviewId);
        
        if (matchingReview) {
            // 从评论中获取订单号（如果有的话）
            const orderId = matchingReview.order_id || '';
            
            if (orderId && orderId.startsWith('LB')) {
                // 构建新格式的图片路径
                const newImagePath = `${orderId}_review_${timestamp}_*.jpg`;
                const fullUrl = `${config.imageBasePath}${newImagePath}`;
                console.log(`转换为新格式图片路径: ${fullUrl}`);
                return fullUrl;
            }
        }
        
        // 如果找不到匹配的评论或没有订单号，尝试在R2中查找通配符匹配
        const wildcardPath = `*_review_${timestamp}_*.jpg`;
        const fullUrl = `${config.imageBasePath}${wildcardPath}`;
        console.log(`使用通配符路径: ${fullUrl}`);
        return fullUrl;
    }
    
    // 默认情况下，直接使用提供的路径
    // 如果后端已经提供了完整的图片名称（包括通配符和扩展名），则不需要再添加
    if (imagePath.endsWith('.jpg') || imagePath.endsWith('.png') || imagePath.endsWith('.jpeg') || imagePath.endsWith('.gif')) {
        const fullUrl = `${config.imageBasePath}${imagePath}`;
        console.log(`使用默认图片路径: ${fullUrl}`);
        return fullUrl;
    } else {
        // 如果没有扩展名，添加通配符和扩展名
        const fullUrl = `${config.imageBasePath}${imagePath}_*.jpg`;
        console.log(`使用通配符默认路径: ${fullUrl}`);
        return fullUrl;
    }
}

/**
 * 生成随机字符串
 * @param {number} length - 字符串长度
 */
function generateRandomString(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
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