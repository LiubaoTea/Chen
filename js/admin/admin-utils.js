/**
 * 管理后台工具函数
 * 提供通用的功能函数
 */

// 显示成功提示
function showSuccessToast(message) {
    // 检查是否已存在toast容器
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        // 创建toast容器
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // 创建toast元素
    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="关闭"></button>
            </div>
        </div>
    `;
    
    // 添加toast到容器
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    // 初始化并显示toast
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    toast.show();
    
    // 自动移除toast元素
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

// 显示错误提示
function showErrorToast(message) {
    // 检查是否已存在toast容器
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        // 创建toast容器
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // 创建toast元素
    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white bg-danger border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="关闭"></button>
            </div>
        </div>
    `;
    
    // 添加toast到容器
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    // 初始化并显示toast
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
    toast.show();
    
    // 自动移除toast元素
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

// 显示确认对话框
function showConfirmDialog(title, message, confirmCallback, cancelCallback) {
    // 检查是否已存在确认对话框
    let confirmDialog = document.getElementById('confirmDialog');
    if (confirmDialog) {
        confirmDialog.remove();
    }
    
    // 创建确认对话框
    const dialogHtml = `
        <div class="modal fade" id="confirmDialog" tabindex="-1" aria-labelledby="confirmDialogLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="confirmDialogLabel">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="关闭"></button>
                    </div>
                    <div class="modal-body">
                        ${message}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" id="confirmDialogCancelBtn">取消</button>
                        <button type="button" class="btn btn-primary" id="confirmDialogConfirmBtn">确认</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 添加对话框到body
    document.body.insertAdjacentHTML('beforeend', dialogHtml);
    
    // 获取对话框元素
    confirmDialog = document.getElementById('confirmDialog');
    const modal = new bootstrap.Modal(confirmDialog);
    
    // 设置按钮事件
    document.getElementById('confirmDialogConfirmBtn').addEventListener('click', () => {
        modal.hide();
        if (typeof confirmCallback === 'function') {
            confirmCallback();
        }
    });
    
    document.getElementById('confirmDialogCancelBtn').addEventListener('click', () => {
        if (typeof cancelCallback === 'function') {
            cancelCallback();
        }
    });
    
    // 显示对话框
    modal.show();
    
    // 对话框关闭后移除元素
    confirmDialog.addEventListener('hidden.bs.modal', () => {
        confirmDialog.remove();
    });
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// 格式化金额
function formatCurrency(amount) {
    return '¥' + parseFloat(amount).toFixed(2);
}

// 导出工具函数
window.showSuccessToast = showSuccessToast;
window.showErrorToast = showErrorToast;
window.showConfirmDialog = showConfirmDialog;
window.formatDate = formatDate;
window.formatCurrency = formatCurrency;