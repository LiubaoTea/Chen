/**
 * 管理员登录API
 * 处理管理员登录请求，验证凭据并返回令牌
 * 使用D1数据库中的admins表进行验证
 */

import { generateToken } from '../../../utils/auth';
import { hashCompare } from '../../../utils/crypto';

export async function onRequestPost(context) {
  try {
    // 获取请求数据
    const { username, password } = await context.request.json();
    
    // 验证请求数据
    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: '用户名和密码不能为空' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 从D1数据库中查询管理员信息
    const { env } = context;
    const admin = await env.DB.prepare(
      `SELECT * FROM admins WHERE username = ?`
    ).bind(username).first();
    
    // 验证管理员是否存在
    if (!admin) {
      return new Response(
        JSON.stringify({ error: '用户名或密码错误' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 验证密码
    const passwordValid = await hashCompare(password, admin.password_hash);
    if (!passwordValid) {
      return new Response(
        JSON.stringify({ error: '用户名或密码错误' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 生成JWT令牌
    const token = generateToken({
      admin_id: admin.admin_id,
      username: admin.username,
      role: admin.role
    }, '24h');
    
    // 更新最后登录时间
    await env.DB.prepare(
      `UPDATE admins SET last_login = CAST(strftime('%s','now') AS INTEGER) WHERE admin_id = ?`
    ).bind(admin.admin_id).run();
    
    // 返回成功响应
    return new Response(
      JSON.stringify({
        token,
        admin_id: admin.admin_id,
        username: admin.username,
        role: admin.role,
        permissions: JSON.parse(admin.permissions || '[]')
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('管理员登录错误:', error);
    
    return new Response(
      JSON.stringify({ error: '服务器错误，请稍后再试' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}