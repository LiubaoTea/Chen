// 用户认证状态检查
// 检查认证状态
export function checkAuthStatus() {
    const token = localStorage.getItem('userToken');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// 跳转到用户中心
export function goToUserCenter() {
    if (checkAuthStatus()) {
        window.location.href = 'user-center.html';
    }
}

// 初始化认证相关的事件监听器
export function initAuthListeners() {
    const userIcon = document.getElementById('userToggle');
    if (userIcon) {
        userIcon.onclick = (e) => {
            e.preventDefault();
            goToUserCenter();
        };
    }
    
    const userCenterLinks = document.querySelectorAll('a[href="user-center.html"]');
    userCenterLinks.forEach(link => {
        link.onclick = (e) => {
            if (!window.location.href.includes('user-center.html')) {
                e.preventDefault();
                goToUserCenter();
            }
        };
    });
}

// 自动初始化认证监听器
document.addEventListener('DOMContentLoaded', initAuthListeners);