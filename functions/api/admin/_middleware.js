/**
 * 管理员API中间件
 * 用于保护管理员API路由，验证管理员身份
 */

import { verifyToken } from '../../../utils/auth';

/**
 * 处理请求的中间件函数
 */
export async function onRequest(context) {
  // 跳过登录API的认证
  if (context.request.url.endsWith('/api/admin/login')) {
    return await context.next();
  }
  
  try {
    // 获取Authorization头
    const authHeader = context.request.headers.get('Authorization');
    
    // 检查是否有Authorization头
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: '未授权访问' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 提取令牌
    const token = authHeader.split(' ')[1];
    
    // 验证令牌
    const payload = await verifyToken(token);
    
    // 检查令牌是否有效
    if (!payload) {
      return new Response(
        JSON.stringify({ error: '无效的令牌' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 将管理员信息添加到上下文中
    context.admin = payload;
    
    // 继续处理请求
    return await context.next();
  } catch (error) {
    console.error('管理员认证错误:', error);
    
    return new Response(
      JSON.stringify({ error: '服务器错误，请稍后再试' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}