/**
 * 生成管理员密码哈希的独立脚本
 * 此脚本包含所有必要的函数，不依赖外部模块
 */

/**
 * 对密码进行哈希处理
 * @param {string} password - 原始密码
 * @returns {Promise<string>} - 哈希后的密码
 */
async function hashPassword(password) {
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
  
  // 将盐值和密钥合并并转为Base64
  const result = new Uint8Array(salt.length + keyBuffer.byteLength);
  result.set(salt, 0);
  result.set(new Uint8Array(keyBuffer), salt.length);
  
  return btoa(String.fromCharCode.apply(null, result));
}

/**
 * 生成管理员密码哈希并输出SQL语句
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