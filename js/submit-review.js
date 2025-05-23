/**
 * 商品评价提交模块
 * 处理用户对已购买商品的评价提交
 */

// 导入API函数
import { API_BASE_URL } from './config.js';
import { addProductReview } from './api-extended.js';
import { showSuccessToast, showErrorToast } from './utils.js';

// 全局变量
let uploadedImages = [];
const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 从URL获取订单和商品信息
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order_id');
    const productId = urlParams.get('product_id');
    
    if (!orderId || !productId) {
        showErrorMessage('缺少必要的订单或商品信息');
        setTimeout(() => {
            window.location.href = 'user-orders.html';
        }, 2000);
        return;
    }
    
    // 设置隐藏字段的值
    document.getElementById('orderId').value = orderId;
    document.getElementById('productId').value = productId;
    
    // 加载订单和商品信息
    loadOrderAndProductInfo(orderId, productId);
    
    // 设置事件监听器
    setupEventListeners();
});

// 加载订单和商品信息
async function loadOrderAndProductInfo(orderId, productId) {
    try {
        // 获取用户令牌
        const token = localStorage.getItem('userToken');
        if (!token) {
            showErrorMessage('请先登录');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }
        
        // 获取订单信息
        const orderResponse = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!orderResponse.ok) {
            throw new Error('获取订单信息失败');
        }
        
        const orderData = await orderResponse.json();
        
        // 显示订单信息
        document.getElementById('orderNumber').textContent = orderData.order_number || orderId;
        document.getElementById('orderDate').textContent = new Date(orderData.created_at * 1000).toLocaleString('zh-CN');
        
        // 查找当前要评价的商品
        const orderItem = orderData.items.find(item => item.product_id === productId);
        
        if (!orderItem) {
            throw new Error('未找到相关商品信息');
        }
        
        // 获取商品详细信息
        const productResponse = await fetch(`${API_BASE_URL}/api/products/${productId}`);
        
        if (!productResponse.ok) {
            throw new Error('获取商品信息失败');
        }
        
        const productData = await productResponse.json();
        
        // 显示商品信息
        document.getElementById('productName').textContent = productData.name;
        document.getElementById('productPrice').textContent = orderItem.price.toFixed(2);
        document.getElementById('productSpecs').textContent = `规格：${orderItem.variant || '默认规格'}`;
        document.getElementById('productImage').src = productData.image_url || 'https://r2liubaotea.liubaotea.online/image/Design_Assets/product-placeholder.png';
        document.getElementById('productImage').alt = productData.name;
        
    } catch (error) {
        console.error('加载订单和商品信息失败:', error);
        showErrorMessage(error.message || '加载信息失败，请稍后重试');
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 星级评分事件
    const starRating = document.querySelector('.star-rating');
    const stars = starRating.querySelectorAll('i');
    const ratingInput = document.getElementById('ratingInput');
    
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const rating = parseInt(star.getAttribute('data-rating'));
            ratingInput.value = rating;
            
            // 更新星星显示
            stars.forEach((s, index) => {
                if (index < rating) {
                    s.className = 'fas fa-star';
                } else {
                    s.className = 'far fa-star';
                }
            });
        });
        
        star.addEventListener('mouseover', () => {
            const rating = parseInt(star.getAttribute('data-rating'));
            
            // 鼠标悬停效果
            stars.forEach((s, index) => {
                if (index < rating) {
                    s.className = 'fas fa-star';
                } else {
                    s.className = 'far fa-star';
                }
            });
        });
    });
    
    starRating.addEventListener('mouseout', () => {
        const rating = parseInt(ratingInput.value) || 5;
        
        // 恢复选中的评分
        stars.forEach((s, index) => {
            if (index < rating) {
                s.className = 'fas fa-star';
            } else {
                s.className = 'far fa-star';
            }
        });
    });
    
    // 图片上传事件
    const imageUploadBtn = document.getElementById('imageUploadBtn');
    const imageUpload = document.getElementById('imageUpload');
    
    imageUploadBtn.addEventListener('click', () => {
        imageUpload.click();
    });
    
    imageUpload.addEventListener('change', handleImageUpload);
    
    // 表单提交事件
    const reviewForm = document.getElementById('reviewForm');
    reviewForm.addEventListener('submit', handleFormSubmit);
    
    // 取消按钮事件
    const cancelBtn = document.getElementById('cancelBtn');
    cancelBtn.addEventListener('click', () => {
        window.location.href = 'user-orders.html';
    });
}

