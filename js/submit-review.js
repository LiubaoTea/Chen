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

// 添加CSS样式
const style = document.createElement('style');
style.textContent = `
.toast {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 4px;
    color: white;
    font-size: 14px;
    z-index: 9999;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.toast.show {
    opacity: 1;
}

.toast-success {
    background-color: #28a745;
}

.toast-error {
    background-color: #dc3545;
}
`;
document.head.appendChild(style);

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 从URL获取订单和商品信息
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order_id');
    const productId = urlParams.get('product_id');
    const orderItemId = urlParams.get('order_item_id'); // 获取订单项ID
    const returnUrl = urlParams.get('return_url') || 'user-orders.html'; // 获取返回URL
    
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
    
    // 存储返回URL，用于取消按钮
    localStorage.setItem('review_return_url', returnUrl);
    
    // 加载订单和商品信息
    loadOrderAndProductInfo(orderId, productId, orderItemId);
    
    // 设置事件监听器
    setupEventListeners();
});

// 加载订单和商品信息
async function loadOrderAndProductInfo(orderId, productId, orderItemId) {
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
        
        console.log('开始加载订单信息:', orderId, '商品ID:', productId, '订单项ID:', orderItemId);
        
        // 获取订单信息
        const orderResponse = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!orderResponse.ok) {
            const errorText = await orderResponse.text();
            console.error('订单API响应错误:', errorText);
            throw new Error(`获取订单信息失败: ${errorText}`);
        }
        
        const orderData = await orderResponse.json();
        console.log('获取到订单数据:', orderData);
        
        // 显示订单信息
        document.getElementById('orderNumber').textContent = orderData.order_number || orderId;
        document.getElementById('orderDate').textContent = new Date(orderData.created_at * 1000).toLocaleString('zh-CN');
        
        // 查找当前要评价的商品
        let orderItem;
        
        // 确保orderData.items存在且是数组
        if (!orderData.items || !Array.isArray(orderData.items)) {
            console.error('订单数据中没有items数组:', orderData);
            throw new Error('订单数据格式错误，未找到商品列表');
        }
        
        console.log('订单中的商品列表:', orderData.items);
        
        // 如果提供了orderItemId，优先使用它查找
        if (orderItemId) {
            orderItem = orderData.items.find(item => item.id === orderItemId || item.item_id === orderItemId);
            console.log('通过orderItemId查找结果:', orderItem);
        }
        
        // 如果没找到，尝试使用productId查找
        if (!orderItem) {
            // 确保进行数字比较
            const productIdNum = parseInt(productId, 10);
            orderItem = orderData.items.find(item => {
                const itemProductId = parseInt(item.product_id, 10);
                return itemProductId === productIdNum;
            });
            console.log('通过productId查找结果:', orderItem);
        }
        
        if (!orderItem) {
            console.error('未找到匹配的商品，订单项:', orderData.items, '查找的商品ID:', productId);
            throw new Error('未找到相关商品信息');
        }
        
        // 确保productId是正确的
        const correctProductId = orderItem.product_id;
        document.getElementById('productId').value = correctProductId;
        console.log('确认的商品ID:', correctProductId);
        
        // 获取商品详细信息
        const productResponse = await fetch(`${API_BASE_URL}/api/products/${correctProductId}`);
        
        if (!productResponse.ok) {
            const errorText = await productResponse.text();
            console.error('商品API响应错误:', errorText);
            throw new Error(`获取商品信息失败: ${errorText}`);
        }
        
        const productData = await productResponse.json();
        console.log('获取到商品数据:', productData);
        
        // 显示商品信息
        document.getElementById('productName').textContent = productData.name || '未知商品';
        
        // 添加对price的空值检查，优先使用订单项中的价格
        let price = '0.00';
        if (orderItem && orderItem.unit_price) {
            price = parseFloat(orderItem.unit_price).toFixed(2);
        } else if (orderItem && orderItem.price) {
            price = parseFloat(orderItem.price).toFixed(2);
        } else if (productData && productData.price) {
            price = parseFloat(productData.price).toFixed(2);
        }
        
        document.getElementById('productPrice').textContent = price;
        
        // 显示商品规格
        let specText = '默认规格';
        if (orderItem && orderItem.variant) {
            specText = orderItem.variant;
        } else if (orderItem && orderItem.specifications) {
            specText = orderItem.specifications;
        } else if (productData && productData.specifications) {
            try {
                // 检查是否已经是字符串
                if (typeof productData.specifications === 'string' && !productData.specifications.startsWith('{')) {
                    specText = productData.specifications;
                } else {
                    // 尝试解析JSON
                    const specs = JSON.parse(productData.specifications);
                    specText = Object.entries(specs)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(', ');
                }
            } catch (e) {
                console.log('规格解析错误:', e);
                specText = productData.specifications;
            }
        }
        document.getElementById('productSpecs').textContent = `规格：${specText}`;
        
        // 设置商品图片，使用与user-center.js相同的图片URL构建方式
        // 构建商品图片URL - 使用R2存储中的图片
        const imageUrl = `https://r2liubaotea.liubaotea.online/image/Goods/Goods_${correctProductId}.png`;
        
        const productImage = document.getElementById('productImage');
        productImage.src = imageUrl;
        productImage.alt = productData.name || '商品图片';
        
        // 添加图片加载错误处理
        productImage.onerror = function() {
            console.warn('商品图片加载失败，尝试使用备用图片');
            this.src = 'https://r2liubaotea.liubaotea.online/image/Design_Assets/product_placeholder.png';
            this.onerror = null; // 防止无限循环
        };
        
        console.log('商品信息加载完成，图片URL:', imageUrl);
        
    } catch (error) {
        console.error('加载订单和商品信息失败:', error);
        showErrorMessage(error.message || '加载信息失败，请稍后重试');
    }
}

