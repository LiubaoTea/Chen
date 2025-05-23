// Cloudflare Worker for 陳記六堡茶

/**
 * 使用Web Crypto API进行密码哈希处理
 * 由于Cloudflare Worker不支持bcryptjs，改用内置的Web Crypto API
 * @param {string} password - 原始密码
 * @returns {Promise<string>} - 哈希后的密码（Base64编码）
 */
async function hashPassword(password) {
  try {
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
      console.error('导出的密钥不是ArrayBuffer类型');
      throw new Error('导出的密钥不是ArrayBuffer类型');
    }
    
    // 将盐值和密钥合并并转为Base64
    const result = new Uint8Array(salt.length + keyBuffer.byteLength);
    result.set(salt, 0);
    result.set(new Uint8Array(keyBuffer), salt.length);
    
    return btoa(String.fromCharCode.apply(null, [...result]));
  } catch (error) {
    console.error('哈希处理失败:', error);
    throw error;
  }
}

/**
 * 比较密码与哈希值是否匹配
 * @param {string} password - 原始密码
 * @param {string} hash - 哈希值
 * @returns {Promise<boolean>} - 是否匹配
 */
async function hashCompare(password, hash) {
  try {
    console.log('开始密码比较，输入密码:', password);
    console.log('存储的哈希值:', hash);
    
    // 解码哈希值
    const hashData = Uint8Array.from(atob(hash), c => c.charCodeAt(0));
    console.log('解码后的哈希数据长度:', hashData.length);
    
    // 提取盐值和密钥
    const salt = hashData.slice(0, 16);
    console.log('提取的盐值长度:', salt.length);
    
    // 使用相同的参数重新计算哈希
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    console.log('编码后的密码数据长度:', passwordData.length);
    
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
      console.error('导出的密钥不是ArrayBuffer类型');
      return false;
    }
    
    console.log('生成的密钥长度:', keyBuffer.byteLength);
    
    // 将计算出的密钥与存储的密钥进行比较
    const storedKey = hashData.slice(16);
    const newKey = new Uint8Array(keyBuffer);
    
    console.log('存储的密钥长度:', storedKey.length);
    console.log('新生成的密钥长度:', newKey.length);
    
    if (storedKey.length !== newKey.length) {
      console.log('密钥长度不匹配');
      return false;
    }
    
    // 比较每个字节
    let mismatchCount = 0;
    for (let i = 0; i < storedKey.length; i++) {
      if (storedKey[i] !== newKey[i]) {
        mismatchCount++;
        if (mismatchCount <= 3) {
          console.log(`密钥不匹配，位置 ${i}: 存储值=${storedKey[i]}, 计算值=${newKey[i]}`);
        }
      }
    }
    
    if (mismatchCount > 0) {
      console.log(`总共有 ${mismatchCount} 个字节不匹配`);
      return false;
    }
    
    console.log('密码验证成功');
    return true;
  } catch (error) {
    console.error('密码比较失败:', error);
    return false;
  }
}

// CORS配置
//==========================================================================
//                        一、CORS配置
//==========================================================================
const corsHeaders = {
   
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
};

// 添加CORS头的通用响应函数
const addCorsToResponse = (response) => {
    return addCorsHeaders(response, corsHeaders);
};

//==========================================================================
//                          二、CORS头处理函数
//                             处理跨域请求的CORS头
//==========================================================================

// 添加CORS头的辅助函数
function addCorsHeaders(response, corsHeaders) {
    const newHeaders = new Headers(response.headers);
    Object.keys(corsHeaders).forEach(key => {
        newHeaders.set(key, corsHeaders[key]);
    });
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
    });
}


//==========================================================================
//                       三、处理OPTIONS预检请求
//==========================================================================
const handleOptions = (request) => {
    return new Response(null, {
        headers: corsHeaders,
        status: 204
    });
};

//==========================================================================
//                       管理员认证和权限验证
//==========================================================================
// 验证管理员身份
const verifyAdmin = async (request) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    
    const token = authHeader.split(' ')[1];
    try {
        // 解析token（实际应用中应使用更安全的JWT验证）
        const decoded = JSON.parse(atob(token));
        if (decoded.role === 'admin' || decoded.role === 'superadmin') {
            return decoded;
        }
        return null;
    } catch (error) {
        console.error('验证管理员身份失败:', error);
        return null;
    }
};

