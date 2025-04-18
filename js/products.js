import { API_BASE_URL } from './config.js';

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 加载商品数据
    loadProducts();
    
    // 初始化移动端菜单
    initMobileMenu();
});

// 从API加载商品数据
async function loadProducts() {
    try {
        const productGrid = document.querySelector('.product-grid');
        if (!productGrid) return;
        
        // 清空现有内容
        productGrid.innerHTML = '<div class="loading">正在加载商品...</div>';
        
        // 从API获取商品数据
        const products = await getProducts();
        
        if (!products || products.length === 0) {
            productGrid.innerHTML = '<div class="no-products">暂无商品</div>';
            return;
        }
        
        // 清空加载提示
        productGrid.innerHTML = '';
        
        // 渲染商品列表
        products.forEach(product => {
            // 创建商品卡片
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.setAttribute('data-category', product.category || 'all');
            
            // 构建商品图片URL
            const imageUrl = `${API_BASE_URL}/image/Goods/Goods_${product.product_id}.png`;
            
            // 设置商品标签
            let tagText = '';
            if (product.is_hot) tagText = '热销';
            else if (product.is_limited) tagText = '限量';
            else if (product.is_new) tagText = '新品';
            
            // 设置商品卡片内容
            productCard.innerHTML = `
                <div class="product-image">
                    <img src="${imageUrl}" alt="${product.name}">
                    ${tagText ? `<div class="product-tag">${tagText}</div>` : ''}
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p class="product-desc">${product.description}</p>
                    <div class="product-meta">
                        <span class="product-weight">规格：${product.specifications}</span>
                        <span class="product-year">年份：${product.aging_years}年</span>
                    </div>
                    <div class="product-price">
                        <span class="price">¥${product.price.toFixed(2)}</span>
                        <a href="shop.html?id=${product.product_id}" class="btn-small">立即购买</a>
                    </div>
                </div>
            `;
            
            // 添加到商品网格
            productGrid.appendChild(productCard);
        });
        
        // 初始化产品分类筛选
        initProductFilter();
        
        // 为商品卡片添加点击事件
        const productCards = document.querySelectorAll('.product-card');
        productCards.forEach(card => {
            card.addEventListener('click', function(e) {
                // 如果点击的是按钮，则不跳转
                if (e.target.closest('.btn-small')) {
                    return;
                }
                
                const productLink = this.querySelector('.btn-small');
                if (productLink) {
                    const productId = new URL(productLink.href).searchParams.get('id');
                    if (productId) {
                        window.location.href = `product-detail.html?id=${productId}`;
                    }
                }
            });
        });
        
    } catch (error) {
        console.error('加载商品失败:', error);
        const productGrid = document.querySelector('.product-grid');
        if (productGrid) {
            productGrid.innerHTML = '<div class="error">加载商品失败，请刷新页面重试</div>';
        }
    }
}

// 产品分类筛选功能
function initProductFilter() {
    const categoryTabs = document.querySelectorAll('.category-tab');
    const productCards = document.querySelectorAll('.product-card');
    
    if (categoryTabs.length > 0 && productCards.length > 0) {
        // 为每个分类标签添加点击事件
        categoryTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                // 移除所有标签的激活状态
                categoryTabs.forEach(t => t.classList.remove('active'));
                
                // 添加当前标签的激活状态
                this.classList.add('active');
                
                // 获取当前选中的分类
                const selectedCategory = this.getAttribute('data-category');
                
                // 显示或隐藏产品卡片
                productCards.forEach(card => {
                    const productName = card.querySelector('h3').textContent;
                    let shouldShow = false;

                    switch(selectedCategory) {
                        case 'all':
                            shouldShow = true;
                            break;
                        case 'traditional':
                            shouldShow = productName.includes('传统');
                            break;
                        case 'seasonal':
                            shouldShow = ['春茶', '夏茶', '秋茶', '冬茶'].some(season => productName.includes(season));
                            break;
                        case 'limited':
                            shouldShow = productName.includes('特惠') || productName.includes('促销');
                            break;
                        case 'aged':
                            shouldShow = productName.includes('十年');
                            break;
                        case 'gift':
                            shouldShow = productName.includes('礼盒');
                            break;
                    }

                    if (shouldShow) {
                        card.style.display = 'block';
                        // 添加动画效果
                        setTimeout(() => {
                            card.style.opacity = '1';
                            card.style.transform = 'translateY(0)';
                        }, 10);
                    } else {
                        card.style.opacity = '0';
                        card.style.transform = 'translateY(20px)';
                        setTimeout(() => {
                            card.style.display = 'none';
                        }, 300);
                    }
                });
            });
        });
        
        // 初始化样式
        productCards.forEach(card => {
            card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            card.style.opacity = '1';
        });
    }
}

// 移动端菜单切换（如果main.js中的函数不可用）
function initMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const navList = document.getElementById('navList');
    
    if (menuToggle && navList) {
        menuToggle.addEventListener('click', function() {
            navList.classList.toggle('active');
        });
        
        // 点击菜单项后关闭菜单
        const navItems = navList.querySelectorAll('a');
        navItems.forEach(item => {
            item.addEventListener('click', function() {
                if (window.innerWidth <= 767) {
                    navList.classList.remove('active');
                }
            });
        });
    }
}