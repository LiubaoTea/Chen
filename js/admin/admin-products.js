/**
 * 管理后台商品管理模块
 * 处理商品的展示、添加、编辑和删除
 */

// 商品列表数据
let productsData = [];
let currentPage = 1;
let totalPages = 1;
let pageSize = 10;
let selectedCategoryId = '';

// 初始化商品管理页面
async function initProductsPage() {
    // 检查是否已登录
    if (!adminAuth.check()) return;
    
    try {
        // 加载商品分类
        await loadCategories();
        
        // 加载商品列表
        await loadProducts(1);
        
        // 设置事件监听器
        setupProductsEventListeners();
    } catch (error) {
        console.error('初始化商品管理页面失败:', error);
        showErrorToast('初始化商品管理页面失败，请稍后重试');
    }
}

// 显示错误提示
function showErrorToast(message) {
    // 检查是否存在全局的toast函数
    if (typeof showToast === 'function') {
        showToast('error', message);
    } else {
        // 创建简单的toast提示
        const toastContainer = document.getElementById('toastContainer') || createToastContainer();
        const toast = document.createElement('div');
        toast.className = 'toast show bg-danger text-white';
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        toast.innerHTML = `
            <div class="toast-header bg-danger text-white">
                <strong class="me-auto">错误</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="关闭"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        `;
        toastContainer.appendChild(toast);
        
        // 3秒后自动关闭
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }
}

// 显示成功提示
function showSuccessToast(message) {
    // 检查是否存在全局的toast函数
    if (typeof showToast === 'function') {
        showToast('success', message);
    } else {
        // 创建简单的toast提示
        const toastContainer = document.getElementById('toastContainer') || createToastContainer();
        const toast = document.createElement('div');
        toast.className = 'toast show bg-success text-white';
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        toast.innerHTML = `
            <div class="toast-header bg-success text-white">
                <strong class="me-auto">成功</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="关闭"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        `;
        toastContainer.appendChild(toast);
        
        // 3秒后自动关闭
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }
}

// 创建toast容器
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    container.style.zIndex = '5000';
    document.body.appendChild(container);
    return container;
}

// 刷新商品数据
async function refreshProductsData() {
    try {
        await loadProducts(currentPage, selectedCategoryId, document.getElementById('productSearchInput')?.value || '');
        console.log('商品数据已刷新');
    } catch (error) {
        console.error('刷新商品数据失败:', error);
        showErrorToast('刷新商品数据失败，请稍后重试');
    }
}

// 导出为全局变量，供其他模块使用
window.adminProducts = { 
    init: initProductsPage,
    refresh: refreshProductsData
};
window.initProductsPage = initProductsPage;
window.refreshProductsData = refreshProductsData;

// 加载商品分类
async function loadCategories() {
    try {
        const categories = await adminAPI.getCategories();
        const categoryFilter = document.getElementById('productCategoryFilter');
        
        // 清空现有选项
        categoryFilter.innerHTML = '<option value="">所有分类</option>';
        
        // 添加分类选项
        if (Array.isArray(categories)) {
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id || category.category_id;
                option.textContent = category.name || category.category_name;
                categoryFilter.appendChild(option);
            });
        } else if (categories && categories.categories && Array.isArray(categories.categories)) {
            // 兼容旧格式的API响应
            categories.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id || category.category_id;
                option.textContent = category.name || category.category_name;
                categoryFilter.appendChild(option);
            });
        } else {
            console.warn('获取到的分类数据格式不正确:', categories);
        }
        
        console.log('分类加载完成，选项数量:', categoryFilter.options.length);
    } catch (error) {
        console.error('加载商品分类失败:', error);
        showErrorToast('加载商品分类失败，请稍后重试');
    }
}

// 加载商品列表
async function loadProducts(page, categoryId = '', searchQuery = '') {
    try {
        currentPage = page;
        selectedCategoryId = categoryId;
        
        // 显示加载状态
        const productsList = document.getElementById('productsList');
        productsList.innerHTML = '<tr><td colspan="7" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">加载中...</span></div></td></tr>';
        
        // 获取商品数据
        const result = await adminAPI.getProducts(page, pageSize, categoryId, searchQuery);
        console.log('获取到的商品数据结果:', result);
        
        // 确保result.products存在
        if (result && result.products && Array.isArray(result.products)) {
            productsData = result.products;
            totalPages = result.totalPages || 1;
            
            // 更新商品列表
            updateProductsList();
            
            // 更新分页控件
            updateProductsPagination();
        } else {
            console.error('商品数据格式不正确:', result);
            productsList.innerHTML = '<tr><td colspan="7" class="text-center text-danger">商品数据格式不正确，请联系管理员</td></tr>';
        }
    } catch (error) {
        console.error('加载商品列表失败:', error);
        const productsList = document.getElementById('productsList');
        productsList.innerHTML = '<tr><td colspan="7" class="text-center text-danger">加载商品列表失败，请稍后重试</td></tr>';
    }
}

