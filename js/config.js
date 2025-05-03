// API配置文件

// API基础URL，根据实际部署环境修改（确保URL末尾没有斜杠）
export const API_BASE_URL = 'https://workers.liubaotea.online';

// 管理后台API基础URL
// 修改为与前端相同的域名，因为管理员API已部署在同一域名下的/api/admin路径
export const ADMIN_API_BASE_URL = 'https://workers.liubaotea.online';

// 导出默认对象，确保模块兼容性
const config = {
    API_BASE_URL,
    ADMIN_API_BASE_URL
};

export default config;