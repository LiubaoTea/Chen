// 导入API基础URL和地址选择器
import { API_BASE_URL } from './config.js';

// 声明省市区数据变量
let addressData = {};

// 初始化省市区选择器
function initAddressSelector() {
    const provinceSelect = document.getElementById('province');
    const citySelect = document.getElementById('city');
    const districtSelect = document.getElementById('district');

    // 加载省份数据
    const provinces = addressData['86'];
    for (const code in provinces) {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = provinces[code];
        provinceSelect.appendChild(option);
    }

    // 省份选择事件
    provinceSelect.addEventListener('change', () => {
        citySelect.innerHTML = '<option value="">请选择城市</option>';
        districtSelect.innerHTML = '<option value="">请选择区县</option>';
        
        const cities = addressData[provinceSelect.value];
        if (cities) {
            for (const code in cities) {
                const option = document.createElement('option');
                option.value = code;
                option.textContent = cities[code];
                citySelect.appendChild(option);
            }
        }
    });

    // 城市选择事件
    citySelect.addEventListener('change', () => {
        districtSelect.innerHTML = '<option value="">请选择区县</option>';
        
        const districts = addressData[citySelect.value];
        if (districts) {
            for (const code in districts) {
                const option = document.createElement('option');
                option.value = code;
                option.textContent = districts[code];
                districtSelect.appendChild(option);
            }
        }
    });
}

// 显示地址表单
async function showAddressForm(addressId = null) {
    const formContainer = document.getElementById('addressFormContainer');
    const formTitle = document.getElementById('addressFormTitle');
    
    // 重置表单
    document.getElementById('addressForm').reset();
    document.getElementById('addressId').value = '';
    
    // 初始化地址选择器
    import('./address-selector.js')
        .then(module => {
            module.initAddressSelector();
        })
        .catch(error => {
            console.error('加载地址选择器失败:', error);
        });
    
    if (addressId) {
        formTitle.textContent = '编辑地址';
        try {
            const token = localStorage.getItem('userToken');
            const response = await fetch(`${API_BASE_URL}/api/user/addresses/${addressId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('获取地址信息失败');
            }
            
            const address = await response.json();
            
            // 填充表单数据
            document.getElementById('addressId').value = addressId;
            document.getElementById('recipient_name').value = address.recipient_name;
            document.getElementById('contact_phone').value = address.contact_phone;
            document.getElementById('full_address').value = address.full_address;
            document.getElementById('postal_code').value = address.postal_code || '';
            document.getElementById('is_default').checked = address.is_default;
            
            // 解析并设置地区信息
            const [province, city, district] = address.region.split(' ');
            document.getElementById('province').value = province;
            // 等待地址选择器初始化完成后再设置值
            setTimeout(() => {
                const provinceSelect = document.getElementById('province');
                provinceSelect.dispatchEvent(new Event('change'));
                
                setTimeout(() => {
                    const citySelect = document.getElementById('city');
                    citySelect.value = city;
                    citySelect.dispatchEvent(new Event('change'));
                    
                    setTimeout(() => {
                        const districtSelect = document.getElementById('district');
                        districtSelect.value = district;
                    }, 100);
                }, 100);
            }, 100);
        } catch (error) {
            console.error('加载地址信息失败:', error);
            alert('加载地址信息失败，请重试');
            return;
        }
    } else {
        formTitle.textContent = '添加新地址';
    }
    
    // 显示表单
    formContainer.classList.add('show');
    
    // 添加遮罩层
    let overlay = document.getElementById('addressOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'addressOverlay';
        overlay.className = 'address-overlay';
        document.body.appendChild(overlay);
    }
    overlay.classList.add('show');
}

// 处理地址表单提交
async function handleAddressFormSubmit(e) {
    e.preventDefault();
    
    const formData = {
        recipient_name: document.getElementById('recipient_name').value.trim(),
        contact_phone: document.getElementById('contact_phone').value.trim(),
        region: [
            document.getElementById('province').options[document.getElementById('province').selectedIndex].text,
            document.getElementById('city').options[document.getElementById('city').selectedIndex].text,
            document.getElementById('district').options[document.getElementById('district').selectedIndex].text
        ].join(' '),
        full_address: document.getElementById('full_address').value.trim(),
        postal_code: document.getElementById('postal_code').value.trim(),
        is_default: document.getElementById('is_default').checked ? 1 : 0
    };

    // 表单验证
    if (!formData.recipient_name) {
        alert('请输入收货人姓名');
        return;
    }
    if (!formData.contact_phone) {
        alert('请输入联系电话');
        return;
    }
    if (!formData.region.split(' ').every(part => part && part !== '请选择省份' && part !== '请选择城市' && part !== '请选择区县')) {
        alert('请选择完整的地区信息');
        return;
    }
    if (!formData.full_address) {
        alert('请输入详细地址');
        return;
    }

    const addressId = document.getElementById('addressId').value;
    const token = localStorage.getItem('userToken');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/user/addresses${addressId ? `/${addressId}` : ''}`, {
            method: addressId ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '保存地址失败');
        }

        alert(addressId ? '地址更新成功' : '地址添加成功');
        hideAddressForm();
        // 重新加载地址列表
        if (typeof loadAddresses === 'function') {
            await loadAddresses();
        }
    } catch (error) {
        console.error('保存地址失败:', error);
        alert('保存地址失败，请重试');
    }
}

// 隐藏地址表单
function hideAddressForm() {
    const formContainer = document.getElementById('addressFormContainer');
    const overlay = document.getElementById('addressOverlay');
    
    if (formContainer) {
        formContainer.classList.remove('show');
    }
    if (overlay) {
        overlay.classList.remove('show');
    }
}

// 删除地址
async function deleteAddress(addressId) {
    if (!confirm('确定要删除这个地址吗？')) return;

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
        // 重新加载地址列表
        if (typeof loadAddresses === 'function') {
            await loadAddresses();
        }
    } catch (error) {
        console.error('删除地址失败:', error);
        alert('删除地址失败，请重试');
    }
}

export {
    initAddressSelector,
    showAddressForm,
    handleAddressFormSubmit,
    hideAddressForm,
    deleteAddress
};