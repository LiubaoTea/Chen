/**
 * 管理后台商品管理模块
 * 处理商品的展示、添加、编辑和删除
 */

// 导入API基础URL配置和adminAuth
import { adminAuth } from './admin-auth.js';
import adminAPI, { API_BASE_URL, ADMIN_API_BASE_URL } from './admin-api.js';

// 确保API配置可用
console.log('admin-products.js中的API配置:', { API_BASE_URL, ADMIN_API_BASE_URL });
console.log('admin-products.js中的adminAPI:', adminAPI);

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
        
        // 使用adminAPI获取分类数据
        const result = await adminAPI.getCategories();
        categoriesData = result.categories || [];
        
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
        console.log('筛选条件 - 页码:', page, '分类ID:', categoryId, '搜索关键词:', searchQuery);
        
        // 确保管理员已登录
        if (!adminAuth.isLoggedIn()) {
            console.error('管理员未登录，无法加载商品数据');
            throw new Error('请先登录');
        }
        
        // 使用adminAPI获取商品数据
        // 确保将categoryId作为参数传递给API，以便后端可以根据分类ID筛选商品
        // 添加参数，确保返回所有商品（包括ID 1-18的商品）
        const result = await adminAPI.getProducts(page, pageSize, categoryId, searchQuery);
        
        // 确保productsData是一个新数组，避免与之前的数据混合
        productsData = result.products || [];
        
        // 记录原始商品数量
        console.log(`API返回的原始商品数量: ${productsData.length}`);
        
        // 正确处理分页信息
        if (result.pagination) {
            // 如果后端返回了pages字段，使用它
            if (result.pagination.pages) {
                totalPages = result.pagination.pages;
            }
            // 否则，如果有total字段，计算总页数
            else if (result.pagination.total) {
                totalPages = Math.ceil(result.pagination.total / pageSize);
            }
            // 如果都没有，默认为1页
            else {
                totalPages = 1;
            }
            console.log('分页信息:', {
                currentPage: page,
                totalPages: totalPages,
                totalItems: result.pagination.total || 'unknown'
            });
            
            // 保存分页信息到productsData，以便在updateProductsPagination中使用
            productsData.pagination = result.pagination;
        } else {
            totalPages = 1;
            // 如果没有分页信息，创建一个默认的
            productsData.pagination = {
                total: productsData.length,
                currentPage: page,
                pages: totalPages
            };
        }
        
        // 如果有商品数据，获取商品分类映射
        if (productsData.length > 0) {
            // 获取所有商品ID - 确保每个ID只出现一次
            const productIds = [...new Set(productsData.map(p => p.product_id))];
            
            try {
                // 获取商品分类映射 - 只需要获取一次，避免重复请求
                const mappings = await adminAPI.getProductCategoryMappings(productIds);
                console.log('获取到的商品分类映射:', mappings);
                
                // 将映射数据添加到商品中
                if (mappings && Array.isArray(mappings)) {
                    // 为每个商品添加分类映射，不会导致商品重复
                    productsData.forEach(product => {
                        // 为每个商品添加分类映射
                        product.category_mappings = mappings.filter(
                            mapping => mapping.product_id === product.product_id
                        );
                        
                        // 确保每个商品都有categories属性，用于兼容旧代码
                        if (!product.categories) {
                            product.categories = [];
                        }
                        
                        // 如果有category_mappings，从中提取分类ID
                        if (product.category_mappings && product.category_mappings.length > 0) {
                            product.categories = product.category_mappings.map(mapping => mapping.category_id);
                        } 
                        // 兼容旧数据结构
                        else if (product.category_id) {
                            product.categories.push(product.category_id);
                        }
                    });
                    
                    // 如果指定了分类ID，在前端进行额外筛选
                    if (categoryId) {
                        console.log(`根据分类ID ${categoryId} 在前端筛选商品数据`);
                        
                        // 筛选商品数组，确保不会有重复
                        productsData = productsData.filter(product => {
                            // 检查商品的category_mappings是否包含所选分类
                            if (product.category_mappings && product.category_mappings.length > 0) {
                                return product.category_mappings.some(mapping => mapping.category_id == categoryId);
                            }
                            // 兼容旧数据结构，检查categories数组
                            else if (product.categories && product.categories.length > 0) {
                                return product.categories.includes(parseInt(categoryId)) || product.categories.includes(categoryId);
                            }
                            // 最后检查单一category_id字段
                            else if (product.category_id) {
                                return product.category_id == categoryId;
                            }
                            return false;
                        });
                        
                        console.log(`筛选后的商品数量: ${productsData.length}`);
                    }
                }
            } catch (mappingError) {
                console.warn('获取商品分类映射失败:', mappingError);
                // 继续处理，不中断主流程
                
                // 处理每个商品
                productsData.forEach(product => {
                    // 确保每个商品都有categories属性，用于兼容旧代码
                    if (!product.categories) {
                        product.categories = [];
                        
                        // 如果有category_mappings，从中提取分类ID
                        if (product.category_mappings && product.category_mappings.length > 0) {
                            product.categories = product.category_mappings.map(mapping => mapping.category_id);
                        } 
                        // 兼容旧数据结构
                        else if (product.category_id) {
                            product.categories.push(product.category_id);
                        }
                    }
                });
                
                console.log(`错误处理后的商品数量: ${productsData.length}`);
                
                // 如果指定了分类ID，在前端进行额外筛选
                if (categoryId && productsData.length > 0) {
                    console.log(`根据分类ID ${categoryId} 在前端筛选商品数据`);
                    
                    // 筛选商品数组
                    productsData = productsData.filter(product => {
                        // 检查商品的category_mappings是否包含所选分类
                        if (product.category_mappings && product.category_mappings.length > 0) {
                            return product.category_mappings.some(mapping => mapping.category_id == categoryId);
                        }
                        // 兼容旧数据结构，检查categories数组
                        else if (product.categories && product.categories.length > 0) {
                            return product.categories.includes(parseInt(categoryId)) || product.categories.includes(categoryId);
                        }
                        // 最后检查单一category_id字段
                        else if (product.category_id) {
                            return product.category_id == categoryId;
                        }
                        return false;
                    });
                    
                    console.log(`筛选后的商品数量: ${productsData.length}`);
                }
            }
        }
        
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
    
    console.log(`准备显示商品数量: ${productsData.length}`);
    
    // 确保商品数据不重复，使用Map按商品ID去重
    // 这一步很重要，因为API可能返回重复的商品数据
    const uniqueProductsMap = new Map();
    productsData.forEach(product => {
        if (!uniqueProductsMap.has(product.product_id)) {
            uniqueProductsMap.set(product.product_id, product);
        }
    });
    
    // 使用去重后的商品数据
    const uniqueProducts = Array.from(uniqueProductsMap.values());
    console.log(`去重后显示商品数量: ${uniqueProducts.length}`);
    
    // 使用去重后的商品数据创建表格行
    uniqueProducts.forEach(product => {
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
        let categoryNames = [];
        
        // 确保categoriesData已加载
        if (!categoriesData || categoriesData.length === 0) {
            console.warn('分类数据未加载，无法显示商品分类名称');
        } else {
            // 优先使用新的数据结构：通过category_mappings获取分类信息
            if (product.category_mappings && product.category_mappings.length > 0) {
                // 获取所有分类名称
                categoryNames = product.category_mappings.map(mapping => {
                    const category = categoriesData.find(c => c.category_id == mapping.category_id);
                    return category ? category.category_name : '未知分类';
                }).filter(name => name !== '未知分类');
            } 
            // 兼容旧数据结构：通过categories数组获取分类信息
            else if (product.categories && product.categories.length > 0) {
                // 获取所有分类名称
                categoryNames = product.categories.map(categoryId => {
                    const category = categoriesData.find(c => c.category_id == categoryId);
                    return category ? category.category_name : '未知分类';
                }).filter(name => name !== '未知分类');
            }
            // 最后尝试使用category_id字段
            else if (product.category_id) {
                const category = categoriesData.find(c => c.category_id == product.category_id);
                if (category) {
                    categoryNames.push(category.category_name);
                }
            }
            
            // 如果找到了分类名称，则使用它们
            if (categoryNames.length > 0) {
                categoryName = categoryNames.join(', ');
            } else {
                // 如果仍然没有找到分类名称，记录日志以便调试
                console.log('未找到商品分类信息:', {
                    productId: product.product_id,
                    categoryMappings: product.category_mappings,
                    categories: product.categories,
                    categoryId: product.category_id
                });
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
            console.log('点击编辑按钮，商品ID:', productId);
            editProduct(productId);
        });
        
        // 添加删除按钮事件
        row.querySelector('.delete-product').addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            console.log('点击删除按钮，商品ID:', productId);
            confirmDeleteProduct(productId);
        });
    });
    
    // 商品计数已在updateProductsPagination函数中更新，此处不再重复
}

