// 从api.js导入用户认证相关函数
import { loginUser, registerUser } from './api.js';

// 重新导出这些函数，使其他模块可以通过auth.js访问
export { loginUser, registerUser };

// 用户认证状态检查
export function checkAuthStatus() {
    // 检查本地存储中是否有用户token
    const token = localStorage.getItem('userToken');
    if (!token) {
        // 如果没有token，重定向到登录页面
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// 跳转到用户中心
function goToUserCenter() {
    if (checkAuthStatus()) {
        window.location.href = 'user-center.html';
    }
    // 如果未登录，checkAuthStatus会重定向到登录页面
}

// 事件监听器设置
document.addEventListener('DOMContentLoaded', () => {
    // 用户图标和用户中心链接的事件监听已经足够，不需要重复的二维码显示逻辑

    // 设置用户图标的点击事件
    const userIcon = document.getElementById('userToggle');
    if (userIcon) {
        userIcon.onclick = (e) => {
            e.preventDefault();
            goToUserCenter();
        };
    }
    
    // 设置用户中心导航链接的点击事件
    const userCenterLinks = document.querySelectorAll('a[href="user-center.html"]');
    userCenterLinks.forEach(link => {
        link.onclick = (e) => {
            // 只有在非用户中心页面才需要阻止默认行为并检查登录状态
            if (!window.location.href.includes('user-center.html')) {
                e.preventDefault();
                goToUserCenter();
            }
        };
    });
});