/**
 * 管理后台修复脚本
 * 解决Chart.js全局可用性问题和API调用问题
 */

// 确保Chart.js全局可用
if (typeof window.Chart === 'undefined' && typeof Chart !== 'undefined') {
    window.Chart = Chart;
    console.log('Chart.js全局对象已修复');
}

// 导入API模块
import adminAPI from './admin-api.js';

// 修复商品保存API
const originalSaveProduct = adminAPI.saveProduct;
adminAPI.saveProduct = async (productData, productId = null) => {
    try {
        // 确保商品数据格式正确
        if (!productData.category_id) {
            productData.category_id = 1; // 默认分类ID
        }
        
        // 确保价格是数字
        if (typeof productData.price === 'string') {
            productData.price = parseFloat(productData.price);
        }
        
        // 确保库存是数字
        if (typeof productData.stock === 'string') {
            productData.stock = parseInt(productData.stock, 10);
        }
        
        return await originalSaveProduct(productData, productId);
    } catch (error) {
        console.error('保存商品出错:', error);
        throw error;
    }
};

// 修复订单详情API
const originalGetOrderDetails = adminAPI.getOrderDetails;
adminAPI.getOrderDetails = async (orderId) => {
    try {
        const orderData = await originalGetOrderDetails(orderId);
        
        // 确保订单项数据格式正确
        if (orderData && orderData.items && Array.isArray(orderData.items)) {
            // 计算商品总额
            let itemsTotal = 0;
            orderData.items.forEach(item => {
                // 确保每个订单项都有价格和数量
                if (!item.price && item.product_price) {
                    item.price = item.product_price;
                }
                if (!item.quantity && item.product_quantity) {
                    item.quantity = item.product_quantity;
                }
                
                // 计算小计
                const itemPrice = parseFloat(item.price) || 0;
                const itemQuantity = parseInt(item.quantity, 10) || 0;
                item.subtotal = itemPrice * itemQuantity;
                
                // 累加到总额
                itemsTotal += item.subtotal;
            });
            
            // 设置商品总额
            orderData.items_total = itemsTotal;
            
            // 设置运费（如果没有则默认为0）
            if (typeof orderData.shipping_fee === 'undefined') {
                orderData.shipping_fee = 0;
            }
        }
        
        // 确保地址信息正确
        if (orderData && orderData.address) {
            // 确保地址显示正确
            if (!orderData.address.full_address && orderData.address.province) {
                orderData.address.full_address = [
                    orderData.address.province,
                    orderData.address.city,
                    orderData.address.district,
                    orderData.address.detail
                ].filter(Boolean).join(' ');
            }
        }
        
        return orderData;
    } catch (error) {
        console.error('获取订单详情出错:', error);
        throw error;
    }
};

// 修复用户状态更新API
const originalUpdateUserStatus = adminAPI.updateUserStatus;
adminAPI.updateUserStatus = async (userId, status) => {
    try {
        // 将状态值转换为API需要的格式
        let apiStatus = status;
        
        // 状态值映射
        const statusMap = {
            '正常': 'active',
            '禁用': 'inactive',
            'active': 'active',
            'inactive': 'inactive',
            'disabled': 'inactive'
        };
        
        if (statusMap[status]) {
            apiStatus = statusMap[status];
        }
        
        console.log(`修复后的用户状态值: ${status} -> ${apiStatus}`);
        
        return await originalUpdateUserStatus(userId, apiStatus);
    } catch (error) {
        console.error('更新用户状态出错:', error);
        throw error;
    }
};

// 修复用户详情API
const originalGetUserDetails = adminAPI.getUserDetails;
adminAPI.getUserDetails = async (userId) => {
    try {
        const userData = await originalGetUserDetails(userId);
        
        // 确保注册时间格式正确
        if (userData && userData.created_at) {
            // 转换时间戳为日期对象
            userData.created_at_date = new Date(userData.created_at * 1000);
        }
        
        return userData;
    } catch (error) {
        console.error('获取用户详情出错:', error);
        throw error;
    }
};

console.log('admin-fixes.js已加载，修复函数已应用');