/**
 * 商品评价提交页面脚本
 * 处理评价表单、评分系统和图片上传
 */

import { API_BASE_URL } from './config.js';
import { checkAuthStatus } from './auth.js';

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 检查用户登录状态
        if (!checkAuthStatus()) {
            window.location.href = 'login.html';
            return;
        }

        // 获取URL参数
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('order_id');
        const productId = urlParams.get('product_id');
        const orderItemId = urlParams.get('order_item_id');
        const returnUrl = urlParams.get('return_url') || 'user-center.html';

        // 验证必要参数
        if (!orderId || !productId) {
            showErrorMessage('缺少必要参数，无法提交评价');
            setTimeout(() => {
                window.location.href = returnUrl;
            }, 2000);
            return;
        }

        // 初始化页面
        await initPage(orderId, productId);

        // 初始化评分系统
        initRatingSystem();

        // 初始化图片上传
        initImageUpload();

        // 初始化表单提交
        initFormSubmit(orderId, productId, orderItemId, returnUrl);

        // 初始化取消按钮
        document.getElementById('cancelButton').addEventListener('click', () => {
            window.location.href = returnUrl;
        });
    } catch (error) {
        console.error('初始化评价页面失败:', error);
        showErrorMessage('加载评价页面失败，请稍后重试');
    }
});

// 初始化页面，加载订单和商品信息
async function initPage(orderId, productId) {
    try {
        // 显示加载状态
        document.getElementById('orderNumber').textContent = '加载中...';
        document.getElementById('orderTime').textContent = '加载中...';
        document.getElementById('productName').textContent = '加载中...';

        // 获取订单详情
        const token = localStorage.getItem('userToken');
        const orderResponse = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!orderResponse.ok) {
            throw new Error('获取订单信息失败');
        }

        const orderData = await orderResponse.json();

        // 更新订单信息
        document.getElementById('orderNumber').textContent = orderData.order_id;
        document.getElementById('orderTime').textContent = new Date(orderData.created_at * 1000).toLocaleString();

        // 查找对应的商品
        const orderItem = orderData.items.find(item => item.product_id == productId);
        if (!orderItem) {
            throw new Error('未找到对应的商品信息');
        }

        // 更新商品信息
        document.getElementById('productName').textContent = orderItem.product_name;
        document.getElementById('productPrice').textContent = `价格: ¥${orderItem.unit_price.toFixed(2)}`;
        document.getElementById('productQuantity').textContent = `数量: ${orderItem.quantity}`;

        // 设置商品图片
        const imageUrl = `${API_BASE_URL}/image/Goods/Goods_${productId}.png`;
        document.getElementById('productImage').src = imageUrl;
        document.getElementById('productImage').alt = orderItem.product_name;
    } catch (error) {
        console.error('加载订单和商品信息失败:', error);
        showErrorMessage('加载订单和商品信息失败，请稍后重试');
    }
}

// 初始化评分系统
function initRatingSystem() {
    const stars = document.querySelectorAll('.star-rating i');
    const ratingText = document.querySelector('.rating-text');
    let currentRating = 5; // 默认5星

    // 评分文本映射
    const ratingTexts = {
        1: '非常不满意',
        2: '不满意',
        3: '一般',
        4: '满意',
        5: '非常满意'
    };

    // 设置初始评分
    updateStars(currentRating);

    // 为每个星星添加点击事件
    stars.forEach(star => {
        star.addEventListener('click', () => {
            currentRating = parseInt(star.getAttribute('data-rating'));
            updateStars(currentRating);
        });

        // 鼠标悬停效果
        star.addEventListener('mouseover', () => {
            const hoverRating = parseInt(star.getAttribute('data-rating'));
            updateStars(hoverRating, true);
        });

        // 鼠标离开效果
        star.addEventListener('mouseout', () => {
            updateStars(currentRating);
        });
    });

    // 更新星星显示和文本
    function updateStars(rating, isHover = false) {
        stars.forEach(star => {
            const starRating = parseInt(star.getAttribute('data-rating'));
            if (starRating <= rating) {
                star.className = 'fas fa-star';
            } else {
                star.className = 'far fa-star';
            }
        });

        if (!isHover) {
            ratingText.textContent = ratingTexts[rating];
        }
    }

    // 返回获取当前评分的函数
    return () => currentRating;
}

