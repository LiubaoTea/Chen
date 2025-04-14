// 引入API函数
const API_BASE_URL = 'https://liubaotea.cyuan52.workers.dev';

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 初始化搜索框
    initSearch();
    
    // 初始化购物车
    initCart();
    
    // 加载商品数据
    loadProducts();
    
    // 初始化产品筛选
    initProductFilter();
    
    // 初始化产品排序
    initProductSort();
    
    // 初始化快速查看
    initQuickView();
    
    // 初始化结算
    initCheckout();
});

// 从API加载商品数据
async function loadProducts() {
    try {
        const productGrid = document.getElementById('productGrid');
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
            productCard.setAttribute('data-price', product.price);
            productCard.setAttribute('data-year', product.aging_years);
            
            // 构建商品图片URL - 使用R2存储中的图片
            // 格式：Goods_1.png, Goods_2.png, ...
            const imageUrl = `${API_BASE_URL}/image/Goods/Goods_${product.product_id}.png`;
            
            // 设置商品卡片内容
            productCard.innerHTML = `
                <div class="product-image">
                    <img src="${imageUrl}" alt="${product.name}">
                    <div class="product-tag">${product.category || ''}</div>
                    <div class="product-actions">
                        <button class="action-btn add-to-cart" data-id="${product.product_id}" data-name="${product.name}" data-price="${product.price}" data-image="${imageUrl}">
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
                        <span class="product-weight">规格：${product.specifications}</span>
                        <span class="product-year">年份：${product.aging_years}年</span>
                    </div>
                    <div class="product-price">
                        <span class="price">¥${product.price.toFixed(2)}</span>
                    </div>
                </div>
            `;
            
            // 添加到商品网格
            productGrid.appendChild(productCard);
        });
        
        // 更新产品计数
        const productCount = document.querySelector('.product-count');
        if (productCount) {
            productCount.innerHTML = `<span>显示 ${products.length} 个产品中的 1-${products.length} 个</span>`;
        }
        
        // 重新初始化快速查看和添加到购物车按钮
        initQuickView();
        initAddToCartButtons();
        
    } catch (error) {
        console.error('加载商品失败:', error);
        const productGrid = document.getElementById('productGrid');
        if (productGrid) {
            productGrid.innerHTML = '<div class="error">加载商品失败，请刷新页面重试</div>';
        }
    }
}

// 搜索框功能
function initSearch() {
    const searchToggle = document.getElementById('searchToggle');
    const searchContainer = document.getElementById('searchContainer');
    
    if (searchToggle && searchContainer) {
        searchToggle.addEventListener('click', function(e) {
            e.preventDefault();
            searchContainer.classList.toggle('active');
        });
        
        // 搜索表单提交
        const searchForm = document.querySelector('.search-form');
        if (searchForm) {
            searchForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const searchInput = this.querySelector('.search-input');
                const searchTerm = searchInput.value.trim().toLowerCase();
                
                if (searchTerm) {
                    // 搜索产品
                    const productCards = document.querySelectorAll('.product-card');
                    let foundProducts = 0;
                    
                    productCards.forEach(card => {
                        const productName = card.querySelector('h3').textContent.toLowerCase();
                        const productDesc = card.querySelector('.product-desc').textContent.toLowerCase();
                        
                        if (productName.includes(searchTerm) || productDesc.includes(searchTerm)) {
                            card.style.display = 'block';
                            foundProducts++;
                        } else {
                            card.style.display = 'none';
                        }
                    });
                    
                    // 更新产品计数
                    const productCount = document.querySelector('.product-count');
                    if (productCount) {
                        productCount.innerHTML = `<span>找到 ${foundProducts} 个产品</span>`;
                    }
                    
                    // 关闭搜索框
                    searchContainer.classList.remove('active');
                }
            });
        }
    }
}

