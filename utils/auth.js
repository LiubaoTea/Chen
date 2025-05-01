/**
 * 认证工具函数
 * 提供JWT令牌生成和验证功能
 */

import jwt from '@tsndr/cloudflare-worker-jwt';

// JWT密钥，实际应用中应存储在环境变量中
const JWT_SECRET = 'liubaocha-admin-secret-key';

/**
 * 生成JWT令牌
 * @param {Object} payload - 令牌载荷
 * @param {string} expiresIn - 过期时间
 * @returns {string} - JWT令牌
 */
export async function generateToken(payload, expiresIn = '24h') {
  // 计算过期时间
  const exp = Math.floor(Date.now() / 1000) + parseExpiration(expiresIn);
  
  // 生成令牌
  const token = await jwt.sign({
    ...payload,
    exp
  }, JWT_SECRET);
  
  return token;
}

/**
 * 验证JWT令牌
 * @param {string} token - JWT令牌
 * @returns {Object|null} - 验证成功返回载荷，失败返回null
 */
export async function verifyToken(token) {
  try {
    // 验证令牌
    const isValid = await jwt.verify(token, JWT_SECRET);
    
    if (!isValid) {
      return null;
    }
    
    // 解码令牌
    const decoded = jwt.decode(token);
    
    return decoded.payload;
  } catch (error) {
    console.error('令牌验证失败:', error);
    return null;
  }
}

/**
 * 解析过期时间字符串为秒数
 * @param {string} expiresIn - 过期时间字符串，如'1h'、'7d'
 * @returns {number} - 秒数
 */
function parseExpiration(expiresIn) {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  
  if (!match) {
    // 默认为1小时
    return 60 * 60;
  }
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 24 * 60 * 60;
    default: return 60 * 60;
  }
}