// 初始化图片上传
function initImageUpload() {
    const imageUpload = document.getElementById('imageUpload');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const uploadedImages = []; // 存储已上传的图片文件

    imageUpload.addEventListener('change', handleImageSelection);

    // 处理图片选择
    function handleImageSelection(event) {
        const files = event.target.files;
        
        if (!files || files.length === 0) {
            return; // 没有选择文件，直接返回
        }
        
        // 检查已上传图片数量
        if (uploadedImages.length + files.length > 5) {
            showErrorMessage('最多只能上传5张图片');
            return;
        }

        // 处理每个选择的文件
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // 验证文件类型
            if (!file.type.match('image.*')) {
                showErrorMessage('请选择图片文件');
                continue;
            }
            
            // 验证文件大小（2MB = 2 * 1024 * 1024 bytes）
            if (file.size > 2 * 1024 * 1024) {
                showErrorMessage('图片大小不能超过2MB');
                continue;
            }

            // 添加到已上传图片数组
            uploadedImages.push(file);
            
            // 创建预览
            createImagePreview(file, uploadedImages.length - 1);
        }

        // 重置文件输入，允许重复选择同一文件
        event.target.value = '';
    }

    // 创建图片预览
    function createImagePreview(file, index) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const previewDiv = document.createElement('div');
            previewDiv.className = 'image-preview';
            previewDiv.dataset.index = index;
            
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = '预览图片';
            
            // 添加图片加载事件，确保图片正确加载
            img.onload = function() {
                // 图片加载成功
                img.style.display = 'block';
            };
            
            img.onerror = function() {
                // 图片加载失败
                console.error('图片加载失败');
                img.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22100%22%3E%3Crect%20fill%3D%22%23f0f0f0%22%20width%3D%22100%22%20height%3D%22100%22%2F%3E%3Ctext%20fill%3D%22%23999%22%20font-family%3D%22sans-serif%22%20font-size%3D%2212%22%20text-anchor%3D%22middle%22%20x%3D%2250%22%20y%3D%2250%22%3E加载失败%3C%2Ftext%3E%3C%2Fsvg%3E';
            };
            
            const removeButton = document.createElement('div');
            removeButton.className = 'remove-image';
            removeButton.innerHTML = '<i class="fas fa-times"></i>';
            removeButton.addEventListener('click', (e) => {
                e.stopPropagation(); // 阻止事件冒泡
                removeImage(index);
            });
            
            previewDiv.appendChild(img);
            previewDiv.appendChild(removeButton);
            imagePreviewContainer.appendChild(previewDiv);
        };
        
        reader.onerror = function() {
            console.error('FileReader 错误');
            showErrorMessage('图片读取失败，请重试');
        };
        
        reader.readAsDataURL(file);
    }

    // 移除图片
    function removeImage(index) {
        // 从数组中移除
        uploadedImages.splice(index, 1);
        
        // 移除预览
        const previews = imagePreviewContainer.querySelectorAll('.image-preview');
        previews.forEach(preview => {
            const previewIndex = parseInt(preview.dataset.index);
            if (previewIndex === index) {
                preview.remove();
            } else if (previewIndex > index) {
                // 更新索引
                preview.dataset.index = previewIndex - 1;
            }
        });
        
        // 如果没有图片了，重置上传按钮
        if (uploadedImages.length === 0) {
            imageUpload.value = '';
        }
    }

    // 返回获取已上传图片的函数
    return () => uploadedImages;
}