// 购物车功能
function initCart() {
    const cartToggle = document.getElementById('cartToggle');
    const cartSidebar = document.getElementById('cartSidebar');
    const cartOverlay = document.getElementById('cartOverlay');
    const closeCart = document.getElementById('closeCart');
    const clearCart = document.getElementById('clearCart');
    const checkout = document.getElementById('checkout');
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    const cartItemList = document.getElementById('cartItemList');
    const emptyCart = document.getElementById('emptyCart');
    const cartFooter = document.getElementById('cartFooter');
    const cartCount = document.querySelector('.cart-count');
    
    // 更新购物车UI
    async function updateCartUI() {
        try {
            const token = localStorage.getItem('userToken');
            if (!token) {
                alert('请先登录');
                return;
            }

            // 从API获取购物车数据
            const response = await fetch('/api/cart', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('获取购物车数据失败');
            }

            const cartItems = await response.json();
            
            // 更新购物车数量
            cartCount.textContent = cartItems.length;
            
            // 更新购物车列表
            if (cartItems.length === 0) {
                emptyCart.style.display = 'block';
                cartItemList.style.display = 'none';
                cartFooter.style.display = 'none';
            } else {
                emptyCart.style.display = 'none';
                cartItemList.style.display = 'block';
                cartFooter.style.display = 'block';
                
                // 清空购物车列表
                cartItemList.innerHTML = '';
                
                // 计算总价
                let totalPrice = 0;
                
                // 添加购物车商品
                cartItems.forEach((item) => {
                    const cartItem = document.createElement('div');
                    cartItem.className = 'cart-item';
                    cartItem.innerHTML = `
                        <div class="cart-item-image">
                            <img src="${item.image_url}" alt="${item.name}">
                        </div>
                        <div class="cart-item-details">
                            <h4 class="cart-item-name">${item.name}</h4>
                            <div class="cart-item-price">¥${item.price.toFixed(2)}</div>
                            <div class="cart-item-quantity">
                                <button class="quantity-btn minus" data-cart-id="${item.cart_id}">-</button>
                                <input type="number" value="${item.quantity}" min="1" max="99" data-cart-id="${item.cart_id}">
                                <button class="quantity-btn plus" data-cart-id="${item.cart_id}">+</button>
                                <button class="remove-item" data-cart-id="${item.cart_id}">删除</button>
                            </div>
                        </div>
                    `;
                    
                    cartItemList.appendChild(cartItem);
                    
                    // 计算小计
                    totalPrice += item.price * item.quantity;
                });
                
                // 更新总价
                document.querySelector('.total-price').textContent = `¥${totalPrice.toFixed(2)}`;
                
                // 添加数量按钮事件
                const minusButtons = cartItemList.querySelectorAll('.minus');
                const plusButtons = cartItemList.querySelectorAll('.plus');
                const quantityInputs = cartItemList.querySelectorAll('input[type="number"]');
                const removeButtons = cartItemList.querySelectorAll('.remove-item');
                
                minusButtons.forEach(button => {
                    button.addEventListener('click', async function() {
                        const cartId = this.getAttribute('data-cart-id');
                        const input = cartItemList.querySelector(`input[data-cart-id="${cartId}"]`);
                        const currentQuantity = parseInt(input.value);
                        
                        if (currentQuantity > 1) {
                            await updateCartItemQuantity(cartId, currentQuantity - 1);
                            await updateCartUI();
                        }
                    });
                });
                
                plusButtons.forEach(button => {
                    button.addEventListener('click', async function() {
                        const cartId = this.getAttribute('data-cart-id');
                        const input = cartItemList.querySelector(`input[data-cart-id="${cartId}"]`);
                        const currentQuantity = parseInt(input.value);
                        
                        if (currentQuantity < 99) {
                            await updateCartItemQuantity(cartId, currentQuantity + 1);
                            await updateCartUI();
                        }
                    });
                });
                
                quantityInputs.forEach(input => {
                    input.addEventListener('change', async function() {
                        const cartId = this.getAttribute('data-cart-id');
                        let value = parseInt(this.value);
                        
                        if (value < 1) value = 1;
                        if (value > 99) value = 99;
                        
                        await updateCartItemQuantity(cartId, value);
                        await updateCartUI();
                    });
                });
                
                removeButtons.forEach(button => {
                    button.addEventListener('click', async function() {
                        const cartId = this.getAttribute('data-cart-id');
                        await removeCartItem(cartId);
                        await updateCartUI();
                    });
                });
            }
        } catch (error) {
            console.error('更新购物车失败:', error);
            alert('更新购物车失败，请重试');
        }
    }
    
    // 更新购物车商品数量
    async function updateCartItemQuantity(cartId, quantity) {
        try {
            const token = localStorage.getItem('userToken');
            if (!token) {
                alert('请先登录');
                return;
            }

            const response = await fetch('/api/cart/update', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ cartId, quantity })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '更新数量失败');
            }
        } catch (error) {
            console.error('更新数量失败:', error);
            alert(error.message);
        }
    }

    // 从购物车中删除商品
    async function removeCartItem(cartId) {
        try {
            const token = localStorage.getItem('userToken');
            if (!token) {
                alert('请先登录');
                return;
            }

            const response = await fetch('/api/cart/remove', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ cartId })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '删除商品失败');
            }
        } catch (error) {
            console.error('删除商品失败:', error);
            alert(error.message);
        }
    }
    
    // 打开购物车
    if (cartToggle && cartSidebar && cartOverlay) {
        cartToggle.addEventListener('click', function(e) {
            e.preventDefault();
            cartSidebar.classList.add('active');
            cartOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            updateCartUI(); // 打开购物车时更新UI
        });
    }
    
    // 关闭购物车
    if (closeCart && cartSidebar && cartOverlay) {
        closeCart.addEventListener('click', function() {
            cartSidebar.classList.remove('active');
            cartOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
        
        cartOverlay.addEventListener('click', function() {
            cartSidebar.classList.remove('active');
            cartOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
    
    // 添加到购物车
    if (addToCartButtons) {
        addToCartButtons.forEach(button => {
            button.addEventListener('click', async function() {
                try {
                    const token = localStorage.getItem('userToken');
                    if (!token) {
                        alert('请先登录');
                        return;
                    }

                    const productId = this.getAttribute('data-id');
                    
                    const response = await fetch('/api/cart/add', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            productId: parseInt(productId),
                            quantity: 1
                        })
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || '添加到购物车失败');
                    }

                    // 显示购物车
                    cartSidebar.classList.add('active');
                    cartOverlay.classList.add('active');
                    document.body.style.overflow = 'hidden';
                    
                    // 更新购物车UI
                    await updateCartUI();
                } catch (error) {
                    console.error('添加到购物车失败:', error);
                    alert(error.message);
                }
            });
        });
    }
    
    // 初始化购物车UI
    updateCartUI();
}

// 获取商品列表
async function fetchProducts(filters = {}) {
    try {
        let url = '/api/products';
        if (Object.keys(filters).length > 0) {
            url = '/api/products/filter?' + new URLSearchParams(filters);
        }
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('获取商品列表失败');
        }
        return await response.json();
    } catch (error) {
        console.error('获取商品列表失败:', error);
        return [];
    }
}
    
    // 产品筛选功能
    function initProductFilter() {
        const categoryCheckboxes = document.querySelectorAll('input[name="category"]');
        const yearCheckboxes = document.querySelectorAll('input[name="year"]');
        const minPriceInput = document.getElementById('minPrice');
        const maxPriceInput = document.getElementById('maxPrice');
        const priceRangeSlider = document.getElementById('priceRange');
        const applyPriceButton = document.getElementById('applyPrice');
        
        // 筛选函数
        function filterProducts() {
            const productCards = document.querySelectorAll('.product-card');
            if (!productCards || productCards.length === 0) return;
            
            // 获取选中的分类
            const selectedCategories = [];
            categoryCheckboxes.forEach(checkbox => {
                if (checkbox.checked && checkbox.value !== 'all') {
                    selectedCategories.push(checkbox.value);
                }
            });
            
            // 获取选中的年份
            const selectedYears = [];
            yearCheckboxes.forEach(checkbox => {
                if (checkbox.checked) {
                    selectedYears.push(checkbox.value);
                }
            });
            
            // 获取价格范围
            const minPrice = minPriceInput.value ? parseInt(minPriceInput.value) : 0;
            const maxPrice = maxPriceInput.value ? parseInt(maxPriceInput.value) : 1000;
            
            // 筛选产品
            let visibleProducts = 0;
            
            productCards.forEach(card => {
                const category = card.getAttribute('data-category');
                const price = parseInt(card.getAttribute('data-price'));
                const year = card.getAttribute('data-year');
                
                // 检查是否符合筛选条件
                const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(category);
                const yearMatch = selectedYears.length === 0 || selectedYears.includes(year);
                const priceMatch = price >= minPrice && price <= maxPrice;
                
                // 显示或隐藏产品
                if (categoryMatch && yearMatch && priceMatch) {
                    card.style.display = 'block';
                    visibleProducts++;
                } else {
                    card.style.display = 'none';
                }
            });
            
            // 更新产品计数
            const productCount = document.querySelector('.product-count');
            if (productCount) {
                productCount.innerHTML = `<span>显示 ${productCards.length} 个产品中的 ${visibleProducts} 个</span>`;
            }
        }
        
        // 分类筛选事件
        if (categoryCheckboxes) {
            categoryCheckboxes.forEach(checkbox => {
                checkbox.addEventListener('change', function() {
                    // 如果选择了"全部产品"
                    if (this.value === 'all' && this.checked) {
                        // 取消选择其他分类
                        categoryCheckboxes.forEach(cb => {
                            if (cb.value !== 'all') {
                                cb.checked = false;
                            }
                        });
                    } else if (this.checked) {
                        // 如果选择了其他分类，取消选择"全部产品"
                        categoryCheckboxes.forEach(cb => {
                            if (cb.value === 'all') {
                                cb.checked = false;
                            }
                        });
                    }
                    
                    filterProducts();
                });
            });
        }
        
        // 年份筛选事件
        if (yearCheckboxes) {
            yearCheckboxes.forEach(checkbox => {
                checkbox.addEventListener('change', function() {
                    filterProducts();
                });
            });
        }
        
        // 价格范围筛选事件
        if (minPriceInput && maxPriceInput) {
            minPriceInput.addEventListener('change', filterProducts);
            maxPriceInput.addEventListener('change', filterProducts);
        }
        
        // 价格范围滑块事件
        if (priceRangeSlider) {
            priceRangeSlider.addEventListener('input', function() {
                const value = this.value;
                maxPriceInput.value = value;
            });
        }
        
        // 应用价格筛选
        if (applyPriceButton) {
            applyPriceButton.addEventListener('click', function() {
                filterProducts();
            });
        }
    }


