/**
 * 管理后台分类管理模块
 * 处理分类的展示、添加、编辑和删除
 */

// 导入adminAuth模块
import { adminAuth } from './admin-auth.js';
import { API_BASE_URL } from '../config.js';

// 分类列表数据
let categoriesData = [];
let categoriesCurrentPage = 1;
let categoriesTotalPages = 1;
let categoriesPageSize = 10;

// 导出为全局变量，供其他模块使用
window.initCategoriesPage = initCategoriesPage;

// 初始化分类管理页面
async function initCategoriesPage() {
    // 检查是否已登录
    if (!adminAuth.check()) return;
    
    try {
        // 加载分类列表
        await loadCategories(1);
        
        // 设置事件监听器
        setupCategoriesEventListeners();
    } catch (error) {
        console.error('初始化分类管理页面失败:', error);
        showErrorToast('初始化分类管理页面失败，请稍后重试');
    }
}

// 加载分类列表
async function loadCategories(page, searchQuery = '') {
    try {
        currentPage = page;
        
        // 显示加载状态
        const categoriesList = document.getElementById('categoriesList');
        categoriesList.innerHTML = '<tr><td colspan="6" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">加载中...</span></div></td></tr>';
        
        // 获取分类数据
        const result = await adminAPI.getCategories(page, pageSize, searchQuery);
        categoriesData = result.categories;
        totalPages = result.totalPages;
        
        // 更新分类列表
        updateCategoriesList();
        
        // 更新分页控件
        updateCategoriesPagination();
    } catch (error) {
        console.error('加载分类列表失败:', error);
        const categoriesList = document.getElementById('categoriesList');
        categoriesList.innerHTML = '<tr><td colspan="6" class="text-center text-danger">加载分类列表失败，请稍后重试</td></tr>';
    }
}

// 更新分类列表
function updateCategoriesList() {
    const categoriesList = document.getElementById('categoriesList');
    categoriesList.innerHTML = '';
    
    if (categoriesData.length === 0) {
        categoriesList.innerHTML = '<tr><td colspan="6" class="text-center">暂无分类数据</td></tr>';
        return;
    }
    
    categoriesData.forEach(category => {
        const row = document.createElement('tr');
        
        // 格式化日期
        const createdDate = new Date(category.created_at * 1000).toLocaleDateString('zh-CN');
        
        row.innerHTML = `
            <td>${category.id}</td>
            <td>
                <div class="d-flex align-items-center">
                    ${category.icon ? `<img src="${category.icon}" class="product-thumbnail me-2" alt="${category.name}">` : ''}
                    <div>${category.name}</div>
                </div>
            </td>
            <td>${category.product_count || 0}</td>
            <td>${category.sort_order || 0}</td>
            <td>${createdDate}</td>
            <td>
                <div class="action-buttons">
                    <button type="button" class="btn btn-sm btn-outline-primary edit-category" data-category-id="${category.id}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-danger delete-category" data-category-id="${category.id}" data-category-name="${category.name}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        categoriesList.appendChild(row);
    });
    
    // 添加编辑按钮事件
    document.querySelectorAll('.edit-category').forEach(button => {
        button.addEventListener('click', handleEditCategory);
    });
    
    // 添加删除按钮事件
    document.querySelectorAll('.delete-category').forEach(button => {
        button.addEventListener('click', handleDeleteCategory);
    });
}

// 更新分页控件
function updateCategoriesPagination() {
    const pagination = document.getElementById('categoriesPagination');
    pagination.innerHTML = '';
    
    if (totalPages <= 1) {
        return;
    }
    
    // 上一页按钮
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" aria-label="上一页"><i class="bi bi-chevron-left"></i></a>`;
    pagination.appendChild(prevLi);
    
    if (currentPage > 1) {
        prevLi.addEventListener('click', (e) => {
            e.preventDefault();
            loadCategories(currentPage - 1);
        });
    }
    
    // 页码按钮
    const maxPages = 5; // 最多显示的页码数
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);
    
    if (endPage - startPage + 1 < maxPages) {
        startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
        pageLi.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        pagination.appendChild(pageLi);
        
        if (i !== currentPage) {
            pageLi.addEventListener('click', (e) => {
                e.preventDefault();
                loadCategories(i);
            });
        }
    }
    
    // 下一页按钮
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" aria-label="下一页"><i class="bi bi-chevron-right"></i></a>`;
    pagination.appendChild(nextLi);
    
    if (currentPage < totalPages) {
        nextLi.addEventListener('click', (e) => {
            e.preventDefault();
            loadCategories(currentPage + 1);
        });
    }
}

// 设置事件监听器
function setupCategoriesEventListeners() {
    // 添加分类按钮
    document.getElementById('addCategoryBtn').addEventListener('click', () => {
        // 重置表单
        document.getElementById('categoryForm').reset();
        document.getElementById('categoryId').value = '';
        document.getElementById('categoryIconPreviewContainer').style.display = 'none';
        
        // 更新模态框标题
        document.getElementById('categoryModalLabel').textContent = '添加分类';
        
        // 显示模态框
        const categoryModal = new bootstrap.Modal(document.getElementById('categoryModal'));
        categoryModal.show();
    });
    
    // 保存分类按钮
    document.getElementById('saveCategoryBtn').addEventListener('click', handleSaveCategory);
    
    // 确认删除分类按钮
    document.getElementById('confirmDeleteCategoryBtn').addEventListener('click', confirmDeleteCategory);
    
    // 分类搜索表单
    document.getElementById('categorySearchForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const searchQuery = document.getElementById('categorySearchInput').value.trim();
        loadCategories(1, searchQuery);
    });
    
    // 分类图标上传预览
    document.getElementById('categoryIcon').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('categoryIconPreview').src = e.target.result;
                document.getElementById('categoryIconPreviewContainer').style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            document.getElementById('categoryIconPreviewContainer').style.display = 'none';
        }
    });
}

