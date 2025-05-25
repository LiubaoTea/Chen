/**
 * 商品评价提交模块
 * 处理商品评价的提交功能
 */

// 导入API函数
import { API_BASE_URL } from './config.js';
import { checkAuthStatus } from './auth.js';
import { showSuccessToast, showErrorToast } from './utils.js';

// 添加页面样式
const style = document.createElement('style');
style.textContent = `
    .review-container {
        max-width: 800px;
        margin: 40px auto;
        padding: 20px;
        background: rgba(255, 255, 255, 0.95);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
`;
document.head.appendChild(style);

// 全局变量
let currentRating = 5; // 默认5星评分
let uploadedImages = []; // 已上传图片数组
let orderId = null;
let productId = null;
let orderItemId = null;
let returnUrl = 'user-center.html';

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
        orderId = urlParams.get('order_id');
        productId = urlParams.get('product_id');
        orderItemId = urlParams.get('order_item_id');
        const urlReturnUrl = urlParams.get('return_url');
        
        if (urlReturnUrl) {
            returnUrl = urlReturnUrl;
        }

        // 验证必要参数
        if (!orderId || !productId) {
            showErrorToast('缺少必要参数，无法提交评价');
            
            // 添加返回按钮，而不是自动跳转
            const container = document.querySelector('.review-container');
            if (container) {
                // 清空容器内容
                container.innerHTML = '<div class="review-header"><h2>参数错误</h2><p>缺少必要的订单或商品信息，无法提交评价</p></div>';
                
                // 添加返回按钮
                const returnButton = document.createElement('button');
                returnButton.textContent = '返回订单页面';
                returnButton.className = 'btn btn-primary mt-3';
                returnButton.onclick = () => window.location.href = returnUrl;
                container.appendChild(returnButton);
            }
            return;
        }

        // 加载订单和商品信息
        await loadOrderAndProductInfo();

        // 初始化评分系统
        initRatingSystem();

        // 初始化图片上传
        initImageUpload();

        // 初始化按钮事件
        initButtons();

    } catch (error) {
        console.error('初始化评价页面失败:', error);
        showErrorToast('加载评价页面失败，请稍后重试');
    }
});

// 加载订单和商品信息
async function loadOrderAndProductInfo() {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            throw new Error('未登录');
        }

        // 获取订单详情
        const orderResponse = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!orderResponse.ok) {
            throw new Error('获取订单信息失败');
        }

        const orderData = await orderResponse.json();
        
        // 验证订单数据
        if (!orderData || typeof orderData !== 'object') {
            throw new Error('订单数据格式不正确');
        }
        
        // 更新订单信息
        document.getElementById('orderId').textContent = orderData.order_id || orderId;
        document.getElementById('orderTime').textContent = orderData.created_at ? new Date(orderData.created_at * 1000).toLocaleString() : '未知时间';
        
        // 确保items是数组
        if (!Array.isArray(orderData.items)) {
            console.warn('订单商品列表不是数组，将使用空数组');
            orderData.items = [];
        }

        // 查找对应的商品
        const product = orderData.items.find(item => item.product_id == productId);
        if (!product) {
            throw new Error('未找到商品信息');
        }

        // 更新商品信息
        document.getElementById('productName').textContent = product.name || product.product_name || '未知商品';
        
        // 处理价格显示 - 优先使用unit_price，然后是price
        let priceDisplay = '0.00';
        let priceValue = null;
        
        if (product.unit_price !== undefined && product.unit_price !== null) {
            priceValue = Number(product.unit_price);
        } else if (product.price !== undefined && product.price !== null) {
            priceValue = Number(product.price);
        }
        
        if (!isNaN(priceValue)) {
            priceDisplay = priceValue.toFixed(2);
        }
        
        document.getElementById('productPrice').textContent = `价格：¥${priceDisplay}`;
        document.getElementById('productQuantity').textContent = `数量：${product.quantity || 1}`;
        
        // 设置商品图片 - 使用与订单详情页相同的逻辑
        let imageUrl = '/images/default-product.jpg'; // 默认图片
        
        if (product.image_url) {
            // 如果商品对象中直接包含完整的图片URL
            imageUrl = product.image_url;
        } else if (product.image_filename) {
            // 如果有图片文件名，构建完整URL
            imageUrl = `https://r2liubaotea.liubaotea.online/image/Goods/${product.image_filename}`;
        } else {
            // 尝试使用商品ID构建图片URL
            imageUrl = `${API_BASE_URL}/image/Goods/Goods_${product.product_id}.png`;
        }
        
        document.getElementById('productImage').src = imageUrl;
        document.getElementById('productImage').alt = product.name || product.product_name || '商品图片';

    } catch (error) {
        console.error('加载订单和商品信息失败:', error);
        // 显示更详细的错误信息
        let errorMsg = '加载订单和商品信息失败';
        if (error.message) {
            errorMsg += `: ${error.message}`;
        }
        showErrorToast(errorMsg);
        
        // 添加一个返回按钮，而不是自动跳转
        const returnButton = document.createElement('button');
        returnButton.textContent = '返回订单页面';
        returnButton.className = 'btn btn-primary mt-3';
        returnButton.onclick = () => window.location.href = returnUrl;
        
        const container = document.querySelector('.review-container');
        if (container) {
            container.appendChild(returnButton);
        }
    }
}