// 产品排序功能
function initProductSort() {
    const sortSelect = document.getElementById('sortBy');
    const productGrid = document.querySelector('.product-grid');
    
    if (sortSelect && productGrid) {
        sortSelect.addEventListener('change', function() {
            const sortValue = this.value;
            const productCards = Array.from(document.querySelectorAll('.product-card'));
            
            if (!productCards || productCards.length === 0) return;
            
            // 根据选择的排序方式排序产品
            productCards.sort((a, b) => {
                if (sortValue === 'price-low') {
                    return parseInt(a.getAttribute('data-price')) - parseInt(b.getAttribute('data-price'));
                } else if (sortValue === 'price-high') {
                    return parseInt(b.getAttribute('data-price')) - parseInt(a.getAttribute('data-price'));
                } else if (sortValue === 'name') {
                    return a.querySelector('h3').textContent.localeCompare(b.querySelector('h3').textContent);
                } else {
                    // 默认排序
                    return 0;
                }
            });
            
            // 清空产品网格
            productGrid.innerHTML = '';
            
            // 重新添加排序后的产品卡片
            productCards.forEach(card => {
                productGrid.appendChild(card);
            });
            
            // 重新初始化快速查看和添加到购物车按钮
            initQuickView();
        });
    }
}

// 初始化添加到购物车按钮
function initAddToCartButtons() {
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    const cartSidebar = document.getElementById('cartSidebar');
    const cartOverlay = document.getElementById('cartOverlay');
    
    if (addToCartButtons && cartSidebar && cartOverlay) {
        addToCartButtons.forEach(button => {
            button.addEventListener('click', async function() {
                try {
                    const token = localStorage.getItem('userToken');
                    if (!token) {
                        alert('请先登录');
                        return;
                    }

                    const productId = this.getAttribute('data-id');
                    
                    const response = await fetch(`${API_BASE_URL}/api/cart/add`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            productId: parseInt(productId),
                            quantity: 1
                        })
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || '添加到购物车失败');
                    }

                    // 显示购物车
                    cartSidebar.classList.add('active');
                    cartOverlay.classList.add('active');
                    document.body.style.overflow = 'hidden';
                    
                    // 更新购物车UI
                    await updateCartUI();
                } catch (error) {
                    console.error('添加到购物车失败:', error);
                    alert(error.message);
                }
            });
        });
    }
}