// 更新商品列表
function updateProductsList() {
    const productsList = document.getElementById('productsList');
    productsList.innerHTML = '';
    
    if (!productsData || productsData.length === 0) {
        productsList.innerHTML = '<tr><td colspan="7" class="text-center">暂无商品数据</td></tr>';
        return;
    }
    
    productsData.forEach(product => {
        try {
            const row = document.createElement('tr');
            
            // 安全获取商品属性，防止undefined错误
            const productId = product.id || product.product_id || '未知';
            const productName = product.name || '未命名商品';
            const productPrice = product.price || 0;
            const productStock = product.stock || 0;
            const productStatus = product.status || 'inactive';
            const productImage = product.image_url || '../images/products/default.jpg';
            const categoryName = product.category_name || '未分类';
            
            // 格式化日期，确保created_at存在
            let createdDate = '未知日期';
            if (product.created_at) {
                try {
                    createdDate = new Date(product.created_at * 1000).toLocaleDateString('zh-CN');
                } catch (e) {
                    console.warn('日期格式化错误:', e);
                }
            }
            
            // 库存状态
            const stockStatus = productStock > 0 ? 
                `<span class="badge bg-success">有库存 (${productStock})</span>` : 
                '<span class="badge bg-danger">无库存</span>';
            
            // 商品状态
            const statusBadge = productStatus === 'active' ? 
                '<span class="badge bg-success">上架中</span>' : 
                '<span class="badge bg-secondary">已下架</span>';
            
            // 格式化价格，确保price是数字
            let formattedPrice = '¥0.00';
            try {
                formattedPrice = `¥${Number(productPrice).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            } catch (e) {
                console.warn('价格格式化错误:', e);
            }
            
            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${productImage}" alt="${productName}" class="product-thumbnail me-2" onerror="this.src='../images/products/default.jpg'">
                        <div>
                            <div class="fw-bold">${productName}</div>
                            <small class="text-muted">ID: ${productId}</small>
                        </div>
                    </div>
                </td>
                <td>${categoryName}</td>
                <td>${formattedPrice}</td>
                <td>${stockStatus}</td>
                <td>${statusBadge}</td>
                <td>${createdDate}</td>
                <td>
                    <div class="btn-group">
                        <button type="button" class="btn btn-sm btn-outline-primary edit-product" data-product-id="${productId}">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-danger delete-product" data-product-id="${productId}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            productsList.appendChild(row);
        } catch (error) {
            console.error('处理商品数据时出错:', error, product);
        }
    });
    
    // 添加事件监听器
    addProductRowEventListeners();
    
    console.log('商品列表更新完成，显示商品数量:', productsData.length);
}

// 更新分页控件
function updateProductsPagination() {
    const pagination = document.getElementById('productsPagination');
    pagination.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // 上一页按钮
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage - 1}">上一页</a>`;
    pagination.appendChild(prevLi);
    
    // 页码按钮
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
        pageLi.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
        pagination.appendChild(pageLi);
    }
    
    // 下一页按钮
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage + 1}">下一页</a>`;
    pagination.appendChild(nextLi);
    
    // 添加分页事件监听器
    document.querySelectorAll('#productsPagination .page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(e.target.getAttribute('data-page'));
            if (page >= 1 && page <= totalPages) {
                loadProducts(page, selectedCategoryId, document.getElementById('productSearchInput').value);
            }
        });
    });
}

// 设置商品管理页面的事件监听器
function setupProductsEventListeners() {
    // 分类筛选
    document.getElementById('productCategoryFilter').addEventListener('change', (e) => {
        loadProducts(1, e.target.value, document.getElementById('productSearchInput').value);
    });
    
    // 搜索商品
    document.getElementById('productSearchForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const searchQuery = document.getElementById('productSearchInput').value;
        loadProducts(1, selectedCategoryId, searchQuery);
    });
    
    // 添加商品按钮
    document.getElementById('addProductBtn').addEventListener('click', () => {
        showProductModal();
    });
    
    // 商品模态框保存按钮
    document.getElementById('saveProductBtn').addEventListener('click', saveProduct);
}

// 为商品行添加事件监听器
function addProductRowEventListeners() {
    // 编辑商品按钮
    document.querySelectorAll('.edit-product').forEach(button => {
        button.addEventListener('click', (e) => {
            const productId = e.currentTarget.getAttribute('data-product-id');
            editProduct(productId);
        });
    });
    
    // 删除商品按钮
    document.querySelectorAll('.delete-product').forEach(button => {
        button.addEventListener('click', (e) => {
            const productId = e.currentTarget.getAttribute('data-product-id');
            confirmDeleteProduct(productId);
        });
    });
}

