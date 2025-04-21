import { API_BASE_URL } from './config.js';

// 加载省市区数据
let areaData = null;

// 初始化地址管理功能
export async function initAddressManagement() {
    try {
        // 加载省市区数据
        const response = await fetch('/src/utils/data.json');
        areaData = await response.json();
        
        // 显示地址列表
        await showAddressList();
        
        // 初始化添加地址按钮
        initAddAddressButton();
        
        // 初始化侧边栏
        initAddressSidebar();
    } catch (error) {
        console.error('初始化地址管理失败:', error);
    }
}

// 显示地址列表
async function showAddressList() {
    const contentArea = document.getElementById('contentArea');
    try {
        const token = localStorage.getItem('userToken');
        const response = await fetch(`${API_BASE_URL}/api/addresses`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('获取地址列表失败');
        }

        const addresses = await response.json();
        
        contentArea.innerHTML = `
            <h3>收货地址管理</h3>
            <div class="address-list">
                ${addresses.length === 0 ? '<p>暂无收货地址</p>' : ''}
                ${addresses.map(address => `
                    <div class="address-item ${address.is_default ? 'default' : ''}">
                        <div class="address-info">
                            <p><strong>${address.recipient_name}</strong> ${address.contact_phone}</p>
                            <p>${address.region} ${address.full_address} ${address.postal_code || ''}</p>
                        </div>
                        <div class="address-actions">
                            ${address.is_default ? 
                                '<span class="default-tag">已默认</span>' : 
                                `<button class="set-default-btn" data-id="${address.address_id}">设为默认</button>`
                            }
                            <button class="edit-btn" data-id="${address.address_id}">编辑</button>
                            <button class="delete-btn" data-id="${address.address_id}">删除</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <button id="addAddressBtn" class="add-address-btn">添加地址</button>
        `;

        // 绑定地址操作事件
        bindAddressActions();
    } catch (error) {
        console.error('加载地址列表失败:', error);
        contentArea.innerHTML = '<div class="error">加载地址列表失败，请重试</div>';
    }
}

// 初始化添加地址按钮
function initAddAddressButton() {
    document.addEventListener('click', (e) => {
        if (e.target.id === 'addAddressBtn') {
            showAddressForm();
        }
    });
}

// 初始化地址编辑侧边栏
function initAddressSidebar() {
    // 添加侧边栏HTML
    const sidebar = document.createElement('div');
    sidebar.className = 'address-sidebar';
    sidebar.innerHTML = `
        <div class="address-sidebar-header">
            <h3 class="address-sidebar-title">编辑地址</h3>
            <button class="close-sidebar">×</button>
        </div>
        <form id="addressForm" class="address-form">
            <input type="hidden" id="addressId">
            <div class="form-group">
                <label for="recipientName">收货人</label>
                <input type="text" id="recipientName" required>
            </div>
            <div class="form-group">
                <label for="contactPhone">联系电话</label>
                <input type="tel" id="contactPhone" required>
            </div>
            <div class="form-group">
                <label>所在地区</label>
                <div class="region-selects">
                    <select id="province" required></select>
                    <select id="city" required></select>
                    <select id="district" required></select>
                </div>
            </div>
            <div class="form-group">
                <label for="fullAddress">详细地址</label>
                <input type="text" id="fullAddress" required>
            </div>
            <div class="form-group">
                <label for="postalCode">邮政编码</label>
                <input type="text" id="postalCode">
            </div>
            <div class="default-checkbox">
                <input type="checkbox" id="isDefault">
                <label for="isDefault">设为默认地址</label>
            </div>
            <div class="form-actions">
                <button type="submit" class="submit-btn">保存</button>
                <button type="button" class="cancel-btn">取消</button>
            </div>
        </form>
    `;
    document.body.appendChild(sidebar);

    // 绑定关闭按钮事件
    sidebar.querySelector('.close-sidebar').addEventListener('click', hideAddressForm);
    sidebar.querySelector('.cancel-btn').addEventListener('click', hideAddressForm);

    // 绑定表单提交事件
    document.getElementById('addressForm').addEventListener('submit', handleAddressSubmit);

    // 绑定省市区联动事件
    initAreaSelects();
}

// 显示地址表单
function showAddressForm(addressId = null) {
    const sidebar = document.querySelector('.address-sidebar');
    const form = document.getElementById('addressForm');
    
    // 重置表单
    form.reset();
    document.getElementById('addressId').value = addressId || '';
    
    // 如果是编辑，加载地址数据
    if (addressId) {
        loadAddressData(addressId);
    }
    
    // 显示侧边栏
    sidebar.classList.add('active');
}

// 隐藏地址表单
function hideAddressForm() {
    const sidebar = document.querySelector('.address-sidebar');
    sidebar.classList.remove('active');
}

// 初始化省市区选择器
function initAreaSelects() {
    const provinceSelect = document.getElementById('province');
    const citySelect = document.getElementById('city');
    const districtSelect = document.getElementById('district');

    // 加载省份数据
    const provinces = areaData['86'];
    provinceSelect.innerHTML = '<option value="">请选择省份</option>' +
        Object.entries(provinces).map(([code, name]) =>
            `<option value="${code}">${name}</option>`
        ).join('');

    // 省份变化时加载城市
    provinceSelect.addEventListener('change', () => {
        const provinceCode = provinceSelect.value;
        const cities = areaData[provinceCode] || {};
        
        citySelect.innerHTML = '<option value="">请选择城市</option>' +
            Object.entries(cities).map(([code, name]) =>
                `<option value="${code}">${name}</option>`
            ).join('');
        
        citySelect.disabled = false;
        districtSelect.innerHTML = '<option value="">请选择区县</option>';
        districtSelect.disabled = true;
    });

    // 城市变化时加载区县
    citySelect.addEventListener('change', () => {
        const cityCode = citySelect.value;
        const districts = areaData[cityCode] || {};
        
        districtSelect.innerHTML = '<option value="">请选择区县</option>' +
            Object.entries(districts).map(([code, name]) =>
                `<option value="${code}">${name}</option>`
            ).join('');
        
        districtSelect.disabled = false;
    });
}

// 加载地址数据
async function loadAddressData(addressId) {
    try {
        const token = localStorage.getItem('userToken');
        const response = await fetch(`${API_BASE_URL}/api/addresses/${addressId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('获取地址数据失败');
        }

        const address = await response.json();
        
        // 填充表单数据
        document.getElementById('recipientName').value = address.recipient_name;
        document.getElementById('contactPhone').value = address.contact_phone;
        document.getElementById('fullAddress').value = address.full_address;
        document.getElementById('postalCode').value = address.postal_code || '';
        document.getElementById('isDefault').checked = address.is_default;

        // 设置省市区
        const [province, city, district] = address.region.split(' ');
        // TODO: 根据名称查找对应的code并设置选择器的值
    } catch (error) {
        console.error('加载地址数据失败:', error);
        alert('加载地址数据失败，请重试');
        hideAddressForm();
    }
}

