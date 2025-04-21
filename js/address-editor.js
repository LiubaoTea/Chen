/**
 * 地址编辑器组件
 * 用于用户中心的地址管理功能
 * 实现省市区三级联动选择和地址编辑功能
 */

import { API_BASE_URL } from './config.js';

/**
 * 创建并显示地址编辑模态框
 * @param {Object|null} address - 要编辑的地址对象，为null时表示新增地址
 * @param {Function} onSuccess - 操作成功后的回调函数
 */
export async function showAddressEditor(address = null, onSuccess) {
    try {
        // 加载省市区数据
        const addressData = await import('../src/utils/data.json', { assert: { type: 'json' } });
        
        // 创建模态框遮罩
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        document.body.appendChild(overlay);
        
        // 创建地址编辑模态框
        const modal = document.createElement('div');
        modal.className = 'address-modal';
        modal.innerHTML = `
            <h3 class="address-modal-title">${address ? '编辑地址' : '新增地址'}</h3>
            <form id="addressForm" class="address-form">
                <div class="form-row">
                    <div class="form-group half-width">
                        <label for="recipientName">收货人姓名</label>
                        <input type="text" id="recipientName" name="recipient_name" value="${address?.recipient_name || ''}" required>
                    </div>
                    <div class="form-group half-width">
                        <label for="contactPhone">电话号码</label>
                        <input type="tel" id="contactPhone" name="contact_phone" value="${address?.contact_phone || ''}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group full-width">
                        <label>所在地区</label>
                        <div class="region-selects">
                            <select id="province" required>
                                <option value="">请选择省份</option>
                                ${Object.entries(addressData.default[86]).map(([code, name]) => 
                                    `<option value="${code}">${name}</option>`
                                ).join('')}
                            </select>
                            <select id="city" required>
                                <option value="">请选择城市</option>
                            </select>
                            <select id="district" required>
                                <option value="">请选择区县</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group full-width">
                        <label for="fullAddress">详细地址</label>
                        <textarea id="fullAddress" name="full_address" required>${address?.full_address || ''}</textarea>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group full-width">
                        <label for="postalCode">邮政编码</label>
                        <input type="text" id="postalCode" name="postal_code" value="${address?.postal_code || ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group full-width default-checkbox">
                        <input type="checkbox" id="isDefault" name="is_default" ${address?.is_default ? 'checked' : ''}>
                        <label for="isDefault">设为默认地址</label>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">${address ? '保存修改' : '添加地址'}</button>
                    <button type="button" class="btn btn-secondary" id="cancelBtn">取消</button>
                </div>
            </form>
        `;
        document.body.appendChild(modal);
        
        // 初始化省市区联动
        initRegionSelects(addressData.default, address);
        
        // 表单提交处理
        document.getElementById('addressForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const token = localStorage.getItem('userToken');
                if (!token) {
                    alert('登录已过期，请重新登录');
                    window.location.href = 'login.html';
                    return;
                }
                
                const formData = new FormData(e.target);
                const provinceSelect = document.getElementById('province');
                const citySelect = document.getElementById('city');
                const districtSelect = document.getElementById('district');
                
                const province = provinceSelect.options[provinceSelect.selectedIndex].text;
                const city = citySelect.options[citySelect.selectedIndex].text;
                const district = districtSelect.options[districtSelect.selectedIndex].text;
                
                if (!province || !city || !district) {
                    alert('请完整选择所在地区');
                    return;
                }
                
                const addressData = {
                    recipient_name: formData.get('recipient_name'),
                    contact_phone: formData.get('contact_phone'),
                    region: `${province} ${city} ${district}`,
                    full_address: formData.get('full_address'),
                    postal_code: formData.get('postal_code'),
                    is_default: formData.get('is_default') === 'on'
                };
                
                const addressId = address?.address_id;
                const response = await fetch(`${API_BASE_URL}/api/user/addresses${addressId ? `/${addressId}` : ''}`, {
                    method: addressId ? 'PUT' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(addressData)
                });
                
                if (!response.ok) {
                    throw new Error(addressId ? '更新地址失败' : '添加地址失败');
                }
                
                alert(addressId ? '地址更新成功' : '地址添加成功');
                closeModal();
                if (typeof onSuccess === 'function') {
                    onSuccess();
                }
            } catch (error) {
                console.error('地址操作失败:', error);
                alert('操作失败，请重试');
            }
        });
        
        // 关闭模态框函数
        function closeModal() {
            document.body.removeChild(modal);
            document.body.removeChild(overlay);
        }
        
        // 取消按钮事件
        document.getElementById('cancelBtn').addEventListener('click', closeModal);
        
        // 点击遮罩层关闭模态框
        overlay.addEventListener('click', closeModal);
        
    } catch (error) {
        console.error('显示地址编辑器失败:', error);
        alert('加载地址编辑器失败，请重试');
    }
}