// 更新分页控件
function updateProductsPagination() {
    const pagination = document.getElementById('productsPagination');
    if (!pagination) {
        console.warn('未找到分页控件元素');
        return;
    }
    
    pagination.innerHTML = '';
    
    // 更新商品总数显示
    const productCount = document.querySelector('.product-count');
    if (productCount) {
        // 使用API返回的总商品数，而不是当前页面的商品数
        // 如果没有totalItems，则使用当前页面的商品数量
        const totalItems = (productsData.pagination && productsData.pagination.total) || productsData.length;
        productCount.textContent = `共 ${totalItems} 个商品，当前显示第 ${currentPage} 页，共 ${totalPages} 页`;
    }
    
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
    
    // 添加总页数信息
    const infoLi = document.createElement('li');
    infoLi.className = 'page-item disabled ms-2';
    infoLi.innerHTML = `<span class="page-link">共 ${totalPages} 页</span>`;
    pagination.appendChild(infoLi);
    
    // 添加分页事件监听器
    document.querySelectorAll('#productsPagination .page-link').forEach(link => {
        if (!link.hasAttribute('data-page')) return; // 跳过信息项
        
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
    // 分类筛选器
    document.getElementById('productCategoryFilter').addEventListener('change', (e) => {
        const categoryId = e.target.value;
        console.log('分类筛选变更，选择的分类ID:', categoryId);
        loadProducts(1, categoryId, document.getElementById('productSearchInput').value.trim());
    });
    
    // 搜索表单
    document.getElementById('productSearchForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const searchQuery = document.getElementById('productSearchInput').value.trim();
        const categoryId = document.getElementById('productCategoryFilter').value;
        console.log('搜索提交，关键词:', searchQuery, '分类ID:', categoryId);
        loadProducts(1, categoryId, searchQuery);
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
            const productId = e.currentTarget.getAttribute('data-id');
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
    document.getElementById('selectedCategories').value = '';
    
    // 设置模态框标题
    const modalTitle = document.getElementById('productModalLabel');
    modalTitle.textContent = productId ? '编辑商品' : '添加商品';
    
    try {
        const categoryList = document.getElementById('productCategory');
        
        // 清空现有选项
        categoryList.innerHTML = '';
        
        // 添加分类选项，每个选项前有复选框
        categoriesData.forEach(category => {
            const li = document.createElement('li');
            li.className = 'dropdown-item';
            
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'form-check';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'form-check-input';
            checkbox.id = `category-${category.category_id}`;
            checkbox.value = category.category_id;
            checkbox.addEventListener('change', function() {
                updateCategoryDropdownText();
                updateSelectedCategories();
            });
            
            const label = document.createElement('label');
            label.className = 'form-check-label';
            label.htmlFor = `category-${category.category_id}`;
            label.textContent = category.category_name;
            
            checkboxDiv.appendChild(checkbox);
            checkboxDiv.appendChild(label);
            li.appendChild(checkboxDiv);
            categoryList.appendChild(li);
        });
        
        // 初始化下拉按钮文本
        document.getElementById('productCategoryDropdown').textContent = '选择分类';
        
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
                
                const response = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
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
    
    // 清除所有已选分类
    document.querySelectorAll('#productCategory .form-check-input').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // 处理分类 - 优先使用新的分类关系结构
    // 获取所有分类ID
    let categoryIds = [];
    
    // 优先使用新的数据结构：通过category_mappings获取分类信息
    if (product.category_mappings && product.category_mappings.length > 0) {
        categoryIds = product.category_mappings.map(mapping => mapping.category_id.toString());
    }
    // 其次使用categories数组
    else if (product.categories && product.categories.length > 0) {
        categoryIds = product.categories.map(id => id.toString());
    }
    // 最后尝试使用category_id字段
    else if (product.category_id) {
        categoryIds = [product.category_id.toString()];
    }
    
    // 选中对应的复选框
    categoryIds.forEach(id => {
        const checkbox = document.querySelector(`#productCategory .form-check-input[value="${id}"]`);
        if (checkbox) {
            checkbox.checked = true;
        }
    });
    
    // 更新下拉按钮文本
    updateCategoryDropdownText();
    
    // 更新隐藏字段的值
    document.getElementById('selectedCategories').value = categoryIds.join(',');
    
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productOriginalPrice').value = product.original_price || '';
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productStatus').value = product.status || 'active';
    
    // 填充规格和陈化年份（如果有这些字段）
    if (document.getElementById('productSpecifications')) {
        document.getElementById('productSpecifications').value = product.specifications || '';
    }
    if (document.getElementById('productAgingYears')) {
        document.getElementById('productAgingYears').value = product.aging_years || 0;
    }
    
    // 显示商品图片
    const imageUrl = `${API_BASE_URL}/image/Goods/Goods_${product.product_id}.png`;
    document.getElementById('productImagePreview').src = imageUrl;
    document.getElementById('productImagePreview').classList.remove('d-none');

}

// 更新分类下拉按钮文本
function updateCategoryDropdownText() {
    const checkedCategories = document.querySelectorAll('#productCategory .form-check-input:checked');
    const dropdownButton = document.getElementById('productCategoryDropdown');
    
    if (checkedCategories.length === 0) {
        dropdownButton.textContent = '选择分类';
    } else if (checkedCategories.length === 1) {
        const categoryName = checkedCategories[0].nextElementSibling.textContent;
        dropdownButton.textContent = categoryName;
    } else {
        dropdownButton.textContent = `已选择 ${checkedCategories.length} 个分类`;
    }
}

// 更新隐藏字段中的已选分类
function updateSelectedCategories() {
    const checkedCategories = document.querySelectorAll('#productCategory .form-check-input:checked');
    const selectedCategoryIds = Array.from(checkedCategories).map(checkbox => checkbox.value);
    document.getElementById('selectedCategories').value = selectedCategoryIds.join(',');
    
    // 如果至少选择了一个分类，移除验证错误
    if (selectedCategoryIds.length > 0) {
        document.getElementById('selectedCategories').setCustomValidity('');
    } else {
        document.getElementById('selectedCategories').setCustomValidity('请选择至少一个分类');
    }
}

// 保存商品（添加或更新）
async function saveProduct() {
    // 确保至少选择了一个分类
    updateSelectedCategories();
    
    // 验证表单
    const form = document.getElementById('productForm');
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }
    
    // 获取表单数据
    const productId = document.getElementById('productId').value;
    const selectedCategoriesValue = document.getElementById('selectedCategories').value;
    const categoryIds = selectedCategoriesValue ? selectedCategoriesValue.split(',') : [];
    
    // 构建分类映射数组
    const categoryMappings = categoryIds.map(id => ({ category_id: parseInt(id) }));
    
    const productData = {
        name: document.getElementById('productName').value,
        // 使用category_mappings数组存储多个分类
        category_mappings: categoryMappings,
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
        // 保存原始文本，避免引用错误
        if (!saveBtn.hasAttribute('data-original-text')) {
            saveBtn.setAttribute('data-original-text', saveBtn.textContent);
        }
        const originalText = saveBtn.getAttribute('data-original-text') || '保存';
        // 保存为全局变量，避免在finally中引用错误
        window.originalBtnText = originalText;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 保存中...';
        saveBtn.disabled = true;
        
        let url, method;
        if (productId) {
            // 更新商品
            url = `${ADMIN_API_BASE_URL}/api/admin/products/${productId}`;
            method = 'PUT';
        } else {
            // 添加商品
            url = `${ADMIN_API_BASE_URL}/api/admin/products`;
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
        saveBtn.textContent = window.originalBtnText || '保存';
        saveBtn.disabled = false;
    }
}

// 编辑商品
function editProduct(productId) {
    showProductModal(productId);
}

// 确认删除商品
function confirmDeleteProduct(productId) {
    console.log('确认删除商品，ID:', productId);
    
    // 查找商品信息
    const product = productsData.find(p => p.product_id == productId);
    if (!product) {
        console.error('未找到要删除的商品，ID:', productId);
        return;
    }
    
    console.log('找到要删除的商品:', product);
    
    // 显示确认对话框
    if (confirm(`确定要删除商品 "${product.name}"？此操作不可恢复。`)) {
        deleteProduct(productId);
    }
}

// 删除商品
async function deleteProduct(productId) {
    try {
        console.log('开始删除商品，ID:', productId);
        
        // 发送删除请求到D1数据库
        // 获取管理员认证头信息
        const headers = {
            'Content-Type': 'application/json',
            ...adminAuth.getHeaders() // 添加认证头信息
        };
        
        console.log('发送删除请求，URL:', `${ADMIN_API_BASE_URL}/api/admin/products/${productId}`);
        
        const response = await fetch(`${ADMIN_API_BASE_URL}/api/admin/products/${productId}`, {
            method: 'DELETE',
            headers: headers
        });
        
        console.log('删除请求响应状态:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('删除商品API响应错误:', response.status, errorText);
            throw new Error(`删除商品失败，HTTP状态码: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('删除商品成功，响应数据:', result);
        
        showSuccessToast('商品删除成功');
        
        // 重新加载商品列表
        await loadProducts(currentPage, selectedCategoryId, document.getElementById('productSearchInput').value);
    } catch (error) {
        console.error('删除商品失败:', error);
        showErrorToast('删除商品失败: ' + error.message);
    }
}

// 刷新分类数据
async function refreshCategories() {
    try {
        // 重新加载分类数据
        await loadCategories();
        console.log('商品分类数据已刷新');
        
        // 如果当前有商品数据，更新商品列表以反映新的分类信息
        if (productsData && productsData.length > 0) {
            updateProductsList();
        }
    } catch (error) {
        console.error('刷新分类数据失败:', error);
    }
}

// 设置全局对象，供admin-main.js调用
window.adminProducts = { 
    init: initProductsPage,
    refreshCategories: refreshCategories
};