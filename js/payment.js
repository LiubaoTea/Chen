// 导入API基础URL
import { API_BASE_URL } from './config.js';

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 检查用户是否登录
    const token = localStorage.getItem('userToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // 获取订单ID和支付方式
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');
    const paymentMethod = urlParams.get('method');

    if (!orderId || !paymentMethod) {
        alert('订单信息不完整');
        window.location.href = 'user-center.html';
        return;
    }

    // 初始化页面
    await initPaymentPage(orderId, paymentMethod);
});

// 初始化支付页面
async function initPaymentPage(orderId, paymentMethod) {
    try {
        // 获取订单信息
        const token = localStorage.getItem('userToken');
        const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('获取订单信息失败');
        }

        const order = await response.json();

        // 更新页面信息
        document.getElementById('orderId').textContent = orderId;
        document.getElementById('paymentMethod').textContent = 
            paymentMethod === 'alipay' ? '支付宝' : '微信支付';
        document.getElementById('totalAmount').textContent = 
            `¥${order.total_amount.toFixed(2)}`;

        // 生成支付二维码
        await generatePaymentQRCode(orderId, paymentMethod, order.total_amount);

        // 开始检查支付状态
        startPaymentCheck(orderId);

        // 开始倒计时
        startPaymentTimer();
    } catch (error) {
        console.error('初始化支付页面失败:', error);
        alert('加载订单信息失败，请刷新页面重试');
    }
}

// 生成支付二维码
async function generatePaymentQRCode(orderId, paymentMethod, amount) {
    try {
        const token = localStorage.getItem('userToken');
        const response = await fetch(`${API_BASE_URL}/api/payment/qrcode`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                orderId,
                paymentMethod,
                amount
            })
        });

        if (!response.ok) {
            throw new Error('生成支付二维码失败');
        }

        const { qrCodeUrl } = await response.json();
        const qrCodeContainer = document.getElementById('qrCode');
        qrCodeContainer.innerHTML = `<img src="${qrCodeUrl}" alt="支付二维码">`;
    } catch (error) {
        console.error('生成支付二维码失败:', error);
        alert('生成支付二维码失败，请刷新页面重试');
    }
}

// 开始检查支付状态
function startPaymentCheck(orderId) {
    const checkInterval = setInterval(async () => {
        try {
            const token = localStorage.getItem('userToken');
            const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('检查支付状态失败');
            }

            const order = await response.json();

            // 更新支付状态显示
            const statusElement = document.getElementById('paymentStatus');
            if (order.status === 'paid') {
                statusElement.textContent = '支付成功！';
                statusElement.style.color = '#4CAF50';
                clearInterval(checkInterval);
                // 3秒后跳转到订单详情页
                setTimeout(() => {
                    window.location.href = `user-center.html?tab=orders`;
                }, 3000);
            }
        } catch (error) {
            console.error('检查支付状态失败:', error);
        }
    }, 3000); // 每3秒检查一次
}

// 开始支付倒计时
function startPaymentTimer() {
    let minutes = 15;
    let seconds = 0;
    const timerElement = document.getElementById('paymentTimer');

    const timer = setInterval(() => {
        if (seconds === 0) {
            if (minutes === 0) {
                clearInterval(timer);
                timerElement.textContent = '支付超时';
                timerElement.style.color = '#f44336';
                alert('支付已超时，请重新下单');
                window.location.href = 'user-center.html';
                return;
            }
            minutes--;
            seconds = 59;
        } else {
            seconds--;
        }

        timerElement.textContent = 
            `剩余支付时间：${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}