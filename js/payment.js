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
        // 从localStorage获取checkout页面传递的订单信息
        const checkoutData = JSON.parse(localStorage.getItem('checkoutData') || '{}');
        
        // 如果没有从checkout页面获取到数据，尝试从API获取
        let order = {};
        if (Object.keys(checkoutData).length === 0) {
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

            order = await response.json();
        }

        // 优先使用checkout页面传递的数据，如果没有则使用API返回的数据
        const orderNumber = checkoutData.orderNumber || orderId;
        const paymentMethodText = checkoutData.paymentMethod || 
            (paymentMethod === 'alipay' ? '支付宝' : '微信支付');
        const totalAmount = checkoutData.totalAmount || 
            (order.total_amount ? order.total_amount.toFixed(2) : '0.00');

        // 更新页面信息
        document.getElementById('orderId').textContent = orderNumber;
        document.getElementById('paymentMethod').textContent = paymentMethodText;
        document.getElementById('totalAmount').textContent = `¥${totalAmount}`;

        // 生成支付二维码
        await generatePaymentQRCode(orderId, paymentMethod, parseFloat(totalAmount));

        // 开始检查支付状态
        startPaymentCheck(orderId);

        // 开始倒计时
        startPaymentTimer();
        
        // 清除localStorage中的临时数据
        localStorage.removeItem('checkoutData');
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
        
        // 如果API返回了二维码URL，则显示二维码图片
        if (qrCodeUrl) {
            qrCodeContainer.innerHTML = `<img src="${qrCodeUrl}" alt="支付二维码">`;
        } else {
            // 如果API没有返回二维码URL，则显示模拟的二维码（用于开发测试）
            qrCodeContainer.innerHTML = `
                <div style="width: 180px; height: 180px; background: #f5f5f5; display: flex; align-items: center; justify-content: center; flex-direction: column;">
                    <div style="font-size: 14px; color: #333; margin-bottom: 10px;">模拟支付二维码</div>
                    <div style="font-size: 12px; color: #666;">${paymentMethod === 'alipay' ? '支付宝' : '微信支付'}</div>
                    <div style="font-size: 12px; color: #666; margin-top: 5px;">¥${amount.toFixed(2)}</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('生成支付二维码失败:', error);
        // 显示模拟的二维码（用于开发测试，API失败时的备选方案）
        const qrCodeContainer = document.getElementById('qrCode');
        qrCodeContainer.innerHTML = `
            <div style="width: 180px; height: 180px; background: #f5f5f5; display: flex; align-items: center; justify-content: center; flex-direction: column;">
                <div style="font-size: 14px; color: #333; margin-bottom: 10px;">模拟支付二维码</div>
                <div style="font-size: 12px; color: #666;">${paymentMethod === 'alipay' ? '支付宝' : '微信支付'}</div>
                <div style="font-size: 12px; color: #666; margin-top: 5px;">¥${amount.toFixed(2)}</div>
            </div>
        `;
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
                // 如果API调用失败，不抛出错误，只记录日志
                console.warn('检查支付状态API调用失败，将继续检查');
                return; // 继续下一次检查
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
            // 错误处理：不中断倒计时和用户体验
        }
    }, 3000); // 每3秒检查一次
}

// 开始支付倒计时
function startPaymentTimer() {
    let minutes = 15;
    let seconds = 0;
    const timerElement = document.getElementById('paymentTimer');
    
    // 立即更新一次显示
    updateTimerDisplay();

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

        updateTimerDisplay();
    }, 1000);
    
    // 更新倒计时显示
    function updateTimerDisplay() {
        timerElement.textContent = 
            `剩余支付时间：${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}