// 管理员API路由处理
const handleAdminAPI = async (request, env) => {
    // 处理OPTIONS预检请求
    if (request.method === 'OPTIONS') {
        return handleOptions(request);
    }
    
    const url = new URL(request.url);
    const path = url.pathname;
    
    // 管理员登录接口
    if (path === '/api/admin/login' && request.method === 'POST') {
        try {
            const { username, password } = await request.json();
            
            // 从数据库中获取管理员信息
            const admin = await env.DB.prepare(
                'SELECT admin_id, username, password_hash, role FROM admins WHERE username = ?'
            ).bind(username).first();
            
            if (!admin) {
                return new Response(JSON.stringify({ error: '用户名或密码错误' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            console.log('正在验证管理员密码，用户名:', username);
            console.log('数据库中的密码哈希:', admin.password_hash);
            
            // 验证密码
            const isPasswordValid = await hashCompare(password, admin.password_hash);
            console.log('密码验证结果:', isPasswordValid ? '成功' : '失败');
            
            if (isPasswordValid) {
                // 更新最后登录时间
                await env.DB.prepare(
                    'UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE admin_id = ?'
                ).bind(admin.admin_id).run();
                
                // 生成管理员token
                const adminInfo = {
                    username: admin.username,
                    role: admin.role,
                    adminId: admin.admin_id,
                    timestamp: new Date().toISOString()
                };
                
                const token = btoa(JSON.stringify(adminInfo));
                
                return new Response(JSON.stringify({
                    token,
                    username: admin.username,
                    role: admin.role,
                    adminId: admin.admin_id
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            return new Response(JSON.stringify({ error: '用户名或密码错误' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '登录失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 验证管理员身份
    const adminInfo = await verifyAdmin(request);
    if (!adminInfo) {
        return new Response(JSON.stringify({ error: '未授权访问' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    // 仪表盘统计数据
    if (path === '/api/admin/dashboard/stats' && request.method === 'GET') {
        try {
            // 获取订单总数
            const ordersCount = await env.DB.prepare(
                'SELECT COUNT(*) as count FROM orders'
            ).first();
            
            // 获取总销售额
            const salesTotal = await env.DB.prepare(
                'SELECT SUM(total_amount) as total FROM orders WHERE status != "cancelled"'
            ).first();
            
            // 获取用户总数
            const usersCount = await env.DB.prepare(
                'SELECT COUNT(*) as count FROM users'
            ).first();
            
            // 获取商品总数
            const productsCount = await env.DB.prepare(
                'SELECT COUNT(*) as count FROM products'
            ).first();
            
            return new Response(JSON.stringify({
                totalOrders: ordersCount?.count || 0,
                totalSales: salesTotal?.total || 0,
                totalUsers: usersCount?.count || 0,
                totalProducts: productsCount?.count || 0
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取仪表盘数据失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 获取最近订单
    if (path === '/api/admin/orders/recent' && request.method === 'GET') {
        try {
            const limit = parseInt(url.searchParams.get('limit') || '5');
            
            const { results: orders } = await env.DB.prepare(
                `SELECT o.*, u.username 
                FROM orders o 
                JOIN users u ON o.user_id = u.user_id 
                ORDER BY o.created_at DESC 
                LIMIT ?`
            ).bind(limit).all();
            
            return new Response(JSON.stringify(orders), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取最近订单失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 获取热销商品
    if (path === '/api/admin/products/top' && request.method === 'GET') {
        try {
            const limit = parseInt(url.searchParams.get('limit') || '5');
            
            // 获取销量最高的商品
            const { results: products } = await env.DB.prepare(
                `SELECT p.*, 
                (SELECT COUNT(*) FROM order_items oi JOIN orders o ON oi.order_id = o.order_id 
                WHERE oi.product_id = p.product_id AND o.status != 'cancelled') as sales_count 
                FROM products p 
                ORDER BY sales_count DESC 
                LIMIT ?`
            ).bind(limit).all();
            
            return new Response(JSON.stringify(products), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取热销商品失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 获取销售趋势数据
    if (path === '/api/admin/sales/trend' && request.method === 'GET') {
        try {
            const period = url.searchParams.get('period') || 'month';
            let timeFormat, limit;
            
            // 根据时间周期设置SQL日期格式和数据点数量
            if (period === 'week') {
                timeFormat = '%Y-%m-%d'; // 按天
                limit = 7;
            } else if (period === 'year') {
                timeFormat = '%Y-%m'; // 按月
                limit = 12;
            } else { // month
                timeFormat = '%Y-%m-%d'; // 按天
                limit = 30;
            }
            
            // 获取销售额趋势
            const { results: salesData } = await env.DB.prepare(
                `SELECT 
                strftime('${timeFormat}', datetime(created_at, 'unixepoch')) as time_period,
                SUM(total_amount) as sales,
                COUNT(*) as orders
                FROM orders
                WHERE status != 'cancelled'
                AND created_at >= unixepoch('now', '-${limit} days')
                GROUP BY time_period
                ORDER BY time_period ASC
                LIMIT ${limit}`
            ).all();
            
            // 格式化数据
            const labels = salesData.map(item => item.time_period);
            const sales = salesData.map(item => item.sales || 0);
            const orders = salesData.map(item => item.orders || 0);
            
            return new Response(JSON.stringify({
                labels,
                sales,
                orders
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取销售趋势数据失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 获取分类占比数据
    if (path === '/api/admin/categories/distribution' && request.method === 'GET') {
        try {
            // 获取各分类的商品数量
            const { results: categoryData } = await env.DB.prepare(
                `SELECT 
                c.category_name,
                COUNT(p.product_id) as product_count
                FROM product_categories c
                LEFT JOIN products p ON p.category_id = c.category_id
                GROUP BY c.category_id
                ORDER BY product_count DESC`
            ).all();
            
            // 格式化数据
            const labels = categoryData.map(item => item.category_name);
            const values = categoryData.map(item => item.product_count);
            
            return new Response(JSON.stringify({
                labels,
                values
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取分类占比数据失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 商品管理API
    // 获取商品列表
    if (path === '/api/admin/products' && request.method === 'GET') {
        try {
            const page = parseInt(url.searchParams.get('page') || '1');
            const limit = parseInt(url.searchParams.get('limit') || '10');
            const offset = (page - 1) * limit;
            
            // 构建查询条件
            let whereClause = '';
            const queryParams = [];
            
            const category = url.searchParams.get('category');
            const search = url.searchParams.get('search');
            const minPrice = url.searchParams.get('minPrice');
            const maxPrice = url.searchParams.get('maxPrice');
            
            if (category) {
                whereClause += whereClause ? ' AND ' : ' WHERE ';
                whereClause += 'p.category_id = ?';
                queryParams.push(category);
            }
            
            if (search) {
                whereClause += whereClause ? ' AND ' : ' WHERE ';
                whereClause += '(p.name LIKE ? OR p.description LIKE ?)';
                queryParams.push(`%${search}%`, `%${search}%`);
            }
            
            if (minPrice) {
                whereClause += whereClause ? ' AND ' : ' WHERE ';
                whereClause += 'p.price >= ?';
                queryParams.push(minPrice);
            }
            
            if (maxPrice) {
                whereClause += whereClause ? ' AND ' : ' WHERE ';
                whereClause += 'p.price <= ?';
                queryParams.push(maxPrice);
            }
            
            // 获取总记录数
            const countQuery = `SELECT COUNT(*) as total FROM products p${whereClause}`;
            const totalResult = await env.DB.prepare(countQuery).bind(...queryParams).first();
            
            // 获取分页数据
            const productsQuery = `
                SELECT p.*, c.category_name 
                FROM products p 
                LEFT JOIN product_categories c ON p.category_id = c.category_id
                ${whereClause}
                ORDER BY p.created_at DESC 
                LIMIT ? OFFSET ?`;
            
            const { results: products } = await env.DB.prepare(productsQuery)
                .bind(...queryParams, limit, offset)
                .all();
            
            return new Response(JSON.stringify({
                products,
                pagination: {
                    total: totalResult.total,
                    page,
                    limit,
                    pages: Math.ceil(totalResult.total / limit)
                }
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取商品列表失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 创建新商品
    if (path === '/api/admin/products' && request.method === 'POST') {
        try {
            const productData = await request.json();
            
            // 验证必填字段
            if (!productData.name || !productData.price) {
                return new Response(JSON.stringify({ error: '商品名称和价格为必填项' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            // 插入商品数据
            const result = await env.DB.prepare(
                `INSERT INTO products (
                    name, description, specifications, aging_years, 
                    price, stock, category_id, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
                productData.name,
                productData.description || '',
                productData.specifications || '{}',
                productData.aging_years || 0,
                productData.price,
                productData.stock || 0,
                productData.category_id || null,
                Math.floor(Date.now() / 1000)
            ).run();
            
            return new Response(JSON.stringify({
                message: '商品创建成功',
                productId: result.lastRowId
            }), {
                status: 201,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '创建商品失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 获取单个商品详情
    const getProductMatch = path.match(/^\/api\/admin\/products\/(\d+)$/);
    if (getProductMatch && request.method === 'GET') {
        try {
            const productId = getProductMatch[1];
            
            const product = await env.DB.prepare(
                `SELECT p.*, c.category_name 
                FROM products p 
                LEFT JOIN product_categories c ON p.category_id = c.category_id 
                WHERE p.product_id = ?`
            ).bind(productId).first();
            
            if (!product) {
                return new Response(JSON.stringify({ error: '商品不存在' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            return new Response(JSON.stringify(product), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取商品详情失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 更新商品
    const updateProductMatch = path.match(/^\/api\/admin\/products\/(\d+)$/);
    if (updateProductMatch && request.method === 'PUT') {
        try {
            const productId = updateProductMatch[1];
            const productData = await request.json();
            
            // 检查商品是否存在
            const existingProduct = await env.DB.prepare(
                'SELECT 1 FROM products WHERE product_id = ?'
            ).bind(productId).first();
            
            if (!existingProduct) {
                return new Response(JSON.stringify({ error: '商品不存在' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            // 更新商品数据
            await env.DB.prepare(
                `UPDATE products SET 
                name = ?, 
                description = ?, 
                specifications = ?, 
                aging_years = ?, 
                price = ?, 
                stock = ?, 
                category_id = ? 
                WHERE product_id = ?`
            ).bind(
                productData.name,
                productData.description || '',
                productData.specifications || '{}',
                productData.aging_years || 0,
                productData.price,
                productData.stock || 0,
                productData.category_id || null,
                productId
            ).run();
            
            return new Response(JSON.stringify({
                message: '商品更新成功',
                productId
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新商品失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 删除商品
    const deleteProductMatch = path.match(/^\/api\/admin\/products\/(\d+)$/);
    if (deleteProductMatch && request.method === 'DELETE') {
        try {
            const productId = deleteProductMatch[1];
            
            // 检查商品是否存在
            const existingProduct = await env.DB.prepare(
                'SELECT 1 FROM products WHERE product_id = ?'
            ).bind(productId).first();
            
            if (!existingProduct) {
                return new Response(JSON.stringify({ error: '商品不存在' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            // 删除商品
            await env.DB.prepare(
                'DELETE FROM products WHERE product_id = ?'
            ).bind(productId).run();
            
            return new Response(JSON.stringify({
                message: '商品删除成功'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '删除商品失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 更新商品库存
    const updateStockMatch = path.match(/^\/api\/admin\/products\/(\d+)\/stock$/);
    if (updateStockMatch && request.method === 'PUT') {
        try {
            const productId = updateStockMatch[1];
            const { stock } = await request.json();
            
            // 检查商品是否存在
            const existingProduct = await env.DB.prepare(
                'SELECT 1 FROM products WHERE product_id = ?'
            ).bind(productId).first();
            
            if (!existingProduct) {
                return new Response(JSON.stringify({ error: '商品不存在' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            // 更新库存
            await env.DB.prepare(
                'UPDATE products SET stock = ? WHERE product_id = ?'
            ).bind(stock, productId).run();
            
            return new Response(JSON.stringify({
                message: '库存更新成功',
                productId,
                stock
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新库存失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    return new Response(JSON.stringify({ error: '请求的API不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
    });
};


//==========================================================================
//                         四、用户相关API路由处理
//                 处理用户注册、登录和获取用户信息的相关请求
//==========================================================================
const handleUserAuth = async (request, env) => {
    // 处理OPTIONS预检请求
    if (request.method === 'OPTIONS') {
        return handleOptions(request);
    }
    const url = new URL(request.url);
    const path = url.pathname;

    // 生成符合要求的6位用户ID（不含4且首位非0）
function generateValidUserId() {
    const digits = [1,2,3,5,6,7,8,9];
    let id = digits[Math.floor(Math.random() * digits.length)].toString();
    const remainingDigits = [0,1,2,3,5,6,7,8,9];
    
    for (let i = 0; i < 5; i++) {
        id += remainingDigits[Math.floor(Math.random() * remainingDigits.length)];
    }
    
    return parseInt(id);
}

if (path === '/api/register' && request.method === 'POST') {
        try {
            const { username, email, password } = await request.json();
            
            // 检查用户是否已存在
            const existingUser = await env.DB.prepare(
                'SELECT username FROM users WHERE username = ?'
            ).bind(username).first();
            
            if (existingUser) {
                return new Response(JSON.stringify({ error: '用户名已存在' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // 生成用户ID（最多重试5次）
            let userId;
            let retryCount = 0;
            while (retryCount < 5) {
                try {
                    userId = generateValidUserId();
                    // 检查ID是否已存在
                    const existingId = await env.DB.prepare(
                        'SELECT 1 FROM users WHERE user_id = ?'
                    ).bind(userId).first();
                    
                    if (!existingId) break;
                } catch (error) {
                    console.error('生成用户ID时出错:', error);
                }
                retryCount++;
            }

            if (retryCount >= 5) {
                return new Response(JSON.stringify({ error: '无法生成有效的用户ID，请稍后重试' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // 创建新用户
            const timestamp = new Date().toISOString();
            // 对密码进行哈希处理
            const hashedPassword = await hashPassword(password);
            await env.DB.prepare(
                'INSERT INTO users (user_id, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
            ).bind(userId, username, email, hashedPassword, timestamp).run();

            return new Response(JSON.stringify({ message: '注册成功', userId }), {
                status: 201,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '注册失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }

    if (path === '/api/login' && request.method === 'POST') {
        try {
            const { username, password } = await request.json();
            
            // 验证用户凭据
            const user = await env.DB.prepare(
                'SELECT * FROM users WHERE username = ? AND password_hash = ?'
            ).bind(username, password).first();

            if (!user) {
                return new Response(JSON.stringify({ error: '用户名或密码错误' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // 生成JWT token（实际应用中需要使用更安全的token生成方式）
            const token = btoa(JSON.stringify({ username, userId: user.user_id, timestamp: new Date().toISOString() }));

            return new Response(JSON.stringify({ 
                token,
                username: user.username,
                email: user.email
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '登录失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }

    if (path === '/api/user' && request.method === 'GET') {
        try {
            // 从请求头中获取token
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const username = decoded.username;

            // 获取用户信息
            const user = await env.DB.prepare(
                'SELECT user_id, username, email, created_at FROM users WHERE username = ?'
            ).bind(username).first();

            if (!user) {
                return new Response(JSON.stringify({ error: '用户不存在' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            return new Response(JSON.stringify(user), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取用户信息失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }

    // 更新用户信息
    if (path === '/api/user/profile' && request.method === 'PUT') {
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            const { username, email } = await request.json();
            
            // 更新用户信息
            await env.DB.prepare(
                'UPDATE users SET username = ?, email = ? WHERE user_id = ?'
            ).bind(username, email, userId).run();

            return new Response(JSON.stringify({ message: '用户信息更新成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新用户信息失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }

    // 更新用户密码
    if (path === '/api/user/password' && request.method === 'PUT') {
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            const { oldPassword, newPassword } = await request.json();

            // 验证旧密码
            const user = await env.DB.prepare(
                'SELECT * FROM users WHERE user_id = ? AND password_hash = ?'
            ).bind(userId, oldPassword).first();

            if (!user) {
                return new Response(JSON.stringify({ error: '原密码错误' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // 更新密码
            await env.DB.prepare(
                'UPDATE users SET password_hash = ? WHERE user_id = ?'
            ).bind(newPassword, userId).run();

            return new Response(JSON.stringify({ message: '密码更新成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新密码失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }

    // 获取用户通知设置
    if (path === '/api/user/settings' && request.method === 'GET') {
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            const settings = await env.DB.prepare(
                'SELECT notification_prefs FROM user_settings WHERE user_id = ?'
            ).bind(userId).first();

            return new Response(JSON.stringify(settings || { notification_prefs: null }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取通知设置失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 更新用户通知设置
    if (path === '/api/user/settings' && request.method === 'PUT') {
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            const { notification_prefs } = await request.json();
            
            // 检查是否已有设置记录
            const existingSettings = await env.DB.prepare(
                'SELECT 1 FROM user_settings WHERE user_id = ?'
            ).bind(userId).first();

            if (existingSettings) {
                // 更新现有设置
                await env.DB.prepare(
                    'UPDATE user_settings SET notification_prefs = ? WHERE user_id = ?'
                ).bind(notification_prefs, userId).run();
            } else {
                // 创建新设置记录
                await env.DB.prepare(
                    'INSERT INTO user_settings (user_id, notification_prefs) VALUES (?, ?)'
                ).bind(userId, notification_prefs).run();
            }

            return new Response(JSON.stringify({ message: '通知设置更新成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新通知设置失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    return new Response('Not Found', { status: 404 });
};

//==========================================================================
//                      五、地址管理API路由处理
//              处理用户收货地址的添加、修改、删除和查询请求
//==========================================================================
const handleAddresses = async (request, env) => {
    // 处理OPTIONS预检请求
    if (request.method === 'OPTIONS') {
        return handleOptions(request);
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // 验证用户身份
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: '未授权访问' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const token = authHeader.split(' ')[1];
    const decoded = JSON.parse(atob(token));
    const userId = decoded.userId;

    // 获取地址列表
    if (path === '/api/user/addresses' && request.method === 'GET') {
        try {
            const { results: addresses } = await env.DB.prepare(
                'SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC'
            ).bind(userId).all();

            return new Response(JSON.stringify(addresses), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取地址列表失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 添加新地址
    if (path === '/api/user/addresses' && request.method === 'POST') {
        try {
            const { recipient_name, contact_phone, full_address, region, postal_code, is_default } = await request.json();

            // 如果设置为默认地址，先将其他地址设置为非默认
            if (is_default) {
                await env.DB.prepare(
                    'UPDATE user_addresses SET is_default = 0 WHERE user_id = ?'
                ).bind(userId).run();
            }

            // 插入新地址
            const result = await env.DB.prepare(
                'INSERT INTO user_addresses (user_id, recipient_name, contact_phone, full_address, region, postal_code, is_default) VALUES (?, ?, ?, ?, ?, ?, ?)'
            ).bind(userId, recipient_name, contact_phone, full_address, region, postal_code, is_default ? 1 : 0).run();

            return new Response(JSON.stringify({ message: '添加地址成功', address_id: result.lastRowId }), {
                status: 201,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '添加地址失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 获取单个地址信息
    const getAddressMatch = path.match(/^\/api\/user\/addresses\/(\d+)$/);    
    if (getAddressMatch && request.method === 'GET') {
        try {
            const addressId = getAddressMatch[1];

            // 验证地址所有权
            const address = await env.DB.prepare(
                'SELECT * FROM user_addresses WHERE address_id = ? AND user_id = ?'
            ).bind(addressId, userId).first();

            if (!address) {
                return new Response(JSON.stringify({ error: '地址不存在或无权限访问' }), {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            return new Response(JSON.stringify(address), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取地址信息失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 更新地址
    const updateMatch = path.match(/^\/api\/user\/addresses\/(\d+)$/);
    if (updateMatch && request.method === 'PUT') {
        try {
            const addressId = updateMatch[1];
            const { recipient_name, contact_phone, full_address, region, postal_code, is_default } = await request.json();

            // 验证地址所有权
            const address = await env.DB.prepare(
                'SELECT 1 FROM user_addresses WHERE address_id = ? AND user_id = ?'
            ).bind(addressId, userId).first();

            if (!address) {
                return new Response(JSON.stringify({ error: '地址不存在或无权限修改' }), {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // 如果设置为默认地址，先将其他地址设置为非默认
            if (is_default) {
                await env.DB.prepare(
                    'UPDATE user_addresses SET is_default = 0 WHERE user_id = ?'
                ).bind(userId).run();
            }

            // 更新地址信息
            await env.DB.prepare(
                'UPDATE user_addresses SET recipient_name = ?, contact_phone = ?, full_address = ?, region = ?, postal_code = ?, is_default = ? WHERE address_id = ?'
            ).bind(recipient_name, contact_phone, full_address, region, postal_code, is_default ? 1 : 0, addressId).run();

            return new Response(JSON.stringify({ message: '更新地址成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新地址失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 删除地址
    const deleteMatch = path.match(/^\/api\/user\/addresses\/(\d+)$/);
    if (deleteMatch && request.method === 'DELETE') {
        try {
            const addressId = deleteMatch[1];

            // 验证地址所有权
            const address = await env.DB.prepare(
                'SELECT 1 FROM user_addresses WHERE address_id = ? AND user_id = ?'
            ).bind(addressId, userId).first();

            if (!address) {
                return new Response(JSON.stringify({ error: '地址不存在或无权限删除' }), {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // 删除地址
            await env.DB.prepare(
                'DELETE FROM user_addresses WHERE address_id = ?'
            ).bind(addressId).run();

            return new Response(JSON.stringify({ message: '删除地址成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '删除地址失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    return new Response('Not Found', { status: 404 });
};

//==========================================================================
//                      六、商品相关API路由处理
//              处理商品列表、商品详情、商品筛选和相关商品推荐的请求
//==========================================================================
const handleProducts = async (request, env) => {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/products' && request.method === 'GET') {
        try {
            // 获取查询参数
            const category = url.searchParams.get('category');
            const minPrice = url.searchParams.get('minPrice');
            const maxPrice = url.searchParams.get('maxPrice');
            const year = url.searchParams.get('year');
            
            // 构建SQL查询
            let sql = 'SELECT * FROM products';
            const params = [];
            
            console.log('开始执行商品查询');
            console.log('初始SQL:', sql);
            const conditions = [];
            
            console.log('开始构建SQL查询');
            
            if (category && category !== 'all') {
                conditions.push('category = ?');
                params.push(category);
                console.log('添加类别筛选:', category);
            }
            
            if (minPrice) {
                conditions.push('price >= ?');
                params.push(parseFloat(minPrice));
            }
            
            if (maxPrice) {
                conditions.push('price <= ?');
                params.push(parseFloat(maxPrice));
            }
            
            if (year) {
                conditions.push('aging_years = ?');
                params.push(parseInt(year));
            }
            
            if (conditions.length > 0) {
                sql += ' WHERE ' + conditions.join(' AND ');
            }
            
            // 执行查询
            console.log('执行SQL查询:', sql, '参数:', params);
            let products;
            try {
                products = await env.DB.prepare(sql).bind(...params).all();
                console.log('数据库查询结果:', products);
            } catch (dbError) {
                console.error('数据库查询错误:', dbError);
                throw new Error(`数据库查询失败: ${dbError.message}`);
            }
            
            if (!products || !products.results) {
                console.error('查询结果无效:', products);
                throw new Error('查询结果为空或格式不正确');
            }
            
            console.log('查询到商品数量:', products.results.length);
            
             // 处理产品图片URL，将本地路径替换为R2存储路径
             const productsWithImages = products.results.map(product => {
             // 假设产品图片存储在R2的image/Goods目录下
                 const imageUrl = `https://${env.R2_DOMAIN}/image/Goods/${product.image_filename}`;
                return { ...product, image_url: imageUrl };
              });

            return new Response(JSON.stringify(productsWithImages), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('获取商品列表失败:', error);
            const errorMessage = error.message || '未知错误';
            const errorDetails = error.stack || '';
            return new Response(JSON.stringify({
                error: '获取商品列表失败',
                message: errorMessage,
                details: errorDetails
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 获取相关推荐商品
    const relatedMatch = path.match(/^\/api\/products\/related\/(\d+)$/);    
    if (relatedMatch) {
        const productId = relatedMatch[1];
        try {
            // 获取当前商品的类别
            const { results: currentProduct } = await env.DB.prepare(
                'SELECT category FROM products WHERE product_id = ?'
            ).bind(productId).all();

            if (currentProduct.length === 0) {
                return new Response(JSON.stringify({ error: '商品不存在' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // 获取同类别的其他商品
            const { results: relatedProducts } = await env.DB.prepare(
                'SELECT * FROM products WHERE category = ? AND product_id != ? LIMIT 4'
            ).bind(currentProduct[0].category, productId).all();

            // 处理产品图片URL
            const productsWithImages = relatedProducts.map(product => {
                const imageUrl = `https://${env.R2_DOMAIN}/image/Goods/${product.image_filename}`;
                return { ...product, image_url: imageUrl };
            });

            return new Response(JSON.stringify(productsWithImages), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取相关商品失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 获取单个商品详情
    if (path.match(/\/api\/products\/\d+$/) && request.method === 'GET') {
        try {
            const productId = path.split('/').pop();
            const product = await env.DB.prepare(
                'SELECT * FROM products WHERE product_id = ?'
            ).bind(productId).first();

            if (!product) {
                return new Response(JSON.stringify({ error: '商品不存在' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // 处理产品图片URL
            const imageUrl = `https://${env.R2_DOMAIN}/image/Goods/${product.image_filename}`;
            product.image_url = imageUrl;

            return new Response(JSON.stringify(product), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取商品详情失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 获取用户通知设置
    if (path === '/api/user/settings' && request.method === 'GET') {
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            const settings = await env.DB.prepare(
                'SELECT notification_prefs FROM user_settings WHERE user_id = ?'
            ).bind(userId).first();

            return new Response(JSON.stringify(settings || { notification_prefs: null }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取通知设置失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 更新用户通知设置
    if (path === '/api/user/settings' && request.method === 'PUT') {
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            const { notification_prefs } = await request.json();
            
            // 检查是否已有设置记录
            const existingSettings = await env.DB.prepare(
                'SELECT 1 FROM user_settings WHERE user_id = ?'
            ).bind(userId).first();

            if (existingSettings) {
                // 更新现有设置
                await env.DB.prepare(
                    'UPDATE user_settings SET notification_prefs = ? WHERE user_id = ?'
                ).bind(notification_prefs, userId).run();
            } else {
                // 创建新设置记录
                await env.DB.prepare(
                    'INSERT INTO user_settings (user_id, notification_prefs) VALUES (?, ?)'
                ).bind(userId, notification_prefs).run();
            }

            return new Response(JSON.stringify({ message: '通知设置更新成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新通知设置失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    return new Response('Not Found', { status: 404 });
};

//==========================================================================
//                       六、购物车相关API路由处理
//        主要的购物车处理函数，负责处理所有购物车相关的API请求（添加、删除、更新、查询等）
//==========================================================================
const handleCartOperations = async (request, env) => {
    console.log('开始处理购物车请求:', request.method, request.url);
    
    // 处理OPTIONS预检请求
    if (request.method === 'OPTIONS') {
        console.log('处理OPTIONS预检请求');
        return handleOptions(request);
    }

    // 使用全局定义的addCorsToResponse函数
    console.log('解析请求URL和路径');
    const url = new URL(request.url);
    const path = url.pathname;

    // 获取用户ID
    console.log('开始验证用户授权');
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('授权头缺失或格式错误');
        return new Response(JSON.stringify({ error: '未授权访问' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    console.log('解析JWT令牌');
    const token = authHeader.split(' ')[1];
    let decoded, userId;
    try {
        decoded = JSON.parse(atob(token));
        userId = decoded.userId;
        console.log('成功获取用户ID:', userId);
    } catch (error) {
        console.error('令牌解析失败:', error);
        return new Response(JSON.stringify({ error: '无效的授权令牌' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // 检查或创建购物车会话
    console.log('开始处理购物车会话');
    const currentTimestamp = Math.floor(Date.now() / 1000);
    console.log('当前时间戳:', currentTimestamp);
    
    let session;
    try {
        console.log('查询现有购物车会话');
        session = await env.DB.prepare(
            'SELECT * FROM shopping_sessions WHERE user_id = ? AND status = "active" AND expires_at > ?'
        ).bind(userId, currentTimestamp).first();

        if (!session) {
            console.log('未找到有效会话，创建新会话');
            // 创建新的购物车会话
            const expiresAt = currentTimestamp + (7 * 24 * 60 * 60); // 7天后过期
            console.log('新会话过期时间:', expiresAt);
            session = await env.DB.prepare(
                'INSERT INTO shopping_sessions (user_id, status, created_at, expires_at) VALUES (?, ?, ?, ?) RETURNING *'
            ).bind(userId, 'active', currentTimestamp, expiresAt).first();
            console.log('新会话创建成功，会话ID:', session.session_id);
        } else {
            console.log('找到现有会话，会话ID:', session.session_id);
        }
    } catch (error) {
        console.error('购物车会话处理错误:', error);
        return addCorsToResponse(new Response(JSON.stringify({ 
            error: '服务器错误', 
            details: '无法处理购物车会话'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        }));
    }

    // 获取购物车内容
    if (path === '/api/cart' && request.method === 'GET') {
        try {
            // 如果没有有效会话，直接返回空购物车
            if (!session) {
                console.log('没有有效的购物车会话，返回空购物车');
                return addCorsToResponse(new Response(JSON.stringify([]), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                }));
            }

            console.log('开始查询购物车内容，用户ID:', userId, '会话ID:', session.session_id);
            
            console.log('执行购物车查询，参数:', { userId, sessionId: session.session_id });
            const cartItems = await env.DB.prepare(
                `SELECT c.cart_id, c.user_id, c.product_id, c.quantity, c.session_id,
                        p.name, p.price,
                        'Goods_' || p.product_id || '.png' as image_filename
                FROM carts c
                INNER JOIN products p ON c.product_id = p.product_id
                WHERE c.user_id = ? AND c.session_id = ?`
            ).bind(userId, session.session_id).all();
            console.log('SQL查询完成');

            console.log('购物车查询结果:', cartItems);

            if (!cartItems || !cartItems.results || !Array.isArray(cartItems.results)) {
                console.log('购物车为空或查询结果格式不正确');
                return addCorsToResponse(new Response(JSON.stringify([]), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                }));
            }

            // 处理产品图片URL
            const itemsWithImages = cartItems.results.map(item => {
                if (!item) return null;
                const imageUrl = item.image_filename 
                    ? `https://${env.R2_DOMAIN}/image/Goods/${item.image_filename}`
                    : null;
                return { ...item, image_url: imageUrl };
            }).filter(item => item !== null);

            console.log('处理后的购物车数据:', itemsWithImages);

            return addCorsToResponse(new Response(JSON.stringify(itemsWithImages), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }));
        } catch (error) {
            console.error('获取购物车失败:', error);
            return addCorsToResponse(new Response(JSON.stringify({
                error: '获取购物车失败',
                details: error.message,
                errorCode: 'CART_FETCH_ERROR'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }));
        }
    }

    // 添加商品到购物车
    if (path === '/api/cart/add' && request.method === 'POST') {
        try {
            const { productId, quantity } = await request.json();
            if (!productId || !quantity || typeof productId !== 'number' || typeof quantity !== 'number') {
                return new Response(JSON.stringify({ error: '无效的商品ID或数量' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // 检查商品是否存在
            const product = await env.DB.prepare(
                'SELECT * FROM products WHERE product_id = ?'
            ).bind(productId).first();

            if (!product) {
                return addCorsToResponse(new Response(JSON.stringify({ error: '商品不存在' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                }));
            }

            // 检查购物车会话是否有效
            const currentTimestamp = Math.floor(Date.now() / 1000);
            let session = await env.DB.prepare(
                'SELECT * FROM shopping_sessions WHERE user_id = ? AND status = "active" AND expires_at > ?'
            ).bind(userId, currentTimestamp).first();

            if (!session) {
                // 创建新的购物车会话
                const expiresAt = currentTimestamp + (24 * 60 * 60); // 24小时后过期
                session = await env.DB.prepare(
                    'INSERT INTO shopping_sessions (user_id, status, created_at, expires_at) VALUES (?, ?, ?, ?) RETURNING *'
                ).bind(userId, 'active', currentTimestamp, expiresAt).first();
            }

            try {
                // 检查商品是否已在购物车中
                const existingItem = await env.DB.prepare(
                    'SELECT * FROM carts WHERE user_id = ? AND product_id = ? AND session_id = ?'
                ).bind(userId, productId, session.session_id).first();

                if (existingItem) {
                    // 更新数量
                    await env.DB.prepare(
                        'UPDATE carts SET quantity = quantity + ? WHERE user_id = ? AND product_id = ? AND session_id = ?'
                    ).bind(quantity, userId, productId, session.session_id).run();
                } else {
                    // 添加新商品
                    await env.DB.prepare(
                        'INSERT INTO carts (user_id, product_id, quantity, added_at, session_id) VALUES (?, ?, ?, ?, ?)'
                    ).bind(userId, productId, quantity, currentTimestamp, session.session_id).run();
                }
            } catch (error) {
                console.error('购物车操作数据库错误:', error);
                return addCorsToResponse(new Response(JSON.stringify({ 
                    error: '服务器错误', 
                    details: '无法更新购物车'
                }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                }));
            }

            return addCorsToResponse(new Response(JSON.stringify({ message: '添加成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }));
        } catch (error) {
            return addCorsToResponse(new Response(JSON.stringify({ error: '添加到购物车失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }));
        }
    }

    // 从购物车移除商品
    if (path === '/api/cart/remove' && request.method === 'POST') {
        try {
            const { productId } = await request.json();

            // 检查购物车会话是否有效
            const session = await env.DB.prepare(
                'SELECT * FROM shopping_sessions WHERE user_id = ? AND status = "active"'
            ).bind(userId).first();

            if (!session) {
                return new Response(JSON.stringify({ error: '购物车会话已过期' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            await env.DB.prepare(
                'DELETE FROM carts WHERE user_id = ? AND product_id = ? AND session_id = ?'
            ).bind(userId, productId, session.session_id).run();

            return addCorsToResponse(new Response(JSON.stringify({ message: '移除成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }));
        } catch (error) {
            return addCorsToResponse(new Response(JSON.stringify({ error: '从购物车移除失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }));
        }
    }

    // 更新购物车商品数量
    if (path === '/api/cart/update' && request.method === 'POST') {
        try {
            const { productId, quantity } = await request.json();

            // 检查购物车会话是否有效
            const session = await env.DB.prepare(
                'SELECT * FROM shopping_sessions WHERE user_id = ? AND status = "active"'
            ).bind(userId).first();

            if (!session) {
                return new Response(JSON.stringify({ error: '购物车会话已过期' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            await env.DB.prepare(
                'UPDATE carts SET quantity = ? WHERE user_id = ? AND product_id = ? AND session_id = ?'
            ).bind(quantity, userId, productId, session.session_id).run();

            return addCorsToResponse(new Response(JSON.stringify({ message: '更新成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }));
        } catch (error) {
            return addCorsToResponse(new Response(JSON.stringify({ error: '更新购物车失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }));
        }
    }

    // 清空购物车
    if (path === '/api/cart/clear' && request.method === 'POST') {
        try {
            // 检查购物车会话是否有效
            const session = await env.DB.prepare(
                'SELECT * FROM shopping_sessions WHERE user_id = ? AND status = "active"'
            ).bind(userId).first();

            if (!session) {
                return new Response(JSON.stringify({ error: '购物车会话已过期' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            await env.DB.prepare(
                'DELETE FROM carts WHERE user_id = ? AND session_id = ?'
            ).bind(userId, session.session_id).run();

            return new Response(JSON.stringify({ message: '清空成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '清空购物车失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 获取用户通知设置
    if (path === '/api/user/settings' && request.method === 'GET') {
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            const settings = await env.DB.prepare(
                'SELECT notification_prefs FROM user_settings WHERE user_id = ?'
            ).bind(userId).first();

            return new Response(JSON.stringify(settings || { notification_prefs: null }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取通知设置失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 更新用户通知设置
    if (path === '/api/user/settings' && request.method === 'PUT') {
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            const { notification_prefs } = await request.json();
            
            // 检查是否已有设置记录
            const existingSettings = await env.DB.prepare(
                'SELECT 1 FROM user_settings WHERE user_id = ?'
            ).bind(userId).first();

            if (existingSettings) {
                // 更新现有设置
                await env.DB.prepare(
                    'UPDATE user_settings SET notification_prefs = ? WHERE user_id = ?'
                ).bind(notification_prefs, userId).run();
            } else {
                // 创建新设置记录
                await env.DB.prepare(
                    'INSERT INTO user_settings (user_id, notification_prefs) VALUES (?, ?)'
                ).bind(userId, notification_prefs).run();
            }

            return new Response(JSON.stringify({ message: '通知设置更新成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新通知设置失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    return new Response('Not Found', { status: 404 });
};

//==========================================================================
//                         七、订单和支付相关API路由处理
//                      处理订单创建、订单状态更新和支付处理等功能
//==========================================================================
const handleOrderOperations = async (request, env) => {
    const url = new URL(request.url);
    const path = url.pathname;

    // 获取用户ID
    console.log('开始验证用户授权');
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('授权头缺失或格式错误');
        return new Response(JSON.stringify({ error: '未授权访问' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    console.log('解析JWT令牌');
    const token = authHeader.split(' ')[1];
    let decoded, userId;
    try {
        decoded = JSON.parse(atob(token));
        userId = decoded.userId;
        console.log('成功获取用户ID:', userId);
    } catch (error) {
        console.error('令牌解析失败:', error);
        return new Response(JSON.stringify({ error: '无效的授权令牌' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // 创建订单
    if (path === '/api/orders' && request.method === 'POST') {
        try {
            const { addressId, paymentMethod } = await request.json();

            // 获取购物车商品
            const cartItems = await env.DB.prepare(
                `SELECT c.*, p.name, p.price 
                FROM carts c 
                JOIN products p ON c.product_id = p.product_id 
                WHERE c.user_id = ?`
            ).bind(userId).all();

            if (!cartItems.results || cartItems.results.length === 0) {
                return addCorsToResponse(new Response(JSON.stringify({ error: '购物车为空' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }));
            }

            // 计算订单总金额
            const total = cartItems.results.reduce((sum, item) => sum + item.price * item.quantity, 0);
            const shipping = total >= 199 ? 0 : 10; // 满199包邮
            const orderTotal = total + shipping;

            // 创建订单
            const timestamp = new Date().toISOString();
            const orderResult = await env.DB.prepare(
                `INSERT INTO orders 
                (user_id, address_id, payment_method, total_amount, shipping_fee, status, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`
            ).bind(
                userId,
                addressId,
                paymentMethod,
                orderTotal,
                shipping,
                'pending',
                timestamp
            ).run();

            const orderId = orderResult.lastRowId;

            // 添加订单商品
            for (const item of cartItems.results) {
                await env.DB.prepare(
                    `INSERT INTO order_items 
                    (order_id, product_id, quantity, price) 
                    VALUES (?, ?, ?, ?)`
                ).bind(orderId, item.product_id, item.quantity, item.price).run();
            }

            // 清空购物车
            await env.DB.prepare('DELETE FROM carts WHERE user_id = ?').bind(userId).run();

            return addCorsToResponse(new Response(JSON.stringify({
                orderId,
                total: orderTotal,
                status: 'pending'
            }), {
                status: 201,
                headers: { 'Content-Type': 'application/json' }
            }));
        } catch (error) {
            return addCorsToResponse(new Response(JSON.stringify({ error: '创建订单失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }));
        }
    }

    // 获取订单列表
    if (path === '/api/orders' && request.method === 'GET') {
        try {
            const orders = await env.DB.prepare(
                `SELECT o.*, a.recipient_name, a.contact_phone, a.full_address 
                FROM orders o 
                LEFT JOIN user_addresses a ON o.address_id = a.address_id 
                WHERE o.user_id = ? 
                ORDER BY o.created_at DESC`
            ).bind(userId).all();

            return addCorsToResponse(new Response(JSON.stringify(orders.results), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }));
        } catch (error) {
            return addCorsToResponse(new Response(JSON.stringify({ error: '获取订单列表失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }));
        }
    }

    // 获取订单详情
    const orderMatch = path.match(/^\/api\/orders\/(\d+)$/);
    if (orderMatch && request.method === 'GET') {
        try {
            const orderId = orderMatch[1];

            // 获取订单基本信息
            const order = await env.DB.prepare(
                `SELECT o.*, a.recipient_name, a.contact_phone, a.full_address 
                FROM orders o 
                LEFT JOIN user_addresses a ON o.address_id = a.address_id 
                WHERE o.order_id = ? AND o.user_id = ?`
            ).bind(orderId, userId).first();

            if (!order) {
                return new Response(JSON.stringify({ error: '订单不存在' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // 获取订单商品
            const orderItems = await env.DB.prepare(
                `SELECT oi.*, p.name, p.image_filename 
                FROM order_items oi 
                JOIN products p ON oi.product_id = p.product_id 
                WHERE oi.order_id = ?`
            ).bind(orderId).all();

            // 处理商品图片URL
            const itemsWithImages = orderItems.results.map(item => {
                const imageUrl = `https://${env.R2_DOMAIN}/image/Goods/${item.image_filename}`;
                return { ...item, image_url: imageUrl };
            });

            return new Response(JSON.stringify({
                ...order,
                items: itemsWithImages
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('获取订单详情失败:', error);
            return addCorsToResponse(new Response(JSON.stringify({ error: '获取订单详情失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }));
        }
    }

    // 更新订单状态
    if (path.match(/^\/api\/orders\/\d+\/status$/) && request.method === 'PUT') {
        try {
            const orderId = path.split('/')[3];
            const { status } = await request.json();

            // 验证订单所属权
            const order = await env.DB.prepare(
                'SELECT * FROM orders WHERE order_id = ? AND user_id = ?'
            ).bind(orderId, userId).first();

            if (!order) {
                return new Response(JSON.stringify({ error: '订单不存在' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // 更新状态
            await env.DB.prepare(
                'UPDATE orders SET status = ? WHERE order_id = ?'
            ).bind(status, orderId).run();

            return addCorsToResponse(new Response(JSON.stringify({ message: '更新成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }));
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新订单状态失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 删除订单
    const deleteOrderMatch = path.match(/^\/api\/orders\/([\w\d]+)$/);
    if (deleteOrderMatch && request.method === 'DELETE') {
        try {
            const orderId = deleteOrderMatch[1];
            
            // 验证订单所有权
            const order = await env.DB.prepare(
                'SELECT * FROM orders WHERE order_id = ? AND user_id = ?'
            ).bind(orderId, userId).first();

            if (!order) {
                return new Response(JSON.stringify({ error: '订单不存在或无权限删除' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // 删除订单项
            await env.DB.prepare(
                'DELETE FROM order_items WHERE order_id = ?'
            ).bind(orderId).run();
            
            // 删除订单
            await env.DB.prepare(
                'DELETE FROM orders WHERE order_id = ?'
            ).bind(orderId).run();

            return addCorsToResponse(new Response(JSON.stringify({ message: '订单删除成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }));
        } catch (error) {
            return new Response(JSON.stringify({ error: '删除订单失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 获取用户通知设置
    if (path === '/api/user/settings' && request.method === 'GET') {
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            const settings = await env.DB.prepare(
                'SELECT notification_prefs FROM user_settings WHERE user_id = ?'
            ).bind(userId).first();

            return new Response(JSON.stringify(settings || { notification_prefs: null }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取通知设置失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 更新用户通知设置
    if (path === '/api/user/settings' && request.method === 'PUT') {
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            const { notification_prefs } = await request.json();
            
            // 检查是否已有设置记录
            const existingSettings = await env.DB.prepare(
                'SELECT 1 FROM user_settings WHERE user_id = ?'
            ).bind(userId).first();

            if (existingSettings) {
                // 更新现有设置
                await env.DB.prepare(
                    'UPDATE user_settings SET notification_prefs = ? WHERE user_id = ?'
                ).bind(notification_prefs, userId).run();
            } else {
                // 创建新设置记录
                await env.DB.prepare(
                    'INSERT INTO user_settings (user_id, notification_prefs) VALUES (?, ?)'
                ).bind(userId, notification_prefs).run();
            }

            return new Response(JSON.stringify({ message: '通知设置更新成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新通知设置失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    return new Response('Not Found', { status: 404 });
};

//==========================================================================
//                            八、用户中心相关API路由处理
//                     处理用户信息更新、地址管理和通知设置等功能
//==========================================================================
const handleUserCenter = async (request, env) => {
    const url = new URL(request.url);
    const path = url.pathname;

    // 获取用户ID
    console.log('开始验证用户授权');
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('授权头缺失或格式错误');
        return new Response(JSON.stringify({ error: '未授权访问' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    console.log('解析JWT令牌');
    const token = authHeader.split(' ')[1];
    let decoded, userId;
    try {
        decoded = JSON.parse(atob(token));
        userId = decoded.userId;
        console.log('成功获取用户ID:', userId);
    } catch (error) {
        console.error('令牌解析失败:', error);
        return new Response(JSON.stringify({ error: '无效的授权令牌' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // 获取用户个人资料
    if (path === '/api/user/profile' && request.method === 'GET') {
        try {
            const user = await env.DB.prepare(
                'SELECT user_id, username, email, created_at FROM users WHERE user_id = ?'
            ).bind(userId).first();

            if (!user) {
                return new Response(JSON.stringify({ error: '用户不存在' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            return new Response(JSON.stringify(user), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取用户信息失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }

    // 更新用户个人资料
    if (path === '/api/user/profile' && request.method === 'PUT') {
        try {
            const { username, email } = await request.json();

            await env.DB.prepare(
                'UPDATE users SET username = ?, email = ? WHERE user_id = ?'
            ).bind(username, email, userId).run();

            return addCorsToResponse(new Response(JSON.stringify({ message: '更新成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }));
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新用户信息失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 更新用户密码
    if (path === '/api/user/password' && request.method === 'PUT') {
        try {
            const { oldPassword, newPassword } = await request.json();

            // 获取用户信息
            const user = await env.DB.prepare(
                'SELECT * FROM users WHERE user_id = ?'
            ).bind(userId).first();

            if (!user) {
                return new Response(JSON.stringify({ error: '用户不存在' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // 验证旧密码
            const isPasswordValid = await hashCompare(oldPassword, user.password_hash);
            if (!isPasswordValid) {
                return new Response(JSON.stringify({ error: '旧密码错误' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // 更新密码
            await env.DB.prepare(
                'UPDATE users SET password_hash = ? WHERE user_id = ?'
            ).bind(newPassword, userId).run();

            return new Response(JSON.stringify({ message: '密码更新成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新密码失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 获取用户地址列表
    if (path === '/api/user/addresses' && request.method === 'GET') {
        try {
            const addresses = await env.DB.prepare(
                'SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC'
            ).bind(userId).all();

            return new Response(JSON.stringify(addresses.results), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取地址列表失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 添加新地址
    if (path === '/api/user/addresses' && request.method === 'POST') {
        try {
            const addressData = await request.json();
            const { recipient_name, contact_phone, full_address, region, postal_code, is_default } = addressData;
            
            // 验证必填字段
            if (!recipient_name || !contact_phone || !full_address || !region) {
                return new Response(JSON.stringify({ error: '缺少必填字段' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // 如果设置为默认地址，先将其他地址设置为非默认
            if (is_default) {
                await env.DB.prepare(
                    'UPDATE user_addresses SET is_default = 0 WHERE user_id = ?'
                ).bind(userId).run();
            }

            // 添加新地址
            await env.DB.prepare(
                `INSERT INTO user_addresses 
                (user_id, recipient_name, contact_phone, full_address, region, postal_code, is_default) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`
            ).bind(
                userId,
                recipient_name,
                contact_phone,
                full_address,
                region,
                postal_code || '',
                is_default ? 1 : 0
            ).run();

            return new Response(JSON.stringify({ message: '添加地址成功' }), {
                status: 201,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '添加地址失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 更新地址
    if (path.match(/\/api\/user\/addresses\/\d+$/) && request.method === 'PUT') {
        try {
            const addressId = path.split('/').pop();
            const addressData = await request.json();

            // 如果设置为默认地址，先将其他地址设置为非默认
            if (addressData.is_default) {
                await env.DB.prepare(
                    'UPDATE user_addresses SET is_default = 0 WHERE user_id = ?'
                ).bind(userId).run();
            }

            // 更新地址
            await env.DB.prepare(
                `UPDATE user_addresses SET 
                recipient_name = ?, contact_phone = ?, full_address = ?, 
                region = ?, postal_code = ?, is_default = ? 
                WHERE address_id = ? AND user_id = ?`
            ).bind(
                addressData.recipient_name,
                addressData.contact_phone,
                addressData.full_address,
                addressData.region,
                addressData.postal_code,
                addressData.is_default ? 1 : 0,
                addressId,
                userId
            ).run();

            return new Response(JSON.stringify({ message: '更新地址成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新地址失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 删除地址
    if (path.match(/\/api\/user\/addresses\/\d+$/) && request.method === 'DELETE') {
        try {
            const addressId = path.split('/').pop();

            await env.DB.prepare(
                'DELETE FROM user_addresses WHERE address_id = ? AND user_id = ?'
            ).bind(addressId, userId).run();

            return new Response(JSON.stringify({ message: '删除地址成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '删除地址失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 获取用户通知设置
    if (path === '/api/user/settings' && request.method === 'GET') {
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            const settings = await env.DB.prepare(
                'SELECT notification_prefs FROM user_settings WHERE user_id = ?'
            ).bind(userId).first();

            return new Response(JSON.stringify(settings || { notification_prefs: null }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取通知设置失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 更新用户通知设置
    if (path === '/api/user/settings' && request.method === 'PUT') {
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            const { notification_prefs } = await request.json();
            
            // 检查是否已有设置记录
            const existingSettings = await env.DB.prepare(
                'SELECT 1 FROM user_settings WHERE user_id = ?'
            ).bind(userId).first();

            if (existingSettings) {
                // 更新现有设置
                await env.DB.prepare(
                    'UPDATE user_settings SET notification_prefs = ? WHERE user_id = ?'
                ).bind(notification_prefs, userId).run();
            } else {
                // 创建新设置记录
                await env.DB.prepare(
                    'INSERT INTO user_settings (user_id, notification_prefs) VALUES (?, ?)'
                ).bind(userId, notification_prefs).run();
            }

            return new Response(JSON.stringify({ message: '通知设置更新成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新通知设置失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    return new Response('Not Found', { status: 404 });
};

//==========================================================================
//                           九、订单相关API路由处理
//                  处理订单创建、订单列表查询和订单详情的相关请求
//==========================================================================
const handleOrders = async (request, env) => {
    // 处理OPTIONS预检请求
    if (request.method === 'OPTIONS') {
        return handleOptions(request);
    }
    
    const url = new URL(request.url);
    const path = url.pathname;

    // 创建新订单
    if (path === '/api/orders' && request.method === 'POST') {
        try {
            // 从请求头中获取token
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            // 获取订单数据
            const orderData = await request.json();
            const { order_id, address_id, total_amount, remark, order_items } = orderData;
            
            // 开始数据库事务
            const timestamp = Math.floor(Date.now() / 1000); // Unix时间戳
            
            // 创建订单 - 使用前端提供的order_id或生成新的
            const orderId = order_id || `ORD${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000)}`;
            
            // 创建订单
            await env.DB.prepare(
                'INSERT INTO orders (order_id, user_id, total_amount, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
            ).bind(orderId, userId, total_amount, 'pending', timestamp, timestamp).run();
            
            // 添加订单项
            for (const item of order_items) {
                await env.DB.prepare(
                    'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)'
                ).bind(orderId, item.product_id, item.quantity, item.unit_price).run();
                
                // 更新库存
                await env.DB.prepare(
                    'UPDATE products SET stock = stock - ? WHERE product_id = ?'
                ).bind(item.quantity, item.product_id).run();
            }

            return addCorsToResponse(new Response(JSON.stringify({ 
                message: '订单创建成功', 
                order_id: orderId
            }), {
                status: 201,
                headers: { 'Content-Type': 'application/json' }
            }));
        } catch (error) {
            return addCorsToResponse(new Response(JSON.stringify({ error: '创建订单失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }));
        }
    }

    // 获取用户订单列表
    if (path === '/api/orders' && request.method === 'GET') {
        try {
            // 从请求头中获取token
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            // 获取用户订单
            const orders = await env.DB.prepare(
                'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC'
            ).bind(userId).all();

            return addCorsToResponse(new Response(JSON.stringify(orders.results), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }));
        } catch (error) {
            return addCorsToResponse(new Response(JSON.stringify({ error: '获取订单列表失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }));
        }
    }

    // 获取订单详情
    if (path.match(/\/api\/orders\/([A-Za-z0-9]+)$/) && request.method === 'GET') {
        try {
            // 从请求头中获取token
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            const orderId = path.split('/').pop();
            
            // 获取订单信息
            const order = await env.DB.prepare(
                'SELECT * FROM orders WHERE order_id = ? AND user_id = ?'
            ).bind(orderId, userId).first();

            if (!order) {
                return addCorsToResponse(new Response(JSON.stringify({ error: '订单不存在或无权访问' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                }));
            }

            // 获取订单项
            const orderItems = await env.DB.prepare(
                `SELECT oi.*, p.name as product_name, p.specifications 
                FROM order_items oi 
                JOIN products p ON oi.product_id = p.product_id 
                WHERE oi.order_id = ?`
            ).bind(orderId).all();

            // 处理订单项数据
            const processedItems = orderItems.results.map(item => {
                // 尝试解析规格信息（如果有）
                let specs = {};
                try {
                    if (item.specifications) {
                        specs = JSON.parse(item.specifications);
                    }
                } catch (e) {
                    console.error('解析商品规格失败:', e);
                }
                
                return { 
                    ...item,
                    specifications: specs
                };
            });


            return addCorsToResponse(new Response(JSON.stringify({
                ...order,
                items: processedItems
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }));
        } catch (error) {
            console.error('获取订单详情失败:', error);
            return addCorsToResponse(new Response(JSON.stringify({ error: '获取订单详情失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }));
        }
    }
    
    // 删除订单
    if ((path.match(/\/api\/user\/orders\/([A-Za-z0-9]+)$/) || path.match(/\/api\/orders\/([A-Za-z0-9]+)$/)) && request.method === 'DELETE') {
        try {
            // 从请求头中获取token
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            const orderId = path.split('/').pop();
            
            // 验证订单所有权
            const order = await env.DB.prepare(
                'SELECT * FROM orders WHERE order_id = ? AND user_id = ?'
            ).bind(orderId, userId).first();

            if (!order) {
                return addCorsToResponse(new Response(JSON.stringify({ error: '订单不存在或无权删除' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                }));
            }

            // 删除订单项
            await env.DB.prepare(
                'DELETE FROM order_items WHERE order_id = ?'
            ).bind(orderId).run();
            
            // 删除订单
            await env.DB.prepare(
                'DELETE FROM orders WHERE order_id = ?'
            ).bind(orderId).run();

            return addCorsToResponse(new Response(JSON.stringify({ message: '订单删除成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }));
        } catch (error) {
            console.error('删除订单失败:', error);
            return addCorsToResponse(new Response(JSON.stringify({ error: '删除订单失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }));
        }
    }

    // 获取用户通知设置
    if (path === '/api/user/settings' && request.method === 'GET') {
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            const settings = await env.DB.prepare(
                'SELECT notification_prefs FROM user_settings WHERE user_id = ?'
            ).bind(userId).first();

            return new Response(JSON.stringify(settings || { notification_prefs: null }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取通知设置失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 更新用户通知设置
    if (path === '/api/user/settings' && request.method === 'PUT') {
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            const { notification_prefs } = await request.json();
            
            // 检查是否已有设置记录
            const existingSettings = await env.DB.prepare(
                'SELECT 1 FROM user_settings WHERE user_id = ?'
            ).bind(userId).first();

            if (existingSettings) {
                // 更新现有设置
                await env.DB.prepare(
                    'UPDATE user_settings SET notification_prefs = ? WHERE user_id = ?'
                ).bind(notification_prefs, userId).run();
            } else {
                // 创建新设置记录
                await env.DB.prepare(
                    'INSERT INTO user_settings (user_id, notification_prefs) VALUES (?, ?)'
                ).bind(userId, notification_prefs).run();
            }

            return new Response(JSON.stringify({ message: '通知设置更新成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新通知设置失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    return new Response('Not Found', { status: 404 });
};

//==========================================================================
//                                十、图片处理API
//                            处理从R2存储获取商品图片的请求
//==========================================================================
const handleImageRequest = async (request, env) => {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // 检查路径是否以/image/开头
    if (path.startsWith('/image/')) {
        try {
            // 从R2存储中获取图片
            const imagePath = path.substring(1); // 去掉开头的斜杠
            const object = await env.BUCKET.get(imagePath);
            
            if (!object) {
                return new Response('Image not found', { status: 404 });
            }
            
            // 设置适当的Content-Type
            const headers = new Headers();
            headers.set('Content-Type', object.httpMetadata.contentType || 'image/jpeg');
            headers.set('Cache-Control', 'public, max-age=31536000'); // 缓存一年
            
            return new Response(object.body, { headers });
        } catch (error) {
            return new Response('Error fetching image: ' + error.message, { status: 500 });
        }
    }
    
    // 获取用户通知设置
    if (path === '/api/user/settings' && request.method === 'GET') {
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            const settings = await env.DB.prepare(
                'SELECT notification_prefs FROM user_settings WHERE user_id = ?'
            ).bind(userId).first();

            return new Response(JSON.stringify(settings || { notification_prefs: null }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取通知设置失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 更新用户通知设置
    if (path === '/api/user/settings' && request.method === 'PUT') {
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            const { notification_prefs } = await request.json();
            
            // 检查是否已有设置记录
            const existingSettings = await env.DB.prepare(
                'SELECT 1 FROM user_settings WHERE user_id = ?'
            ).bind(userId).first();

            if (existingSettings) {
                // 更新现有设置
                await env.DB.prepare(
                    'UPDATE user_settings SET notification_prefs = ? WHERE user_id = ?'
                ).bind(notification_prefs, userId).run();
            } else {
                // 创建新设置记录
                await env.DB.prepare(
                    'INSERT INTO user_settings (user_id, notification_prefs) VALUES (?, ?)'
                ).bind(userId, notification_prefs).run();
            }

            return new Response(JSON.stringify({ message: '通知设置更新成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新通知设置失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    return new Response('Not Found', { status: 404 });
};

//==========================================================================
//                         十一、用户地址管理API路由处理
//                       处理用户地址的添加、查询、更新和删除
//==========================================================================
const handleUserAddress = async (request, env) => {
    const url = new URL(request.url);
    const path = url.pathname;

    // 验证用户身份
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: '未授权访问' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const token = authHeader.split(' ')[1];
    const decoded = JSON.parse(atob(token));
    const userId = decoded.userId;

    // 添加新地址
    if (path === '/api/user/addresses' && request.method === 'POST') {
        try {
            const { recipient_name, contact_phone, full_address, region, postal_code, is_default } = await request.json();
            const timestamp = new Date().toISOString();

            // 如果设置为默认地址，先将其他地址设置为非默认
            if (is_default) {
                await env.DB.prepare(
                    'UPDATE user_addresses SET is_default = 0 WHERE user_id = ?'
                ).bind(userId).run();
            }

            // 插入新地址
            await env.DB.prepare(
                'INSERT INTO user_addresses (user_id, recipient_name, contact_phone, full_address, region, postal_code, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            ).bind(userId, recipient_name, contact_phone, full_address, region, postal_code, is_default ? 1 : 0, timestamp).run();

            return new Response(JSON.stringify({ message: '地址添加成功' }), {
                status: 201,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '添加地址失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 获取用户地址列表
    if (path === '/api/user/addresses' && request.method === 'GET') {
        try {
            const addresses = await env.DB.prepare(
                'SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC'
            ).bind(userId).all();

            return new Response(JSON.stringify(addresses.results), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取地址列表失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 更新地址
    if (path.match(/\/api\/user\/addresses\/\d+$/) && request.method === 'PUT') {
        try {
            const addressId = path.split('/').pop();
            const { recipient_name, contact_phone, full_address, region, postal_code, is_default } = await request.json();

            // 验证地址所有权
            const address = await env.DB.prepare(
                'SELECT * FROM user_addresses WHERE address_id = ? AND user_id = ?'
            ).bind(addressId, userId).first();

            if (!address) {
                return new Response(JSON.stringify({ error: '地址不存在或无权访问' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // 如果设置为默认地址，先将其他地址设置为非默认
            if (is_default) {
                await env.DB.prepare(
                    'UPDATE user_addresses SET is_default = 0 WHERE user_id = ?'
                ).bind(userId).run();
            }

            // 更新地址
            await env.DB.prepare(
                'UPDATE user_addresses SET recipient_name = ?, contact_phone = ?, full_address = ?, region = ?, postal_code = ?, is_default = ? WHERE address_id = ?'
            ).bind(recipient_name, contact_phone, full_address, region, postal_code, is_default ? 1 : 0, addressId).run();

            return new Response(JSON.stringify({ message: '地址更新成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新地址失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 删除地址
    if (path.match(/\/api\/user\/addresses\/\d+$/) && request.method === 'DELETE') {
        try {
            const addressId = path.split('/').pop();

            // 验证地址所有权
            const address = await env.DB.prepare(
                'SELECT * FROM user_addresses WHERE address_id = ? AND user_id = ?'
            ).bind(addressId, userId).first();

            if (!address) {
                return new Response(JSON.stringify({ error: '地址不存在或无权访问' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // 删除地址
            await env.DB.prepare(
                'DELETE FROM user_addresses WHERE address_id = ?'
            ).bind(addressId).run();

            return new Response(JSON.stringify({ message: '地址删除成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '删除地址失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 获取用户通知设置
    if (path === '/api/user/settings' && request.method === 'GET') {
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            const settings = await env.DB.prepare(
                'SELECT notification_prefs FROM user_settings WHERE user_id = ?'
            ).bind(userId).first();

            return new Response(JSON.stringify(settings || { notification_prefs: null }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取通知设置失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 更新用户通知设置
    if (path === '/api/user/settings' && request.method === 'PUT') {
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            const { notification_prefs } = await request.json();
            
            // 检查是否已有设置记录
            const existingSettings = await env.DB.prepare(
                'SELECT 1 FROM user_settings WHERE user_id = ?'
            ).bind(userId).first();

            if (existingSettings) {
                // 更新现有设置
                await env.DB.prepare(
                    'UPDATE user_settings SET notification_prefs = ? WHERE user_id = ?'
                ).bind(notification_prefs, userId).run();
            } else {
                // 创建新设置记录
                await env.DB.prepare(
                    'INSERT INTO user_settings (user_id, notification_prefs) VALUES (?, ?)'
                ).bind(userId, notification_prefs).run();
            }

            return new Response(JSON.stringify({ message: '通知设置更新成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新通知设置失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    return new Response('Not Found', { status: 404 });
};

//==========================================================================
//                            十二、用户设置API路由处理
//                            处理用户设置的查询和更新
//==========================================================================
const handleUserSettings = async (request, env) => {
    const url = new URL(request.url);
    const path = url.pathname;

    // 验证用户身份
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: '未授权访问' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const token = authHeader.split(' ')[1];
    const decoded = JSON.parse(atob(token));
    const userId = decoded.userId;

    // 获取用户设置
    if (path === '/api/settings' && request.method === 'GET') {
        try {
            const settings = await env.DB.prepare(
                'SELECT * FROM user_settings WHERE user_id = ?'
            ).bind(userId).first();

            if (!settings) {
                // 如果没有设置记录，返回默认设置
                return new Response(JSON.stringify({
                    notification_prefs: '{}',
                    privacy_settings: '{}'
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            return new Response(JSON.stringify(settings), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取用户设置失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 更新用户设置
    if (path === '/api/settings' && request.method === 'PUT') {
        try {
            const { notification_prefs, privacy_settings } = await request.json();
            const timestamp = new Date().toISOString();

            // 检查是否已存在设置记录
            const existingSettings = await env.DB.prepare(
                'SELECT setting_id FROM user_settings WHERE user_id = ?'
            ).bind(userId).first();

            if (existingSettings) {
                // 更新现有设置
                await env.DB.prepare(
                    'UPDATE user_settings SET notification_prefs = ?, privacy_settings = ?, updated_at = ? WHERE user_id = ?'
                ).bind(JSON.stringify(notification_prefs), JSON.stringify(privacy_settings), timestamp, userId).run();
            } else {
                // 创建新设置记录
                await env.DB.prepare(
                    'INSERT INTO user_settings (user_id, notification_prefs, privacy_settings, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
                ).bind(userId, JSON.stringify(notification_prefs), JSON.stringify(privacy_settings), timestamp, timestamp).run();
            }

            return new Response(JSON.stringify({ message: '设置更新成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新用户设置失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 获取用户通知设置
    if (path === '/api/user/settings' && request.method === 'GET') {
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            const settings = await env.DB.prepare(
                'SELECT notification_prefs FROM user_settings WHERE user_id = ?'
            ).bind(userId).first();

            return new Response(JSON.stringify(settings || { notification_prefs: null }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取通知设置失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 更新用户通知设置
    if (path === '/api/user/settings' && request.method === 'PUT') {
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            const { notification_prefs } = await request.json();
            
            // 检查是否已有设置记录
            const existingSettings = await env.DB.prepare(
                'SELECT 1 FROM user_settings WHERE user_id = ?'
            ).bind(userId).first();

            if (existingSettings) {
                // 更新现有设置
                await env.DB.prepare(
                    'UPDATE user_settings SET notification_prefs = ? WHERE user_id = ?'
                ).bind(notification_prefs, userId).run();
            } else {
                // 创建新设置记录
                await env.DB.prepare(
                    'INSERT INTO user_settings (user_id, notification_prefs) VALUES (?, ?)'
                ).bind(userId, notification_prefs).run();
            }

            return new Response(JSON.stringify({ message: '通知设置更新成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新通知设置失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    return new Response('Not Found', { status: 404 });
};

//==========================================================================
//                              十三、商品分类API路由处理
//                             处理商品分类的查询和管理
//==========================================================================
const handleProductCategories = async (request, env) => {
    const url = new URL(request.url);
    const path = url.pathname;

    // 获取所有分类
    if (path === '/api/categories' && request.method === 'GET') {
        try {
            const categories = await env.DB.prepare(
                'SELECT * FROM product_categories ORDER BY parent_category_id NULLS FIRST, category_name'
            ).all();

            // 构建分类树结构
            const categoryMap = new Map();
            const rootCategories = [];

            // 首先将所有分类添加到Map中
            categories.results.forEach(category => {
                category.children = [];
                categoryMap.set(category.category_id, category);
            });

            // 构建树结构
            categories.results.forEach(category => {
                if (category.parent_category_id === null) {
                    rootCategories.push(category);
                } else {
                    const parentCategory = categoryMap.get(category.parent_category_id);
                    if (parentCategory) {
                        parentCategory.children.push(category);
                    }
                }
            });

            return new Response(JSON.stringify(rootCategories), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取分类列表失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 获取特定分类及其商品
    if (path.match(/\/api\/categories\/\d+\/products$/) && request.method === 'GET') {
        try {
            const categoryId = path.split('/')[3];

            // 获取分类信息
            const category = await env.DB.prepare(
                'SELECT * FROM product_categories WHERE category_id = ?'
            ).bind(categoryId).first();

            if (!category) {
                return new Response(JSON.stringify({ error: '分类不存在' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // 获取该分类下的商品
            const products = await env.DB.prepare(
                'SELECT * FROM products WHERE category_id = ?'
            ).bind(categoryId).all();

            return new Response(JSON.stringify({
                category,
                products: products.results
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取分类商品失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 获取用户通知设置
    if (path === '/api/user/settings' && request.method === 'GET') {
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            const settings = await env.DB.prepare(
                'SELECT notification_prefs FROM user_settings WHERE user_id = ?'
            ).bind(userId).first();

            return new Response(JSON.stringify(settings || { notification_prefs: null }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取通知设置失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 更新用户通知设置
    if (path === '/api/user/settings' && request.method === 'PUT') {
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            const { notification_prefs } = await request.json();
            
            // 检查是否已有设置记录
            const existingSettings = await env.DB.prepare(
                'SELECT 1 FROM user_settings WHERE user_id = ?'
            ).bind(userId).first();

            if (existingSettings) {
                // 更新现有设置
                await env.DB.prepare(
                    'UPDATE user_settings SET notification_prefs = ? WHERE user_id = ?'
                ).bind(notification_prefs, userId).run();
            } else {
                // 创建新设置记录
                await env.DB.prepare(
                    'INSERT INTO user_settings (user_id, notification_prefs) VALUES (?, ?)'
                ).bind(userId, notification_prefs).run();
            }

            return new Response(JSON.stringify({ message: '通知设置更新成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新通知设置失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    return new Response('Not Found', { status: 404 });
};

//==========================================================================
//                              十四、商品评价API路由处理
//                              处理商品评价的添加、查询和管理
//==========================================================================
const handleProductReviews = async (request, env) => {
    // 处理OPTIONS预检请求
    if (request.method === 'OPTIONS') {
        return handleOptions(request);
    }
    
    const url = new URL(request.url);
    const path = url.pathname;

    // 添加商品评价 - 支持两种API路径
    if ((path === '/api/reviews' || path === '/api/product-reviews') && request.method === 'POST') {
        try {
            // 验证用户身份
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            const requestData = await request.json();
            const { product_id, order_id, rating, images } = requestData;
            const review_content = requestData.review_content || requestData.content;
            const timestamp = Math.floor(Date.now() / 1000); // Unix时间戳

            // 验证用户是否购买过该商品
            const orderItem = await env.DB.prepare(
                `SELECT oi.* FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                WHERE o.user_id = ? AND oi.product_id = ? AND o.status IN ('delivered', 'completed')`
            ).bind(userId, product_id).first();

            if (!orderItem) {
                return new Response(JSON.stringify({ error: '只有购买过的商品才能评价' }), {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // 检查是否已经评价过
            const existingReview = await env.DB.prepare(
                'SELECT review_id FROM product_reviews WHERE user_id = ? AND product_id = ?'
            ).bind(userId, product_id).first();

            if (existingReview) {
                return new Response(JSON.stringify({ error: '您已经评价过该商品' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // 处理图片URL
            const imagesJson = images && images.length > 0 ? JSON.stringify(images) : null;

            // 添加评价
            await env.DB.prepare(
                'INSERT INTO product_reviews (user_id, product_id, order_id, rating, review_content, images, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            ).bind(userId, product_id, order_id, rating, review_content, imagesJson, 'published', timestamp).run();

            return new Response(JSON.stringify({ message: '评价添加成功' }), {
                status: 201,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('添加评价失败:', error);
            return new Response(JSON.stringify({ error: '添加评价失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 获取商品评价列表
    if (path.match(/\/api\/products\/\d+\/reviews$/) && request.method === 'GET') {
        try {
            const productId = path.split('/')[3];

            // 获取评价列表
            const reviews = await env.DB.prepare(
                `SELECT pr.*, u.username 
                FROM product_reviews pr
                JOIN users u ON pr.user_id = u.user_id
                WHERE pr.product_id = ? AND pr.status = 'published'
                ORDER BY pr.created_at DESC`
            ).bind(productId).all();

            return new Response(JSON.stringify(reviews.results), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取评价列表失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 获取用户通知设置
    if (path === '/api/user/settings' && request.method === 'GET') {
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            const settings = await env.DB.prepare(
                'SELECT notification_prefs FROM user_settings WHERE user_id = ?'
            ).bind(userId).first();

            return new Response(JSON.stringify(settings || { notification_prefs: null }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取通知设置失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 更新用户通知设置
    if (path === '/api/user/settings' && request.method === 'PUT') {
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            const { notification_prefs } = await request.json();
            
            // 检查是否已有设置记录
            const existingSettings = await env.DB.prepare(
                'SELECT 1 FROM user_settings WHERE user_id = ?'
            ).bind(userId).first();

            if (existingSettings) {
                // 更新现有设置
                await env.DB.prepare(
                    'UPDATE user_settings SET notification_prefs = ? WHERE user_id = ?'
                ).bind(notification_prefs, userId).run();
            } else {
                // 创建新设置记录
                await env.DB.prepare(
                    'INSERT INTO user_settings (user_id, notification_prefs) VALUES (?, ?)'
                ).bind(userId, notification_prefs).run();
            }

            return new Response(JSON.stringify({ message: '通知设置更新成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新通知设置失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    return new Response('Not Found', { status: 404 });
};



//==========================================================================
//                           十五、购物会话API路由处理
//                           处理购物会话的创建、更新和管理
//==========================================================================
const handleShoppingSession = async (request, env) => {
    const url = new URL(request.url);
    const path = url.pathname;

    // 验证用户身份
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: '未授权访问' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const token = authHeader.split(' ')[1];
    const decoded = JSON.parse(atob(token));
    const userId = decoded.userId;

    // 创建或更新购物会话
    if (path === '/api/shopping-session' && (request.method === 'POST' || request.method === 'PUT')) {
        try {
            const { cart_data } = await request.json();
            const timestamp = new Date().toISOString();
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24小时后过期

            // 检查是否存在活跃会话
            const activeSession = await env.DB.prepare(
                "SELECT session_id FROM shopping_sessions WHERE user_id = ? AND status = 'active'"
            ).bind(userId).first();

            if (activeSession) {
                // 更新现有会话
                await env.DB.prepare(
                    'UPDATE shopping_sessions SET cart_data = ?, expires_at = ? WHERE session_id = ?'
                ).bind(JSON.stringify(cart_data), expiresAt, activeSession.session_id).run();
            } else {
                // 创建新会话
                await env.DB.prepare(
                    'INSERT INTO shopping_sessions (user_id, cart_data, status, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
                ).bind(userId, JSON.stringify(cart_data), 'active', expiresAt, timestamp).run();
            }

            return new Response(JSON.stringify({ message: '购物会话更新成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新购物会话失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 获取当前购物会话
    if (path === '/api/shopping-session' && request.method === 'GET') {
        try {
            const session = await env.DB.prepare(
                "SELECT * FROM shopping_sessions WHERE user_id = ? AND status = 'active' AND expires_at > datetime('now')"
            ).bind(userId).first();

            if (!session) {
                return new Response(JSON.stringify({ cart_data: '{}' }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            return new Response(JSON.stringify(session), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取购物会话失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 获取用户通知设置
    if (path === '/api/user/settings' && request.method === 'GET') {
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            const settings = await env.DB.prepare(
                'SELECT notification_prefs FROM user_settings WHERE user_id = ?'
            ).bind(userId).first();

            return new Response(JSON.stringify(settings || { notification_prefs: null }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取通知设置失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 更新用户通知设置
    if (path === '/api/user/settings' && request.method === 'PUT') {
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            const { notification_prefs } = await request.json();
            
            // 检查是否已有设置记录
            const existingSettings = await env.DB.prepare(
                'SELECT 1 FROM user_settings WHERE user_id = ?'
            ).bind(userId).first();

            if (existingSettings) {
                // 更新现有设置
                await env.DB.prepare(
                    'UPDATE user_settings SET notification_prefs = ? WHERE user_id = ?'
                ).bind(notification_prefs, userId).run();
            } else {
                // 创建新设置记录
                await env.DB.prepare(
                    'INSERT INTO user_settings (user_id, notification_prefs) VALUES (?, ?)'
                ).bind(userId, notification_prefs).run();
            }

            return new Response(JSON.stringify({ message: '通知设置更新成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新通知设置失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    return new Response('Not Found', { status: 404 });
}

//==========================================================================
//                              十六、各函数相关API路由处理
//                                处理各个函数的API相关请求
//==========================================================================

// 处理图片上传请求
const handleImageUpload = async (request, env) => {
    // 处理OPTIONS预检请求
    if (request.method === 'OPTIONS') {
        return handleOptions(request);
    }

    // 验证用户身份
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: '未授权访问' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // 解析multipart/form-data请求
        const formData = await request.formData();
        const imageFile = formData.get('image');
        let fileName = formData.get('fileName');
        const folder = formData.get('folder') || 'Product-Reviews';

        if (!imageFile || !(imageFile instanceof File)) {
            return new Response(JSON.stringify({ error: '未提供有效的图片文件' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 如果没有提供文件名，自动生成一个
        if (!fileName) {
            const timestamp = new Date().getTime();
            const randomStr = Math.random().toString(36).substring(2, 8);
            const fileExt = imageFile.name.split('.').pop() || 'jpg';
            fileName = `auto_${timestamp}_${randomStr}.${fileExt}`;
        }

        // 读取文件内容
        const arrayBuffer = await imageFile.arrayBuffer();

        // 检查R2存储是否可用
        if (!env.R2) {
            return new Response(JSON.stringify({ error: '图片存储服务不可用' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 上传到R2存储
        const objectKey = `image/${folder}/${fileName}`;
        try {
            await env.R2.put(objectKey, arrayBuffer, {
                httpMetadata: {
                    contentType: imageFile.type,
                },
            });
        } catch (r2Error) {
            console.error('R2存储上传失败:', r2Error);
            return new Response(JSON.stringify({ error: '图片上传到存储失败', details: r2Error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 返回图片URL
        const imageUrl = `https://r2liubaotea.liubaotea.online/${objectKey}`;
        return new Response(JSON.stringify({
            success: true,
            url: imageUrl,
            fileName: fileName
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('图片上传失败:', error);
        return new Response(JSON.stringify({ error: '图片上传失败', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

// 主函数：处理所有API请求
const handleRequest = {
    async fetch(request, env, ctx) {
        try {
            const url = new URL(request.url);
            const path = url.pathname;

            // 处理图片请求
            if (path.startsWith('/image/')) {
                return handleImageRequest(request, env);
            }

            // 处理用户认证相关请求
            if (path.startsWith('/api/register') || path.startsWith('/api/login') || path.startsWith('/api/user')) {
                return handleUserAuth(request, env);
            }

            // 处理商品相关请求
            if (path.startsWith('/api/products')) {
                return handleProducts(request, env);
            }

            // 处理订单相关请求
            if (path.startsWith('/api/orders')) {
                return handleOrders(request, env);
            }

            // 处理购物车相关请求
            if (path.startsWith('/api/cart')) {
                return handleCartOperations(request, env);
            }

            // 处理用户地址相关请求
            if (path.startsWith('/api/addresses')) {
                return handleUserAddress(request, env);
            }

            // 处理用户设置相关请求
            if (path.startsWith('/api/settings')) {
                return handleUserSettings(request, env);
            }

            // 处理商品分类相关请求
            if (path.startsWith('/api/categories')) {
                return handleProductCategories(request, env);
            }

            // 处理商品评价相关请求
            if (path.startsWith('/api/reviews') || path.match(/\/api\/products\/\d+\/reviews$/)) {
                return handleProductReviews(request, env);
            }

            // 处理图片上传请求
            if (path.startsWith('/api/upload-image')) {
                return handleImageUpload(request, env);
            }

            // 处理购物会话相关请求
            if (path.startsWith('/api/shopping-session')) {
                return handleShoppingSession(request, env);
            }

            // 获取用户通知设置
    if (path === '/api/user/settings' && request.method === 'GET') {
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            const settings = await env.DB.prepare(
                'SELECT notification_prefs FROM user_settings WHERE user_id = ?'
            ).bind(userId).first();

            return new Response(JSON.stringify(settings || { notification_prefs: null }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取通知设置失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 更新用户通知设置
    if (path === '/api/user/settings' && request.method === 'PUT') {
        try {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return new Response(JSON.stringify({ error: '未授权访问' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(atob(token));
            const userId = decoded.userId;

            const { notification_prefs } = await request.json();
            
            // 检查是否已有设置记录
            const existingSettings = await env.DB.prepare(
                'SELECT 1 FROM user_settings WHERE user_id = ?'
            ).bind(userId).first();

            if (existingSettings) {
                // 更新现有设置
                await env.DB.prepare(
                    'UPDATE user_settings SET notification_prefs = ? WHERE user_id = ?'
                ).bind(notification_prefs, userId).run();
            } else {
                // 创建新设置记录
                await env.DB.prepare(
                    'INSERT INTO user_settings (user_id, notification_prefs) VALUES (?, ?)'
                ).bind(userId, notification_prefs).run();
            }

            return new Response(JSON.stringify({ message: '通知设置更新成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新通知设置失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    return new Response('Not Found', { status: 404 });
        } catch (error) {
            return new Response(JSON.stringify({ error: '服务器错误', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
};

//==========================================================================
//                         十五、购物车相关API路由处理（已合并到handleCartOperations）
//==========================================================================


//                      
//==========================================================================
//                         十七、Worker主处理函数
//==========================================================================
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        
        // 使用全局CORS配置
        const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

        // 处理预检请求
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        try {
            // 路由分发
            let response;

            if (url.pathname.startsWith('/api/products')) {
                response = await handleProducts(request, env);
            } else if (url.pathname.startsWith('/api/cart')) {
                response = await handleCartOperations(request, env);
            } else if (url.pathname.startsWith('/api/orders')) {
                response = await handleOrders(request, env);
            } else if (url.pathname.startsWith('/api/user/addresses')) {
                response = await handleAddresses(request, env);
            } else if (url.pathname.startsWith('/api/user/')) {
                response = await handleUserCenter(request, env);
            } else if (['/api/register', '/api/login', '/api/user'].includes(url.pathname)) {
                response = await handleUserAuth(request, env);
            } else if (url.pathname.startsWith('/api/admin')) {
                response = await handleAdminAPI(request, env);
            } else if (url.pathname.startsWith('/api/reviews') || url.pathname.startsWith('/api/product-reviews')) {
                response = await handleProductReviews(request, env);
            } else if (url.pathname.startsWith('/api/upload-image')) {
                response = await handleImageUpload(request, env);
            } else if (url.pathname.startsWith('/image/')) {
                return await handleImageRequest(request, env);
            } else {
                return new Response('Not Found', { 
                    status: 404,
                    headers: corsHeaders
                });
            }

            // 添加CORS头到响应
            return new Response(response.body, {
                status: response.status,
                headers: { ...corsHeaders, ...response.headers }
            });
        } catch (error) {
            return new Response(JSON.stringify({ 
                error: '服务器错误', 
                details: error.message 
            }), {
                status: 500,
                headers: corsHeaders
            });
        }
    }
};