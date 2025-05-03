/**
 * 修复管理员密码脚本
 * 此脚本用于在本地环境中直接生成正确的密码哈希值
 * 可以将生成的哈希值直接复制到D1数据库中
 */

// 导入加密工具
import { hashPassword } from '../utils/crypto.js';

/**
 * 生成管理员密码哈希
 */
async function generateAdminPasswordHash() {
  try {
    // 管理员密码
    const password = 'admin';
    
    // 生成密码哈希
    const passwordHash = await hashPassword(password);
    
    console.log('\n===== 管理员密码哈希生成成功 =====');
    console.log('用户名: admin');
    console.log('密码: admin');
    console.log('生成的密码哈希值:');
    console.log(passwordHash);
    console.log('\n请使用以下SQL语句更新管理员密码:');
    console.log(`UPDATE admins SET password_hash = '${passwordHash}' WHERE username = 'admin';`);
    console.log('\n执行SQL后，使用用户名 "admin" 和密码 "admin" 登录');
    
    return passwordHash;
  } catch (error) {
    console.error('生成密码哈希失败:', error);
    throw error;
  }
}

// 立即执行
generateAdminPasswordHash().catch(error => {
  console.error('执行失败:', error);
});