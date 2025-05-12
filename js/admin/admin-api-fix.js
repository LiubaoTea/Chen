/**
 * 管理后台API接口修复文件
 * 添加缺失的API函数实现
 */

// 导入配置和认证模块
import { adminAuth } from './admin-auth.js';
import { ADMIN_API_BASE_URL } from './admin-config.js';
import adminAPI from './admin-api.js';

// 添加缺失的订单详情获取函数
adminAPI.getOrderDetails = async (orderId) => {
    try {
        const url = `${ADMIN_API_BASE_URL}/api/admin/orders/${orderId}`;
        console.log('发送订单详情请求，URL:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                ...adminAuth.getHeaders(),
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('订单详情API响应错误:', response.status, errorText);
            throw new Error(`获取订单详情失败，HTTP状态码: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('成功获取订单详情:', data);
        return data;
    } catch (error) {
        console.error('获取订单详情出错:', error);
        throw error;
    }
};

// 添加缺失的订单状态更新函数
adminAPI.updateOrderStatus = async (orderId, status) => {
    try {
        const url = `${ADMIN_API_BASE_URL}/api/admin/orders/${orderId}/status`;
        console.log('发送更新订单状态请求，URL:', url);
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                ...adminAuth.getHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('更新订单状态API响应错误:', response.status, errorText);
            throw new Error(`更新订单状态失败，HTTP状态码: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('成功更新订单状态:', data);
        return data;
    } catch (error) {
        console.error('更新订单状态出错:', error);
        throw error;
    }
};

// 修复用户状态更新函数，确保使用正确的状态值
const originalUpdateUserStatus = adminAPI.updateUserStatus;
adminAPI.updateUserStatus = async (userId, status) => {
    try {
        // 将active/inactive转换为中文状态值，以符合数据库约束
        let dbStatus = status;
        if (status === 'active') dbStatus = '正常';
        if (status === 'inactive') dbStatus = '禁用';
        
        console.log(`转换用户状态值: ${status} -> ${dbStatus}`);
        
        return await originalUpdateUserStatus(userId, dbStatus);
    } catch (error) {
        console.error('更新用户状态出错:', error);
        throw error;
    }
};

console.log('admin-api-fix.js已加载，API函数已修复');