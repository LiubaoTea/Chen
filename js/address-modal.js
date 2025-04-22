// 导入API基础URL
import { API_BASE_URL } from './config.js';

// 创建地址模态框HTML
const modalHtml = `
<div id="addressModal" class="modal">
    <div class="modal-content">
        <span class="close">&times;</span>
        <h2>收货地址</h2>
        <form id="addressForm">
            <input type="hidden" id="addressId">
            <div class="form-group">
                <label for="recipient_name">收货人</label>
                <input type="text" id="recipient_name" required>
            </div>
            <div class="form-group">
                <label for="contact_phone">联系电话</label>
                <input type="tel" id="contact_phone" required>
            </div>
            <div class="form-group">
                <label for="region">所在地区</label>
                <input type="text" id="region" required>
            </div>
            <div class="form-group">
                <label for="full_address">详细地址</label>
                <textarea id="full_address" required></textarea>
            </div>
            <div class="form-group">
                <label for="postal_code">邮政编码</label>
                <input type="text" id="postal_code" required>
            </div>
            <div class="form-group checkbox">
                <input type="checkbox" id="is_default">
                <label for="is_default">设为默认地址</label>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn-primary">保存</button>
                <button type="button" class="btn-secondary" onclick="closeAddressModal()">取消</button>
            </div>
        </form>
    </div>
</div>
`;

// 初始化模态框
function initAddressModal() {
    // 如果模态框已存在，则不重复创建
    if (document.getElementById('addressModal')) return;

    // 将模态框HTML添加到页面
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // 获取模态框元素
    const modal = document.getElementById('addressModal');
    const closeBtn = modal.querySelector('.close');
    const form = document.getElementById('addressForm');

    // 关闭按钮事件
    closeBtn.onclick = closeAddressModal;

    // 点击模态框外部关闭
    window.onclick = (event) => {
        if (event.target === modal) {
            closeAddressModal();
        }
    };

    // 表单提交事件
    form.onsubmit = handleAddressSubmit;
}

// 显示地址模态框
export function showAddressModal(address = null) {
    initAddressModal();
    const modal = document.getElementById('addressModal');
    const form = document.getElementById('addressForm');

    // 重置表单
    form.reset();

    // 如果是编辑模式，填充地址信息
    if (address) {
        document.getElementById('addressId').value = address.address_id;
        document.getElementById('recipient_name').value = address.recipient_name;
        document.getElementById('contact_phone').value = address.contact_phone;
        document.getElementById('region').value = address.region;
        document.getElementById('full_address').value = address.full_address;
        document.getElementById('postal_code').value = address.postal_code;
        document.getElementById('is_default').checked = address.is_default === 1;
    }

    modal.style.display = 'block';
}

// 关闭地址模态框
export function closeAddressModal() {
    const modal = document.getElementById('addressModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 处理地址表单提交
async function handleAddressSubmit(event) {
    event.preventDefault();

    const addressId = document.getElementById('addressId').value;
    const addressData = {
        recipient_name: document.getElementById('recipient_name').value,
        contact_phone: document.getElementById('contact_phone').value,
        region: document.getElementById('region').value,
        full_address: document.getElementById('full_address').value,
        postal_code: document.getElementById('postal_code').value,
        is_default: document.getElementById('is_default').checked ? 1 : 0
    };

    try {
        const token = localStorage.getItem('userToken');
        const url = addressId
            ? `${API_BASE_URL}/api/user/addresses/${addressId}`
            : `${API_BASE_URL}/api/user/addresses`;
        
        const response = await fetch(url, {
            method: addressId ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(addressData)
        });

        if (!response.ok) {
            throw new Error('保存地址失败');
        }

        closeAddressModal();
        // 重新加载地址列表
        await loadAddresses();

    } catch (error) {
        console.error('保存地址失败:', error);
        alert('保存地址失败，请重试');
    }
}