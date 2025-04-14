// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 初始化导航菜单
    initMobileMenu();
    
    // 初始化轮播图
    initSlider();
    
    // 初始化客户评价轮播
    initTestimonialSlider();
    
    // 初始化茶香缭绕动画
    initTeaSmokeAnimation();
});

// 移动端菜单切换
function initMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const navList = document.getElementById('navList');
    
    if (menuToggle && navList) {
        menuToggle.addEventListener('click', function() {
            navList.classList.toggle('active');
        });
        
        // 点击菜单项后关闭菜单
        const navItems = navList.querySelectorAll('a');
        navItems.forEach(item => {
            item.addEventListener('click', function() {
                if (window.innerWidth <= 767) {
                    navList.classList.remove('active');
                }
            });
        });
        
        // 点击页面其他区域关闭菜单
        document.addEventListener('click', function(event) {
            const isClickInside = navList.contains(event.target) || menuToggle.contains(event.target);
            if (!isClickInside && navList.classList.contains('active')) {
                navList.classList.remove('active');
            }
        });
    }
}

// 轮播图功能
function initSlider() {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.slider-dots .dot');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    let currentIndex = 0;
    let slideInterval;
    
    // 显示指定索引的幻灯片
    function showSlide(index) {
        // 隐藏所有幻灯片
        slides.forEach(slide => {
            slide.classList.remove('active');
        });
        
        // 移除所有点的激活状态
        dots.forEach(dot => {
            dot.classList.remove('active');
        });
        
        // 显示当前幻灯片和激活对应的点
        slides[index].classList.add('active');
        dots[index].classList.add('active');
        
        currentIndex = index;
    }
    
    // 显示下一张幻灯片
    function nextSlide() {
        let nextIndex = currentIndex + 1;
        if (nextIndex >= slides.length) {
            nextIndex = 0;
        }
        showSlide(nextIndex);
    }
    
    // 显示上一张幻灯片
    function prevSlide() {
        let prevIndex = currentIndex - 1;
        if (prevIndex < 0) {
            prevIndex = slides.length - 1;
        }
        showSlide(prevIndex);
    }
    
    // 自动轮播
    function startSlideInterval() {
        slideInterval = setInterval(nextSlide, 5000);
    }
    
    // 停止自动轮播
    function stopSlideInterval() {
        clearInterval(slideInterval);
    }
    
    // 初始化轮播图
    if (slides.length > 0 && dots.length > 0) {
        // 设置点击事件
        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                prevSlide();
                stopSlideInterval();
                startSlideInterval();
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                nextSlide();
                stopSlideInterval();
                startSlideInterval();
            });
        }
        
        // 点击指示点切换幻灯片
        dots.forEach((dot, index) => {
            dot.addEventListener('click', function() {
                showSlide(index);
                stopSlideInterval();
                startSlideInterval();
            });
        });
        
        // 鼠标悬停时暂停轮播
        const sliderContainer = document.querySelector('.slider-container');
        if (sliderContainer) {
            sliderContainer.addEventListener('mouseenter', stopSlideInterval);
            sliderContainer.addEventListener('mouseleave', startSlideInterval);
        }
        
        // 开始自动轮播
        startSlideInterval();
    }
}

// 客户评价轮播
function initTestimonialSlider() {
    const testimonials = document.querySelectorAll('.testimonial-slide');
    const dots = document.querySelectorAll('.testimonial-dots .dot');
    let currentIndex = 0;
    let testimonialInterval;
    
    // 显示指定索引的评价
    function showTestimonial(index) {
        // 隐藏所有评价
        testimonials.forEach(testimonial => {
            testimonial.classList.remove('active');
        });
        
        // 移除所有点的激活状态
        dots.forEach(dot => {
            dot.classList.remove('active');
        });
        
        // 显示当前评价和激活对应的点
        testimonials[index].classList.add('active');
        dots[index].classList.add('active');
        
        currentIndex = index;
    }
    
    // 显示下一个评价
    function nextTestimonial() {
        let nextIndex = currentIndex + 1;
        if (nextIndex >= testimonials.length) {
            nextIndex = 0;
        }
        showTestimonial(nextIndex);
    }
    
    // 自动轮播
    function startTestimonialInterval() {
        testimonialInterval = setInterval(nextTestimonial, 6000);
    }
    
    // 停止自动轮播
    function stopTestimonialInterval() {
        clearInterval(testimonialInterval);
    }
    
    // 初始化评价轮播
    if (testimonials.length > 0 && dots.length > 0) {
        // 点击指示点切换评价
        dots.forEach((dot, index) => {
            dot.addEventListener('click', function() {
                showTestimonial(index);
                stopTestimonialInterval();
                startTestimonialInterval();
            });
        });
        
        // 鼠标悬停时暂停轮播
        const testimonialSlider = document.getElementById('testimonialSlider');
        if (testimonialSlider) {
            testimonialSlider.addEventListener('mouseenter', stopTestimonialInterval);
            testimonialSlider.addEventListener('mouseleave', startTestimonialInterval);
        }
        
        // 开始自动轮播
        startTestimonialInterval();
    }
}

// 茶香缭绕动画
function initTeaSmokeAnimation() {
    const heroSlider = document.querySelector('.hero-slider');
    
    if (heroSlider) {
        // 创建茶香动画容器
        const teaSmoke = document.createElement('div');
        teaSmoke.className = 'tea-smoke';
        heroSlider.appendChild(teaSmoke);
        
        // 创建多个烟雾粒子
        for (let i = 0; i < 15; i++) {
            createSmokeParticle(teaSmoke);
        }
    }
}

// 创建单个烟雾粒子
function createSmokeParticle(container) {
    const particle = document.createElement('div');
    particle.className = 'smoke-particle';
    
    // 随机位置
    const posX = Math.random() * 100;
    const posY = 70 + Math.random() * 20; // 主要在底部区域
    
    // 随机大小
    const size = 10 + Math.random() * 20;
    
    // 设置样式
    particle.style.left = `${posX}%`;
    particle.style.top = `${posY}%`;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    // 添加到容器
    container.appendChild(particle);
    
    // 动画结束后重新创建
    particle.addEventListener('animationend', function() {
        container.removeChild(particle);
        createSmokeParticle(container);
    });
}

// 表单提交处理
document.addEventListener('DOMContentLoaded', function() {
    const subscribeForm = document.querySelector('.subscribe-form');
    
    if (subscribeForm) {
        subscribeForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const emailInput = this.querySelector('input[type="email"]');
            const email = emailInput.value.trim();
            
            if (email) {
                // 这里可以添加实际的表单提交逻辑
                alert('感谢您的订阅！我们将会向您发送最新的产品信息和促销活动。');
                emailInput.value = '';
            }
        });
    }
});