/**
 * 管理后台商品管理模块
 * 处理商品的展示、添加、编辑和删除
 */

// 导入API基础URL配置
import config from '../config.js';
const { API_BASE_URL, ADMIN_API_BASE_URL } = config;

// 商品列表数据
let productsData = [];
let currentPage = 1;
let totalPages = 1;
let pageSize = 10;
let selectedCategoryId = '';
let categoriesData = []; // 存储分类数据

// 初始化商品管理页面
async function initProductsPage() {
    // 检查是否已登录
    if (!adminAuth.check()) return;
    
    try {
        console.log('初始化商品管理页面...');
        
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

// 从D1数据库加载商品分类
async function loadCategories() {
    try {
        console.log('正在从D1数据库加载商品分类...');
        
        // 确保管理员已登录
        if (!adminAuth.isLoggedIn()) {
            console.error('管理员未登录，无法加载分类数据');
            throw new Error('请先登录');
        }
        
        // 获取管理员认证头信息
        const token = adminAuth.getToken();
        if (!token) {
            console.error('管理员令牌不存在，无法加载分类数据');
            throw new Error('认证令牌无效，请重新登录');
        }
        
        // 构建请求头
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
        
        console.log('发送分类请求，认证头:', headers);
        
        const response = await fetch(`${ADMIN_API_BASE_URL}/categories`, {
            method: 'GET',
            headers: headers
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('分类API响应错误:', response.status, errorText);
            throw new Error('获取分类列表失败，HTTP状态码: ' + response.status);
        }
        
        const data = await response.json();
        categoriesData = data.categories || [];
        
        console.log('成功加载分类数据:', categoriesData);
        
        const categoryFilter = document.getElementById('productCategoryFilter');
        if (!categoryFilter) {
            console.warn('未找到分类筛选器元素');
            return;
        }
        
        // 清空现有选项
        categoryFilter.innerHTML = '<option value="">所有分类</option>';
        
        // 添加分类选项
        categoriesData.forEach(category => {
            const option = document.createElement('option');
            option.value = category.category_id;
            option.textContent = category.category_name;
            categoryFilter.appendChild(option);
        });
    } catch (error) {
        console.error('加载商品分类失败:', error);
        // 显示错误信息
        const categoryFilter = document.getElementById('productCategoryFilter');
        if (categoryFilter) {
            // 清空现有选项并显示错误提示
            categoryFilter.innerHTML = '<option value="">加载分类失败</option>';
        }
        
        // 重新抛出错误，让上层函数处理
        throw error;
    }
}

// 从D1数据库加载商品列表
async function loadProducts(page, categoryId = '', searchQuery = '') {
    try {
        currentPage = page;
        selectedCategoryId = categoryId;
        
        // 显示加载状态
        const productsList = document.getElementById('productsList');
        if (productsList) {
            productsList.innerHTML = '<tr><td colspan="7" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">加载中...</span></div></td></tr>';
        }
        
        console.log('正在从D1数据库加载商品数据...');
        
        // 确保管理员已登录
        if (!adminAuth.isLoggedIn()) {
            console.error('管理员未登录，无法加载商品数据');
            throw new Error('请先登录');
        }
        
        // 获取管理员认证头信息
        const token = adminAuth.getToken();
        if (!token) {
            console.error('管理员令牌不存在，无法加载商品数据');
            throw new Error('认证令牌无效，请重新登录');
        }
        
        // 构建API URL
        let url = `${ADMIN_API_BASE_URL}/products?page=${page}&pageSize=${pageSize}`;
        if (categoryId) url += `&category=${categoryId}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
        
        // 构建请求头
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
        
        console.log('发送商品请求，URL:', url);
        console.log('认证头:', headers);
        
        // 获取商品数据
        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('商品API响应错误:', response.status, errorText);
            throw new Error('获取商品列表失败，HTTP状态码: ' + response.status);
        }
        
        const result = await response.json();
        productsData = result.products || [];
        totalPages = result.totalPages || 1;
        
        console.log('成功加载商品数据:', productsData);
        
        // 更新商品列表
        updateProductsList();
        
        // 更新分页控件
        updateProductsPagination();
    } catch (error) {
        console.error('加载商品列表失败:', error);
        
        // 清空商品数据
        productsData = [];
        totalPages = 0;
        
        // 显示错误信息
        const productsList = document.getElementById('productsList');
        if (productsList) {
            productsList.innerHTML = '<tr><td colspan="7" class="text-center text-danger">加载商品列表失败，请稍后重试</td></tr>';
        }
        
        // 更新分页控件
        updateProductsPagination();
        
        // 重新抛出错误，让上层函数处理
        throw error;
    }
}

// 更新商品列表
function updateProductsList() {
    const productsList = document.getElementById('productsList');
    if (!productsList) {
        console.error('未找到商品列表元素');
        return;
    }
    
    productsList.innerHTML = '';
    
    if (!productsData || productsData.length === 0) {
        productsList.innerHTML = '<tr><td colspan="7" class="text-center">暂无商品数据</td></tr>';
        return;
    }
    
    productsData.forEach(product => {
        const row = document.createElement('tr');
        
        // 格式化日期
        let createdDate = '未知';
        if (product.created_at) {
            try {
                createdDate = new Date(product.created_at * 1000).toLocaleDateString('zh-CN');
            } catch (e) {
                console.warn('日期格式化错误:', e);
            }
        }
        
        // 库存状态
        const stockStatus = product.stock > 0 ? 
            `<span class="badge bg-success">有库存 (${product.stock})</span>` : 
            '<span class="badge bg-danger">无库存</span>';
        
        // 商品状态 - 默认为上架中
        const status = product.status || 'active';
        const statusBadge = status === 'active' ? 
            '<span class="badge bg-success">上架中</span>' : 
            '<span class="badge bg-secondary">已下架</span>';
        
        // 查找分类名称
        let categoryName = '未分类';
        if (product.category_id && categoriesData && categoriesData.length > 0) {
            const category = categoriesData.find(c => c.category_id == product.category_id);
            if (category) {
                categoryName = category.category_name;
            }
        }
        
        // 构建商品图片URL - 使用R2存储中的图片
        const imageUrl = `${API_BASE_URL}/image/Goods/Goods_${product.product_id}.png`;
        
        // 设置行内容
        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <img src="${imageUrl}" alt="${product.name}" class="product-thumbnail me-2" onerror="this.src='../assets/img/product-placeholder.png'">
                    <div>
                        <div class="fw-bold">${product.name}</div>
                        <div class="small text-muted">ID: ${product.product_id}</div>
                    </div>
                </div>
            </td>
            <td>${categoryName}</td>
            <td>¥${product.price.toFixed(2)}</td>
            <td>${stockStatus}</td>
            <td>${statusBadge}</td>
            <td>${createdDate}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button type="button" class="btn btn-outline-primary edit-product" data-id="${product.product_id}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button type="button" class="btn btn-outline-danger delete-product" data-id="${product.product_id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        // 添加到商品列表
        productsList.appendChild(row);
        
        // 添加编辑按钮事件
        row.querySelector('.edit-product').addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            editProduct(productId);
        });
        
        // 添加删除按钮事件
        row.querySelector('.delete-product').addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            confirmDeleteProduct(productId);
        });
    });
    
    // 更新商品计数
    const productCount = document.querySelector('.product-count');
    if (productCount) {
        productCount.textContent = `共 ${productsData.length} 个商品`;
    }
}

// 更新分页控件
function updateProductsPagination() {
    const pagination = document.getElementById('productsPagination');
    if (!pagination) {
        console.warn('未找到分页控件元素');
        return;
    }
    
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
    
    try {
        const categorySelect = document.getElementById('productCategory');
        
        // 清空现有选项
        categorySelect.innerHTML = '<option value="">选择分类</option>';
        
        // 添加分类选项
        categoriesData.forEach(category => {
            const option = document.createElement('option');
            option.value = category.category_id;
            option.textContent = category.category_name;
            categorySelect.appendChild(option);
        });
        
        // 如果是编辑模式，加载商品数据
        if (productId) {
            console.log('正在加载商品详情，ID:', productId);
            
            // 从已加载的商品数据中查找
            const product = productsData.find(p => p.product_id.toString() === productId.toString());
            
            if (!product) {
                // 如果在当前页面数据中找不到，则从API获取
                // 获取管理员认证头信息
                const headers = {
                    'Content-Type': 'application/json',
                    ...adminAuth.getHeaders() // 添加认证头信息
                };
                
                const response = await fetch(`${ADMIN_API_BASE_URL}/products/${productId}`, {
                    method: 'GET',
                    headers: headers
                });
                
                if (!response.ok) {
                    throw new Error('获取商品详情失败，HTTP状态码: ' + response.status);
                }
                
                const data = await response.json();
                if (!data) {
                    throw new Error('获取商品详情失败，未返回数据');
                }
                
                // 使用API返回的数据
                fillProductForm(data);
            } else {
                // 使用已加载的数据
                fillProductForm(product);
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

// 填充商品表单
function fillProductForm(product) {
    // 填充表单
    document.getElementById('productId').value = product.product_id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category_id || '';
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productOriginalPrice').value = product.original_price || '';
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productStatus').value = product.status || 'active';
    
    // 显示商品图片
    const imageUrl = `${API_BASE_URL}/image/Goods/Goods_${product.product_id}.png`;
    document.getElementById('productImagePreview').src = imageUrl;
    document.getElementById('productImagePreview').classList.remove('d-none');
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
        status: document.getElementById('productStatus').value,
        specifications: document.getElementById('productSpecifications') ? 
            document.getElementById('productSpecifications').value : '',
        aging_years: document.getElementById('productAgingYears') ? 
            parseInt(document.getElementById('productAgingYears').value || '0') : 0
    };
    
    // 获取图片文件
    const imageFile = document.getElementById('productImage').files[0];
    
    try {
        // 显示加载状态
        const saveBtn = document.getElementById('saveProductBtn');
        const originalText = saveBtn.textContent;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 保存中...';
        saveBtn.disabled = true;
        
        let url, method;
        if (productId) {
            // 更新商品
            url = `${ADMIN_API_BASE_URL}/products/${productId}`;
            method = 'PUT';
        } else {
            // 添加商品
            url = `${ADMIN_API_BASE_URL}/products`;
            method = 'POST';
        }
        
        // 准备表单数据
        const formData = new FormData();
        
        // 添加商品数据
        formData.append('data', JSON.stringify(productData));
        
        // 如果有图片文件，添加到表单数据
        if (imageFile) {
            formData.append('image', imageFile);
        }
        
        // 发送请求
        // 获取管理员认证头信息
        const authHeaders = adminAuth.getHeaders();
        
        const response = await fetch(url, {
            method: method,
            headers: authHeaders, // 添加认证头信息，不需要Content-Type，FormData会自动设置
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`保存商品失败，HTTP状态码: ${response.status}`);
        }
        
        const result = await response.json();
        
        // 显示成功消息
        showSuccessToast(productId ? '商品更新成功' : '商品添加成功');
        
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
    const product = productsData.find(p => p.product_id === productId);
    if (!product) return;
    
    // 显示确认对话框
    if (confirm(`确定要删除商品 "${product.name}"？此操作不可恢复。`)) {
        deleteProduct(productId);
    }
}

// 删除商品
async function deleteProduct(productId) {
    try {
        // 发送删除请求到D1数据库
        // 获取管理员认证头信息
        const headers = {
            'Content-Type': 'application/json',
            ...adminAuth.getHeaders() // 添加认证头信息
        };
        
        const response = await fetch(`${ADMIN_API_BASE_URL}/products/${productId}`, {
            method: 'DELETE',
            headers: headers
        });
        
        if (!response.ok) {
            throw new Error(`删除商品失败，HTTP状态码: ${response.status}`);
        }
        
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