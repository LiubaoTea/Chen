/**
 * 管理后台认证模块
 * 处理管理员登录、登出和权限验证
 * 使用D1数据库中的admins表进行管理员认证
 */

// 导入API基础URL配置
import config from '../config.js';
import adminConfig, { ADMIN_API_BASE_URL } from './admin-config.js';

// 解构导入的配置
const { API_BASE_URL } = config;
const { ADMIN_API_BASE_URL } = adminConfig;
console.log('加载admin-auth.js，配置:', config);
console.log('加载admin-config.js中的配置:', adminConfig);

// 清理API URL，移除所有可能的特殊字符和多余空格
let cleanApiBaseUrl = API_BASE_URL ? API_BASE_URL.toString().replace(/[`\s]/g, '') : '';
let cleanAdminApiBaseUrl = ADMIN_API_BASE_URL ? ADMIN_API_BASE_URL.toString().replace(/[`\s]/g, '') : '';

// 确保ADMIN_API_BASE_URL已定义
const ADMIN_API_URL = cleanAdminApiBaseUrl || cleanApiBaseUrl;

console.log('API URL清理过程:', {
    原始API_BASE_URL: API_BASE_URL,
    原始ADMIN_API_BASE_URL: ADMIN_API_BASE_URL,
    清理后API_BASE_URL: cleanApiBaseUrl,
    清理后ADMIN_API_BASE_URL: cleanAdminApiBaseUrl,
    最终ADMIN_API_URL: ADMIN_API_URL
});

// 确保全局可访问API配置
if (typeof window !== 'undefined') {
    window.API_BASE_URL = cleanApiBaseUrl;
    window.ADMIN_API_BASE_URL = cleanAdminApiBaseUrl;
    window.ADMIN_API_URL = ADMIN_API_URL;
}

console.log('admin-auth.js中的配置:', {
    API_BASE_URL,
    ADMIN_API_BASE_URL,
    ADMIN_API_URL
});

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
export default adminAuthObj;

// 确保全局可访问adminAuth
if (typeof window !== 'undefined') {
    window.adminAuth = adminAuthObj;
}

// 管理员登录
async function adminLogin(username, password) {
    try {
        // 使用已清理的API地址
        console.log('清理后的API地址:', window.ADMIN_API_BASE_URL);
        
        // 构建完整的API URL
        let loginUrl = window.ADMIN_API_BASE_URL || window.ADMIN_API_URL || window.API_BASE_URL || '';
        
        // 确保loginUrl不为空
        if (!loginUrl) {
            console.error('错误: API URL未定义，使用默认URL');
            loginUrl = 'https://www.liubaotea.online';
        }
        
        // 移除URL末尾的斜杠
        loginUrl = loginUrl.replace(/\/$/, '');
        
        // 添加路径 - 根据functions目录结构，正确的路径是/api/admin/login
        loginUrl += '/api/admin/login';
        
        console.log('完整登录URL:', loginUrl);
        console.log('URL类型:', typeof loginUrl);
        
        // 调用后端API验证管理员凭据
        // 后端API会查询D1数据库中的admins表进行验证
        const response = await fetch(loginUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        console.log('登录响应状态:', response.status);
        
        // 检查响应状态
        if (!response.ok) {
            let errorMessage = `登录失败 (${response.status})`;
            try {
                const errorData = await response.json();
                if (errorData && errorData.error) {
                    errorMessage = errorData.error;
                }
            } catch (e) {
                console.error('解析错误响应失败:', e);
            }
            console.error('登录失败:', errorMessage);
            throw new Error(errorMessage);
        }
        
        let data;
        try {
            data = await response.json();
            console.log('登录响应数据:', data);
        } catch (e) {
            console.error('解析响应JSON失败:', e);
            throw new Error('服务器响应格式错误');
        }
        
        if (!data || !data.token) {
            console.error('登录响应缺少token');
            throw new Error('登录响应缺少必要信息');
        }
        
        // 保存认证信息
        adminAuthState.adminToken = data.token;
        adminAuthState.adminInfo = {
            username: data.username || username,
            role: data.role || 'admin',
            id: data.admin_id || 0,
            permissions: data.permissions || []
        };
        adminAuthState.isLoggedIn = true;
        
        // 存储到本地存储
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminInfo', JSON.stringify(adminAuthState.adminInfo));
        
        console.log('认证信息已保存到本地存储');
        
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