// 快速查看功能
function initQuickView() {
    const quickViewButtons = document.querySelectorAll('.quick-view');
    const quickViewModal = document.getElementById('quickViewModal');
    const modalOverlay = document.getElementById('modalOverlay');
    const closeModal = document.getElementById('closeModal');
    const modalProductImage = document.getElementById('modalProductImage');
    const modalProductName = document.getElementById('modalProductName');
    const modalProductPrice = document.getElementById('modalProductPrice');
    const modalProductWeight = document.getElementById('modalProductWeight');
    const modalProductYear = document.getElementById('modalProductYear');
    const modalProductDesc = document.getElementById('modalProductDesc');
    const quantityMinus = document.getElementById('quantityMinus');
    const quantityPlus = document.getElementById('quantityPlus');
    const quantity = document.getElementById('quantity');
    const modalAddToCart = document.getElementById('modalAddToCart');
    
    // 打开快速查看弹窗
    if (quickViewButtons && quickViewModal && modalOverlay) {
        quickViewButtons.forEach(button => {
            button.addEventListener('click', async function() {
                const productId = this.getAttribute('data-id');
                const productCard = this.closest('.product-card');
                
                try {
                    // 显示加载中状态
                    modalProductName.textContent = '加载中...';
                    modalProductDesc.textContent = '';
                    modalProductPrice.textContent = '';
                    modalProductWeight.textContent = '';
                    modalProductYear.textContent = '';
                    modalProductImage.src = '';
                    
                    // 显示弹窗
                    quickViewModal.classList.add('active');
                    modalOverlay.classList.add('active');
                    document.body.style.overflow = 'hidden';
                    
                    // 从API获取产品详情
                    const product = await getProductDetails(productId);
                    
                    if (!product) {
                        throw new Error('获取商品详情失败');
                    }
                    
                    // 构建商品图片URL - 使用R2存储中的图片
                    const imageUrl = `${API_BASE_URL}/image/Goods/Goods_${product.product_id}.png`;
                    
                    // 更新弹窗内容
                    modalProductImage.src = imageUrl;
                    modalProductName.textContent = product.name;
                    modalProductPrice.textContent = `¥${product.price.toFixed(2)}`;
                    modalProductWeight.textContent = `规格：${product.specifications}`;
                    modalProductYear.textContent = `年份：${product.aging_years}年`;
                    modalProductDesc.textContent = product.description;
                    
                    // 重置数量
                    quantity.value = 1;
                    
                    // 设置添加到购物车按钮的数据
                    modalAddToCart.setAttribute('data-id', product.product_id);
                    modalAddToCart.setAttribute('data-name', product.name);
                    modalAddToCart.setAttribute('data-price', product.price);
                    modalAddToCart.setAttribute('data-image', imageUrl);
                    
                } catch (error) {
                    console.error('获取商品详情失败:', error);
                    modalProductName.textContent = '获取商品详情失败';
                    modalProductDesc.textContent = '请刷新页面重试';
                }
            });
        });
    }
    
    // 关闭快速查看弹窗
    if (closeModal && quickViewModal && modalOverlay) {
        closeModal.addEventListener('click', function() {
            quickViewModal.classList.remove('active');
            modalOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
        
        modalOverlay.addEventListener('click', function() {
            quickViewModal.classList.remove('active');
            modalOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
    
    // 数量加减按钮
    if (quantityMinus && quantityPlus && quantity) {
        quantityMinus.addEventListener('click', function() {
            let value = parseInt(quantity.value);
            if (value > 1) {
                quantity.value = value - 1;
            }
        });
        
        quantityPlus.addEventListener('click', function() {
            let value = parseInt(quantity.value);
            if (value < 99) {
                quantity.value = value + 1;
            }
        });
        
        quantity.addEventListener('change', function() {
            let value = parseInt(this.value);
            if (value < 1) {
                this.value = 1;
            } else if (value > 99) {
                this.value = 99;
            }
        });
    }
    
    // 弹窗中的添加到购物车按钮
    if (modalAddToCart) {
        modalAddToCart.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            const name = this.getAttribute('data-name');
            const price = parseFloat(this.getAttribute('data-price'));
            const image = this.getAttribute('data-image');
            const quantityValue = parseInt(quantity.value);
            
            // 获取购物车数据
            let cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
            
            // 检查商品是否已在购物车中
            const existingItem = cartItems.find(item => item.id === id);
            
            if (existingItem) {
                // 如果已存在，增加数量
                existingItem.quantity += quantityValue;
            } else {
                // 如果不存在，添加新商品
                cartItems.push({
                    id,
                    name,
                    price,
                    image,
                    quantity: quantityValue
                });
            }
            
            // 保存购物车数据
            localStorage.setItem('cartItems', JSON.stringify(cartItems));
            
            // 更新购物车UI
            const cartCount = document.querySelector('.cart-count');
            if (cartCount) {
                cartCount.textContent = cartItems.length;
            }
            
            // 关闭弹窗
            quickViewModal.classList.remove('active');
            modalOverlay.classList.remove('active');
            document.body.style.overflow = '';
            
            // 显示购物车
            const cartSidebar = document.getElementById('cartSidebar');
            const cartOverlay = document.getElementById('cartOverlay');
            if (cartSidebar && cartOverlay) {
                cartSidebar.classList.add('active');
                cartOverlay.classList.add('active');
                document.body.style.overflow = 'hidden';
                
                // 刷新购物车内容
                initCart();
            }
        });
    }
}

// 结算功能
function initCheckout() {
    const checkout = document.getElementById('checkout');
    const checkoutModal = document.getElementById('checkoutModal');
    const checkoutOverlay = document.getElementById('checkoutOverlay');
    const closeCheckoutModal = document.getElementById('closeCheckoutModal');
    const checkoutItems = document.getElementById('checkoutItems');
    const checkoutTotal = document.getElementById('checkoutTotal');
    const placeOrder = document.getElementById('placeOrder');
    const orderSuccessModal = document.getElementById('orderSuccessModal');
    const orderSuccessOverlay = document.getElementById('orderSuccessOverlay');
    const orderNumber = document.getElementById('orderNumber');
    const continueShoppingBtn = document.getElementById('continueShoppingBtn');
    
    // 打开结算弹窗
    if (checkout && checkoutModal && checkoutOverlay) {
        checkout.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 获取购物车数据
            const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
            
            if (cartItems.length === 0) {
                alert('您的购物车是空的，请先添加商品。');
                return;
            }
            
            // 更新结算商品列表
            checkoutItems.innerHTML = '';
            let totalPrice = 0;
            
            cartItems.forEach(item => {
                const checkoutItem = document.createElement('div');
                checkoutItem.className = 'checkout-item';
                checkoutItem.innerHTML = `
                    <div class="checkout-item-name">${item.name}</div>
                    <div class="checkout-item-quantity">x${item.quantity}</div>
                    <div class="checkout-item-price">¥${(item.price * item.quantity).toFixed(2)}</div>
                `;
                
                checkoutItems.appendChild(checkoutItem);
                
                // 计算总价
                totalPrice += item.price * item.quantity;
            });
            
            // 更新总价
            checkoutTotal.textContent = `¥${totalPrice.toFixed(2)}`;
            
            // 关闭购物车侧边栏
            const cartSidebar = document.getElementById('cartSidebar');
            const cartOverlay = document.getElementById('cartOverlay');
            if (cartSidebar && cartOverlay) {
                cartSidebar.classList.remove('active');
                cartOverlay.classList.remove('active');
            }
            
            // 显示结算弹窗
            checkoutModal.classList.add('active');
            checkoutOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }
    
    // 关闭结算弹窗
    if (closeCheckoutModal && checkoutModal && checkoutOverlay) {
        closeCheckoutModal.addEventListener('click', function() {
            checkoutModal.classList.remove('active');
            checkoutOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
        
        checkoutOverlay.addEventListener('click', function() {
            checkoutModal.classList.remove('active');
            checkoutOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
    
    // 提交订单
    if (placeOrder) {
        placeOrder.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 获取表单数据
            const name = document.getElementById('name').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const address = document.getElementById('address').value.trim();
            
            // 简单表单验证
            if (!name || !phone || !address) {
                alert('请填写完整的收货信息。');
                return;
            }
            
            // 生成随机订单号
            const orderNum = 'ORD' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000);
            orderNumber.textContent = orderNum;
            
            // 关闭结算弹窗
            checkoutModal.classList.remove('active');
            checkoutOverlay.classList.remove('active');
            
            // 显示订单成功弹窗
            orderSuccessModal.classList.add('active');
            orderSuccessOverlay.classList.add('active');
            
            // 清空购物车
            localStorage.removeItem('cartItems');
            
            // 更新购物车UI
            const cartCount = document.querySelector('.cart-count');
            if (cartCount) {
                cartCount.textContent = '0';
            }
        });
    }
    
    // 继续购物按钮
    if (continueShoppingBtn && orderSuccessModal && orderSuccessOverlay) {
        continueShoppingBtn.addEventListener('click', function() {
            orderSuccessModal.classList.remove('active');
            orderSuccessOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
        
        orderSuccessOverlay.addEventListener('click', function() {
            orderSuccessModal.classList.remove('active');
            orderSuccessOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
}
