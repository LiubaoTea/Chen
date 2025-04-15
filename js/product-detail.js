// 获取URL参数中的商品ID
function getProductId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// 从D1数据库获取商品详情
async function fetchProductDetail(productId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/products/${productId}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '商品数据获取失败');
        }
        const data = await response.json();
        if (!data) {
            throw new Error('商品不存在');
        }
        return data;
    } catch (error) {
        console.error('获取商品详情失败:', error);
        alert(error.message);
        window.location.href = 'shop.html';
        return null;
    }
}

// 更新商品详情页面
function updateProductDetail(product) {
    // 更新商品图片
    const productImage = document.getElementById('productImage');
    productImage.src = `/image/Goods/Goods_${product.product_id}.png`;
    productImage.alt = product.name;

    // 更新商品信息
    document.getElementById('productName').textContent = product.name;
    document.getElementById('productDescription').textContent = product.description;
    document.getElementById('productSpecifications').textContent = product.specifications;
    document.getElementById('productAgingYears').textContent = `${product.aging_years}年陈化`;
    document.getElementById('productPrice').textContent = `¥${product.price.toFixed(2)}`;
    document.getElementById('productStock').textContent = `库存：${product.stock}件`;

    // 更新页面标题
    document.title = `${product.name} - 陳記六堡茶`;
}

// 加载茶文化内容
async function loadTeaCulture() {
    try {
        const response = await fetch('tea-culture.html');
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const teaCultureContent = doc.querySelector('.tea-culture-content');
        const cultureTab = document.getElementById('culture');
        if (cultureTab && teaCultureContent) {
            cultureTab.innerHTML = teaCultureContent.innerHTML;
        } else {
            console.warn('茶文化内容加载失败：找不到目标元素');
        }
    } catch (error) {
        console.error('加载茶文化内容失败:', error);
    }
}

// 获取相关推荐商品
async function fetchRelatedProducts(currentProductId) {
    try {
        const response = await fetch(`/api/products/related/${currentProductId}`);
        if (!response.ok) {
            throw new Error('获取相关商品失败');
        }
        const products = await response.json();
        displayRelatedProducts(products);
    } catch (error) {
        console.error('获取相关商品失败:', error);
    }
}

// 显示相关推荐商品
function displayRelatedProducts(products) {
    const container = document.getElementById('relatedProducts');
    container.innerHTML = products.map(product => `
        <div class="product-card" data-id="${product.product_id}">
            <div class="product-image">
                <img src="/image/Goods/Goods_${product.product_id}.png" alt="${product.name}">
                <div class="product-actions">
                    <button class="action-btn add-to-cart" data-id="${product.product_id}">
                        <i class="fas fa-shopping-cart"></i>
                    </button>
                    <button class="action-btn quick-view" data-id="${product.product_id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <p class="product-desc">${product.description}</p>
                <div class="product-meta">
                    <span class="product-weight">${product.specifications}</span>
                    <span class="product-year">${product.aging_years}年陈化</span>
                </div>
                <div class="product-price">
                    <span class="price">¥${product.price.toFixed(2)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// 数量控制
function initQuantityControl() {
    const minusBtn = document.querySelector('.quantity-btn.minus');
    const plusBtn = document.querySelector('.quantity-btn.plus');
    const quantityInput = document.getElementById('quantity');

    minusBtn.addEventListener('click', () => {
        const currentValue = parseInt(quantityInput.value);
        if (currentValue > 1) {
            quantityInput.value = currentValue - 1;
        }
    });

    plusBtn.addEventListener('click', () => {
        const currentValue = parseInt(quantityInput.value);
        const stock = parseInt(document.getElementById('productStock').textContent.match(/\d+/)[0]);
        if (currentValue < stock) {
            quantityInput.value = currentValue + 1;
        }
    });

    quantityInput.addEventListener('change', () => {
        const value = parseInt(quantityInput.value);
        const stock = parseInt(document.getElementById('productStock').textContent.match(/\d+/)[0]);
        if (isNaN(value) || value < 1) {
            quantityInput.value = 1;
        } else if (value > stock) {
            quantityInput.value = stock;
        }
    });
}

// 标签页切换
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// 加入购物车
function initAddToCart() {
    const addToCartBtn = document.getElementById('addToCart');
    addToCartBtn.addEventListener('click', async () => {
        const productId = getProductId();
        const quantity = parseInt(document.getElementById('quantity').value);
        
        try {
            const response = await fetch('/api/cart/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    productId,
                    quantity
                })
            });

            if (!response.ok) {
                throw new Error('添加到购物车失败');
            }

            // 更新购物车图标数量
            updateCartCount();
            
            // 显示成功提示
            alert('成功加入购物车！');
        } catch (error) {
            console.error('添加到购物车失败:', error);
            alert('添加到购物车失败，请稍后重试');
        }
    });
}

// 立即购买
function initBuyNow() {
    const buyNowBtn = document.getElementById('buyNow');
    buyNowBtn.addEventListener('click', () => {
        const productId = getProductId();
        const quantity = document.getElementById('quantity').value;
        window.location.href = `/checkout.html?product=${productId}&quantity=${quantity}`;
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
    const productId = getProductId();
    if (!productId) {
        alert('商品ID不存在');
        window.location.href = 'shop.html';
        return;
    }

    try {
        // 获取并显示商品详情
        const product = await fetchProductDetail(productId);
        if (!product) {
            alert('商品不存在');
            window.location.href = 'shop.html';
            return;
        }
        updateProductDetail(product);

        // 初始化各个功能模块
        initQuantityControl();
        initTabs();
        initAddToCart();
        initBuyNow();

        // 加载茶文化内容
        await loadTeaCulture();

        // 获取相关推荐商品
        await fetchRelatedProducts(productId);

        // 加载商品详情内容
        const detailContent = document.getElementById('detail');
        if (detailContent) {
            detailContent.innerHTML = `
                <div class="product-detail-content">
                    <h3>商品详情</h3>
                    <div class="detail-section">
                        <h4>产品特点</h4>
                        <p>${product.description}</p>
                    </div>
                    <div class="detail-section">
                        <h4>储存方法</h4>
                        <p>请将茶叶存放在阴凉干燥处，避免阳光直射和潮湿环境。</p>
                    </div>
                    <div class="detail-section">
                        <h4>冲泡建议</h4>
                        <p>水温：95-100℃<br>时间：3-5分钟<br>比例：5-8克/150ml</p>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('初始化商品详情页失败:', error);
        alert('加载商品详情失败，请刷新页面重试');
    }

    // 获取并显示商品详情
    const product = await fetchProductDetail(productId);
    if (product) {
        updateProductDetail(product);
        
        // 初始化页面功能
        initQuantityControl();
        initTabs();
        initAddToCart();
        initBuyNow();
        
        // 加载茶文化内容
        loadTeaCulture();
        
        // 获取相关推荐
        fetchRelatedProducts(productId);
    } else {
        window.location.href = '/shop.html';
    }
});