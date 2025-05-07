// Cloudflare Worker for 陳記六堡茶 - 管理系统API

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
      throw new Error('导出的密钥不是ArrayBuffer类型');
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
        // 解析token
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

// 检查管理员权限
const checkAdminPermission = (adminInfo, requiredRole = 'admin') => {
    if (!adminInfo) return false;
    
    // 超级管理员拥有所有权限
    if (adminInfo.role === 'superadmin') return true;
    
    // 普通管理员只能访问admin级别的API
    if (requiredRole === 'admin' && adminInfo.role === 'admin') return true;
    
    return false;
};

//==========================================================================
//                       管理员API路由处理
//==========================================================================
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
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            return new Response(JSON.stringify({ error: '用户名或密码错误' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取仪表盘数据失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取最近订单失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取热销商品失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
            
            // 获取销售趋势数据
            const { results: salesData } = await env.DB.prepare(
                `SELECT 
                    strftime('${timeFormat}', created_at) as time_period,
                    SUM(total_amount) as sales_amount,
                    COUNT(*) as orders_count
                FROM orders
                WHERE status != 'cancelled'
                GROUP BY time_period
                ORDER BY time_period DESC
                LIMIT ?`
            ).bind(limit).all();
            
            return new Response(JSON.stringify(salesData.reverse()), { // 反转以按时间升序排列
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取销售趋势数据失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    //==========================================================================
    //                       商品管理API
    //==========================================================================
    
    // 获取商品列表
    if (path === '/api/admin/products' && request.method === 'GET') {
        try {
            // 获取分页参数
            const page = parseInt(url.searchParams.get('page') || '1');
            const limit = parseInt(url.searchParams.get('limit') || '10');
            const offset = (page - 1) * limit;
            
            // 获取筛选参数
            const category = url.searchParams.get('category');
            const search = url.searchParams.get('search');
            
            // 构建查询条件
            let whereClause = '';
            const params = [];
            
            if (category) {
                whereClause += ' WHERE category_id = ?';
                params.push(category);
            }
            
            if (search) {
                whereClause += whereClause ? ' AND ' : ' WHERE ';
                whereClause += '(product_name LIKE ? OR description LIKE ?)';
                params.push(`%${search}%`, `%${search}%`);
            }
            
            // 获取商品总数
            const countQuery = `SELECT COUNT(*) as total FROM products${whereClause}`;
            const totalResult = await env.DB.prepare(countQuery).bind(...params).first();
            const total = totalResult?.total || 0;
            
            // 获取商品列表
            const productsQuery = `
                SELECT p.*, c.category_name 
                FROM products p
                LEFT JOIN product_categories c ON p.category_id = c.category_id
                ${whereClause}
                ORDER BY p.created_at DESC
                LIMIT ? OFFSET ?
            `;
            
            const { results: products } = await env.DB.prepare(productsQuery)
                .bind(...params, limit, offset)
                .all();
            
            return new Response(JSON.stringify({
                products,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取商品列表失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 获取商品详情
    if (path.match(/^\/api\/admin\/products\/\d+$/) && request.method === 'GET') {
        try {
            const productId = path.split('/').pop();
            
            // 获取商品详情
            const product = await env.DB.prepare(`
                SELECT p.*, c.category_name 
                FROM products p
                LEFT JOIN product_categories c ON p.category_id = c.category_id
                WHERE p.product_id = ?
            `).bind(productId).first();
            
            if (!product) {
                return new Response(JSON.stringify({ error: '商品不存在' }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            return new Response(JSON.stringify(product), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取商品详情失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 添加商品
    if (path === '/api/admin/products' && request.method === 'POST') {
        try {
            // 检查超级管理员权限
            if (!checkAdminPermission(adminInfo, 'superadmin')) {
                return new Response(JSON.stringify({ error: '权限不足，需要超级管理员权限' }), {
                    status: 403,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            const { 
                product_name, 
                description, 
                price, 
                stock_quantity, 
                category_id, 
                image_url, 
                is_featured, 
                is_active 
            } = await request.json();
            
            // 验证必填字段
            if (!product_name || !price || !category_id) {
                return new Response(JSON.stringify({ error: '商品名称、价格和分类为必填项' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 检查分类是否存在
            const category = await env.DB.prepare('SELECT category_id FROM product_categories WHERE category_id = ?')
                .bind(category_id)
                .first();
                
            if (!category) {
                return new Response(JSON.stringify({ error: '所选分类不存在' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 插入商品数据
            const result = await env.DB.prepare(`
                INSERT INTO products (
                    product_name, description, price, stock_quantity, 
                    category_id, image_url, is_featured, is_active, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `).bind(
                product_name,
                description || '',
                price,
                stock_quantity || 0,
                category_id,
                image_url || '',
                is_featured ? 1 : 0,
                is_active !== undefined ? (is_active ? 1 : 0) : 1,
            ).run();
            
            // 获取新插入的商品ID
            const newProductId = result.meta?.last_row_id;
            
            // 获取新插入的商品详情
            const newProduct = await env.DB.prepare(`
                SELECT p.*, c.category_name 
                FROM products p
                LEFT JOIN product_categories c ON p.category_id = c.category_id
                WHERE p.product_id = ?
            `).bind(newProductId).first();
            
            return new Response(JSON.stringify({
                message: '商品添加成功',
                product: newProduct
            }), {
                status: 201,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '添加商品失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 更新商品
    if (path.match(/^\/api\/admin\/products\/\d+$/) && request.method === 'PUT') {
        try {
            // 检查超级管理员权限
            if (!checkAdminPermission(adminInfo, 'superadmin')) {
                return new Response(JSON.stringify({ error: '权限不足，需要超级管理员权限' }), {
                    status: 403,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            const productId = path.split('/').pop();
            
            // 检查商品是否存在
            const existingProduct = await env.DB.prepare('SELECT product_id FROM products WHERE product_id = ?')
                .bind(productId)
                .first();
                
            if (!existingProduct) {
                return new Response(JSON.stringify({ error: '商品不存在' }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            const { 
                product_name, 
                description, 
                price, 
                stock_quantity, 
                category_id, 
                image_url, 
                is_featured, 
                is_active 
            } = await request.json();
            
            // 验证必填字段
            if (!product_name || !price || !category_id) {
                return new Response(JSON.stringify({ error: '商品名称、价格和分类为必填项' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 检查分类是否存在
            if (category_id) {
                const category = await env.DB.prepare('SELECT category_id FROM product_categories WHERE category_id = ?')
                    .bind(category_id)
                    .first();
                    
                if (!category) {
                    return new Response(JSON.stringify({ error: '所选分类不存在' }), {
                        status: 400,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }
            }
            
            // 更新商品数据
            await env.DB.prepare(`
                UPDATE products SET
                    product_name = ?,
                    description = ?,
                    price = ?,
                    stock_quantity = ?,
                    category_id = ?,
                    image_url = ?,
                    is_featured = ?,
                    is_active = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE product_id = ?
            `).bind(
                product_name,
                description || '',
                price,
                stock_quantity || 0,
                category_id,
                image_url || '',
                is_featured ? 1 : 0,
                is_active !== undefined ? (is_active ? 1 : 0) : 1,
                productId
            ).run();
            
            // 获取更新后的商品详情
            const updatedProduct = await env.DB.prepare(`
                SELECT p.*, c.category_name 
                FROM products p
                LEFT JOIN product_categories c ON p.category_id = c.category_id
                WHERE p.product_id = ?
            `).bind(productId).first();
            
            return new Response(JSON.stringify({
                message: '商品更新成功',
                product: updatedProduct
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新商品失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 删除商品
    if (path.match(/^\/api\/admin\/products\/\d+$/) && request.method === 'DELETE') {
        try {
            // 检查超级管理员权限
            if (!checkAdminPermission(adminInfo, 'superadmin')) {
                return new Response(JSON.stringify({ error: '权限不足，需要超级管理员权限' }), {
                    status: 403,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            const productId = path.split('/').pop();
            
            // 检查商品是否存在
            const existingProduct = await env.DB.prepare('SELECT product_id FROM products WHERE product_id = ?')
                .bind(productId)
                .first();
                
            if (!existingProduct) {
                return new Response(JSON.stringify({ error: '商品不存在' }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 检查商品是否已被订单引用
            const orderItem = await env.DB.prepare(`
                SELECT oi.order_item_id 
                FROM order_items oi 
                WHERE oi.product_id = ? 
                LIMIT 1
            `).bind(productId).first();
            
            if (orderItem) {
                return new Response(JSON.stringify({ 
                    error: '该商品已被订单引用，无法删除',
                    suggestion: '您可以将商品设置为不活跃，而不是删除它'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 删除商品
            await env.DB.prepare('DELETE FROM products WHERE product_id = ?')
                .bind(productId)
                .run();
            
            return new Response(JSON.stringify({
                message: '商品删除成功',
                productId
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '删除商品失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    //==========================================================================
    //                       分类管理API
    //==========================================================================
    
    // 获取分类列表
    if (path === '/api/admin/categories' && request.method === 'GET') {
        try {
            // 获取所有分类
            const { results: categories } = await env.DB.prepare(`
                SELECT c.*, 
                       (SELECT COUNT(*) FROM products p WHERE p.category_id = c.category_id) as product_count
                FROM product_categories c
                ORDER BY c.category_name ASC
            `).all();
            
            return new Response(JSON.stringify(categories), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取分类列表失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 获取分类详情
    if (path.match(/^\/api\/admin\/categories\/\d+$/) && request.method === 'GET') {
        try {
            const categoryId = path.split('/').pop();
            
            // 获取分类详情
            const category = await env.DB.prepare(`
                SELECT c.*, 
                       (SELECT COUNT(*) FROM products p WHERE p.category_id = c.category_id) as product_count
                FROM product_categories c
                WHERE c.category_id = ?
            `).bind(categoryId).first();
            
            if (!category) {
                return new Response(JSON.stringify({ error: '分类不存在' }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            return new Response(JSON.stringify(category), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取分类详情失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 添加分类
    if (path === '/api/admin/categories' && request.method === 'POST') {
        try {
            // 检查超级管理员权限
            if (!checkAdminPermission(adminInfo, 'superadmin')) {
                return new Response(JSON.stringify({ error: '权限不足，需要超级管理员权限' }), {
                    status: 403,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            const { category_name, description, image_url } = await request.json();
            
            // 验证必填字段
            if (!category_name) {
                return new Response(JSON.stringify({ error: '分类名称为必填项' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 检查分类名称是否已存在
            const existingCategory = await env.DB.prepare('SELECT category_id FROM product_categories WHERE category_name = ?')
                .bind(category_name)
                .first();
                
            if (existingCategory) {
                return new Response(JSON.stringify({ error: '分类名称已存在' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 插入分类数据
            const result = await env.DB.prepare(`
                INSERT INTO product_categories (category_name, description, image_url, created_at, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `).bind(
                category_name,
                description || '',
                image_url || ''
            ).run();
            
            // 获取新插入的分类ID
            const newCategoryId = result.meta?.last_row_id;
            
            // 获取新插入的分类详情
            const newCategory = await env.DB.prepare(`
                SELECT c.*, 0 as product_count
                FROM product_categories c
                WHERE c.category_id = ?
            `).bind(newCategoryId).first();
            
            return new Response(JSON.stringify({
                message: '分类添加成功',
                category: newCategory
            }), {
                status: 201,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '添加分类失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 更新分类
    if (path.match(/^\/api\/admin\/categories\/\d+$/) && request.method === 'PUT') {
        try {
            // 检查超级管理员权限
            if (!checkAdminPermission(adminInfo, 'superadmin')) {
                return new Response(JSON.stringify({ error: '权限不足，需要超级管理员权限' }), {
                    status: 403,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            const categoryId = path.split('/').pop();
            
            // 检查分类是否存在
            const existingCategory = await env.DB.prepare('SELECT category_id FROM product_categories WHERE category_id = ?')
                .bind(categoryId)
                .first();
                
            if (!existingCategory) {
                return new Response(JSON.stringify({ error: '分类不存在' }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            const { category_name, description, image_url } = await request.json();
            
            // 验证必填字段
            if (!category_name) {
                return new Response(JSON.stringify({ error: '分类名称为必填项' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 检查分类名称是否已被其他分类使用
            const duplicateCategory = await env.DB.prepare(
                'SELECT category_id FROM product_categories WHERE category_name = ? AND category_id != ?'
            ).bind(category_name, categoryId).first();
                
            if (duplicateCategory) {
                return new Response(JSON.stringify({ error: '分类名称已被其他分类使用' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 更新分类数据
            await env.DB.prepare(`
                UPDATE product_categories SET
                    category_name = ?,
                    description = ?,
                    image_url = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE category_id = ?
            `).bind(
                category_name,
                description || '',
                image_url || '',
                categoryId
            ).run();
            
            // 获取更新后的分类详情
            const updatedCategory = await env.DB.prepare(`
                SELECT c.*, 
                       (SELECT COUNT(*) FROM products p WHERE p.category_id = c.category_id) as product_count
                FROM product_categories c
                WHERE c.category_id = ?
            `).bind(categoryId).first();
            
            return new Response(JSON.stringify({
                message: '分类更新成功',
                category: updatedCategory
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新分类失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 删除分类
    if (path.match(/^\/api\/admin\/categories\/\d+$/) && request.method === 'DELETE') {
        try {
            // 检查超级管理员权限
            if (!checkAdminPermission(adminInfo, 'superadmin')) {
                return new Response(JSON.stringify({ error: '权限不足，需要超级管理员权限' }), {
                    status: 403,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            const categoryId = path.split('/').pop();
            
            // 检查分类是否存在
            const existingCategory = await env.DB.prepare('SELECT category_id FROM product_categories WHERE category_id = ?')
                .bind(categoryId)
                .first();
                
            if (!existingCategory) {
                return new Response(JSON.stringify({ error: '分类不存在' }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 检查分类是否已被商品引用
            const product = await env.DB.prepare('SELECT product_id FROM products WHERE category_id = ? LIMIT 1')
                .bind(categoryId)
                .first();
                
            if (product) {
                return new Response(JSON.stringify({ 
                    error: '该分类下存在商品，无法删除',
                    suggestion: '请先删除或移动该分类下的所有商品'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 删除分类
            await env.DB.prepare('DELETE FROM product_categories WHERE category_id = ?')
                .bind(categoryId)
                .run();
            
            return new Response(JSON.stringify({
                message: '分类删除成功',
                categoryId
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '删除分类失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    //==========================================================================
    //                       订单管理API
    //==========================================================================
    
    // 获取订单列表
    if (path === '/api/admin/orders' && request.method === 'GET') {
        try {
            // 获取分页参数
            const page = parseInt(url.searchParams.get('page') || '1');
            const limit = parseInt(url.searchParams.get('limit') || '10');
            const offset = (page - 1) * limit;
            
            // 获取筛选参数
            const status = url.searchParams.get('status');
            const search = url.searchParams.get('search');
            const startDate = url.searchParams.get('start_date');
            const endDate = url.searchParams.get('end_date');
            
            // 构建查询条件
            let whereClause = '';
            const params = [];
            
            if (status) {
                whereClause += ' WHERE o.status = ?';
                params.push(status);
            }
            
            if (search) {
                whereClause += whereClause ? ' AND ' : ' WHERE ';
                whereClause += '(o.order_id LIKE ? OR u.username LIKE ? OR u.email LIKE ?)';
                params.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }
            
            if (startDate) {
                whereClause += whereClause ? ' AND ' : ' WHERE ';
                whereClause += 'o.created_at >= ?';
                params.push(startDate);
            }
            
            if (endDate) {
                whereClause += whereClause ? ' AND ' : ' WHERE ';
                whereClause += 'o.created_at <= ?';
                params.push(endDate);
            }
            
            // 获取订单总数
            const countQuery = `
                SELECT COUNT(*) as total 
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.user_id
                ${whereClause}
            `;
            const totalResult = await env.DB.prepare(countQuery).bind(...params).first();
            const total = totalResult?.total || 0;
            
            // 获取订单列表
            const ordersQuery = `
                SELECT o.*, u.username, u.email 
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.user_id
                ${whereClause}
                ORDER BY o.created_at DESC
                LIMIT ? OFFSET ?
            `;
            
            const { results: orders } = await env.DB.prepare(ordersQuery)
                .bind(...params, limit, offset)
                .all();
            
            return new Response(JSON.stringify({
                orders,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取订单列表失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 获取订单详情
    if (path.match(/^\/api\/admin\/orders\/\d+$/) && request.method === 'GET') {
        try {
            const orderId = path.split('/').pop();
            
            // 获取订单基本信息
            const order = await env.DB.prepare(`
                SELECT o.*, u.username, u.email, u.phone 
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.user_id
                WHERE o.order_id = ?
            `).bind(orderId).first();
            
            if (!order) {
                return new Response(JSON.stringify({ error: '订单不存在' }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 获取订单商品明细
            const { results: orderItems } = await env.DB.prepare(`
                SELECT oi.*, p.product_name, p.image_url 
                FROM order_items oi
                LEFT JOIN products p ON oi.product_id = p.product_id
                WHERE oi.order_id = ?
            `).bind(orderId).all();
            
            // 获取订单地址信息
            const address = await env.DB.prepare(`
                SELECT * FROM shipping_addresses 
                WHERE order_id = ?
            `).bind(orderId).first();
            
            // 获取订单支付信息
            const payment = await env.DB.prepare(`
                SELECT * FROM payments 
                WHERE order_id = ?
                ORDER BY created_at DESC
                LIMIT 1
            `).bind(orderId).first();
            
            // 组合完整的订单信息
            const orderDetails = {
                ...order,
                items: orderItems,
                shipping_address: address || null,
                payment: payment || null
            };
            
            return new Response(JSON.stringify(orderDetails), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取订单详情失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 更新订单状态
    if (path.match(/^\/api\/admin\/orders\/\d+\/status$/) && request.method === 'PUT') {
        try {
            const orderId = path.split('/')[4]; // 从路径中提取订单ID
            const { status, notes } = await request.json();
            
            // 验证状态值
            const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
            if (!validStatuses.includes(status)) {
                return new Response(JSON.stringify({ 
                    error: '无效的订单状态', 
                    validStatuses 
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 检查订单是否存在
            const existingOrder = await env.DB.prepare('SELECT order_id, status FROM orders WHERE order_id = ?')
                .bind(orderId)
                .first();
                
            if (!existingOrder) {
                return new Response(JSON.stringify({ error: '订单不存在' }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 更新订单状态
            await env.DB.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?')
                .bind(status, orderId)
                .run();
            
            // 添加订单状态变更记录
            await env.DB.prepare(
                'INSERT INTO order_status_history (order_id, status, notes, created_by) VALUES (?, ?, ?, ?)'
            ).bind(orderId, status, notes || null, adminInfo.adminId).run();
            
            return new Response(JSON.stringify({
                message: '订单状态更新成功',
                orderId,
                status
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新订单状态失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 获取订单状态历史
    if (path.match(/^\/api\/admin\/orders\/\d+\/history$/) && request.method === 'GET') {
        try {
            const orderId = path.split('/')[4]; // 从路径中提取订单ID
            
            // 检查订单是否存在
            const existingOrder = await env.DB.prepare('SELECT order_id FROM orders WHERE order_id = ?')
                .bind(orderId)
                .first();
                
            if (!existingOrder) {
                return new Response(JSON.stringify({ error: '订单不存在' }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 获取订单状态历史记录
            const { results: history } = await env.DB.prepare(`
                SELECT h.*, a.username as admin_username 
                FROM order_status_history h
                LEFT JOIN admins a ON h.created_by = a.admin_id
                WHERE h.order_id = ?
                ORDER BY h.created_at DESC
            `).bind(orderId).all();
            
            return new Response(JSON.stringify(history), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取订单状态历史失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    //==========================================================================
    //                       用户管理API
    //==========================================================================
    
    // 获取用户列表
    if (path === '/api/admin/users' && request.method === 'GET') {
        try {
            // 获取分页参数
            const page = parseInt(url.searchParams.get('page') || '1');
            const limit = parseInt(url.searchParams.get('limit') || '10');
            const offset = (page - 1) * limit;
            
            // 获取筛选参数
            const search = url.searchParams.get('search');
            const sortBy = url.searchParams.get('sort_by') || 'created_at';
            const sortOrder = url.searchParams.get('sort_order') || 'desc';
            
            // 验证排序字段
            const validSortFields = ['user_id', 'username', 'email', 'created_at', 'last_login'];
            const validSortOrders = ['asc', 'desc'];
            
            const actualSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
            const actualSortOrder = validSortOrders.includes(sortOrder) ? sortOrder : 'desc';
            
            // 构建查询条件
            let whereClause = '';
            const params = [];
            
            if (search) {
                whereClause = ' WHERE username LIKE ? OR email LIKE ? OR phone LIKE ?';
                params.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }
            
            // 获取用户总数
            const countQuery = `SELECT COUNT(*) as total FROM users${whereClause}`;
            const totalResult = await env.DB.prepare(countQuery).bind(...params).first();
            const total = totalResult?.total || 0;
            
            // 获取用户列表（不返回密码哈希）
            const usersQuery = `
                SELECT user_id, username, email, phone, address, created_at, last_login, status 
                FROM users
                ${whereClause}
                ORDER BY ${actualSortBy} ${actualSortOrder}
                LIMIT ? OFFSET ?
            `;
            
            const { results: users } = await env.DB.prepare(usersQuery)
                .bind(...params, limit, offset)
                .all();
            
            // 获取每个用户的订单数量
            const usersWithStats = await Promise.all(users.map(async (user) => {
                const orderStats = await env.DB.prepare(`
                    SELECT 
                        COUNT(*) as total_orders,
                        SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END) as total_spent
                    FROM orders 
                    WHERE user_id = ?
                `).bind(user.user_id).first();
                
                return {
                    ...user,
                    total_orders: orderStats?.total_orders || 0,
                    total_spent: orderStats?.total_spent || 0
                };
            }));
            
            return new Response(JSON.stringify({
                users: usersWithStats,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取用户列表失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 获取用户详情
    if (path.match(/^\/api\/admin\/users\/\d+$/) && request.method === 'GET') {
        try {
            const userId = path.split('/').pop();
            
            // 获取用户基本信息（不返回密码哈希）
            const user = await env.DB.prepare(`
                SELECT user_id, username, email, phone, address, created_at, last_login, status 
                FROM users
                WHERE user_id = ?
            `).bind(userId).first();
            
            if (!user) {
                return new Response(JSON.stringify({ error: '用户不存在' }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 获取用户订单统计
            const orderStats = await env.DB.prepare(`
                SELECT 
                    COUNT(*) as total_orders,
                    SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END) as total_spent,
                    MAX(created_at) as last_order_date
                FROM orders 
                WHERE user_id = ?
            `).bind(userId).first();
            
            // 获取用户最近的订单
            const { results: recentOrders } = await env.DB.prepare(`
                SELECT order_id, status, total_amount, created_at 
                FROM orders
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT 5
            `).bind(userId).all();
            
            // 组合完整的用户信息
            const userDetails = {
                ...user,
                stats: {
                    total_orders: orderStats?.total_orders || 0,
                    total_spent: orderStats?.total_spent || 0,
                    last_order_date: orderStats?.last_order_date || null
                },
                recent_orders: recentOrders
            };
            
            return new Response(JSON.stringify(userDetails), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取用户详情失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 添加新用户
    if (path === '/api/admin/users' && request.method === 'POST') {
        try {
            // 检查超级管理员权限
            if (!checkAdminPermission(adminInfo, 'superadmin')) {
                return new Response(JSON.stringify({ error: '权限不足，需要超级管理员权限' }), {
                    status: 403,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            const { username, email, password, phone, address, status } = await request.json();
            
            // 验证必填字段
            if (!username || !email || !password) {
                return new Response(JSON.stringify({ error: '用户名、邮箱和密码为必填项' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 检查用户名或邮箱是否已存在
            const existingUser = await env.DB.prepare('SELECT user_id FROM users WHERE username = ? OR email = ?')
                .bind(username, email)
                .first();
                
            if (existingUser) {
                return new Response(JSON.stringify({ error: '用户名或邮箱已存在' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 对密码进行哈希处理
            const passwordHash = await hashPassword(password);
            
            // 添加新用户
            const result = await env.DB.prepare(`
                INSERT INTO users (username, email, password_hash, phone, address, status, created_at, last_login)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, NULL)
            `).bind(username, email, passwordHash, phone || null, address || null, status || 'active').run();
            
            return new Response(JSON.stringify({
                message: '用户创建成功',
                userId: result.meta?.last_row_id
            }), {
                status: 201,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '创建用户失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 更新用户信息
    if (path.match(/^\/api\/admin\/users\/\d+$/) && request.method === 'PUT') {
        try {
            // 检查超级管理员权限
            if (!checkAdminPermission(adminInfo, 'superadmin')) {
                return new Response(JSON.stringify({ error: '权限不足，需要超级管理员权限' }), {
                    status: 403,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            const userId = path.split('/').pop();
            const { username, email, phone, address, status } = await request.json();
            
            // 检查用户是否存在
            const existingUser = await env.DB.prepare('SELECT user_id FROM users WHERE user_id = ?')
                .bind(userId)
                .first();
                
            if (!existingUser) {
                return new Response(JSON.stringify({ error: '用户不存在' }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 检查用户名或邮箱是否与其他用户冲突
            if (username || email) {
                const conflictUser = await env.DB.prepare(
                    'SELECT user_id FROM users WHERE (username = ? OR email = ?) AND user_id != ?'
                ).bind(username || '', email || '', userId).first();
                
                if (conflictUser) {
                    return new Response(JSON.stringify({ error: '用户名或邮箱已被其他用户使用' }), {
                        status: 400,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }
            }
            
            // 构建更新字段
            const updateFields = [];
            const updateParams = [];
            
            if (username) {
                updateFields.push('username = ?');
                updateParams.push(username);
            }
            
            if (email) {
                updateFields.push('email = ?');
                updateParams.push(email);
            }
            
            if (phone !== undefined) {
                updateFields.push('phone = ?');
                updateParams.push(phone || null);
            }
            
            if (address !== undefined) {
                updateFields.push('address = ?');
                updateParams.push(address || null);
            }
            
            if (status) {
                updateFields.push('status = ?');
                updateParams.push(status);
            }
            
            // 如果没有要更新的字段，直接返回成功
            if (updateFields.length === 0) {
                return new Response(JSON.stringify({
                    message: '用户信息未变更',
                    userId
                }), {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 更新用户信息
            updateParams.push(userId);
            await env.DB.prepare(`UPDATE users SET ${updateFields.join(', ')} WHERE user_id = ?`)
                .bind(...updateParams)
                .run();
            
            return new Response(JSON.stringify({
                message: '用户信息更新成功',
                userId
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新用户信息失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 重置用户密码
    if (path.match(/^\/api\/admin\/users\/\d+\/reset-password$/) && request.method === 'POST') {
        try {
            // 检查超级管理员权限
            if (!checkAdminPermission(adminInfo, 'superadmin')) {
                return new Response(JSON.stringify({ error: '权限不足，需要超级管理员权限' }), {
                    status: 403,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            const userId = path.split('/')[4]; // 从路径中提取用户ID
            const { password } = await request.json();
            
            // 验证密码
            if (!password || password.length < 6) {
                return new Response(JSON.stringify({ error: '密码长度必须至少为6个字符' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 检查用户是否存在
            const existingUser = await env.DB.prepare('SELECT user_id FROM users WHERE user_id = ?')
                .bind(userId)
                .first();
                
            if (!existingUser) {
                return new Response(JSON.stringify({ error: '用户不存在' }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 对新密码进行哈希处理
            const passwordHash = await hashPassword(password);
            
            // 更新用户密码
            await env.DB.prepare('UPDATE users SET password_hash = ? WHERE user_id = ?')
                .bind(passwordHash, userId)
                .run();
            
            return new Response(JSON.stringify({
                message: '用户密码重置成功',
                userId
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '重置用户密码失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 删除用户
    if (path.match(/^\/api\/admin\/users\/\d+$/) && request.method === 'DELETE') {
        try {
            // 检查超级管理员权限
            if (!checkAdminPermission(adminInfo, 'superadmin')) {
                return new Response(JSON.stringify({ error: '权限不足，需要超级管理员权限' }), {
                    status: 403,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            const userId = path.split('/').pop();
            
            // 检查用户是否存在
            const existingUser = await env.DB.prepare('SELECT user_id FROM users WHERE user_id = ?')
                .bind(userId)
                .first();
                
            if (!existingUser) {
                return new Response(JSON.stringify({ error: '用户不存在' }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 检查用户是否有关联订单
            const order = await env.DB.prepare('SELECT order_id FROM orders WHERE user_id = ? LIMIT 1')
                .bind(userId)
                .first();
                
            if (order) {
                return new Response(JSON.stringify({ 
                    error: '该用户有关联订单，无法删除',
                    suggestion: '您可以将用户状态设置为"inactive"'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 删除用户
            await env.DB.prepare('DELETE FROM users WHERE user_id = ?')
                .bind(userId)
                .run();
            
            return new Response(JSON.stringify({
                message: '用户删除成功',
                userId
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '删除用户失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    //==========================================================================
    //                       评价管理API
    //==========================================================================
    
    // 获取评价列表
    if (path === '/api/admin/reviews' && request.method === 'GET') {
        try {
            // 获取分页参数
            const page = parseInt(url.searchParams.get('page') || '1');
            const limit = parseInt(url.searchParams.get('limit') || '10');
            const offset = (page - 1) * limit;
            
            // 获取筛选参数
            const productId = url.searchParams.get('product_id');
            const status = url.searchParams.get('status'); // 例如：pending, approved, rejected
            
            // 构建查询条件
            let whereClause = '';
            const params = [];
            
            if (productId) {
                whereClause += ' WHERE r.product_id = ?';
                params.push(productId);
            }
            
            if (status) {
                whereClause += whereClause ? ' AND ' : ' WHERE ';
                whereClause += 'r.status = ?';
                params.push(status);
            }
            
            // 获取评价总数
            const countQuery = `SELECT COUNT(*) as total FROM reviews r${whereClause}`;
            const totalResult = await env.DB.prepare(countQuery).bind(...params).first();
            const total = totalResult?.total || 0;
            
            // 获取评价列表
            const reviewsQuery = `
                SELECT r.*, p.product_name, u.username
                FROM reviews r
                LEFT JOIN products p ON r.product_id = p.product_id
                LEFT JOIN users u ON r.user_id = u.user_id
                ${whereClause}
                ORDER BY r.created_at DESC
                LIMIT ? OFFSET ?
            `;
            
            const { results: reviews } = await env.DB.prepare(reviewsQuery)
                .bind(...params, limit, offset)
                .all();
            
            return new Response(JSON.stringify({
                reviews,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取评价列表失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 获取评价详情
    if (path.match(/^\/api\/admin\/reviews\/\d+$/) && request.method === 'GET') {
        try {
            const reviewId = path.split('/').pop();
            
            // 获取评价详情
            const review = await env.DB.prepare(`
                SELECT r.*, p.product_name, u.username, u.email
                FROM reviews r
                LEFT JOIN products p ON r.product_id = p.product_id
                LEFT JOIN users u ON r.user_id = u.user_id
                WHERE r.review_id = ?
            `).bind(reviewId).first();
            
            if (!review) {
                return new Response(JSON.stringify({ error: '评价不存在' }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            return new Response(JSON.stringify(review), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取评价详情失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 更新评价状态（批准/拒绝）
    if (path.match(/^\/api\/admin\/reviews\/\d+\/status$/) && request.method === 'PUT') {
        try {
            const reviewId = path.split('/')[4];
            const { status, admin_reply } = await request.json();
            
            // 验证状态值
            if (!['approved', 'rejected', 'pending'].includes(status)) {
                return new Response(JSON.stringify({ error: '无效的状态值' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 检查评价是否存在
            const existingReview = await env.DB.prepare('SELECT review_id FROM reviews WHERE review_id = ?')
                .bind(reviewId)
                .first();
                
            if (!existingReview) {
                return new Response(JSON.stringify({ error: '评价不存在' }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 更新评价状态和管理员回复
            await env.DB.prepare(`
                UPDATE reviews 
                SET status = ?, 
                    admin_reply = ?, 
                    admin_id = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE review_id = ?
            `).bind(status, admin_reply || null, adminInfo.adminId, reviewId).run();
            
            return new Response(JSON.stringify({
                message: '评价状态更新成功',
                reviewId,
                status
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新评价状态失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 删除评价
    if (path.match(/^\/api\/admin\/reviews\/\d+$/) && request.method === 'DELETE') {
        try {
            // 检查超级管理员权限
            if (!checkAdminPermission(adminInfo, 'superadmin')) {
                return new Response(JSON.stringify({ error: '权限不足，需要超级管理员权限' }), {
                    status: 403,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            const reviewId = path.split('/').pop();
            
            // 检查评价是否存在
            const existingReview = await env.DB.prepare('SELECT review_id FROM reviews WHERE review_id = ?')
                .bind(reviewId)
                .first();
                
            if (!existingReview) {
                return new Response(JSON.stringify({ error: '评价不存在' }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 删除评价
            await env.DB.prepare('DELETE FROM reviews WHERE review_id = ?')
                .bind(reviewId)
                .run();
            
            return new Response(JSON.stringify({
                message: '评价删除成功',
                reviewId
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '删除评价失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    //==========================================================================
    //                       数据统计API
    //==========================================================================
    
    // 获取销售趋势数据（按日期范围）
    if (path === '/api/admin/stats/sales-trend' && request.method === 'GET') {
        try {
            const period = url.searchParams.get('period') || 'month';
            const groupBy = url.searchParams.get('group_by') || 'day';
            
            let timeFormat, limit, dateCondition;
            
            // 根据时间周期设置SQL日期格式和数据点数量
            if (period === 'week') {
                dateCondition = 'created_at >= date("now", "-7 days")';
                limit = 7;
            } else if (period === 'month') {
                dateCondition = 'created_at >= date("now", "-30 days")';
                limit = 30;
            } else if (period === 'year') {
                dateCondition = 'created_at >= date("now", "-365 days")';
                limit = 12;
            } else {
                dateCondition = '1=1'; // 无限制
                limit = 30;
            }
            
            // 根据分组方式设置SQL日期格式
            if (groupBy === 'day') {
                timeFormat = '%Y-%m-%d';
            } else if (groupBy === 'week') {
                timeFormat = '%Y-%W'; // 年-周数
            } else if (groupBy === 'month') {
                timeFormat = '%Y-%m';
            } else {
                timeFormat = '%Y-%m-%d'; // 默认按天
            }
            
            // 获取销售趋势数据
            const { results: salesData } = await env.DB.prepare(`
                SELECT 
                    strftime('${timeFormat}', created_at) as time_period,
                    SUM(total_amount) as sales_amount,
                    COUNT(*) as orders_count
                FROM orders
                WHERE status != 'cancelled' AND ${dateCondition}
                GROUP BY time_period
                ORDER BY time_period ASC
                LIMIT ?
            `).bind(limit).all();
            
            return new Response(JSON.stringify(salesData), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取销售趋势数据失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 获取用户增长数据
    if (path === '/api/admin/stats/user-growth' && request.method === 'GET') {
        try {
            const period = url.searchParams.get('period') || 'month';
            const groupBy = url.searchParams.get('group_by') || 'day';
            
            let timeFormat, limit, dateCondition;
            
            // 根据时间周期设置SQL日期格式和数据点数量
            if (period === 'week') {
                dateCondition = 'created_at >= date("now", "-7 days")';
                limit = 7;
            } else if (period === 'month') {
                dateCondition = 'created_at >= date("now", "-30 days")';
                limit = 30;
            } else if (period === 'year') {
                dateCondition = 'created_at >= date("now", "-365 days")';
                limit = 12;
            } else {
                dateCondition = '1=1'; // 无限制
                limit = 30;
            }
            
            // 根据分组方式设置SQL日期格式
            if (groupBy === 'day') {
                timeFormat = '%Y-%m-%d';
            } else if (groupBy === 'week') {
                timeFormat = '%Y-%W'; // 年-周数
            } else if (groupBy === 'month') {
                timeFormat = '%Y-%m';
            } else {
                timeFormat = '%Y-%m-%d'; // 默认按天
            }
            
            // 获取用户增长数据
            const { results: userData } = await env.DB.prepare(`
                SELECT 
                    strftime('${timeFormat}', created_at) as time_period,
                    COUNT(*) as new_users
                FROM users
                WHERE ${dateCondition}
                GROUP BY time_period
                ORDER BY time_period ASC
                LIMIT ?
            `).bind(limit).all();
            
            return new Response(JSON.stringify(userData), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取用户增长数据失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 获取商品销量分布
    if (path === '/api/admin/stats/product-sales' && request.method === 'GET') {
        try {
            const limit = parseInt(url.searchParams.get('limit') || '10');
            const period = url.searchParams.get('period') || 'all'; // all, month, week
            
            let dateCondition = '';
            if (period === 'week') {
                dateCondition = 'AND o.created_at >= date("now", "-7 days")';
            } else if (period === 'month') {
                dateCondition = 'AND o.created_at >= date("now", "-30 days")';
            }
            
            // 获取商品销量分布
            const { results: productSales } = await env.DB.prepare(`
                SELECT 
                    p.product_id,
                    p.product_name,
                    p.price,
                    SUM(oi.quantity) as total_quantity,
                    SUM(oi.quantity * oi.price) as total_sales
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                JOIN products p ON oi.product_id = p.product_id
                WHERE o.status != 'cancelled' ${dateCondition}
                GROUP BY p.product_id
                ORDER BY total_quantity DESC
                LIMIT ?
            `).bind(limit).all();
            
            return new Response(JSON.stringify(productSales), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取商品销量分布失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 获取分类销售分布
    if (path === '/api/admin/stats/category-sales' && request.method === 'GET') {
        try {
            const period = url.searchParams.get('period') || 'all'; // all, month, week
            
            let dateCondition = '';
            if (period === 'week') {
                dateCondition = 'AND o.created_at >= date("now", "-7 days")';
            } else if (period === 'month') {
                dateCondition = 'AND o.created_at >= date("now", "-30 days")';
            }
            
            // 获取分类销售分布
            const { results: categorySales } = await env.DB.prepare(`
                SELECT 
                    c.category_id,
                    c.category_name,
                    SUM(oi.quantity) as total_quantity,
                    SUM(oi.quantity * oi.price) as total_sales,
                    COUNT(DISTINCT o.order_id) as orders_count
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                JOIN products p ON oi.product_id = p.product_id
                JOIN product_categories c ON p.category_id = c.category_id
                WHERE o.status != 'cancelled' ${dateCondition}
                GROUP BY c.category_id
                ORDER BY total_sales DESC
            `).all();
            
            return new Response(JSON.stringify(categorySales), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取分类销售分布失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    //==========================================================================
    //                       系统设置API
    //==========================================================================
    
    // 获取系统配置
    if (path === '/api/admin/settings' && request.method === 'GET') {
        try {
            // 检查超级管理员权限
            if (!checkAdminPermission(adminInfo, 'superadmin')) {
                return new Response(JSON.stringify({ error: '权限不足，需要超级管理员权限' }), {
                    status: 403,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 获取所有系统配置
            const { results: settings } = await env.DB.prepare(
                'SELECT setting_key, setting_value, description FROM system_settings'
            ).all();
            
            // 将设置转换为键值对对象
            const settingsObject = {};
            for (const setting of settings) {
                try {
                    // 尝试解析JSON值
                    settingsObject[setting.setting_key] = JSON.parse(setting.setting_value);
                } catch (e) {
                    // 如果不是有效的JSON，则保留原始字符串
                    settingsObject[setting.setting_key] = setting.setting_value;
                }
            }
            
            return new Response(JSON.stringify(settingsObject), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取系统配置失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 更新系统配置
    if (path === '/api/admin/settings' && request.method === 'PUT') {
        try {
            // 检查超级管理员权限
            if (!checkAdminPermission(adminInfo, 'superadmin')) {
                return new Response(JSON.stringify({ error: '权限不足，需要超级管理员权限' }), {
                    status: 403,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            const settings = await request.json();
            
            // 验证设置对象
            if (!settings || typeof settings !== 'object') {
                return new Response(JSON.stringify({ error: '无效的设置数据' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 批量更新设置
            const updatePromises = Object.entries(settings).map(async ([key, value]) => {
                // 将值转换为JSON字符串存储
                const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
                
                // 检查设置是否存在
                const existingSetting = await env.DB.prepare(
                    'SELECT setting_key FROM system_settings WHERE setting_key = ?'
                ).bind(key).first();
                
                if (existingSetting) {
                    // 更新现有设置
                    return env.DB.prepare(
                        'UPDATE system_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?'
                    ).bind(valueStr, key).run();
                } else {
                    // 创建新设置
                    return env.DB.prepare(
                        'INSERT INTO system_settings (setting_key, setting_value, description) VALUES (?, ?, ?)'
                    ).bind(key, valueStr, '').run();
                }
            });
            
            await Promise.all(updatePromises);
            
            return new Response(JSON.stringify({
                message: '系统配置更新成功',
                updated: Object.keys(settings)
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新系统配置失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 获取特定系统配置
    if (path.match(/^\/api\/admin\/settings\/[\w.-]+$/) && request.method === 'GET') {
        try {
            const settingKey = path.split('/').pop();
            
            // 获取特定系统配置
            const setting = await env.DB.prepare(
                'SELECT setting_key, setting_value, description FROM system_settings WHERE setting_key = ?'
            ).bind(settingKey).first();
            
            if (!setting) {
                return new Response(JSON.stringify({ error: '配置项不存在' }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            try {
                // 尝试解析JSON值
                setting.setting_value = JSON.parse(setting.setting_value);
            } catch (e) {
                // 如果不是有效的JSON，保留原始字符串
            }
            
            return new Response(JSON.stringify(setting), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取系统配置失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 未找到匹配的API路由
    return new Response(JSON.stringify({ error: '未找到请求的API' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
};

//==========================================================================
//                       主请求处理函数
//==========================================================================
export default {
    async fetch(request, env, ctx) {
        // 处理OPTIONS预检请求
        if (request.method === 'OPTIONS') {
            return handleOptions(request);
        }
        
        const url = new URL(request.url);
        const path = url.pathname;
        
        // 处理管理员API请求
        if (path.startsWith('/api/admin/')) {
            const response = await handleAdminAPI(request, env);
            return addCorsToResponse(response);
        }
        
        // 未找到匹配的路由
        return addCorsToResponse(new Response(JSON.stringify({ error: '未找到请求的资源' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        }));
    }
};