/**
 * 管理后台系统设置模块
 * 处理系统设置的加载和保存
 */

// 导入adminAuth模块和API配置
import { adminAuth } from './admin-auth.js';
import adminAPI, { API_BASE_URL, ADMIN_API_BASE_URL } from './admin-api.js';

// 确保API配置可用
console.log('admin-settings.js中的API配置:', { API_BASE_URL, ADMIN_API_BASE_URL });
console.log('admin-settings.js中的adminAPI:', adminAPI);

// 初始化设置页面
async function initSettingsPage() {
    // 检查是否已登录
    if (!adminAuth.check()) return;
    
    try {
        // 加载系统设置数据
        await refreshSettingsData();
        
        // 设置事件监听器
        setupSettingsEventListeners();
    } catch (error) {
        console.error('初始化设置页面失败:', error);
        showErrorToast('初始化设置页面失败，请稍后重试');
    }
}

// 导出为全局变量，供其他模块使用
window.initSettingsPage = initSettingsPage;
window.refreshSettingsData = refreshSettingsData;
window.adminSettings = { init: initSettingsPage, refresh: refreshSettingsData };

// 刷新设置数据
async function refreshSettingsData() {
    try {
        // 获取系统设置数据
        const settings = await adminAPI.getSystemSettings();
        
        // 填充网站信息设置
        fillSiteSettings(settings.site || {});
        
        // 填充支付设置
        fillPaymentSettings(settings.payment || {});
        
        // 填充邮件设置
        fillMailSettings(settings.mail || {});
        
        // 填充安全设置
        fillSecuritySettings(settings.security || {});
    } catch (error) {
        console.error('加载系统设置失败:', error);
        showErrorToast('加载系统设置失败，请稍后重试');
    }
}

// 设置页面事件监听器
function setupSettingsEventListeners() {
    // 保存设置按钮点击事件
    document.getElementById('saveSettingsBtn').addEventListener('click', saveAllSettings);
    
    // 测试邮件按钮点击事件
    document.getElementById('testMailBtn').addEventListener('click', sendTestMail);
    
    // 上传Logo按钮点击事件
    const logoUploadBtn = document.querySelector('#siteLogo + .input-group-append button');
    if (logoUploadBtn) {
        logoUploadBtn.addEventListener('click', uploadSiteLogo);
    }
}

// 填充网站信息设置
function fillSiteSettings(siteSettings) {
    document.getElementById('siteName').value = siteSettings.name || '陳記六堡茶';
    document.getElementById('siteDescription').value = siteSettings.description || '陳記六堡茶 - 传承百年工艺，品味经典茶香';
    document.getElementById('contactEmail').value = siteSettings.contactEmail || 'contact@liubaotea.online';
    document.getElementById('contactPhone').value = siteSettings.contactPhone || '+86 123 4567 8901';
    document.getElementById('siteAddress').value = siteSettings.address || '广西梧州市六堡镇';
}

// 填充支付设置
function fillPaymentSettings(paymentSettings) {
    document.getElementById('enableWechatPay').checked = paymentSettings.enableWechatPay !== false;
    document.getElementById('enableAliPay').checked = paymentSettings.enableAliPay !== false;
    document.getElementById('enableBankTransfer').checked = paymentSettings.enableBankTransfer === true;
    document.getElementById('wechatPayAppId').value = paymentSettings.wechatPayAppId || 'wx123456789abcdef';
    document.getElementById('wechatPayMchId').value = paymentSettings.wechatPayMchId || '1234567890';
    document.getElementById('aliPayAppId').value = paymentSettings.aliPayAppId || '2021000000000000';
    document.getElementById('bankAccount').value = paymentSettings.bankAccount || '开户行：中国工商银行梧州分行\n账户名：陳記六堡茶有限公司\n账号：6222 0000 0000 0000';
}

// 填充邮件设置
function fillMailSettings(mailSettings) {
    document.getElementById('smtpServer').value = mailSettings.smtpServer || 'smtp.example.com';
    document.getElementById('smtpPort').value = mailSettings.smtpPort || '587';
    document.getElementById('smtpUsername').value = mailSettings.smtpUsername || 'noreply@liubaotea.online';
    document.getElementById('smtpPassword').value = mailSettings.smtpPassword ? '********' : '';
    document.getElementById('senderName').value = mailSettings.senderName || '陳記六堡茶';
    document.getElementById('senderEmail').value = mailSettings.senderEmail || 'noreply@liubaotea.online';
}

// 填充安全设置
function fillSecuritySettings(securitySettings) {
    document.getElementById('enableLoginCaptcha').checked = securitySettings.enableLoginCaptcha !== false;
    document.getElementById('enableLoginLimit').checked = securitySettings.enableLoginLimit !== false;
    document.getElementById('loginFailLimit').value = securitySettings.loginFailLimit || '5';
    document.getElementById('loginLockTime').value = securitySettings.loginLockTime || '30';
    document.getElementById('sessionTimeout').value = securitySettings.sessionTimeout || '120';
    document.getElementById('requireUppercase').checked = securitySettings.requireUppercase !== false;
    document.getElementById('requireLowercase').checked = securitySettings.requireLowercase !== false;
    document.getElementById('requireNumbers').checked = securitySettings.requireNumbers !== false;
    document.getElementById('requireSpecial').checked = securitySettings.requireSpecial !== false;
    document.getElementById('minPasswordLength').value = securitySettings.minPasswordLength || '8';
    document.getElementById('passwordExpireDays').value = securitySettings.passwordExpireDays || '90';
}

