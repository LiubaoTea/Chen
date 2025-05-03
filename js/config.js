// API配置文件

// API基础URL，根据实际部署环境修改（确保URL末尾没有斜杠）
// 移除所有可能的特殊字符和多余空格
export const API_BASE_URL = "https://workers.liubaotea.online";

// 管理后台API基础URL
// 管理员API已部署在同一域名下的/api/admin路径
export const ADMIN_API_BASE_URL = "https://workers.liubaotea.online";

// 导出默认对象，确保模块兼容性
const config = {
    API_BASE_URL,
    ADMIN_API_BASE_URL
};

// 添加调试信息
console.log('config.js加载完成，API配置:', {
    API_BASE_URL: API_BASE_URL,
    ADMIN_API_BASE_URL: ADMIN_API_BASE_URL,
    API_BASE_URL_TYPE: typeof API_BASE_URL,
    ADMIN_API_BASE_URL_TYPE: typeof ADMIN_API_BASE_URL
});

export default config;