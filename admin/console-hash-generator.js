/**
 * 管理员密码哈希生成脚本
 * 可以直接在浏览器控制台中运行
 * 使用方法：
 * 1. 打开浏览器控制台 (F12)
 * 2. 复制粘贴此脚本
 * 3. 按回车执行
 * 4. 复制生成的SQL语句并在Cloudflare D1控制台执行
 */

// 对密码进行哈希处理
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
  
  return btoa(String.fromCharCode.apply(null, [...result]));
}

// 生成管理员密码哈希
async function generateAdminPasswordHash() {
  try {
    // 管理员信息
    const username = 'admin';
    const password = 'admin';
    
    // 生成密码哈希
    const passwordHash = await hashPassword(password);
    
    // 输出结果
    console.log('%c===== 管理员密码哈希生成成功 =====', 'color: green; font-weight: bold;');
    console.log('用户名:', username);
    console.log('密码:', password);
    console.log('生成的密码哈希值:');
    console.log(passwordHash);
    console.log('\n请使用以下SQL语句更新管理员密码:');
    console.log(`%cUPDATE admins SET password_hash = '${passwordHash}' WHERE username = 'admin';`, 'color: blue; background: #f0f0f0; padding: 5px; border-left: 3px solid blue;');
    
    return passwordHash;
  } catch (error) {
    console.error('生成密码哈希失败:', error);
    throw error;
  }
}

// 执行生成函数
console.clear();
console.log('%c管理员密码哈希生成工具', 'color: #333; font-size: 16px; font-weight: bold;');
console.log('正在生成密码哈希...');
generateAdminPasswordHash().then(() => {
  console.log('%c操作完成！请复制上面的SQL语句并在Cloudflare D1控制台执行', 'color: green; font-weight: bold;');
}).catch(error => {
  console.error('%c操作失败！', 'color: red; font-weight: bold;', error);
});