// 处理图片上传
function handleImageUpload(event) {
    const files = event.target.files;
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    
    if (uploadedImages.length + files.length > MAX_IMAGES) {
        showErrorMessage(`最多只能上传${MAX_IMAGES}张图片`);
        return;
    }
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // 检查文件类型
        if (!file.type.startsWith('image/')) {
            showErrorMessage('请上传图片文件');
            continue;
        }
        
        // 检查文件大小
        if (file.size > MAX_IMAGE_SIZE) {
            showErrorMessage(`图片大小不能超过${MAX_IMAGE_SIZE / 1024 / 1024}MB`);
            continue;
        }
        
        // 创建预览元素
        const previewElement = document.createElement('div');
        previewElement.className = 'image-preview';
        
        const img = document.createElement('img');
        const reader = new FileReader();
        
        reader.onload = function(e) {
            img.src = e.target.result;
            
            // 将图片添加到上传列表
            uploadedImages.push({
                file: file,
                dataUrl: e.target.result
            });
        };
        
        reader.readAsDataURL(file);
        
        const removeBtn = document.createElement('div');
        removeBtn.className = 'remove-image';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.addEventListener('click', () => {
            // 从上传列表中移除
            const index = uploadedImages.findIndex(img => img.dataUrl === reader.result);
            if (index !== -1) {
                uploadedImages.splice(index, 1);
            }
            
            // 从预览中移除
            imagePreviewContainer.removeChild(previewElement);
        });
        
        previewElement.appendChild(img);
        previewElement.appendChild(removeBtn);
        imagePreviewContainer.appendChild(previewElement);
    }
    
    // 重置文件输入框
    event.target.value = '';
}

// 处理表单提交
async function handleFormSubmit(event) {
    event.preventDefault();
    
    // 获取表单数据
    const productId = document.getElementById('productId').value;
    const orderId = document.getElementById('orderId').value;
    const rating = document.getElementById('ratingInput').value;
    const content = document.getElementById('reviewContent').value;
    
    // 表单验证
    if (!content.trim()) {
        document.getElementById('contentError').textContent = '请填写评价内容';
        return;
    } else {
        document.getElementById('contentError').textContent = '';
    }
    
    try {
        // 禁用提交按钮
        const submitBtn = document.getElementById('submitReviewBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = '提交中...';
        
        // 上传图片到R2存储
        const imageUrls = [];
        
        if (uploadedImages.length > 0) {
            for (const image of uploadedImages) {
                // 创建文件名
                const timestamp = new Date().getTime();
                const randomStr = Math.random().toString(36).substring(2, 8);
                const ext = image.file.name.split('.').pop();
                const fileName = `Product-Reviews/${timestamp}-${randomStr}.${ext}`;
                
                // 上传图片
                const token = localStorage.getItem('userToken');
                const formData = new FormData();
                formData.append('file', image.file);
                formData.append('path', fileName);
                
                const uploadResponse = await fetch(`${API_BASE_URL}/api/upload`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });
                
                if (!uploadResponse.ok) {
                    throw new Error('图片上传失败');
                }
                
                const uploadResult = await uploadResponse.json();
                imageUrls.push(`r2liubaotea.liubaotea.online/image/${fileName}`);
            }
        }
        
        // 提交评价数据
        const reviewData = {
            product_id: productId,
            order_id: orderId,
            rating: parseInt(rating),
            content: content,
            images: imageUrls
        };
        
        const result = await addProductReview(reviewData);
        
        // 显示成功消息
        showSuccessMessage('评价提交成功！');
        
        // 延迟跳转回订单页面
        setTimeout(() => {
            window.location.href = 'user-orders.html';
        }, 2000);
        
    } catch (error) {
        console.error('提交评价失败:', error);
        showErrorMessage(error.message || '提交失败，请稍后重试');
        
        // 恢复提交按钮
        const submitBtn = document.getElementById('submitReviewBtn');
        submitBtn.disabled = false;
        submitBtn.textContent = '提交评价';
    }
}

// 显示成功消息
function showSuccessMessage(message) {
    const messageModal = document.getElementById('messageModal');
    const messageText = document.getElementById('messageText');
    const successIcon = document.querySelector('.success-icon');
    const errorIcon = document.querySelector('.error-icon');
    
    messageText.textContent = message;
    successIcon.style.display = 'block';
    errorIcon.style.display = 'none';
    messageModal.style.display = 'block';
    
    setTimeout(() => {
        messageModal.style.display = 'none';
    }, 3000);
}

// 显示错误消息
function showErrorMessage(message) {
    const messageModal = document.getElementById('messageModal');
    const messageText = document.getElementById('messageText');
    const successIcon = document.querySelector('.success-icon');
    const errorIcon = document.querySelector('.error-icon');
    
    messageText.textContent = message;
    successIcon.style.display = 'none';
    errorIcon.style.display = 'block';
    messageModal.style.display = 'block';
    
    setTimeout(() => {
        messageModal.style.display = 'none';
    }, 3000);
}