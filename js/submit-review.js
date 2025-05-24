/**
 * 商品评价提交模块
 * 处理用户对已购买商品的评价提交
 */

// 导入必要的模块
import { isAuthenticated, redirectToLogin, getUserInfo } from './auth.js';
import { getOrderDetail } from './api.js';
import { addProductReview } from './api-extended.js';

// 确保用户已登录
if (!isAuthenticated()) {
    redirectToLogin();
}

// 获取URL参数
const urlParams = new URLSearchParams(window.location.search);
const orderId = urlParams.get('order_id');
const productId = urlParams.get('product_id');
const orderItemId = urlParams.get('order_item_id'); // 获取订单项ID
const returnUrl = urlParams.get('return_url') || 'user-center.html';

// 如果缺少必要参数，返回用户中心
if (!orderId || !productId) {
    window.location.href = returnUrl;
}

// DOM元素
const orderNumberElement = document.getElementById('orderNumber');
const orderDateElement = document.getElementById('orderDate');
const productImageElement = document.getElementById('productImage');
const productNameElement = document.getElementById('productName');
const productPriceElement = document.getElementById('productPrice');
const productSpecsElement = document.getElementById('productSpecs');
const reviewForm = document.getElementById('reviewForm');
const cancelBtn = document.getElementById('cancelBtn');
const imageUpload = document.getElementById('imageUpload');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');

// 存储上传的图片
let uploadedImages = [];

// 初始化页面
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 加载订单和商品信息
        await loadOrderAndProductInfo(orderId, productId, orderItemId);
        
        // 设置事件监听器
        setupEventListeners();
    } catch (error) {
        console.error('初始化评价页面失败:', error);
        showErrorToast('加载数据失败，请稍后重试');
    }
});

/**
 * 加载订单和商品信息
 */
async function loadOrderAndProductInfo(orderId, productId, orderItemId) {
    try {
        // 显示加载状态
        orderNumberElement.textContent = '加载中...';
        orderDateElement.textContent = '加载中...';
        productNameElement.textContent = '加载中...';
        productPriceElement.textContent = '0.00';
        productSpecsElement.textContent = '规格: 加载中...';
        
        console.log('开始加载订单信息:', orderId, '商品ID:', productId, '订单项ID:', orderItemId);
        
        // 获取订单详情
        const orderData = await getOrderDetail(orderId);
        
        if (!orderData) {
            throw new Error('获取订单信息失败');
        }
        
        // 显示订单基本信息
        orderNumberElement.textContent = orderData.order_id || orderId;
        
        // 格式化日期
        const orderDate = orderData.created_at 
            ? new Date(orderData.created_at * 1000).toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            })
            : '未知';
        orderDateElement.textContent = orderDate;
        
        let orderItem;
        
        // 确保orderData.items存在且是数组
        if (!orderData.items || !Array.isArray(orderData.items)) {
            orderData.items = [];
        }
        
        console.log('订单中的商品列表:', orderData.items);
        
        // 如果提供了orderItemId，优先使用它查找
        if (orderItemId) {
            orderItem = orderData.items.find(item => item.id === orderItemId || item.item_id === orderItemId);
            console.log('通过orderItemId查找结果:', orderItem);
        }
        
        // 如果通过orderItemId没找到，尝试通过productId查找
        if (!orderItem) {
            // 在订单项中查找匹配的商品
            orderItem = orderData.items.find(item => {
                return item.product_id == productId || item.product_id == parseInt(productId);
            });
            console.log('通过productId查找结果:', orderItem);
        }
        
        if (!orderItem) {
            console.error('未找到匹配的商品，订单项:', orderData.items, '查找的商品ID:', productId);
            throw new Error('未找到匹配的商品信息');
        }
        
        // 使用找到的商品ID
        const correctProductId = orderItem.product_id;
        
        // 显示商品信息
        productNameElement.textContent = orderItem.name || '未知商品';
        
        // 设置商品图片
        if (orderItem.image_url) {
            productImageElement.src = orderItem.image_url;
            productImageElement.alt = orderItem.name || '商品图片';
        } else {
            // 使用默认图片
            productImageElement.src = './image/placeholder.png';
            productImageElement.alt = '商品图片';
        }
        
        // 设置价格
        let price = '0.00';
        if (orderItem && orderItem.unit_price) {
            price = parseFloat(orderItem.unit_price).toFixed(2);
        } else if (orderItem && orderItem.price) {
            price = parseFloat(orderItem.price).toFixed(2);
        }
        productPriceElement.textContent = price;
        
        // 设置规格信息
        let specText = '无规格信息';
        
        console.log('订单项数据:', orderItem);
        
        // 尝试解析规格信息
        if (orderItem && orderItem.variant) {
            specText = orderItem.variant;
            
        } else if (orderItem && orderItem.specifications) {
            console.log('订单项规格原始数据:', orderItem.specifications, '类型:', typeof orderItem.specifications);
            
            try {
                if (typeof orderItem.specifications === 'string') {
                    try {
                        const parsedSpecs = JSON.parse(orderItem.specifications);
                        specText = Object.entries(parsedSpecs)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(', ');
                    } catch (e) {
                        // 如果解析失败，直接使用字符串
                        specText = orderItem.specifications;
                    }
                } else if (typeof orderItem.specifications === 'object' && orderItem.specifications !== null) {
                    // 已经是对象，直接使用
                    specText = Object.entries(orderItem.specifications)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(', ');
                } else {
                    // 其他情况，转为字符串
                    specText = String(orderItem.specifications);
                }
            } catch (e) {
                specText = String(orderItem.specifications);
            }
        }
        
        productSpecsElement.textContent = `规格: ${specText}`;
        
    } catch (error) {
        console.error('加载订单和商品信息失败:', error);
        showErrorToast('加载订单和商品信息失败: ' + error.message);
        throw error;
    }
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
    // 取消按钮
    cancelBtn.addEventListener('click', () => {
        window.location.href = returnUrl;
    });
    
    // 图片上传
    imageUpload.addEventListener('change', handleImageUpload);
    
    // 表单提交
    reviewForm.addEventListener('submit', handleFormSubmit);
}