// 显示商品模态框（添加或编辑）
async function showProductModal(productId = null) {
    // 重置表单
    document.getElementById('productForm').reset();
    document.getElementById('productImagePreview').src = '';
    document.getElementById('productImagePreview').classList.add('d-none');
    
    // 设置模态框标题
    const modalTitle = document.getElementById('productModalLabel');
    modalTitle.textContent = productId ? '编辑商品' : '添加商品';
    
    // 加载分类选项
    try {
        const categories = await adminAPI.getCategories();
        const categorySelect = document.getElementById('productCategory');
        
        // 清空现有选项
        categorySelect.innerHTML = '<option value="">选择分类</option>';
        
        // 添加分类选项
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
        
        // 如果是编辑模式，加载商品数据
        if (productId) {
            const product = await adminAPI.getProductById(productId);
            
            // 填充表单
            document.getElementById('productId').value = product.id;
            document.getElementById('productName').value = product.name;
            document.getElementById('productCategory').value = product.category_id;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productOriginalPrice').value = product.original_price || '';
            document.getElementById('productStock').value = product.stock;
            document.getElementById('productDescription').value = product.description;
            document.getElementById('productStatus').value = product.status;
            
            // 显示商品图片
            if (product.image_url) {
                document.getElementById('productImagePreview').src = product.image_url;
                document.getElementById('productImagePreview').classList.remove('d-none');
            }
        } else {
            // 添加模式，设置默认值
            document.getElementById('productId').value = '';
            document.getElementById('productStatus').value = 'active';
        }
        
        // 显示模态框
        const productModal = new bootstrap.Modal(document.getElementById('productModal'));
        productModal.show();
    } catch (error) {
        console.error('加载商品数据失败:', error);
        showErrorToast('加载商品数据失败，请稍后重试');
    }
}

// 保存商品（添加或更新）
async function saveProduct() {
    // 验证表单
    const form = document.getElementById('productForm');
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }
    
    // 获取表单数据
    const productId = document.getElementById('productId').value;
    const productData = {
        name: document.getElementById('productName').value,
        category_id: document.getElementById('productCategory').value,
        price: parseFloat(document.getElementById('productPrice').value),
        original_price: document.getElementById('productOriginalPrice').value ? 
            parseFloat(document.getElementById('productOriginalPrice').value) : null,
        stock: parseInt(document.getElementById('productStock').value),
        description: document.getElementById('productDescription').value,
        status: document.getElementById('productStatus').value
    };
    
    // 获取图片文件
    const imageFile = document.getElementById('productImage').files[0];
    
    try {
        // 显示加载状态
        const saveBtn = document.getElementById('saveProductBtn');
        const originalText = saveBtn.textContent;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 保存中...';
        saveBtn.disabled = true;
        
        let result;
        if (productId) {
            // 更新商品
            result = await adminAPI.updateProduct(productId, productData, imageFile);
            showSuccessToast('商品更新成功');
        } else {
            // 添加商品
            result = await adminAPI.createProduct(productData, imageFile);
            showSuccessToast('商品添加成功');
        }
        
        // 关闭模态框
        const productModal = bootstrap.Modal.getInstance(document.getElementById('productModal'));
        productModal.hide();
        
        // 重新加载商品列表
        await loadProducts(currentPage, selectedCategoryId, document.getElementById('productSearchInput').value);
    } catch (error) {
        console.error('保存商品失败:', error);
        showErrorToast('保存商品失败: ' + error.message);
    } finally {
        // 恢复按钮状态
        const saveBtn = document.getElementById('saveProductBtn');
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}

// 编辑商品
function editProduct(productId) {
    showProductModal(productId);
}

// 确认删除商品
function confirmDeleteProduct(productId) {
    // 查找商品信息
    const product = productsData.find(p => p.id === productId);
    if (!product) return;
    
    // 显示确认对话框
    if (confirm(`确定要删除商品 "${product.name}"？此操作不可恢复。`)) {
        deleteProduct(productId);
    }
}

// 删除商品
async function deleteProduct(productId) {
    try {
        await adminAPI.deleteProduct(productId);
        showSuccessToast('商品删除成功');
        
        // 重新加载商品列表
        await loadProducts(currentPage, selectedCategoryId, document.getElementById('productSearchInput').value);
    } catch (error) {
        console.error('删除商品失败:', error);
        showErrorToast('删除商品失败: ' + error.message);
    }
}

// 设置全局对象，供admin-main.js调用
window.adminProducts = { init: initProductsPage };