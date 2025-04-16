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
    // 更新页面标题
    document.title = `${product.name} - 陳記六堡茶`;
    
    // 更新商品详情主体
    const productDetailMain = document.getElementById('productDetailMain');
    if (productDetailMain) {
        productDetailMain.innerHTML = `
            <div class="product-gallery">
                <div class="main-image">
                    <img src="/image/Goods/Goods_${product.product_id}.png" alt="${product.name}">
                </div>
            </div>
            <div class="product-info">
                <h1 class="product-title">${product.name}</h1>
                <p class="product-description">${product.description}</p>
                <div class="product-meta">
                    <div>
                        <span class="label">规格：</span>
                        <span>${product.specifications}</span>
                    </div>
                    <div>
                        <span class="label">年份：</span>
                        <span>${product.aging_years}年陈化</span>
                    </div>
                    <div>
                        <span class="label">库存：</span>
                        <span id="productStock">${product.stock}件</span>
                    </div>
                </div>
                <div class="product-price">
                    <span class="label">价格：</span>
                    <span class="price">¥${product.price.toFixed(2)}</span>
                </div>
                <div class="product-quantity">
                    <span class="label">数量：</span>
                    <button class="quantity-btn minus">-</button>
                    <input type="number" id="quantity" value="1" min="1" max="${product.stock}">
                    <button class="quantity-btn plus">+</button>
                    <span class="stock">库存${product.stock}件</span>
                </div>
                <div class="product-actions">
                    <button class="btn btn-secondary" id="addToCart">加入购物车</button>
                    <button class="btn btn-primary" id="buyNow">立即购买</button>
                </div>
            </div>
        `;
    }
}

// 加载茶文化内容
async function loadTeaCulture() {
    try {
        const response = await fetch('tea-culture.html');
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const mainContent = doc.querySelector('main');
        const cultureTab = document.getElementById('culture');
        if (cultureTab && mainContent) {
            // 移除不需要的导航和页脚部分
            const contentToDisplay = mainContent.innerHTML;
            cultureTab.innerHTML = `<div class="tea-culture-content">${contentToDisplay}</div>`;
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
        const response = await fetch(`${API_BASE_URL}/api/products`);
        if (!response.ok) {
            throw new Error('获取商品列表失败');
        }
        const allProducts = await response.json();
        
        // 过滤掉当前商品并随机选择4个商品
        const shuffledProducts = allProducts
            .filter(product => product.product_id !== currentProductId)
            .sort(() => Math.random() - 0.5)
            .slice(0, 4);
            
        // 渲染相关推荐商品
        const container = document.getElementById('relatedProducts');
        if (!container) return;
        
        container.innerHTML = shuffledProducts.map(product => `
            <div class="product-card" data-id="${product.product_id}">
                <div class="product-image">
                    <img src="/image/Goods/Goods_${product.product_id}.png" alt="${product.name}">
                    <div class="product-actions">
                        <button class="action-btn add-to-cart" data-id="${product.product_id}" title="加入购物车">
                            <i class="fas fa-shopping-cart"></i>
                        </button>
                        <a href="product-detail.html?id=${product.product_id}" class="action-btn buy-now" title="立即购买">
                            <i class="fas fa-shopping-bag"></i>
                        </a>
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

        // 添加商品卡片点击事件
        const productCards = container.querySelectorAll('.product-card');
        productCards.forEach(card => {
            // 商品卡片点击跳转到商品详情页
            card.addEventListener('click', (e) => {
                // 如果点击的是操作按钮，则不跳转
                if (e.target.closest('.product-actions')) {
                    return;
                }
                const productId = card.dataset.id;
                window.location.href = `product-detail.html?id=${productId}`;
            });

            // 加入购物车按钮点击事件
            const addToCartBtn = card.querySelector('.add-to-cart');
            addToCartBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const productId = addToCartBtn.dataset.id;
                try {
                    const response = await fetch('/api/cart/add', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            productId,
                            quantity: 1
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
        });
    } catch (error) {
        console.error('获取相关商品失败:', error);
        const container = document.getElementById('relatedProducts');
        if (container) {
            container.innerHTML = '<div class="error">加载相关商品失败，请刷新页面重试</div>';
        }
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

    // 添加商品卡片点击事件
    const productCards = container.querySelectorAll('.product-card');
    productCards.forEach(card => {
        // 商品卡片点击跳转到商品详情页
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.action-btn')) {
                const productId = card.dataset.id;
                window.location.href = `product-detail.html?id=${productId}`;
            }
        });

        // 加入购物车按钮点击事件
        const addToCartBtn = card.querySelector('.add-to-cart');
        addToCartBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const productId = addToCartBtn.dataset.id;
            try {
                const response = await fetch('/api/cart/add', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        productId,
                        quantity: 1
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

        // 快速查看按钮点击事件
        const quickViewBtn = card.querySelector('.quick-view');
        quickViewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const productId = quickViewBtn.dataset.id;
            window.location.href = `product-detail.html?id=${productId}`;
        });
    });
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
                    <div class="detail-section">
                        <h4>温馨提示</h4>
                        <p>亲爱的茶友们：<br>感谢您选择我们的陈记农家六堡茶～为了让每一份茶香都能尽快、安全地抵达您手中，我们统一采用顺丰快递为您配送。由于顺丰运费相对较高，且茶叶作为特殊饮品，口感体验因人而异，为了更好地保障您和其他茶友的权益，小店在此温馨说明：<br>--当您的订单完成发货后，很抱歉无法支持因 "口感不合"" 个人不喜欢 " 等主观口味原因的退换货哦。<br>--每一片茶叶都承载着我们对品质的用心，也深知每位茶友的口味偏好各有不同，所以恳请您在下单前充分考虑个人口味习惯，确认后再下单哟～<br>--我们始终致力于为您提供优质的产品和服务，若您在购买过程中有任何疑问，欢迎随时与我们沟通。期待与您共品六堡茶香，让每一次品茗都成为美好的体验！<br>感谢您的理解与支持，祝您生活愉快，茶香常伴～<br>陈记农家六堡茶</p>
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