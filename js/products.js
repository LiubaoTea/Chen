// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 初始化产品分类筛选
    initProductFilter();
    
    // 初始化移动端菜单
    initMobileMenu();
});

// 产品分类筛选功能
function initProductFilter() {
    const categoryTabs = document.querySelectorAll('.category-tab');
    const productCards = document.querySelectorAll('.product-card');
    
    if (categoryTabs.length > 0 && productCards.length > 0) {
        // 为每个分类标签添加点击事件
        categoryTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                // 移除所有标签的激活状态
                categoryTabs.forEach(t => t.classList.remove('active'));
                
                // 添加当前标签的激活状态
                this.classList.add('active');
                
                // 获取当前选中的分类
                const selectedCategory = this.getAttribute('data-category');
                
                // 显示或隐藏产品卡片
                productCards.forEach(card => {
                    if (selectedCategory === 'all' || card.getAttribute('data-category') === selectedCategory) {
                        card.style.display = 'block';
                        // 添加动画效果
                        setTimeout(() => {
                            card.style.opacity = '1';
                            card.style.transform = 'translateY(0)';
                        }, 10);
                    } else {
                        card.style.opacity = '0';
                        card.style.transform = 'translateY(20px)';
                        setTimeout(() => {
                            card.style.display = 'none';
                        }, 300);
                    }
                });
            });
        });
        
        // 初始化样式
        productCards.forEach(card => {
            card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            card.style.opacity = '1';
        });
    }
}

// 移动端菜单切换（如果main.js中的函数不可用）
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
    }
}