// 导入API基础URL和地址数据
import { API_BASE_URL } from './config.js';
import addressData from '../src/utils/data.json' assert { type: 'json' };

export class AddressEditor {
    constructor(container) {
        this.container = container;
        this.currentAddress = null;
        this.init();
        this.isVisible = false;
    }

    init() {
        this.render();
        this.initEventListeners();
        this.loadProvinces();
        
        // 添加点击遮罩层关闭功能
        this.container.addEventListener('click', (e) => {
            if (e.target === this.container) {
                this.hide();
            }
        });
        
        // 添加点击编辑器外部区域关闭功能
        document.addEventListener('click', (e) => {
            if (this.isVisible && !this.container.contains(e.target) && e.target !== this.container) {
                this.hide();
            }
        });
        
        // 添加ESC键关闭功能
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
        
        // 添加ESC键关闭功能
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }

    render() {
        this.container.innerHTML = `
            <div class="address-editor">
                <h2>编辑收货地址</h2>
                <form class="address-form" id="addressForm">
                    <div class="form-group">
                        <label for="recipientName">收货人姓名</label>
                        <input type="text" id="recipientName" required>
                    </div>
                    <div class="form-group">
                        <label for="contactPhone">联系电话</label>
                        <input type="tel" id="contactPhone" required>
                    </div>
                    <div class="form-group">
                        <label>所在地区</label>
                        <div class="region-selects">
                            <select id="province" required>
                                <option value="">请选择省份</option>
                            </select>
                            <select id="city" required>
                                <option value="">请选择城市</option>
                            </select>
                            <select id="district" required>
                                <option value="">请选择区县</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="detailAddress">详细地址</label>
                        <input type="text" id="detailAddress" required>
                    </div>
                    <div class="form-group">
                        <label for="postalCode">邮政编码</label>
                        <input type="text" id="postalCode" pattern="[0-9]{6}">
                    </div>
                    <div class="default-address-group">
                        <input type="checkbox" id="isDefault">
                        <label for="isDefault">设为默认地址</label>
                    </div>
                    <div class="address-actions">
                        <button type="submit" class="save-address">保存地址</button>
                        <button type="button" class="cancel-edit">取消</button>
                    </div>
                </form>
            </div>
        `;
    }

    initEventListeners() {
        const form = this.container.querySelector('#addressForm');
        const provinceSelect = this.container.querySelector('#province');
        const citySelect = this.container.querySelector('#city');
        const cancelBtn = this.container.querySelector('.cancel-edit');

        form.addEventListener('submit', (e) => this.handleSubmit(e));
        provinceSelect.addEventListener('change', () => this.handleProvinceChange());
        citySelect.addEventListener('change', () => this.handleCityChange());
        cancelBtn.addEventListener('click', () => this.handleCancel());
    }

    loadProvinces() {
        const provinceSelect = this.container.querySelector('#province');
        const provinces = addressData['86'];
        
        for (const code in provinces) {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = provinces[code];
            provinceSelect.appendChild(option);
        }
    }

    handleProvinceChange() {
        const provinceSelect = this.container.querySelector('#province');
        const citySelect = this.container.querySelector('#city');
        const districtSelect = this.container.querySelector('#district');

        const selectedProvince = provinceSelect.value;
        const cities = addressData[selectedProvince];

        citySelect.innerHTML = '<option value="">请选择城市</option>';
        districtSelect.innerHTML = '<option value="">请选择区县</option>';

        for (const code in cities) {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = cities[code];
            citySelect.appendChild(option);
        }
    }

    handleCityChange() {
        const citySelect = this.container.querySelector('#city');
        const districtSelect = this.container.querySelector('#district');

        const selectedCity = citySelect.value;
        const districts = addressData[selectedCity];

        districtSelect.innerHTML = '<option value="">请选择区县</option>';

        for (const code in districts) {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = districts[code];
            districtSelect.appendChild(option);
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const formData = {
            recipient_name: this.container.querySelector('#recipientName').value,
            contact_phone: this.container.querySelector('#contactPhone').value,
            region: this.getSelectedRegion(),
            full_address: this.container.querySelector('#detailAddress').value,
            postal_code: this.container.querySelector('#postalCode').value
        };

        try {
            const token = localStorage.getItem('userToken');
            const url = this.currentAddress
                ? `${API_BASE_URL}/api/user/addresses/${this.currentAddress.address_id}`
                : `${API_BASE_URL}/api/user/addresses`;
            
            const response = await fetch(url, {
                method: this.currentAddress ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('保存地址失败');
            }

            // 触发地址更新事件
            const event = new CustomEvent('addressUpdated');
            document.dispatchEvent(event);

            // 保存成功后自动关闭编辑器
            this.hide();
            this.resetForm();
            
            // 显示成功提示
            alert('地址保存成功');
        } catch (error) {
            console.error('保存地址失败:', error);
            alert('保存地址失败，请重试');
        }
    }

    getSelectedRegion() {
        const province = this.container.querySelector('#province');
        const city = this.container.querySelector('#city');
        const district = this.container.querySelector('#district');

        return `${province.options[province.selectedIndex].text} ${city.options[city.selectedIndex].text} ${district.options[district.selectedIndex].text}`;
    }

    handleCancel() {
        this.resetForm();
        this.hide();
    }

    resetForm() {
        const form = this.container.querySelector('#addressForm');
        form.reset();
        this.currentAddress = null;
    }

    editAddress(address) {
        this.currentAddress = address;
        
        // 填充表单数据
        this.container.querySelector('#recipientName').value = address.recipient_name;
        this.container.querySelector('#contactPhone').value = address.contact_phone;
        this.container.querySelector('#detailAddress').value = address.full_address;
        this.container.querySelector('#postalCode').value = address.postal_code || '';

        // TODO: 根据地址解析设置省市区选择器的值
        this.show();
    }

    show() {
        this.container.style.display = 'block';
        // 使用setTimeout确保display生效后再添加active类，以触发过渡动画
        setTimeout(() => {
            this.container.classList.add('active');
            this.isVisible = true;
        }, 10);
    }

    hide() {
        this.container.classList.remove('active');
        // 等待过渡动画完成后再隐藏元素
        setTimeout(() => {
            this.container.style.display = 'none';
            this.isVisible = false;
        }, 400); // 与CSS过渡时间相匹配
    }
}