// 设置事件监听器
function setupEventListeners() {
    console.log('设置事件监听器');
    
    // 星级评分事件
    const starRating = document.querySelector('.star-rating');
    if (!starRating) {
        console.error('未找到星级评分元素');
        return;
    }
    
    const stars = starRating.querySelectorAll('i');
    const ratingInput = document.getElementById('ratingInput');
    
    // 设置默认评分为5星
    if (ratingInput) ratingInput.value = 5;
    
    stars.forEach(star => {
        star.addEventListener('click', (e) => {
            e.preventDefault();
            const rating = parseInt(star.getAttribute('data-rating'));
            console.log('选择了', rating, '星评分');
            if (ratingInput) ratingInput.value = rating;
            
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
        const rating = parseInt(ratingInput?.value) || 5;
        
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
    
    if (imageUploadBtn && imageUpload) {
        // 确保图片上传按钮点击事件正确触发文件选择
        imageUploadBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('点击了图片上传按钮');
            document.getElementById('imageUpload').click();
        };
        
        // 确保文件选择变化事件正确处理
        imageUpload.addEventListener('change', handleImageUpload);
    } else {
        console.error('未找到图片上传元素');
    }
    
    // 表单提交事件
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        reviewForm.addEventListener('submit', (e) => {
            console.log('提交表单');
            handleFormSubmit(e);
        });
    } else {
        console.error('未找到评价表单元素');
    }
    
    // 取消按钮事件
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('点击了取消按钮');
            // 获取存储的返回URL，如果没有则默认返回订单列表页
            const returnUrl = localStorage.getItem('review_return_url') || 'user-orders.html';
            window.location.href = returnUrl;
        });
    } else {
        console.error('未找到取消按钮元素');
    }
    
    console.log('事件监听器设置完成');
}