/**
 * 处理图片上传
 */
function handleImageUpload(event) {
    const files = event.target.files;
    
    if (!files || files.length === 0) return;
    
    // 检查上传数量限制
    if (uploadedImages.length + files.length > 5) {
        showErrorToast('最多只能上传5张图片');
        return;
    }
    
    // 处理每个文件
    Array.from(files).forEach(file => {
        // 检查文件大小
        if (file.size > 5 * 1024 * 1024) { // 5MB
            showErrorToast(`图片 ${file.name} 超过5MB限制`);
            return;
        }
        
        // 检查文件类型
        if (!file.type.startsWith('image/')) {
            showErrorToast(`${file.name} 不是有效的图片文件`);
            return;
        }
        
        // 创建预览
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewId = `preview-${Date.now()}`;
            
            // 创建预览元素
            const previewElement = document.createElement('div');
            previewElement.className = 'image-preview';
            previewElement.id = previewId;
            previewElement.innerHTML = `
                <img src="${e.target.result}" alt="预览图片">
                <button type="button" class="remove-image" data-id="${previewId}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            // 添加到预览容器
            imagePreviewContainer.appendChild(previewElement);
            
            // 存储图片数据
            uploadedImages.push({
                id: previewId,
                file: file,
                dataUrl: e.target.result
            });
            
            // 添加删除按钮事件
            previewElement.querySelector('.remove-image').addEventListener('click', function() {
                removeImage(previewId);
            });
        };
        
        reader.readAsDataURL(file);
    });
    
    // 重置文件输入，允许重复选择相同文件
    event.target.value = '';
}

/**
 * 移除上传的图片
 */
function removeImage(previewId) {
    // 从DOM中移除预览
    const previewElement = document.getElementById(previewId);
    if (previewElement) {
        previewElement.remove();
    }
    
    // 从存储中移除
    uploadedImages = uploadedImages.filter(img => img.id !== previewId);
}

/**
 * 处理表单提交
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    
    try {
        // 禁用提交按钮，防止重复提交
        const submitBtn = document.getElementById('submitReviewBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = '提交中...';
        
        // 获取表单数据
        const rating = document.querySelector('input[name="rating"]:checked').value;
        const reviewContent = document.getElementById('reviewContent').value.trim();
        
        // 验证表单
        if (!rating) {
            showErrorToast('请选择评分');
            return;
        }
        
        if (!reviewContent) {
            showErrorToast('请填写评价内容');
            return;
        }
        
        console.log('开始处理评价提交，商品ID:', productId, '订单ID:', orderId);
        
        // 上传图片（如果有）
        let imageUrls = [];
        
        if (uploadedImages.length > 0) {
            showInfoToast('正在上传图片...');
            
            // 上传每张图片
            for (const image of uploadedImages) {
                try {
                    const formData = new FormData();
                    formData.append('image', image.file);
                    formData.append('folder', 'Product-Reviews');
                    
                    // 获取认证令牌
                    const token = localStorage.getItem('token');
                    
                    // 调用上传API
                    const response = await fetch('https://liubaotea.liubaotea.online/api/upload-image', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        },
                        body: formData
                    });
                    
                    console.log('图片上传API响应状态:', response.status);
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`图片上传失败: ${errorText}`);
                    }
                    
                    const result = await response.json();
                    
                    if (result.url) {
                        imageUrls.push(result.url);
                    }
                } catch (error) {
                    console.error('上传图片失败:', error);
                    showErrorToast(`上传图片失败: ${error.message}`);
                }
            }
        }
        
        // 提交评价
        showInfoToast('正在提交评价...');
        
        // 调用API提交评价（修正API路径）
        const reviewData = {
            product_id: parseInt(productId),
            order_id: orderId,
            rating: parseInt(rating),
            review_content: reviewContent,
            images: imageUrls
        };
        
        // 发送评价请求
        const response = await addProductReview(reviewData);
        console.log('评价提交API响应状态:', response.status);
        
        // 处理响应
        let result;
        try {
            if (typeof response === 'object') {
                result = response;
            } else {
                result = { success: true, message: '评价提交成功' };
            }
        } catch (error) {
            console.error('解析响应失败:', error);
            result = { success: true, message: '评价提交成功' };
        }
        
        console.log('评价提交成功:', result);
        
        // 显示成功消息
        showSuccessToast('评价提交成功！');
        
        // 延迟后返回
        setTimeout(() => {
            window.location.href = returnUrl;
        }, 2000);
        
    } catch (error) {
        console.error('评价提交请求失败:', error);
        showErrorToast(`评价提交失败: ${error.message}`);
        
        // 重新启用提交按钮
        const submitBtn = document.getElementById('submitReviewBtn');
        submitBtn.disabled = false;
        submitBtn.textContent = '提交评价';
    }
}

/**
 * 显示成功提示
 */
function showSuccessToast(message) {
    showToast(message, 'success');
}

/**
 * 显示错误提示
 */
function showErrorToast(message) {
    showToast(message, 'error');
    
    // 重新启用提交按钮
    const submitBtn = document.getElementById('submitReviewBtn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '提交评价';
    }
}

/**
 * 显示信息提示
 */
function showInfoToast(message) {
    showToast(message, 'info');
}

/**
 * 显示提示消息
 */
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // 显示动画
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // 自动关闭
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}