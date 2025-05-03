/**
 * 生成SQL语句用于更新管理员密码
 * 此脚本生成可在D1控制台执行的SQL语句
 */

import { hashPassword } from '../utils/crypto.js';

/**
 * 生成更新管理员密码的SQL语句
 * @param {string} password - 明文密码
 * @returns {Promise<string>} - SQL语句
 */
async function generateUpdatePasswordSQL(password = 'admin') {
  try {
    // 生成密码哈希
    const passwordHash = await hashPassword(password);
    
    // 生成SQL语句
    const sql = `-- 更新管理员密码为正确的哈希值\n
-- 查看当前管理员信息\nSELECT * FROM admins WHERE username = 'admin';\n\n-- 更新密码哈希\nUPDATE admins SET password_hash = '${passwordHash}' WHERE username = 'admin';\n\n-- 验证更新结果\nSELECT * FROM admins WHERE username = 'admin';`;
    
    console.log('生成的SQL语句:');
    console.log(sql);
    
    return sql;
  } catch (error) {
    console.error('生成SQL语句失败:', error);
    throw error;
  }
}

// 立即执行
generateUpdatePasswordSQL().then(sql => {
  console.log('\n请复制上面的SQL语句，在Cloudflare D1控制台执行以更新管理员密码');
}).catch(error => {
  console.error('执行失败:', error);
});