// 处理图片上传
function handleImageUpload(event) {
    const files = event.target.files;
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    
    if (!files || files.length === 0) {
        console.log('没有选择文件');
        return;
    }
    
    console.log('选择了', files.length, '个文件');
    
    if (uploadedImages.length + files.length > MAX_IMAGES) {
        showErrorMessage(`最多只能上传${MAX_IMAGES}张图片`);
        showErrorToast(`最多只能上传${MAX_IMAGES}张图片`);
        return;
    }
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // 检查文件类型
        if (!file.type.startsWith('image/')) {
            showErrorMessage('请上传图片文件');
            showErrorToast('请上传图片文件');
            continue;
        }
        
        // 检查文件大小
        if (file.size > MAX_IMAGE_SIZE) {
            showErrorMessage(`图片大小不能超过${MAX_IMAGE_SIZE / 1024 / 1024}MB`);
            showErrorToast(`图片大小不能超过${MAX_IMAGE_SIZE / 1024 / 1024}MB`);
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
            
            console.log('图片已添加到上传列表，当前共', uploadedImages.length, '张');
        };
        
        reader.onerror = function(e) {
            console.error('FileReader错误:', e);
            showErrorToast('读取图片失败');
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
                console.log('已从上传列表移除图片，剩余', uploadedImages.length, '张');
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
    const rating = document.getElementById('ratingInput').value || 5; // 默认5星
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
        
        console.log('开始处理评价提交，商品ID:', productId, '订单ID:', orderId);
        
        // 上传图片到R2存储
        const imageUrls = [];
        
        if (uploadedImages.length > 0) {
            console.log(`准备上传${uploadedImages.length}张图片`);
            
            // 上传图片到R2存储
            for (let i = 0; i < uploadedImages.length; i++) {
                const image = uploadedImages[i];
                const file = image.file;
                
                // 创建唯一的文件名
                const timestamp = new Date().getTime();
                const randomStr = Math.random().toString(36).substring(2, 8);
                const fileName = `review_${productId}_${timestamp}_${randomStr}.${file.name.split('.').pop()}`;
                
                // 创建FormData对象
                const formData = new FormData();
                formData.append('image', file);
                formData.append('fileName', fileName);
                formData.append('folder', 'Product-Reviews');
                
                try {
                    // 调用上传API
                    const uploadResponse = await fetch(`${API_BASE_URL}/api/upload-image`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                        },
                        body: formData
                    });
                    
                    if (!uploadResponse.ok) {
                        throw new Error(`图片上传失败: ${await uploadResponse.text()}`);
                    }
                    
                    const uploadResult = await uploadResponse.json();
                    const imageUrl = uploadResult.url || `https://r2liubaotea.liubaotea.online/image/Product-Reviews/${fileName}`;
                    imageUrls.push(imageUrl);
                    
                    console.log(`图片 ${i+1}/${uploadedImages.length} 上传成功:`, imageUrl);
                } catch (uploadError) {
                    console.error(`图片 ${i+1}/${uploadedImages.length} 上传失败:`, uploadError);
                    // 继续上传其他图片，不中断整个流程
                }
            }
        }
        
        // 提交评价数据
        const reviewData = {
            product_id: parseInt(productId),
            order_id: orderId,
            rating: parseInt(rating),
            review_content: content,  // 注意：后端API使用review_content而不是content
            images: imageUrls  // 添加图片URL数组
        };
        
        console.log('准备提交评价数据:', reviewData);
        
        // 获取用户令牌
        const token = localStorage.getItem('userToken');
        if (!token) {
            throw new Error('未登录状态，请先登录');
        }
        
        // 调用API提交评价
        const response = await fetch(`${API_BASE_URL}/api/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(reviewData)
        });
        
        console.log('评价提交API响应状态:', response.status);
        
        // 检查响应状态
        if (!response.ok) {
            let errorMessage = '提交评价失败';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                const errorText = await response.text();
                errorMessage = errorText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        
        // 处理成功响应
        let result;
        try {
            result = await response.json();
        } catch (e) {
            // 如果响应不是JSON格式，创建一个基本的成功对象
            result = { success: true, message: '评价提交成功' };
        }
        
        console.log('评价提交成功:', result);
        
        // 显示成功消息
        showSuccessMessage('评价提交成功！');
        showSuccessToast('评价提交成功！');
        
        // 延迟跳转回订单页面
        setTimeout(() => {
            // 获取存储的返回URL，如果没有则默认返回订单列表页
            const returnUrl = localStorage.getItem('review_return_url') || 'user-orders.html';
            window.location.href = returnUrl;
        }, 2000);
        
    } catch (error) {
        console.error('提交评价失败:', error);
        showErrorMessage(error.message || '提交失败，请稍后重试');
        showErrorToast(error.message || '提交失败，请稍后重试');
        
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
    
    if (!messageModal || !messageText) {
        console.error('消息模态框元素未找到');
        return;
    }
    
    messageText.textContent = message;
    
    if (successIcon) successIcon.style.display = 'block';
    if (errorIcon) errorIcon.style.display = 'none';
    
    messageModal.style.display = 'block';
    
    setTimeout(() => {
        messageModal.style.display = 'none';
    }, 3000);
    
    console.log('显示成功消息:', message);
}

// 显示错误消息
function showErrorMessage(message) {
    const messageModal = document.getElementById('messageModal');
    const messageText = document.getElementById('messageText');
    const successIcon = document.querySelector('.success-icon');
    const errorIcon = document.querySelector('.error-icon');
    
    if (!messageModal || !messageText) {
        console.error('消息模态框元素未找到');
        // 使用alert作为备选方案
        alert(message);
        return;
    }
    
    messageText.textContent = message;
    
    if (successIcon) successIcon.style.display = 'none';
    if (errorIcon) errorIcon.style.display = 'block';
    
    messageModal.style.display = 'block';
    
    setTimeout(() => {
        messageModal.style.display = 'none';
    }, 3000);
    
    console.log('显示错误消息:', message);
}