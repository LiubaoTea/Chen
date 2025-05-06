/**
 * 加密工具函数
 * 提供密码哈希和比较功能
 * 使用Web Crypto API代替bcryptjs
 */

/**
 * 对密码进行哈希处理
 * @param {string} password - 原始密码
 * @returns {Promise<string>} - 哈希后的密码
 */
export async function hashPassword(password) {
  // 使用PBKDF2算法进行密码哈希
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  
  // 生成随机盐值
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // 使用PBKDF2派生密钥
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt']
  );
  
  // 导出密钥
  const keyBuffer = await crypto.subtle.exportKey('raw', key);
  
  // 确保keyBuffer是ArrayBuffer类型
  if (!(keyBuffer instanceof ArrayBuffer)) {
    throw new Error('导出的密钥不是ArrayBuffer类型');
  }
  
  // 将盐值和密钥合并并转为Base64
  const result = new Uint8Array(salt.length + keyBuffer.byteLength);
  result.set(salt, 0);
  result.set(new Uint8Array(keyBuffer), salt.length);
  
  return btoa(String.fromCharCode.apply(null, result));
}

/**
 * 比较密码与哈希值是否匹配
 * @param {string} password - 原始密码
 * @param {string} hash - 哈希值
 * @returns {Promise<boolean>} - 是否匹配
 */
export async function hashCompare(password, hash) {
  try {
    // 解码哈希值
    const hashData = Uint8Array.from(atob(hash), c => c.charCodeAt(0));
    
    // 提取盐值和密钥
    const salt = hashData.slice(0, 16);
    
    // 使用相同的参数重新计算哈希
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordData,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt']
    );
    
    // 导出密钥
    const keyBuffer = await crypto.subtle.exportKey('raw', key);
    
    // 确保keyBuffer是ArrayBuffer类型
    if (!(keyBuffer instanceof ArrayBuffer)) {
      throw new Error('导出的密钥不是ArrayBuffer类型');
    }
    
    // 将计算出的密钥与存储的密钥进行比较
    const storedKey = hashData.slice(16);
    const newKey = new Uint8Array(keyBuffer);
    
    if (storedKey.length !== newKey.length) {
      return false;
    }
    
    // 比较每个字节
    for (let i = 0; i < storedKey.length; i++) {
      if (storedKey[i] !== newKey[i]) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('密码比较失败:', error);
    return false;
  }
}