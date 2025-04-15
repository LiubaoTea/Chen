// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 加载精选商品
    loadFeaturedProducts();
});

// 从API加载精选商品数据
async function loadFeaturedProducts() {
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
        
        // 随机选择4个商品作为精选商品
        const featuredProducts = shuffleArray(products).slice(0, 4);
        
        // 清空加载提示
        productGrid.innerHTML = '';
        
        // 渲染精选商品列表
        featuredProducts.forEach(product => {
            // 创建商品卡片
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            
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
                        <a href="product-detail.html?id=${product.product_id}" class="btn-small">立即购买</a>
                    </div>
                </div>
            `;
            
            // 添加到商品网格
            productGrid.appendChild(productCard);
            
            // 添加点击事件
            productCard.addEventListener('click', function(e) {
                // 如果点击的是按钮，则不跳转
                if (e.target.closest('.btn-small')) {
                    return;
                }
                
                window.location.href = `product-detail.html?id=${product.product_id}`;
            });
        });
        
    } catch (error) {
        console.error('加载精选商品失败:', error);
        const productGrid = document.querySelector('.product-grid');
        if (productGrid) {
            productGrid.innerHTML = '<div class="error">加载商品失败，请刷新页面重试</div>';
        }
    }
}

// 数组随机排序函数
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}