// 保存所有设置
async function saveAllSettings() {
    try {
        // 收集所有设置数据
        const settings = {
            site: collectSiteSettings(),
            payment: collectPaymentSettings(),
            mail: collectMailSettings(),
            security: collectSecuritySettings()
        };
        
        // 保存设置到服务器
        await adminAPI.saveSystemSettings(settings);
        
        showSuccessToast('系统设置保存成功');
    } catch (error) {
        console.error('保存系统设置失败:', error);
        showErrorToast('保存系统设置失败，请稍后重试');
    }
}

// 收集网站信息设置
function collectSiteSettings() {
    return {
        name: document.getElementById('siteName').value,
        description: document.getElementById('siteDescription').value,
        contactEmail: document.getElementById('contactEmail').value,
        contactPhone: document.getElementById('contactPhone').value,
        address: document.getElementById('siteAddress').value
    };
}

// 收集支付设置
function collectPaymentSettings() {
    return {
        enableWechatPay: document.getElementById('enableWechatPay').checked,
        enableAliPay: document.getElementById('enableAliPay').checked,
        enableBankTransfer: document.getElementById('enableBankTransfer').checked,
        wechatPayAppId: document.getElementById('wechatPayAppId').value,
        wechatPayMchId: document.getElementById('wechatPayMchId').value,
        aliPayAppId: document.getElementById('aliPayAppId').value,
        bankAccount: document.getElementById('bankAccount').value
    };
}

// 收集邮件设置
function collectMailSettings() {
    const settings = {
        smtpServer: document.getElementById('smtpServer').value,
        smtpPort: document.getElementById('smtpPort').value,
        smtpUsername: document.getElementById('smtpUsername').value,
        senderName: document.getElementById('senderName').value,
        senderEmail: document.getElementById('senderEmail').value
    };
    
    // 只有当密码字段不是占位符时才更新密码
    const password = document.getElementById('smtpPassword').value;
    if (password && password !== '********') {
        settings.smtpPassword = password;
    }
    
    return settings;
}

// 收集安全设置
function collectSecuritySettings() {
    return {
        enableLoginCaptcha: document.getElementById('enableLoginCaptcha').checked,
        enableLoginLimit: document.getElementById('enableLoginLimit').checked,
        loginFailLimit: document.getElementById('loginFailLimit').value,
        loginLockTime: document.getElementById('loginLockTime').value,
        sessionTimeout: document.getElementById('sessionTimeout').value,
        requireUppercase: document.getElementById('requireUppercase').checked,
        requireLowercase: document.getElementById('requireLowercase').checked,
        requireNumbers: document.getElementById('requireNumbers').checked,
        requireSpecial: document.getElementById('requireSpecial').checked,
        minPasswordLength: document.getElementById('minPasswordLength').value,
        passwordExpireDays: document.getElementById('passwordExpireDays').value
    };
}

// 上传网站Logo
async function uploadSiteLogo() {
    const fileInput = document.getElementById('siteLogo');
    if (!fileInput.files || fileInput.files.length === 0) {
        showErrorToast('请先选择要上传的Logo图片');
        return;
    }
    
    const file = fileInput.files[0];
    if (!file.type.startsWith('image/')) {
        showErrorToast('请选择有效的图片文件');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('logo', file);
        
        // 上传Logo
        const result = await adminAPI.uploadSiteLogo(formData);
        
        // 更新Logo预览
        const logoPreview = document.querySelector('#siteLogo + .mt-2 img');
        if (logoPreview && result.logoUrl) {
            logoPreview.src = result.logoUrl;
        }
        
        showSuccessToast('Logo上传成功');
    } catch (error) {
        console.error('上传Logo失败:', error);
        showErrorToast('上传Logo失败，请稍后重试');
    }
}

// 发送测试邮件
async function sendTestMail() {
    try {
        const testEmail = document.getElementById('senderEmail').value;
        if (!testEmail) {
            showErrorToast('请先填写发件人邮箱');
            return;
        }
        
        // 收集邮件设置
        const mailSettings = collectMailSettings();
        
        // 发送测试邮件
        await adminAPI.sendTestMail(mailSettings, testEmail);
        
        showSuccessToast('测试邮件发送成功，请检查邮箱');
    } catch (error) {
        console.error('发送测试邮件失败:', error);
        showErrorToast('发送测试邮件失败，请检查邮件设置');
    }
}

// 显示成功提示
function showSuccessToast(message) {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = 'toast align-items-center text-white bg-success border-0';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="bi bi-check-circle me-2"></i>${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // 自动移除
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// 显示错误提示
function showErrorToast(message) {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = 'toast align-items-center text-white bg-danger border-0';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="bi bi-exclamation-triangle me-2"></i>${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // 自动移除
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// 创建Toast容器
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(container);
    return container;
}

// 设置全局函数，供admin-main.js调用
window.initSettingsPage = initSettingsPage;
window.refreshSettingsData = refreshSettingsData;