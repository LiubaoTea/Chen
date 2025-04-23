import { API_BASE_URL } from './config.js';
import { AddressEditor } from './address-editor.js';

class UserAddressManager {
    constructor() {
        this.addressList = document.getElementById('addressList');
        this.addressManagement = document.getElementById('addressManagement');
        this.addAddressBtn = document.getElementById('addAddressBtn');
        this.addressEditor = new AddressEditor(document.getElementById('addressEditorContainer'));
        
        this.init();
    }

    init() {
        // 初始化事件监听
        this.addAddressBtn.addEventListener('click', () => this.handleAddAddress());
        document.addEventListener('addressUpdated', () => this.loadAddresses());

        // 监听导航项点击
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                if (item.dataset.section === 'address') {
                    this.showAddressManagement();
                } else {
                    this.hideAddressManagement();
                }
            });
        });

        // 如果当前在地址管理页面，加载地址列表
        if (window.location.hash === '#address') {
            this.showAddressManagement();
        }
    }

    async loadAddresses() {
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

            const addresses = await response.json();
            this.renderAddresses(addresses);
        } catch (error) {
            console.error('加载地址失败:', error);
            this.addressList.innerHTML = '<p class="error-message">加载地址失败，请刷新页面重试</p>';
        }
    }

    renderAddresses(addresses) {
        this.addressList.innerHTML = '';
        
        if (addresses.length === 0) {
            this.addressList.innerHTML = '<p class="no-address">暂无收货地址，请添加新地址</p>';
            return;
        }

        addresses.forEach(address => {
            const addressCard = document.createElement('div');
            addressCard.className = 'address-card';
            if (address.is_default) addressCard.classList.add('selected');

            addressCard.innerHTML = `
                <div class="address-info">
                    <div class="recipient-info">
                        <span>${address.recipient_name}</span>
                        <span>${address.contact_phone}</span>
                    </div>
                    <div class="address-detail">
                        ${address.region} ${address.full_address}
                        ${address.postal_code ? `<br>邮编: ${address.postal_code}` : ''}
                    </div>
                </div>
                <div class="address-actions">
                    <button class="edit-address" data-id="${address.address_id}">
                        <i class="fas fa-edit"></i> 编辑
                    </button>
                    <button class="delete-address" data-id="${address.address_id}">
                        <i class="fas fa-trash-alt"></i> 删除
                    </button>
                </div>
            `;

            // 添加编辑和删除事件监听
            const editBtn = addressCard.querySelector('.edit-address');
            const deleteBtn = addressCard.querySelector('.delete-address');

            editBtn.addEventListener('click', () => this.handleEditAddress(address));
            deleteBtn.addEventListener('click', () => this.handleDeleteAddress(address.address_id));

            this.addressList.appendChild(addressCard);
        });
    }

    handleAddAddress() {
        this.addressEditor.show();
    }

    handleEditAddress(address) {
        this.addressEditor.editAddress(address);
    }

    async handleDeleteAddress(addressId) {
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

            await this.loadAddresses();
            alert('地址删除成功');
        } catch (error) {
            console.error('删除地址失败:', error);
            alert('删除地址失败，请重试');
        }
    }

    showAddressManagement() {
        this.addressManagement.style.display = 'block';
        this.loadAddresses();
    }

    hideAddressManagement() {
        this.addressManagement.style.display = 'none';
    }
}

// 初始化地址管理器
document.addEventListener('DOMContentLoaded', () => {
    new UserAddressManager();
});