// 初始化评分系统
function initRatingSystem() {
    const starRating = document.getElementById('starRating');
    const stars = starRating.querySelectorAll('.fa-star');
    const ratingText = document.getElementById('ratingText');

    // 评分文本映射
    const ratingTexts = {
        1: '非常不满意',
        2: '不满意',
        3: '一般',
        4: '满意',
        5: '非常满意'
    };

    // 设置默认评分
    updateStars(currentRating);

    // 为每个星星添加点击事件
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const rating = parseInt(star.getAttribute('data-rating'));
            currentRating = rating;
            updateStars(rating);
        });

        // 鼠标悬停效果
        star.addEventListener('mouseover', () => {
            const rating = parseInt(star.getAttribute('data-rating'));
            highlightStars(rating);
        });

        // 鼠标移出效果
        star.addEventListener('mouseout', () => {
            updateStars(currentRating);
        });
    });

    // 更新星星显示
    function updateStars(rating) {
        highlightStars(rating);
        ratingText.textContent = ratingTexts[rating];
    }

    // 高亮星星
    function highlightStars(rating) {
        stars.forEach(star => {
            const starRating = parseInt(star.getAttribute('data-rating'));
            if (starRating <= rating) {
                star.classList.add('active');
                star.style.color = '#FFD700'; // 金色
            } else {
                star.classList.remove('active');
                star.style.color = '#E0E0E0'; // 灰色
            }
        });
    }
}

