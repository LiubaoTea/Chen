/**
 * 更新管理员密码脚本
 * 用于将D1数据库中的管理员密码更新为正确的哈希值
 */

import { hashPassword } from '../utils/crypto.js';

/**
 * 更新管理员密码
 * @param {D1Database} db - D1数据库实例
 */
export async function updateAdminPassword(db) {
  try {
    console.log('开始更新管理员密码...');
    
    // 检查admins表是否存在
    const tableExists = await db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='admins'`
    ).first();
    
    if (!tableExists) {
      console.error('admins表不存在，请先初始化数据库');
      return;
    }
    
    // 获取管理员账户
    const admin = await db.prepare(
      `SELECT * FROM admins WHERE username = 'admin'`
    ).first();
    
    if (!admin) {
      console.error('未找到admin用户，请先创建管理员账户');
      return;
    }
    
    // 生成新的密码哈希
    const password = 'admin'; // 使用与用户输入相同的密码
    const passwordHash = await hashPassword(password);
    
    // 更新管理员密码
    await db.prepare(
      `UPDATE admins SET password_hash = ? WHERE username = 'admin'`
    ).bind(passwordHash).run();
    
    console.log('管理员密码更新成功');
    
    // 验证更新是否成功
    const updatedAdmin = await db.prepare(
      `SELECT * FROM admins WHERE username = 'admin'`
    ).first();
    
    console.log('更新后的管理员信息:', {
      username: updatedAdmin.username,
      password_hash_length: updatedAdmin.password_hash.length,
      role: updatedAdmin.role
    });
    
  } catch (error) {
    console.error('更新管理员密码失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (typeof process !== 'undefined' && process.argv[1] === import.meta.url) {
  console.log('直接运行更新密码脚本');
  // 这里需要连接到D1数据库
  // 在本地开发环境中，可以使用wrangler连接到D1数据库
  // 例如: wrangler d1 execute liubaotea --local --command="SELECT * FROM admins"
}