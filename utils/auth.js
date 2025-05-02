/**
 * 认证工具函数
 * 提供JWT令牌生成和验证功能
 * 使用Web Crypto API代替外部JWT库
 */

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
  
  // 创建JWT头部
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  // 合并载荷
  const jwtPayload = {
    ...payload,
    exp
  };
  
  // Base64Url编码头部和载荷
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload));
  
  // 创建签名
  const signature = await createSignature(`${encodedHeader}.${encodedPayload}`, JWT_SECRET);
  
  // 组合JWT令牌
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * 验证JWT令牌
 * @param {string} token - JWT令牌
 * @returns {Object|null} - 验证成功返回载荷，失败返回null
 */
export async function verifyToken(token) {
  try {
    // 分割令牌
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const [encodedHeader, encodedPayload, signature] = parts;
    
    // 验证签名
    const isValid = await verifySignature(`${encodedHeader}.${encodedPayload}`, signature, JWT_SECRET);
    
    if (!isValid) {
      return null;
    }
    
    // 解码载荷
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    
    // 检查令牌是否过期
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return payload;
  } catch (error) {
    console.error('令牌验证失败:', error);
    return null;
  }
}

/**
 * 创建HMAC签名
 * @param {string} data - 要签名的数据
 * @param {string} secret - 密钥
 * @returns {string} - Base64Url编码的签名
 */
async function createSignature(data, secret) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);
  
  // 导入密钥
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // 创建签名
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    messageData
  );
  
  // 转换为Base64Url
  return arrayBufferToBase64Url(signature);
}

/**
 * 验证HMAC签名
 * @param {string} data - 签名的数据
 * @param {string} signature - Base64Url编码的签名
 * @param {string} secret - 密钥
 * @returns {boolean} - 签名是否有效
 */
async function verifySignature(data, signature, secret) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);
  
  // 导入密钥
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  
  // 解码签名
  const signatureData = base64UrlToArrayBuffer(signature);
  
  // 验证签名
  return crypto.subtle.verify(
    'HMAC',
    key,
    signatureData,
    messageData
  );
}

/**
 * Base64Url编码
 * @param {string} str - 要编码的字符串
 * @returns {string} - Base64Url编码的字符串
 */
function base64UrlEncode(str) {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Base64Url解码
 * @param {string} str - 要解码的Base64Url字符串
 * @returns {string} - 解码后的字符串
 */
function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // 添加填充
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

/**
 * ArrayBuffer转Base64Url
 * @param {ArrayBuffer} buffer - ArrayBuffer
 * @returns {string} - Base64Url编码的字符串
 */
function arrayBufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Base64Url转ArrayBuffer
 * @param {string} base64Url - Base64Url编码的字符串
 * @returns {ArrayBuffer} - ArrayBuffer
 */
function base64UrlToArrayBuffer(base64Url) {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  // 添加填充
  const paddedBase64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  const binary = atob(paddedBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
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