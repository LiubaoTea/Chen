/**
 * 加密工具函数
 * 提供密码哈希和比较功能
 */

// 使用bcrypt进行密码哈希和比较
import bcrypt from 'bcryptjs';

/**
 * 对密码进行哈希处理
 * @param {string} password - 原始密码
 * @returns {Promise<string>} - 哈希后的密码
 */
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * 比较密码与哈希值是否匹配
 * @param {string} password - 原始密码
 * @param {string} hash - 哈希值
 * @returns {Promise<boolean>} - 是否匹配
 */
export async function hashCompare(password, hash) {
  return bcrypt.compare(password, hash);
}