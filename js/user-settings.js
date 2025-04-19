// 用户设置和个人资料管理
import { API_BASE_URL } from './config.js';

// 更新用户个人资料
export async function updateUserProfile(profileData) {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            throw new Error('未登录');
        }

        const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(profileData)
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || '更新个人资料失败');
        }

        // 更新本地存储的用户信息
        if (profileData.username) localStorage.setItem('username', profileData.username);
        if (profileData.email) localStorage.setItem('userEmail', profileData.email);

        return data;
    } catch (error) {
        console.error('更新个人资料错误:', error);
        throw error;
    }
}

// 更新用户安全设置
export async function updateSecuritySettings(securityData) {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            throw new Error('未登录');
        }

        const response = await fetch(`${API_BASE_URL}/api/user/security`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(securityData)
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || '更新安全设置失败');
        }

        return data;
    } catch (error) {
        console.error('更新安全设置错误:', error);
        throw error;
    }
}

// 加载用户个人资料
export async function loadUserProfile() {
    try {
        const token = localStorage.getItem('userToken');
        if (!token) {
            throw new Error('未登录');
        }

        const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || '获取个人资料失败');
        }

        // 更新页面显示
        document.getElementById('username').textContent = data.username;
        document.getElementById('userEmail').textContent = data.email;
        document.getElementById('userPhone').textContent = data.phone_number || '未设置';
        document.getElementById('userId').textContent = data.user_id;

        return data;
    } catch (error) {
        console.error('获取个人资料错误:', error);
        throw error;
    }
}

// 初始化用户设置页面
export function initializeUserSettings() {
    // 加载个人资料
    loadUserProfile().catch(error => {
        console.error('加载个人资料失败:', error);
        alert('加载个人资料失败，请稍后重试');
    });

    // 绑定表单提交事件
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(profileForm);
            const profileData = {
                username: formData.get('username'),
                email: formData.get('email'),
                phone_number: formData.get('phone')
            };

            try {
                await updateUserProfile(profileData);
                alert('个人资料更新成功');
                loadUserProfile(); // 重新加载显示
            } catch (error) {
                alert('更新失败：' + error.message);
            }
        });
    }
}