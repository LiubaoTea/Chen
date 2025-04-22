// 导入API基础URL和地址编辑器
import { API_BASE_URL } from './config.js';
import { AddressEditor } from './address-editor.js';

let addressEditor;

// 初始化地址编辑器
export function initAddressEditor(container) {
    addressEditor = new AddressEditor(container);
}

// 显示地址编辑器
export function showAddressModal(address = null) {
    if (!addressEditor) {
        console.error('地址编辑器未初始化');
        return;
    }

    if (address) {
        addressEditor.editAddress(address);
    } else {
        addressEditor.resetForm();
    }
    addressEditor.show();
}

// 关闭地址编辑器
export function closeAddressModal() {
    if (addressEditor) {
        addressEditor.hide();
    }
}