/**
 * 初始化省市区三级联动选择器
 * @param {Object} regionData - 省市区数据
 * @param {Object|null} address - 要编辑的地址对象
 */
function initRegionSelects(regionData, address) {
    const provinceSelect = document.getElementById('province');
    const citySelect = document.getElementById('city');
    const districtSelect = document.getElementById('district');
    
    // 省份变化时更新城市
    provinceSelect.addEventListener('change', () => {
        const provinceCode = provinceSelect.value;
        citySelect.innerHTML = '<option value="">请选择城市</option>';
        districtSelect.innerHTML = '<option value="">请选择区县</option>';
        
        if (provinceCode && regionData[provinceCode]) {
            Object.entries(regionData[provinceCode]).forEach(([code, name]) => {
                citySelect.innerHTML += `<option value="${code}">${name}</option>`;
            });
        }
    });
    
    // 城市变化时更新区县
    citySelect.addEventListener('change', () => {
        const cityCode = citySelect.value;
        districtSelect.innerHTML = '<option value="">请选择区县</option>';
        
        if (cityCode && regionData[cityCode]) {
            Object.entries(regionData[cityCode]).forEach(([code, name]) => {
                districtSelect.innerHTML += `<option value="${code}">${name}</option>`;
            });
        }
    });
    
    // 如果是编辑模式，设置已选择的地区
    if (address && address.region) {
        const [province, city, district] = address.region.split(' ');
        
        // 设置省份
        const provinceOption = Array.from(provinceSelect.options)
            .find(option => option.text === province);
        if (provinceOption) {
            provinceSelect.value = provinceOption.value;
            provinceSelect.dispatchEvent(new Event('change'));
            
            // 设置城市
            setTimeout(() => {
                const cityOption = Array.from(citySelect.options)
                    .find(option => option.text === city);
                if (cityOption) {
                    citySelect.value = cityOption.value;
                    citySelect.dispatchEvent(new Event('change'));
                    
                    // 设置区县
                    setTimeout(() => {
                        const districtOption = Array.from(districtSelect.options)
                            .find(option => option.text === district);
                        if (districtOption) {
                            districtSelect.value = districtOption.value;
                        }
                    }, 100);
                }
            }, 100);
        }
    }
}

/**
 * 设置默认地址
 * @param {string} addressId - 地址ID
 * @param {Function} onSuccess - 操作成功后的回调函数
 */
export async function setDefaultAddress(addressId, onSuccess) {
    try {
        const token = localStorage.getItem('userToken');
        const response = await fetch(`${API_BASE_URL}/api/user/addresses/${addressId}/default`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('设置默认地址失败');
        }
        
        alert('默认地址设置成功');
        if (typeof onSuccess === 'function') {
            onSuccess();
        }
    } catch (error) {
        console.error('设置默认地址失败:', error);
        alert('设置失败，请重试');
    }
}

/**
 * 删除地址
 * @param {string} addressId - 地址ID
 * @param {Function} onSuccess - 操作成功后的回调函数
 */
export async function deleteAddress(addressId, onSuccess) {
    if (!confirm('确定要删除这个地址吗？')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('userToken');
        const response = await fetch(`${API_BASE_URL}/api/user/addresses/${addressId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('删除地址失败');
        }
        
        alert('地址删除成功');
        if (typeof onSuccess === 'function') {
            onSuccess();
        }
    } catch (error) {
        console.error('删除地址失败:', error);
        alert('删除失败，请重试');
    }
}

/**
 * 加载用户地址列表
 * @returns {Promise<Array>} 地址列表
 */
export async function loadUserAddresses() {
    try {
        const token = localStorage.getItem('userToken');
        const response = await fetch(`${API_BASE_URL}/api/user/addresses`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('获取地址列表失败');
        }
        
        return await response.json();
    } catch (error) {
        console.error('加载地址列表失败:', error);
        throw error;
    }
}