// 初始化表单提交
function initFormSubmit(orderId, productId, orderItemId, returnUrl) {
    const reviewForm = document.getElementById('reviewForm');
    const submitButton = document.getElementById('submitButton');
    const getStarRating = initRatingSystem();
    const getUploadedImages = initImageUpload();

    reviewForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        // 禁用提交按钮，防止重复提交
        submitButton.disabled = true;
        submitButton.textContent = '提交中...';
        
        try {
            // 获取表单数据
            const rating = getStarRating();
            const content = document.getElementById('reviewContent').value.trim();
            const uploadedImages = getUploadedImages();
            
            // 验证评分
            if (rating < 1 || rating > 5) {
                throw new Error('请选择评分');
            }
            
            // 获取用户Token
            const token = localStorage.getItem('userToken');
            if (!token) {
                throw new Error('未登录，请先登录');
            }
            
            // 准备评价数据
            const reviewData = {
                product_id: productId,
                order_id: orderId,
                order_item_id: orderItemId,
                rating: rating,
                content: content
            };
            
            // 提交评价
            const reviewResponse = await fetch(`${API_BASE_URL}/api/reviews`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reviewData)
            });
            
            if (!reviewResponse.ok) {
                const errorData = await reviewResponse.json();
                throw new Error(errorData.error || '提交评价失败');
            }
            
            const reviewResult = await reviewResponse.json();
            
            // 获取评价ID - 从响应中获取或从URL中提取
            let reviewId;
            if (reviewResult.review_id) {
                reviewId = reviewResult.review_id;
            } else {
                // 如果后端没有返回review_id，尝试获取最新的评价ID
                const latestReviewResponse = await fetch(`${API_BASE_URL}/api/user/reviews/latest`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (latestReviewResponse.ok) {
                    const latestReview = await latestReviewResponse.json();
                    reviewId = latestReview.review_id;
                } else {
                    console.warn('无法获取评价ID，图片可能无法关联到评价');
                }
            }
            
            // 上传图片（如果有）
            if (uploadedImages.length > 0 && reviewId) {
                await uploadReviewImages(uploadedImages, reviewId, token);
            }
            
            // 显示成功消息
            showSuccessMessage('评价提交成功');
            
            // 延迟跳转回原页面
            setTimeout(() => {
                window.location.href = returnUrl;
            }, 2000);
            
        } catch (error) {
            console.error('提交评价失败:', error);
            showErrorMessage(error.message || '提交评价失败，请稍后重试');
            
            // 恢复提交按钮
            submitButton.disabled = false;
            submitButton.textContent = '提交评价';
        }
    });
}

// 上传评价图片
async function uploadReviewImages(images, reviewId, token) {
    try {
        // 显示上传进度提示
        showToast('正在上传图片...', 'info');
        
        const uploadPromises = images.map(async (image, index) => {
            // 创建文件名：review_[reviewId]_[index].[扩展名]
            const fileExtension = image.name.split('.').pop();
            const fileName = `review_${reviewId}_${index}.${fileExtension}`;
            
            // 创建FormData对象
            const formData = new FormData();
            formData.append('image', image);
            formData.append('fileName', fileName);
            formData.append('folder', 'Product-Reviews');
            
            try {
                // 上传图片
                const response = await fetch(`${API_BASE_URL}/api/upload/image`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || '上传图片失败');
                }
                
                return response.json();
            } catch (uploadError) {
                console.error(`上传第${index+1}张图片失败:`, uploadError);
                throw uploadError;
            }
        });
        
        // 等待所有图片上传完成
        const uploadResults = await Promise.all(uploadPromises);
        
        // 将图片URL关联到评价
        const imageUrls = uploadResults.map(result => result.url);
        
        // 更新评价的图片信息
        const updateResponse = await fetch(`${API_BASE_URL}/api/reviews/${reviewId}/images`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ images: imageUrls })
        });
        
        if (!updateResponse.ok) {
            const errorData = await updateResponse.json().catch(() => ({}));
            throw new Error(errorData.error || '关联图片到评价失败');
        }
        
        return updateResponse.json();
    } catch (error) {
        console.error('上传评价图片失败:', error);
        throw error;
    }
}

// 显示成功消息
function showSuccessMessage(message) {
    showToast(message, 'success');
}

// 显示错误消息
function showErrorMessage(message) {
    showToast(message, 'error');
}

// 显示提示消息
function showToast(message, type) {
    // 移除现有的提示
    const existingToast = document.querySelector('.toast-message');
    if (existingToast) {
        document.body.removeChild(existingToast);
    }
    
    // 创建新提示
    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    
    // 添加图标
    let icon = '';
    if (type === 'success') {
        icon = '<i class="fas fa-check-circle"></i> ';
    } else if (type === 'error') {
        icon = '<i class="fas fa-exclamation-circle"></i> ';
    } else if (type === 'info') {
        icon = '<i class="fas fa-info-circle"></i> ';
    }
    
    toast.innerHTML = icon + message;
    
    // 添加到页面
    document.body.appendChild(toast);
    
    // 设置动画
    setTimeout(() => {
        toast.style.opacity = '1';
    }, 10);
    
    // 自动移除
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}