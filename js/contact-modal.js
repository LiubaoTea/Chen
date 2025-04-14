document.addEventListener('DOMContentLoaded', function() {
    // 创建模态框HTML结构
    const modalHTML = `
        <div class="contact-modal" id="contactModal">
            <div class="contact-modal-content">
                <button class="contact-modal-close" id="closeContactModal">
                    <i class="fas fa-times"></i>
                </button>
                <img src="./image/gongzhonghao_image.png" alt="微信公众号二维码">
            </div>
        </div>
    `;

    // 将模态框添加到body
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // 获取DOM元素
    const modal = document.getElementById('contactModal');
    const closeBtn = document.getElementById('closeContactModal');
    const contactLinks = document.querySelectorAll('a[href="contact.html"]');

    // 为所有"联系我们"链接添加点击事件
    contactLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            modal.classList.add('active');
        });
    });

    // 点击关闭按钮关闭模态框
    closeBtn.addEventListener('click', function() {
        modal.classList.remove('active');
    });

    // 点击模态框外部关闭模态框
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
})