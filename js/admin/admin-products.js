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

// 导出为全局变量，供其他模块使用
window.adminProducts = { init: initProductsPage };
window.initProductsPage = initProductsPage;

// 加载商品分类
async function loadCategories() {
    try {
        const categories = await adminAPI.getCategories();
        const categoryFilter = document.getElementById('productCategoryFilter');
        
        // 清空现有选项
        categoryFilter.innerHTML = '<option value="">所有分类</option>';
        
        // 添加分类选项
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categoryFilter.appendChild(option);
        });
    } catch (error) {
        console.error('加载商品分类失败:', error);
        throw error;
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
        productsData = result.products;
        totalPages = result.totalPages;
        
        // 更新商品列表
        updateProductsList();
        
        // 更新分页控件
        updateProductsPagination();
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
    
    if (productsData.length === 0) {
        productsList.innerHTML = '<tr><td colspan="7" class="text-center">暂无商品数据</td></tr>';
        return;
    }
    
    productsData.forEach(product => {
        const row = document.createElement('tr');
        
        // 格式化日期
        const createdDate = new Date(product.created_at * 1000).toLocaleDateString('zh-CN');
        
        // 库存状态
        const stockStatus = product.stock > 0 ? 
            `<span class="badge bg-success">有库存 (${product.stock})</span>` : 
            '<span class="badge bg-danger">无库存</span>';
        
        // 商品状态
        const statusBadge = product.status === 'active' ? 
            '<span class="badge bg-success">上架中</span>' : 
            '<span class="badge bg-secondary">已下架</span>';
        
        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <img src="${product.image_url}" alt="${product.name}" class="product-thumbnail me-2">
                    <div>
                        <div class="fw-bold">${product.name}</div>
                        <small class="text-muted">ID: ${product.id}</small>
                    </div>
                </div>
            </td>
            <td>${product.category_name}</td>
            <td>¥${product.price.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>${stockStatus}</td>
            <td>${statusBadge}</td>
            <td>${createdDate}</td>
            <td>
                <div class="btn-group">
                    <button type="button" class="btn btn-sm btn-outline-primary edit-product" data-product-id="${product.id}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-danger delete-product" data-product-id="${product.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        productsList.appendChild(row);
    });
    
    // 添加事件监听器
    addProductRowEventListeners();
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