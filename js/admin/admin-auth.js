/**
 * 管理后台认证模块
 * 处理管理员登录、登出和权限验证
 * 使用D1数据库中的admins表进行管理员认证
 */

// 导入API基础URL配置
import { API_BASE_URL, ADMIN_API_BASE_URL } from '../config.js';

// 确保ADMIN_API_BASE_URL已定义
const ADMIN_API_URL = ADMIN_API_BASE_URL || API_BASE_URL;

// 确保全局可访问API配置
if (typeof window !== 'undefined') {
    window.API_BASE_URL = API_BASE_URL;
    window.ADMIN_API_BASE_URL = ADMIN_API_BASE_URL;
    window.ADMIN_API_URL = ADMIN_API_URL;
}

// 管理员认证状态
let adminAuthState = {
    isLoggedIn: false,
    adminToken: null,
    adminInfo: null
};

// 初始化认证状态
function initAdminAuth() {
    // 从本地存储中获取管理员令牌
    const storedToken = localStorage.getItem('adminToken');
    const storedAdminInfo = localStorage.getItem('adminInfo');
    
    if (storedToken && storedAdminInfo) {
        try {
            adminAuthState.adminToken = storedToken;
            adminAuthState.adminInfo = JSON.parse(storedAdminInfo);
            adminAuthState.isLoggedIn = true;
            
            // 更新UI显示管理员信息
            updateAdminUI();
            return true;
        } catch (error) {
            console.error('解析管理员信息失败:', error);
            clearAdminAuth();
        }
    }
    
    return false;
}

// 获取管理员令牌
function getAdminToken() {
    return adminAuthState.adminToken;
}

// 获取管理员信息
function getAdminInfo() {
    return adminAuthState.adminInfo;
}

// 创建adminAuth对象
const adminAuthObj = {
    init: initAdminAuth,
    login: adminLogin,
    logout: adminLogout,
    check: checkAdminAuth,
    getHeaders: getAdminAuthHeaders,
    getToken: getAdminToken,
    getAdminInfo: getAdminInfo,
    isLoggedIn: isAdminLoggedIn
};

// 导出为ES模块
export const adminAuth = adminAuthObj;

// 确保全局可访问adminAuth
if (typeof window !== 'undefined') {
    window.adminAuth = adminAuthObj;
}

// 管理员登录
async function adminLogin(username, password) {
    try {
        // 调用后端API验证管理员凭据
        // 后端API会查询D1数据库中的admins表进行验证
        const response = await fetch(`${ADMIN_API_URL}/api/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || '登录失败');
        }
        
        // 保存认证信息
        adminAuthState.adminToken = data.token;
        adminAuthState.adminInfo = {
            username: data.username,
            role: data.role,
            id: data.admin_id,
            permissions: data.permissions || []
        };
        adminAuthState.isLoggedIn = true;
        
        // 存储到本地存储
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminInfo', JSON.stringify(adminAuthState.adminInfo));
        
        // 更新UI
        updateAdminUI();
        
        return true;
    } catch (error) {
        console.error('管理员登录失败:', error);
        throw error;
    }
}

// 管理员登出
function adminLogout() {
    clearAdminAuth();
    // 重定向到登录页或显示登录模态框
    showLoginModal();
}

// 清除认证信息
function clearAdminAuth() {
    adminAuthState.isLoggedIn = false;
    adminAuthState.adminToken = null;
    adminAuthState.adminInfo = null;
    
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminInfo');
}

// 获取管理员认证头信息
function getAdminAuthHeaders() {
    if (!adminAuthState.adminToken) {
        return {};
    }
    
    return {
        'Authorization': `Bearer ${adminAuthState.adminToken}`
    };
}

// 检查是否已登录，未登录则显示登录模态框
function checkAdminAuth() {
    if (!adminAuthState.isLoggedIn) {
        showLoginModal();
        return false;
    }
    return true;
}

// 显示登录模态框
function showLoginModal() {
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    loginModal.show();
}

// 更新UI显示管理员信息
function updateAdminUI() {
    if (adminAuthState.isLoggedIn && adminAuthState.adminInfo) {
        // 更新管理员名称显示
        const adminNameElement = document.getElementById('adminName');
        if (adminNameElement) {
            adminNameElement.textContent = adminAuthState.adminInfo.username;
        }
    }
}

// 检查是否已登录
function isAdminLoggedIn() {
    return adminAuthState.isLoggedIn;
}

// 这部分已经在上面导出，不需要重复