// 处理地址表单提交
async function handleAddressSubmit(e) {
    e.preventDefault();
    
    try {
        const addressId = document.getElementById('addressId').value;
        const provinceSelect = document.getElementById('province');
        const citySelect = document.getElementById('city');
        const districtSelect = document.getElementById('district');

        const addressData = {
            recipient_name: document.getElementById('recipientName').value,
            contact_phone: document.getElementById('contactPhone').value,
            region: `${provinceSelect.options[provinceSelect.selectedIndex].text} ${citySelect.options[citySelect.selectedIndex].text} ${districtSelect.options[districtSelect.selectedIndex].text}`,
            full_address: document.getElementById('fullAddress').value,
            postal_code: document.getElementById('postalCode').value,
            is_default: document.getElementById('isDefault').checked ? 1 : 0
        };

        const token = localStorage.getItem('userToken');
        const url = addressId ?
            `${API_BASE_URL}/api/addresses/${addressId}` :
            `${API_BASE_URL}/api/addresses`;

        const response = await fetch(url, {
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

        hideAddressForm();
        await showAddressList();
    } catch (error) {
        console.error('保存地址失败:', error);
        alert('保存失败，请重试');
    }
}

// 绑定地址操作事件
function bindAddressActions() {
    // 设为默认地址
    document.querySelectorAll('.set-default-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const addressId = e.target.dataset.id;
            try {
                const token = localStorage.getItem('userToken');
                // 先获取当前地址的完整信息
                const getResponse = await fetch(`${API_BASE_URL}/api/addresses/${addressId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!getResponse.ok) {
                    throw new Error('获取地址信息失败');
                }

                const addressData = await getResponse.json();
                // 更新默认状态
                addressData.is_default = 1;

                const response = await fetch(`${API_BASE_URL}/api/addresses/${addressId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(addressData)
                });

                if (!response.ok) {
                    throw new Error('设置默认地址失败');
                }

                await showAddressList();
            } catch (error) {
                console.error('设置默认地址失败:', error);
                alert('设置失败，请重试');
            }
        });
    });

    // 编辑地址
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const addressId = e.target.dataset.id;
            showAddressForm(addressId);
        });
    });

    // 删除地址
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const addressId = e.target.dataset.id;
            if (confirm('确定要删除这个地址吗？')) {
                try {
                    const token = localStorage.getItem('userToken');
                    const response = await fetch(`${API_BASE_URL}/api/addresses/${addressId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (!response.ok) {
                        throw new Error('删除地址失败');
                    }

                    await showAddressList();
                } catch (error) {
                    console.error('删除地址失败:', error);
                    alert('删除失败，请重试');
                }
            }
        });
    });
}