// 处理编辑分类
async function handleEditCategory(e) {
    const categoryId = e.currentTarget.getAttribute('data-category-id');
    
    try {
        // 显示加载状态
        e.currentTarget.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
        e.currentTarget.disabled = true;
        
        // 获取分类详情
        const category = await adminAPI.getCategoryById(categoryId);
        
        // 填充表单
        document.getElementById('categoryId').value = category.id;
        document.getElementById('categoryName').value = category.name;
        document.getElementById('categoryDescription').value = category.description || '';
        document.getElementById('categorySort').value = category.sort_order || 0;
        
        // 显示图标预览
        if (category.icon) {
            document.getElementById('categoryIconPreview').src = category.icon;
            document.getElementById('categoryIconPreviewContainer').style.display = 'block';
        } else {
            document.getElementById('categoryIconPreviewContainer').style.display = 'none';
        }
        
        // 更新模态框标题
        document.getElementById('categoryModalLabel').textContent = '编辑分类';
        
        // 显示模态框
        const categoryModal = new bootstrap.Modal(document.getElementById('categoryModal'));
        categoryModal.show();
    } catch (error) {
        console.error('获取分类详情失败:', error);
        showErrorToast('获取分类详情失败，请稍后重试');
    } finally {
        // 恢复按钮状态
        e.currentTarget.innerHTML = '<i class="bi bi-pencil"></i>';
        e.currentTarget.disabled = false;
    }
}

// 处理删除分类
function handleDeleteCategory(e) {
    const categoryId = e.currentTarget.getAttribute('data-category-id');
    const categoryName = e.currentTarget.getAttribute('data-category-name');
    
    // 设置删除确认信息
    document.getElementById('deleteCategoryName').textContent = categoryName;
    
    // 设置确认按钮的数据
    document.getElementById('confirmDeleteCategoryBtn').setAttribute('data-category-id', categoryId);
    
    // 显示确认模态框
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteCategoryModal'));
    deleteModal.show();
}

// 确认删除分类
async function confirmDeleteCategory(e) {
    const categoryId = e.currentTarget.getAttribute('data-category-id');
    
    try {
        // 显示加载状态
        e.currentTarget.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 处理中...';
        e.currentTarget.disabled = true;
        
        // 调用API删除分类
        await adminAPI.deleteCategory(categoryId);
        
        // 关闭模态框
        const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteCategoryModal'));
        deleteModal.hide();
        
        // 重新加载分类列表
        await loadCategories(currentPage);
        
        // 显示成功提示
        showSuccessToast('分类删除成功');
    } catch (error) {
        console.error('删除分类失败:', error);
        showErrorToast('删除分类失败: ' + (error.message || '请稍后重试'));
    } finally {
        // 恢复按钮状态
        e.currentTarget.innerHTML = '确认删除';
        e.currentTarget.disabled = false;
    }
}

// 处理保存分类
async function handleSaveCategory() {
    // 表单验证
    const form = document.getElementById('categoryForm');
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }
    
    const saveBtn = document.getElementById('saveCategoryBtn');
    const categoryId = document.getElementById('categoryId').value;
    const isEdit = categoryId !== '';
    
    try {
        // 显示加载状态
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 保存中...';
        saveBtn.disabled = true;
        
        // 准备分类数据
        const categoryData = {
            name: document.getElementById('categoryName').value,
            description: document.getElementById('categoryDescription').value,
            sort_order: parseInt(document.getElementById('categorySort').value) || 0
        };
        
        // 处理图标上传
        const iconFile = document.getElementById('categoryIcon').files[0];
        if (iconFile) {
            // 这里应该调用上传图片的API，获取图片URL
            // 示例代码，实际实现可能不同
            const iconUrl = await adminAPI.uploadImage(iconFile, 'category');
            categoryData.icon = iconUrl;
        }
        
        // 保存分类
        if (isEdit) {
            await adminAPI.updateCategory(categoryId, categoryData);
        } else {
            await adminAPI.createCategory(categoryData);
        }
        
        // 关闭模态框
        const categoryModal = bootstrap.Modal.getInstance(document.getElementById('categoryModal'));
        categoryModal.hide();
        
        // 重新加载分类列表
        await loadCategories(currentPage);
        
        // 显示成功提示
        showSuccessToast(`分类${isEdit ? '更新' : '创建'}成功`);
    } catch (error) {
        console.error(`${isEdit ? '更新' : '创建'}分类失败:`, error);
        showErrorToast(`${isEdit ? '更新' : '创建'}分类失败: ` + (error.message || '请稍后重试'));
    } finally {
        // 恢复按钮状态
        saveBtn.innerHTML = '保存';
        saveBtn.disabled = false;
        form.classList.remove('was-validated');
    }
}

// 显示成功提示
function showSuccessToast(message) {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    const toastId = 'toast-' + Date.now();
    
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-check-circle me-2"></i>${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="关闭"></button>
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    toast.show();
    
    // 自动移除
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

// 显示错误提示
function showErrorToast(message) {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    const toastId = 'toast-' + Date.now();
    
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white bg-danger border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-exclamation-circle me-2"></i>${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="关闭"></button>
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
    toast.show();
    
    // 自动移除
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

// 创建Toast容器
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    container.style.zIndex = '1050';
    document.body.appendChild(container);
    return container;
}