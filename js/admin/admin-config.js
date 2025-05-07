// 管理后台API配置文件

// 管理后台API基础URL
// 管理员API已部署在专用的adminsystem worker上
export const ADMIN_API_BASE_URL = "https://adminsystemworkers.liubaotea.online";

// 导出默认对象，确保模块兼容性
const config = {
    ADMIN_API_BASE_URL
};

// 添加调试信息
console.log('admin-config.js加载完成，管理后台API配置:', {
    ADMIN_API_BASE_URL: ADMIN_API_BASE_URL,
    ADMIN_API_BASE_URL_TYPE: typeof ADMIN_API_BASE_URL
});

export default config;