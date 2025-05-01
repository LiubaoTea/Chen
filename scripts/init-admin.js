/**
 * 初始化管理员账户脚本
 * 用于在D1数据库中创建默认管理员账户
 */

import { hashPassword } from '../utils/crypto.js';

/**
 * 初始化管理员账户
 * @param {D1Database} db - D1数据库实例
 */
export async function initializeAdmin(db) {
  try {
    console.log('开始初始化管理员账户...');
    
    // 检查admins表是否存在
    const tableExists = await db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='admins'`
    ).first();
    
    // 如果表不存在，创建表
    if (!tableExists) {
      console.log('创建admins表...');
      await db.exec(`
        CREATE TABLE admins (
          admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin')),
          permissions JSON DEFAULT '[]',
          created_at INTEGER DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
          last_login TIMESTAMP
        );
        
        CREATE INDEX idx_admins_role ON admins(role);
        CREATE INDEX idx_admins_username ON admins(username);
      `);
    }
    
    // 检查是否已存在管理员账户
    const adminExists = await db.prepare(
      `SELECT COUNT(*) as count FROM admins`
    ).first();
    
    // 如果没有管理员账户，创建默认管理员
    if (!adminExists || adminExists.count === 0) {
      console.log('创建默认管理员账户...');
      
      // 默认管理员信息
      const defaultAdmin = {
        username: 'admin',
        password: 'admin123',  // 实际应用中应使用更强的密码
        role: 'superadmin'
      };
      
      // 对密码进行哈希处理
      const passwordHash = await hashPassword(defaultAdmin.password);
      
      // 插入管理员记录
      await db.prepare(
        `INSERT INTO admins (username, password_hash, role) VALUES (?, ?, ?)`
      ).bind(
        defaultAdmin.username,
        passwordHash,
        defaultAdmin.role
      ).run();
      
      console.log(`默认管理员账户创建成功: ${defaultAdmin.username}`);
    } else {
      console.log('管理员账户已存在，跳过初始化');
    }
    
    console.log('管理员账户初始化完成');
  } catch (error) {
    console.error('初始化管理员账户失败:', error);
    throw error;
  }
}