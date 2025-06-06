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

console.log('加载admin-auth.js，配置:', {
    API_BASE_URL,
    ADMIN_API_BASE_URL
});

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
    adminInfo: null,
    expiresAt: null,
    username: null,
    adminId: null
};

// 初始化认证状态
function initAdminAuth() {
    // 从本地存储中获取管理员令牌
    const storedToken = localStorage.getItem('admin_token');
    const storedExpiresAt = localStorage.getItem('admin_expires_at');
    const storedUsername = localStorage.getItem('admin_username');
    const storedAdminId = localStorage.getItem('admin_id');
    
    if (storedToken && storedExpiresAt && storedUsername) {
        try {
            // 检查token是否过期
            if (storedExpiresAt && new Date().getTime() > parseInt(storedExpiresAt)) {
                console.warn('管理员token已过期，执行自动登出');
                clearAdminAuth();
                return false;
            }
            
            adminAuthState.adminToken = storedToken;
            adminAuthState.expiresAt = storedExpiresAt;
            adminAuthState.username = storedUsername;
            adminAuthState.adminId = storedAdminId;
            adminAuthState.isLoggedIn = true;
            
            // 构建adminInfo对象
            adminAuthState.adminInfo = {
                username: storedUsername,
                id: storedAdminId,
                role: 'admin', // 默认角色，可以根据需要从后端获取
                permissions: []
            };
            
            console.log('成功恢复管理员会话:', {
                username: storedUsername,
                expiresAt: new Date(parseInt(storedExpiresAt)).toLocaleString()
            });
            
            // 更新UI显示管理员信息
            // 确保DOM已加载
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                updateAdminUI();
            } else {
                document.addEventListener('DOMContentLoaded', updateAdminUI);
            }
            
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

// 获取管理员ID
function getAdminId() {
    return adminAuthState.adminId;
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
    getAdminId: getAdminId,
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
        adminAuthState.expiresAt = data.expiresAt || null;
        adminAuthState.username = data.username || username;
        adminAuthState.adminId = data.admin_id || null;
        adminAuthState.isLoggedIn = true;
        
        // 存储到本地存储
        localStorage.setItem('admin_token', data.token);
        localStorage.setItem('admin_expires_at', data.expiresAt ? data.expiresAt.toString() : null);
        localStorage.setItem('admin_username', data.username || username);
        if (data.admin_id) {
            localStorage.setItem('admin_id', data.admin_id.toString());
        }
        
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
    adminAuthState.expiresAt = null;
    adminAuthState.username = null;
    adminAuthState.adminId = null;
    
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_expires_at');
    localStorage.removeItem('admin_username');
    localStorage.removeItem('admin_id');
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
    // 检查是否为登录页面
    const isLoginPage = window.isLoginPage === true || 
                      window.location.pathname.includes('login.html') || 
                      window.location.pathname.endsWith('/admin/');
    
    console.log('checkAdminAuth 检查登录状态:', 
                '是否登录页:', isLoginPage, 
                '当前路径:', window.location.pathname, 
                '登录状态:', adminAuthState.isLoggedIn);
    
    // 如果未登录
    if (!adminAuthState.isLoggedIn) {
        // 在登录页不做处理，其他页面重定向到登录页
        if (!isLoginPage) {
            console.log('非登录页面，未登录状态，重定向到登录页');
            redirectToLogin();
        } else {
            console.log('已在登录页面，不进行重定向');
        }
        return false;
    }
    
    // 检查token是否过期
    if (adminAuthState.expiresAt && new Date().getTime() > parseInt(adminAuthState.expiresAt)) {
        console.warn('管理员token已过期，执行自动登出');
        clearAdminAuth();
        if (!isLoginPage) {
            redirectToLogin();
        }
        return false;
    }
    
    return true;
}

// 重定向到登录页面函数
function redirectToLogin() {
    // 检查当前是否为登录页面
    const isLoginPage = document.querySelector('meta[name="page-type"][content="login-page"]') !== null || 
        window.isLoginPage === true || 
        window.location.pathname.includes('login.html') || 
        window.location.pathname.endsWith('/admin/');
    
    // 防止在登录页面调用
    if (isLoginPage) {
        console.warn('已在登录页面，取消重定向');
        return;
    }
    
    console.log('执行重定向到登录页面');
    
    // 使用替换方式重定向，不留下历史记录，减少循环可能性
    window.location.replace('./login.html');
}

// 显示登录模态框 - 改为直接重定向
function showLoginModal() {
    // 如果在登录页面或已标记为登录页面，则不重定向
    if (window.isLoginPage === true || 
        window.location.pathname.includes('login.html') || 
        window.location.pathname.endsWith('/admin/')) {
        console.log('已在登录页面，不进行重定向');
        return;
    }
    
    // 直接调用重定向函数
    redirectToLogin();
}

// 更新UI显示管理员信息
function updateAdminUI() {
    if (!adminAuthState.isLoggedIn || !adminAuthState.username) {
        return;
    }
    
    try {
        // 更新管理员名称显示
        const adminNameElement = document.getElementById('adminName');
        if (adminNameElement) {
            adminNameElement.textContent = adminAuthState.username;
        }
        
        // 更新导航栏管理员名称
        const dropdownAdminName = document.getElementById('adminDropdown');
        if (dropdownAdminName) {
            const nameSpan = dropdownAdminName.querySelector('span');
            if (nameSpan) {
                nameSpan.textContent = adminAuthState.username;
            } else {
                // 如果span不存在，更新按钮文本
                let iconHtml = '';
                const icon = dropdownAdminName.querySelector('i');
                if (icon) {
                    iconHtml = icon.outerHTML + ' ';
                }
                dropdownAdminName.innerHTML = `${iconHtml}<span id="adminName">${adminAuthState.username}</span>`;
            }
        }
    } catch (error) {
        console.error('更新管理员UI失败:', error);
    }
}

// 检查是否已登录
function isAdminLoggedIn() {
    // 检查是否为登录页面
    const isLoginPage = document.querySelector('meta[name="page-type"][content="login-page"]') !== null || 
                      window.isLoginPage === true || 
                      window.location.pathname.includes('login.html') || 
                      window.location.pathname.endsWith('/admin/');
    
    console.log('isAdminLoggedIn 检查登录状态:', 
                '是否登录页:', isLoginPage, 
                '当前路径:', window.location.pathname, 
                '登录状态:', adminAuthState.isLoggedIn);
    
    // 如果是登录页面，只返回登录状态不做重定向
    if (isLoginPage) {
        return adminAuthState.isLoggedIn;
    }
    
    // 读取本地存储的token，手动检查而不依赖adminAuthState
    const token = localStorage.getItem('admin_token');
    const expiresAt = localStorage.getItem('admin_expires_at');
    const tokenValid = token && expiresAt && parseInt(expiresAt) > Date.now();
    
    // 如果token有效，更新内存中的登录状态
    if (tokenValid && !adminAuthState.isLoggedIn) {
        adminAuthState.isLoggedIn = true;
        adminAuthState.adminToken = token;
        adminAuthState.expiresAt = expiresAt;
        adminAuthState.username = localStorage.getItem('admin_username');
        adminAuthState.adminId = localStorage.getItem('admin_id');
    }
    
    // 非登录页面，检查登录状态
    if (!tokenValid && !isLoginPage) {
        redirectToLogin();
        return false;
    }
    
    return adminAuthState.isLoggedIn;
}

// 这部分已经在上面导出，不需要重复