// 初始化图片上传
function initImageUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const imagePreview = document.getElementById('imagePreview');
    const uploadError = document.getElementById('uploadError');

    // 点击上传区域触发文件选择
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    // 拖拽上传
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.background = '#FFF9F0';
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.background = '';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.background = '';
        
        if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    });

    // 文件选择变化
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleFiles(fileInput.files);
        }
    });

    // 处理选择的文件
    function handleFiles(files) {
        uploadError.textContent = '';
        
        // 检查已上传图片数量
        if (uploadedImages.length + files.length > 5) {
            uploadError.textContent = '最多只能上传5张图片';
            return;
        }

        // 处理每个文件
        Array.from(files).forEach(file => {
            // 检查文件类型
            if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
                uploadError.textContent = '只支持JPG、JPEG和PNG格式的图片';
                return;
            }

            // 检查文件大小（2MB = 2 * 1024 * 1024 bytes）
            if (file.size > 2 * 1024 * 1024) {
                uploadError.textContent = '图片大小不能超过2MB';
                return;
            }

            // 上传图片
            uploadImage(file);
        });

        // 清空文件输入框，允许重复选择同一文件
        fileInput.value = '';
    }

    // 上传图片到服务器
    async function uploadImage(file) {
        try {
            const token = localStorage.getItem('userToken');
            if (!token) {
                throw new Error('未登录');
            }

            // 创建唯一文件名
            const timestamp = new Date().getTime();
            const randomStr = Math.random().toString(36).substring(2, 8);
            const fileExt = file.name.split('.').pop();
            const fileName = `review_${timestamp}_${randomStr}.${fileExt}`;

            // 创建FormData对象
            const formData = new FormData();
            formData.append('image', file);
            formData.append('fileName', fileName);
            formData.append('folder', 'Product-Reviews');

            // 显示上传中的预览
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item loading';
            previewItem.innerHTML = '<div class="loading-spinner"></div>';
            imagePreview.appendChild(previewItem);

            console.log('开始上传图片到:', `${API_BASE_URL}/api/upload-image`);
            // 上传图片
            const response = await fetch(`${API_BASE_URL}/api/upload-image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('图片上传服务器响应错误:', errorData);
                throw new Error(errorData.error || '图片上传失败');
            }

            const result = await response.json();
            console.log('图片上传成功，响应:', result);

            // 移除加载中的预览
            imagePreview.removeChild(previewItem);

            // 添加到已上传图片数组
            uploadedImages.push(result.url);

            // 创建图片预览
            createImagePreview(result.url);

        } catch (error) {
            console.error('上传图片失败:', error);
            uploadError.textContent = '上传图片失败，请重试';
            
            // 移除所有加载中的预览
            const loadingPreviews = imagePreview.querySelectorAll('.preview-item.loading');
            loadingPreviews.forEach(item => imagePreview.removeChild(item));
        }
    }

    // 创建图片预览
    function createImagePreview(imageUrl) {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = '评价图片';
        
        const removeBtn = document.createElement('div');
        removeBtn.className = 'remove-image';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.addEventListener('click', () => {
            // 从数组和预览中移除
            const index = uploadedImages.indexOf(imageUrl);
            if (index !== -1) {
                uploadedImages.splice(index, 1);
            }
            imagePreview.removeChild(previewItem);
        });
        
        previewItem.appendChild(img);
        previewItem.appendChild(removeBtn);
        imagePreview.appendChild(previewItem);
    }
}

// 初始化按钮事件
function initButtons() {
    const submitBtn = document.getElementById('submitBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const reviewContent = document.getElementById('reviewContent');

    // 提交评价
    submitBtn.addEventListener('click', async () => {
        try {
            const token = localStorage.getItem('userToken');
            if (!token) {
                throw new Error('未登录');
            }
            
            // 验证评分和评价内容
            if (reviewContent.value.trim() === '') {
                throw new Error('请填写评价内容');
            }

            // 准备评价数据
            const reviewData = {
                product_id: productId,
                order_id: orderId,
                order_item_id: orderItemId,
                rating: currentRating,
                review_content: reviewContent.value.trim(),
                images: uploadedImages
            };
            
            console.log('提交评价数据:', reviewData);

            // 发送评价请求
            const response = await fetch(`${API_BASE_URL}/api/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(reviewData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('评价提交服务器响应错误:', errorData);
                throw new Error(errorData.error || '提交评价失败');
            }

            const result = await response.json();
            console.log('评价提交成功，响应:', result);

            // 显示成功消息
            showSuccessToast('评价提交成功！');

            // 3秒后跳转回订单页面
            setTimeout(() => {
                window.location.href = returnUrl;
            }, 3000);

        } catch (error) {
            console.error('提交评价失败:', error);
            showErrorToast(error.message || '提交评价失败，请稍后重试');
        }
    });

    // 取消按钮
    cancelBtn.addEventListener('click', () => {
        window.location.href = returnUrl;
    });
}

// 显示成功消息
function showSuccessMessage(message) {
    const successMessage = document.createElement('div');
    successMessage.className = 'success-message';
    successMessage.textContent = message;
    document.body.appendChild(successMessage);
    
    // 3秒后移除提示
    setTimeout(() => {
        document.body.removeChild(successMessage);
    }, 3000);
}