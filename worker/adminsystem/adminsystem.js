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
//                       辅助函数
//==========================================================================

/**
 * 格式化时间戳为ISO字符串
 * @param {string|number} timestamp - 时间戳（可能是数字或字符串）
 * @returns {string|null} - 格式化后的ISO时间字符串，无效则返回null
 */
function formatTimestamp(timestamp) {
    if (!timestamp) return null;
    
    // 如果是数字时间戳（秒），转换为毫秒
    const timeMs = typeof timestamp === 'number' ? timestamp * 1000 : Date.parse(timestamp);
    
    // 检查是否为有效日期
    if (isNaN(timeMs)) return null;
    
    return new Date(timeMs).toISOString();
}

//==========================================================================
//                       图片处理函数
//==========================================================================

/**
 * 处理从R2存储获取商品图片的请求
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Promise<Response>} - 响应对象
 */
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
            console.error('获取图片失败:', error);
            return new Response('Error fetching image: ' + error.message, { status: 500 });
        }
    }
    
    return null; // 不是图片请求，返回null让后续处理
}

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
            
            // 获取销量最高的商品，修正销量计算方式，并包含库存信息
            const { results: products } = await env.DB.prepare(
                `SELECT p.*, 
                (SELECT SUM(oi.quantity) FROM order_items oi JOIN orders o ON oi.order_id = o.order_id 
                WHERE oi.product_id = p.product_id AND o.status != 'cancelled') as sales_count,
                p.stock as inventory
                FROM products p 
                ORDER BY sales_count DESC 
                LIMIT ?`
            ).bind(limit).all();
            
            // 获取所有商品的分类映射
            if (products.length > 0) {
                const productIds = products.map(p => p.product_id);
                const placeholders = productIds.map(() => '?').join(',');
                
                const { results: mappings } = await env.DB.prepare(`
                    SELECT * FROM product_category_mapping 
                    WHERE product_id IN (${placeholders})
                `).bind(...productIds).all();
                
                // 将分类映射添加到对应的商品中
                const mappingsByProductId = {};
                for (const mapping of mappings) {
                    if (!mappingsByProductId[mapping.product_id]) {
                        mappingsByProductId[mapping.product_id] = [];
                    }
                    mappingsByProductId[mapping.product_id].push(mapping);
                }
                
                // 将映射添加到商品对象中
                for (const product of products) {
                    product.category_mappings = mappingsByProductId[product.product_id] || [];
                }
            }
            
            return new Response(JSON.stringify(products), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('获取热销商品失败:', error);
            return new Response(JSON.stringify({ error: '获取热销商品失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 获取商品分类映射关系
    if (path === '/api/admin/product-category-mappings' && request.method === 'GET') {
        try {
            // 获取请求参数中的商品ID列表
            const productIdsParam = url.searchParams.get('product_ids');
            
            if (!productIdsParam) {
                return new Response(JSON.stringify({ error: '缺少必要参数：product_ids' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 解析商品ID列表
            const productIds = productIdsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            
            if (productIds.length === 0) {
                return new Response(JSON.stringify([]), {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 构建查询参数占位符
            const placeholders = productIds.map(() => '?').join(',');
            
            // 查询指定商品ID的分类映射关系
            const { results: mappings } = await env.DB.prepare(
                `SELECT * 
                FROM product_category_mapping pcm
                WHERE pcm.product_id IN (${placeholders})`
            ).bind(...productIds).all();
            
            return new Response(JSON.stringify(mappings), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取商品分类映射失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 获取销售趋势数据
    if (path === '/api/admin/sales/trend' && request.method === 'GET') {
        try {
            const period = url.searchParams.get('period') || 'month';
            const startDate = url.searchParams.get('startDate');
            const endDate = url.searchParams.get('endDate');
            let timeFormat, limit, dateCondition;
            const params = [];
            
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
            
            // 构建日期条件
            if (startDate && endDate) {
                dateCondition = 'AND created_at BETWEEN ? AND ?';
                params.push(startDate, endDate);
            } else if (startDate) {
                dateCondition = 'AND created_at >= ?';
                params.push(startDate);
            } else if (endDate) {
                dateCondition = 'AND created_at <= ?';
                params.push(endDate);
            } else {
                dateCondition = '';
            }
            
            // 获取销售趋势数据
            params.push(limit);
            const { results: salesData } = await env.DB.prepare(
                `SELECT 
                    strftime('${timeFormat}', created_at) as time_period,
                    SUM(total_amount) as sales_amount,
                    COUNT(*) as orders_count
                FROM orders
                WHERE status != 'cancelled' ${dateCondition}
                GROUP BY time_period
                ORDER BY time_period ASC
                LIMIT ?`
            ).bind(...params).all();
            
            // 确保返回足够的数据点以便图表完整展示
            if (salesData.length === 0) {
                // 如果没有数据，返回一个空数据点以便前端能正确渲染图表
                return new Response(JSON.stringify({
                    labels: [new Date().toISOString().split('T')[0]],
                    sales: [0],
                    orders: [0]
                }), {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 转换数据格式以适应前端图表
            const formattedData = {
                labels: salesData.map(item => item.time_period),
                sales: salesData.map(item => item.sales_amount),
                orders: salesData.map(item => item.orders_count)
            };
            
            return new Response(JSON.stringify(formattedData), {
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
    
    // 获取分类占比数据
    if (path === '/api/admin/categories/distribution' && request.method === 'GET') {
        try {
            // 获取商品分类分布数据
            const { results: categoryData } = await env.DB.prepare(
                `SELECT 
                    pc.category_id,
                    pc.category_name,
                    COUNT(pcm.product_id) as product_count
                FROM product_categories pc
                LEFT JOIN product_category_mapping pcm ON pc.category_id = pcm.category_id
                GROUP BY pc.category_id
                ORDER BY product_count DESC`
            ).all();
            
            // 计算总商品数（用于计算百分比）
            const totalProducts = await env.DB.prepare(
                'SELECT COUNT(DISTINCT product_id) as count FROM product_category_mapping'
            ).first();
            
            // 格式化响应数据
            const formattedData = categoryData.map(category => ({
                id: category.category_id,
                name: category.category_name,
                count: category.product_count,
                percentage: totalProducts.count > 0 ? 
                    Math.round((category.product_count / totalProducts.count) * 100) : 0
            }));
            
            // 确保返回足够的数据点以便图表完整展示
            if (formattedData.length === 0) {
                // 如果没有数据，返回一个空数据点以便前端能正确渲染图表
                return new Response(JSON.stringify([{
                    id: 0,
                    name: '无数据',
                    count: 0,
                    percentage: 100
                }]), {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            return new Response(JSON.stringify(formattedData), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取分类占比数据失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 获取订单详情
    if (path.match(/\/api\/admin\/orders\/[\w-]+$/) && request.method === 'GET') {
        try {
            // 从路径中提取订单ID
            const orderId = path.split('/').pop();
            
            // 获取订单基本信息
            const order = await env.DB.prepare(
                `SELECT o.*, u.username, u.email, u.phone_number
                FROM orders o
                JOIN users u ON o.user_id = u.user_id
                WHERE o.order_id = ?`
            ).bind(orderId).first();
            
            if (!order) {
                return new Response(JSON.stringify({ error: '订单不存在' }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 获取订单项
            const { results: orderItems } = await env.DB.prepare(
                `SELECT oi.*, p.name as product_name, p.price as current_price
                FROM order_items oi
                JOIN products p ON oi.product_id = p.product_id
                WHERE oi.order_id = ?`
            ).bind(orderId).all();
            
            // 获取用户地址
            const address = await env.DB.prepare(
                `SELECT *
                FROM user_addresses
                WHERE user_id = ? AND is_default = 1`
            ).bind(order.user_id).first();
            
            // 组合完整的订单详情
            const orderDetails = {
                ...order,
                items: orderItems,
                address: address || null
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
    if (path.match(/\/api\/admin\/orders\/[\w-]+\/status$/) && request.method === 'PUT') {
        try {
            // 从路径中提取订单ID
            const orderId = path.split('/').slice(-2)[0];
            
            // 获取请求体中的状态
            const { status } = await request.json();
            
            // 验证状态值
            const validStatuses = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return new Response(JSON.stringify({ error: '无效的状态值' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 更新订单状态
            const result = await env.DB.prepare(
                `UPDATE orders
                SET status = ?, updated_at = CAST(strftime('%s','now') AS INTEGER)
                WHERE order_id = ?`
            ).bind(status, orderId).run();
            
            if (result.changes === 0) {
                return new Response(JSON.stringify({ error: '订单不存在或状态未更改' }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            return new Response(JSON.stringify({ success: true, message: '订单状态已更新' }), {
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
    
    // 获取订单状态分布数据
    if (path === '/api/admin/statistics/order-status' && request.method === 'GET') {
        try {
            // 获取日期参数
            const startDate = url.searchParams.get('startDate');
            const endDate = url.searchParams.get('endDate');
            
            // 构建日期条件
            let dateCondition = '';
            const params = [];
            
            if (startDate && endDate) {
                dateCondition = 'AND created_at BETWEEN ? AND ?';
                params.push(startDate, endDate);
            } else if (startDate) {
                dateCondition = 'AND created_at >= ?';
                params.push(startDate);
            } else if (endDate) {
                dateCondition = 'AND created_at <= ?';
                params.push(endDate);
            }
            
            // 获取订单状态分布数据
            const { results: statusData } = await env.DB.prepare(
                `SELECT 
                    status,
                    COUNT(*) as count
                FROM orders
                WHERE 1=1 ${dateCondition}
                GROUP BY status
                ORDER BY count DESC`
            ).bind(...params).all();
            
            // 确保返回足够的数据点以便图表完整展示
            if (statusData.length === 0) {
                // 如果没有数据，返回一个空数据点以便前端能正确渲染图表
                return new Response(JSON.stringify([{
                    status: '无数据',
                    count: 0,
                    percentage: 100
                }]), {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 计算总订单数（用于计算百分比）
            const totalOrders = statusData.reduce((sum, item) => sum + item.count, 0);
            
            // 格式化响应数据
            const formattedData = statusData.map(item => ({
                status: item.status,
                count: item.count,
                percentage: totalOrders > 0 ? Math.round((item.count / totalOrders) * 100) : 0
            }));
            
            return new Response(JSON.stringify(formattedData), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取订单状态分布数据失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 获取用户增长趋势数据
    if (path === '/api/admin/statistics/user-growth' && request.method === 'GET') {
        try {
            const period = url.searchParams.get('period') || 'month';
            const startDate = url.searchParams.get('startDate');
            const endDate = url.searchParams.get('endDate');
            let timeFormat, limit, dateCondition;
            const params = [];
            
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
            
            // 构建日期条件
            if (startDate && endDate) {
                dateCondition = 'AND created_at BETWEEN ? AND ?';
                params.push(startDate, endDate);
            } else if (startDate) {
                dateCondition = 'AND created_at >= ?';
                params.push(startDate);
            } else if (endDate) {
                dateCondition = 'AND created_at <= ?';
                params.push(endDate);
            } else {
                dateCondition = '';
            }
            
            // 获取用户增长数据
            params.push(limit);
            const { results: userData } = await env.DB.prepare(
                `SELECT 
                    strftime('${timeFormat}', created_at) as time_period,
                    COUNT(*) as user_count
                FROM users
                WHERE 1=1 ${dateCondition}
                GROUP BY time_period
                ORDER BY time_period ASC
                LIMIT ?`
            ).bind(...params).all();
            
            // 确保返回足够的数据点以便图表完整展示
            if (userData.length === 0) {
                // 如果没有数据，返回一个空数据点以便前端能正确渲染图表
                return new Response(JSON.stringify({
                    labels: [new Date().toISOString().split('T')[0]],
                    values: [0]
                }), {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 转换数据格式以适应前端图表
            const formattedData = {
                labels: userData.map(item => item.time_period),
                values: userData.map(item => item.user_count)
            };
            
            return new Response(JSON.stringify(formattedData), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取用户增长趋势数据失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 获取商品销售分布数据
    if (path === '/api/admin/products/sales-distribution' && request.method === 'GET') {
        try {
            // 获取日期参数
            const startDate = url.searchParams.get('startDate');
            const endDate = url.searchParams.get('endDate');
            
            // 构建日期条件
            let dateCondition = '';
            const params = [];
            
            if (startDate && endDate) {
                dateCondition = 'AND o.created_at BETWEEN ? AND ?';
                params.push(startDate, endDate);
            } else if (startDate) {
                dateCondition = 'AND o.created_at >= ?';
                params.push(startDate);
            } else if (endDate) {
                dateCondition = 'AND o.created_at <= ?';
                params.push(endDate);
            }
            
            // 获取商品销售分布数据
            const { results: salesData } = await env.DB.prepare(
                `SELECT 
                    p.product_id,
                    p.product_name,
                    SUM(oi.quantity) as sold_count,
                    SUM(oi.price * oi.quantity) as sales_amount
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                JOIN products p ON oi.product_id = p.product_id
                WHERE o.status != 'cancelled' ${dateCondition}
                GROUP BY p.product_id
                ORDER BY sold_count DESC
                LIMIT 10`
            ).bind(...params).all();
            
            // 计算总销售额（用于计算百分比）
            const totalSales = await env.DB.prepare(
                `SELECT SUM(oi.price * oi.quantity) as total
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                WHERE o.status != 'cancelled' ${dateCondition}`
            ).bind(...params).first();
            
            // 格式化响应数据
            const formattedData = salesData.map(item => ({
                name: item.product_name,
                value: item.sold_count,
                amount: item.sales_amount,
                percentage: totalSales.total > 0 ? 
                    Math.round((item.sales_amount / totalSales.total) * 100) : 0
            }));
            
            // 确保返回足够的数据点以便图表完整展示
            if (formattedData.length === 0) {
                // 如果没有数据，返回一个空数据点以便前端能正确渲染图表
                return new Response(JSON.stringify([{
                    name: '无销售数据',
                    value: 0,
                    amount: 0,
                    percentage: 100
                }]), {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            return new Response(JSON.stringify(formattedData), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取商品销售分布数据失败', details: error.message }), {
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
            const pageSize = parseInt(url.searchParams.get('pageSize') || url.searchParams.get('limit') || '10');
            const offset = (page - 1) * pageSize;
            
            // 获取筛选参数
            const categoryId = url.searchParams.get('categoryId') || url.searchParams.get('category');
            const search = url.searchParams.get('search');
            
            // 构建查询条件
            let whereClause = '';
            const params = [];
            
            if (categoryId) {
                whereClause += ' WHERE EXISTS (SELECT 1 FROM product_category_mapping pcm WHERE pcm.product_id = p.product_id AND pcm.category_id = ?)';
                params.push(categoryId);
            }
            
            if (search) {
                whereClause += whereClause ? ' AND ' : ' WHERE ';
                whereClause += '(name LIKE ? OR description LIKE ?)';
                params.push(`%${search}%`, `%${search}%`);
            }
            
            // 简化商品总数查询，直接从products表计数，避免JOIN操作带来的重复
            const countQuery = `
                SELECT COUNT(*) as total 
                FROM products p
                ${whereClause}
            `;
            const totalResult = await env.DB.prepare(countQuery).bind(...params).first();
            const total = totalResult?.total || 0;
            
            // 获取商品列表，使用DISTINCT确保每个商品只出现一次
            const productsQuery = `
                SELECT DISTINCT p.* 
                FROM products p
                LEFT JOIN product_category_mapping pcm ON p.product_id = pcm.product_id
                LEFT JOIN product_categories c ON pcm.category_id = c.category_id
                ${whereClause}
                ORDER BY p.product_id ASC
                LIMIT ? OFFSET ?
            `;
            
            const { results: products } = await env.DB.prepare(productsQuery)
                .bind(...params, pageSize, offset)
                .all();
            
            // 获取所有商品的分类映射
            if (products.length > 0) {
                const productIds = products.map(p => p.product_id);
                const placeholders = productIds.map(() => '?').join(',');
                
                const { results: mappings } = await env.DB.prepare(`
                    SELECT * FROM product_category_mapping 
                    WHERE product_id IN (${placeholders})
                `).bind(...productIds).all();
                
                // 将分类映射添加到对应的商品中
                const mappingsByProductId = {};
                for (const mapping of mappings) {
                    if (!mappingsByProductId[mapping.product_id]) {
                        mappingsByProductId[mapping.product_id] = [];
                    }
                    mappingsByProductId[mapping.product_id].push(mapping);
                }
                
                // 将映射添加到商品对象中
                for (const product of products) {
                    product.category_mappings = mappingsByProductId[product.product_id] || [];
                }
            }
            
            return new Response(JSON.stringify({
                products,
                pagination: {
                    total,
                    page,
                    pageSize,
                    pages: Math.ceil(total / pageSize)
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
                SELECT * FROM products
                WHERE product_id = ?
            `).bind(productId).first();
            
            if (!product) {
                return new Response(JSON.stringify({ error: '商品不存在' }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 获取商品分类映射
            const { results: mappings } = await env.DB.prepare(`
                SELECT * FROM product_category_mapping 
                WHERE product_id = ?
            `).bind(productId).all();
            
            // 合并商品信息和分类映射
            product.category_mappings = mappings;
            
            return new Response(JSON.stringify(product), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('获取商品详情失败:', error);
            return new Response(JSON.stringify({ error: '获取商品详情失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 获取用户详情
    if (path.match(/^\/api\/admin\/users\/\d+$/) && request.method === 'GET') {
        try {
            const userId = path.split('/').pop();
            
            // 获取用户基本信息
            const user = await env.DB.prepare(`
                SELECT u.*, 
                    (SELECT COUNT(*) FROM orders WHERE user_id = u.user_id) as orders_count,
                    (SELECT SUM(total_amount) FROM orders WHERE user_id = u.user_id AND status != 'cancelled') as total_spent
                FROM users u
                WHERE u.user_id = ?
            `).bind(userId).first();
            
            if (!user) {
                return new Response(JSON.stringify({ error: '用户不存在' }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 获取用户最近订单
            const { results: recentOrders } = await env.DB.prepare(`
                SELECT order_id, total_amount, status, created_at
                FROM orders
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT 5
            `).bind(userId).all();
            
            // 获取用户地址信息
            const { results: addresses } = await env.DB.prepare(`
                SELECT *
                FROM user_addresses
                WHERE user_id = ?
            `).bind(userId).all();
            
            // 组合用户完整信息
            const userDetails = {
                ...user,
                recentOrders,
                addresses
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
       
    // 获取用户增长趋势数据
    if (path === '/api/admin/statistics/user-growth' && request.method === 'GET') {
        try {
            const period = url.searchParams.get('period') || 'month';
            const startDate = url.searchParams.get('startDate');
            const endDate = url.searchParams.get('endDate');
            let timeFormat, limit, dateCondition;
            const params = [];
            
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
            
            // 构建日期条件
            if (startDate && endDate) {
                dateCondition = 'AND created_at BETWEEN ? AND ?';
                params.push(startDate, endDate);
            } else if (startDate) {
                dateCondition = 'AND created_at >= ?';
                params.push(startDate);
            } else if (endDate) {
                dateCondition = 'AND created_at <= ?';
                params.push(endDate);
            } else {
                dateCondition = '';
            }
            
            // 获取用户增长趋势数据
            params.push(limit);
            const { results: userData } = await env.DB.prepare(
                `SELECT 
                    strftime('${timeFormat}', created_at) as time_period,
                    COUNT(*) as new_users
                FROM users
                WHERE 1=1 ${dateCondition}
                GROUP BY time_period
                ORDER BY time_period ASC
                LIMIT ?`
            ).bind(...params).all();
            
            // 确保返回足够的数据点以便图表完整展示
            if (userData.length === 0) {
                // 如果没有数据，返回一个空数据点以便前端能正确渲染图表
                return new Response(JSON.stringify([{
                    time_period: new Date().toISOString().split('T')[0],
                    new_users: 0
                }]), {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            return new Response(JSON.stringify(userData), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取用户增长趋势数据失败', details: error.message }), {
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
            
            // 获取请求数据
            const requestData = await request.formData();
            
            // 解析JSON数据
            const productDataStr = requestData.get('data');
            if (!productDataStr) {
                return new Response(JSON.stringify({ error: '缺少商品数据' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            const productData = JSON.parse(productDataStr);
            console.log('接收到的商品数据:', productData);
            
            // 字段映射，适配前端发送的字段名
            const name = productData.name;
            const description = productData.description || '';
            const price = productData.price;
            const original_price = productData.original_price || price;
            const stock = productData.stock || 0;
            const specifications = productData.specifications || '{}';
            const aging_years = productData.aging_years || 0;
            const status = productData.status === 'active' ? 'active' : 'inactive';
            const category_mappings = productData.category_mappings || [];
            
            // 验证必填字段
            if (!name || !price) {
                return new Response(JSON.stringify({ error: '商品名称和价格为必填项' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 开始数据库事务
            // 插入商品数据到products表
            const result = await env.DB.prepare(`
                INSERT INTO products (
                    name, description, price, original_price, stock, 
                    specifications, aging_years, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `).bind(
                name,
                description,
                price,
                original_price,
                stock,
                specifications,
                aging_years,
                status
            ).run();
            
            // 获取新插入的商品ID
            const newProductId = result.meta?.last_row_id;
            
            // 处理商品分类映射
            if (category_mappings && category_mappings.length > 0) {
                for (const mapping of category_mappings) {
                    // 检查分类是否存在
                    const category = await env.DB.prepare('SELECT category_id, category_name FROM product_categories WHERE category_id = ?')
                        .bind(mapping.category_id)
                        .first();
                    
                    if (category) {
                        // 插入商品-分类映射
                        await env.DB.prepare(`
                            INSERT INTO product_category_mapping (
                                product_id, name, category_id, category_name, created_at
                            ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                        `).bind(
                            newProductId,
                            name,
                            category.category_id,
                            category.category_name
                        ).run();
                    }
                }
            }
            
            // 处理图片上传到R2存储桶
            const imageFile = requestData.get('image');
            if (imageFile && imageFile.size > 0) {
                try {
                    // 构建图片存储路径
                    const imagePath = `image/Goods/Goods_${newProductId}.png`;
                    
                    // 上传图片到R2存储桶
                    await env.BUCKET.put(imagePath, imageFile.stream(), {
                        httpMetadata: {
                            contentType: imageFile.type || 'image/png'
                        }
                    });
                    
                    console.log(`商品图片上传成功: ${imagePath}`);
                } catch (uploadError) {
                    console.error('图片上传失败:', uploadError);
                    // 不中断流程，继续返回商品信息
                }
            }
            
            // 获取新插入的商品详情
            const newProduct = await env.DB.prepare(`
                SELECT * FROM products WHERE product_id = ?
            `).bind(newProductId).first();
            
            // 获取商品分类映射
            const { results: mappings } = await env.DB.prepare(`
                SELECT * FROM product_category_mapping WHERE product_id = ?
            `).bind(newProductId).all();
            
            // 合并商品信息和分类映射
            newProduct.category_mappings = mappings;
            
            // 添加图片URL
            newProduct.image_url = `https://${env.R2_DOMAIN}/image/Goods/Goods_${newProductId}.png`;
            
            return new Response(JSON.stringify({
                message: '商品添加成功',
                product: newProduct
            }), {
                status: 201,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('添加商品失败:', error);
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
            
            // 获取请求数据
            const requestData = await request.formData();
            
            // 解析JSON数据
            const productDataStr = requestData.get('data');
            if (!productDataStr) {
                return new Response(JSON.stringify({ error: '缺少商品数据' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            const productData = JSON.parse(productDataStr);
            console.log('接收到的商品编辑数据:', productData);
            
            // 字段映射，适配前端发送的字段名
            const name = productData.name;
            const description = productData.description || '';
            const price = productData.price;
            const original_price = productData.original_price || price;
            const stock = productData.stock || 0;
            const specifications = productData.specifications || '{}';
            const aging_years = productData.aging_years || 0;
            const status = productData.status === 'active' ? 'active' : 'inactive';
            const category_mappings = productData.category_mappings || [];
            
            // 处理图片上传到R2存储桶
            const imageFile = requestData.get('image');
            if (imageFile && imageFile.size > 0) {
                try {
                    // 构建图片存储路径
                    const imagePath = `image/Goods/Goods_${productId}.png`;
                    
                    // 上传图片到R2存储桶
                    await env.BUCKET.put(imagePath, imageFile.stream(), {
                        httpMetadata: {
                            contentType: imageFile.type || 'image/png'
                        }
                    });
                    
                    console.log(`商品图片更新成功: ${imagePath}`);
                } catch (uploadError) {
                    console.error('图片上传失败:', uploadError);
                    // 不中断流程，继续更新商品信息
                }
            }
            
            // 验证必填字段
            if (!name || !price) {
                return new Response(JSON.stringify({ error: '商品名称和价格为必填项' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 更新商品数据
            await env.DB.prepare(`
                UPDATE products SET
                    name = ?,
                    description = ?,
                    price = ?,
                    original_price = ?,
                    stock = ?,
                    specifications = ?,
                    aging_years = ?,
                    status = ?
                WHERE product_id = ?
            `).bind(
                name,
                description,
                price,
                original_price,
                stock,
                specifications,
                aging_years,
                status,
                productId
            ).run();
            
            // 处理商品分类映射
            // 首先删除现有的映射关系
            await env.DB.prepare(`
                DELETE FROM product_category_mapping WHERE product_id = ?
            `).bind(productId).run();
            
            // 添加新的映射关系
            if (category_mappings && category_mappings.length > 0) {
                for (const mapping of category_mappings) {
                    // 检查分类是否存在
                    const category = await env.DB.prepare('SELECT category_id, category_name FROM product_categories WHERE category_id = ?')
                        .bind(mapping.category_id)
                        .first();
                    
                    if (category) {
                        // 插入商品-分类映射
                        await env.DB.prepare(`
                            INSERT INTO product_category_mapping (
                                product_id, name, category_id, category_name, created_at
                            ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                        `).bind(
                            productId,
                            name,
                            category.category_id,
                            category.category_name
                        ).run();
                    }
                }
            }
            
            // 获取更新后的商品详情
            const updatedProduct = await env.DB.prepare(`
                SELECT * FROM products WHERE product_id = ?
            `).bind(productId).first();
            
            // 获取商品分类映射
            const { results: mappings } = await env.DB.prepare(`
                SELECT * FROM product_category_mapping WHERE product_id = ?
            `).bind(productId).all();
            
            // 合并商品信息和分类映射
            updatedProduct.category_mappings = mappings;
            
            return new Response(JSON.stringify({
                message: '商品更新成功',
                product: updatedProduct
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('更新商品失败:', error);
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
            
            // 先删除商品分类映射关系
            await env.DB.prepare('DELETE FROM product_category_mapping WHERE product_id = ?')
                .bind(productId)
                .run();
            
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
            console.error('删除商品失败:', error);
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
                       0 as product_count
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
                       0 as product_count
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
                       0 as product_count
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
            const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
            const limit = parseInt(String(url.searchParams.get('limit') || pageSize));
            const offset = (page - 1) * limit;
            
            // 获取筛选参数
            const status = url.searchParams.get('status');
            const search = url.searchParams.get('search');
            const startDate = url.searchParams.get('start_date') || url.searchParams.get('startDate');
            const endDate = url.searchParams.get('end_date') || url.searchParams.get('endDate');
            
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
                SELECT o.*, u.username, u.email, u.user_id 
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.user_id
                ${whereClause}
                ORDER BY o.created_at DESC
                LIMIT ? OFFSET ?
            `;
            
            const { results: orders } = await env.DB.prepare(ordersQuery)
                .bind(...params, limit, offset)
                .all();
                
            // 获取订单项
            const orderIds = orders.map(order => order.order_id);
            
            if (orderIds.length > 0) {
                const placeholders = orderIds.map(() => '?').join(',');
                const { results: orderItems } = await env.DB.prepare(`
                    SELECT oi.*, p.name as product_name, oi.quantity
                    FROM order_items oi
                    LEFT JOIN products p ON oi.product_id = p.product_id
                    WHERE oi.order_id IN (${placeholders})
                `).bind(...orderIds).all();
                
                // 将订单项关联到对应的订单
                const orderItemsMap = {};
                orderItems.forEach(item => {
                    if (!orderItemsMap[item.order_id]) {
                        orderItemsMap[item.order_id] = [];
                    }
                    orderItemsMap[item.order_id].push(item);
                });
                
                orders.forEach(order => {
                    order.items = orderItemsMap[order.order_id] || [];
                    // 计算订单中的商品总数
                    order.items_count = order.items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
                });
            } else {
                // 确保每个订单都有items属性
                orders.forEach(order => {
                    order.items = [];
                    order.items_count = 0;
                });
            }
            
            return new Response(JSON.stringify({
                orders,
                pagination: {
                    total,
                    page,
                    pageSize: limit,
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
                SELECT oi.*, p.product_name as name, p.image_url, oi.quantity, oi.price 
                FROM order_items oi
                LEFT JOIN products p ON oi.product_id = p.product_id
                WHERE oi.order_id = ?
            `).bind(orderId).all();
            
            // 计算订单商品总额
            const items_total = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            
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
                items_total: items_total,
                shipping_fee: order.shipping_fee || 0,
                total_amount: order.total_amount,
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
                whereClause = ' WHERE username LIKE ? OR email LIKE ? OR phone_number LIKE ?';
                params.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }
            
            // 获取用户总数
            const countQuery = `SELECT COUNT(*) as total FROM users${whereClause}`;
            const totalResult = await env.DB.prepare(countQuery).bind(...params).first();
            const total = totalResult?.total || 0;
            
            // 获取用户列表（不返回密码哈希）
            const usersQuery = `
                SELECT user_id, username, email, phone_number, created_at, last_login, status 
                FROM users
                ${whereClause}
                ORDER BY ${actualSortBy} ${actualSortOrder}
                LIMIT ? OFFSET ?
            `;
            
            const { results: users } = await env.DB.prepare(usersQuery)
                .bind(...params, limit, offset)
                .all();
            
            // 格式化用户列表中的时间戳
            users.forEach(user => {
                // 使用辅助函数格式化时间戳
                user.created_at = formatTimestamp(user.created_at);
                user.last_login = formatTimestamp(user.last_login);
            });
            
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
    if ((path.match(/^\/api\/admin\/users\/\d+$/) || path === '/api/admin/users/undefined') && request.method === 'GET') {
        try {
            const userId = path.split('/').pop();
            
            // 如果userId是undefined或无效，返回适当的错误信息
            if (userId === 'undefined' || !userId) {
                return new Response(JSON.stringify({ error: '无效的用户ID', message: '请提供有效的用户ID' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 获取用户基本信息（不返回密码哈希）
            const user = await env.DB.prepare(`
                SELECT user_id, username, email, phone_number, created_at, last_login, status 
                FROM users
                WHERE user_id = ?
            `).bind(userId).first();
            
            if (!user) {
                return new Response(JSON.stringify({ error: '用户不存在' }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 格式化时间戳
            user.created_at = formatTimestamp(user.created_at);
            user.last_login = formatTimestamp(user.last_login);
            
            // 获取用户订单统计
            const orderStats = await env.DB.prepare(`
                SELECT 
                    COUNT(*) as total_orders,
                    SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END) as total_spent,
                    MAX(created_at) as last_order_date
                FROM orders 
                WHERE user_id = ?
            `).bind(userId).first();
            
            // 格式化最后订单日期
            if (orderStats) {
                orderStats.last_order_date = formatTimestamp(orderStats.last_order_date);
            }
            
            // 获取用户最近的订单
            const { results: recentOrders } = await env.DB.prepare(`
                SELECT order_id, status, total_amount, created_at 
                FROM orders
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT 5
            `).bind(userId).all();
            
            // 格式化订单时间
            recentOrders.forEach(order => {
                order.created_at = formatTimestamp(order.created_at);
            });
            
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
            const countQuery = `SELECT COUNT(*) as total FROM product_reviews r${whereClause}`;
            const totalResult = await env.DB.prepare(countQuery).bind(...params).first();
            const total = totalResult?.total || 0;
            
            // 获取评价列表
            const reviewsQuery = `
                SELECT r.*, p.name as product_name, u.username
                FROM product_reviews r
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
                SELECT r.*, p.name as product_name, u.username, u.email
                FROM product_reviews r
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
    
    // 获取商品分类映射关系
    if (path === '/api/admin/product-category-mappings' && request.method === 'GET') {
        try {
            // 获取请求参数中的商品ID列表
            const productIdsParam = url.searchParams.get('product_ids');
            if (!productIdsParam) {
                return new Response(JSON.stringify({ error: '缺少必要的product_ids参数' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 解析商品ID列表，去重
            const productIds = [...new Set(productIdsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)))];
            
            if (productIds.length === 0) {
                return new Response(JSON.stringify([]), {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            // 构建IN查询的参数占位符
            const placeholders = productIds.map(() => '?').join(',');
            
            // 查询商品分类映射关系
            const { results: mappings } = await env.DB.prepare(`
                SELECT pcm.product_id, pcm.category_id, pcm.name, pcm.category_name
                FROM product_category_mapping pcm
                WHERE pcm.product_id IN (${placeholders})
            `).bind(...productIds).all();
            
            return new Response(JSON.stringify(mappings), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取商品分类映射失败', details: error.message }), {
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
                LEFT JOIN product_category_mapping pcm ON p.product_id = pcm.product_id
                LEFT JOIN product_categories c ON pcm.category_id = c.category_id
                WHERE o.status != 'cancelled' ${dateCondition}
                GROUP BY p.product_id
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
                'SELECT config_key as setting_key, config_value as setting_value, data_type FROM admin_settings'
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
                    'SELECT config_key FROM admin_settings WHERE config_key = ?'
                ).bind(key).first();
                
                if (existingSetting) {
                    // 更新现有设置
                    return env.DB.prepare(
                        'UPDATE admin_settings SET config_value = ?, updated_at = CURRENT_TIMESTAMP WHERE config_key = ?'
                    ).bind(valueStr, key).run();
                } else {
                    // 创建新设置
                    return env.DB.prepare(
                        'INSERT INTO admin_settings (module, config_key, config_value, data_type) VALUES (?, ?, ?, ?)'
                    ).bind('site', key, valueStr, typeof value === 'object' ? 'json' : typeof value).run();
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
    
    // 更新用户状态（启用/禁用）
    if ((path.match(/^\/api\/admin\/users\/\d+\/status$/) || path === '/api/admin/users/undefined/status') && request.method === 'PUT') {
        try {
            const userId = path.split('/')[4];
            
            // 如果userId是undefined或无效，返回适当的错误信息
            if (userId === 'undefined' || !userId) {
                return new Response(JSON.stringify({ error: '无效的用户ID', message: '请提供有效的用户ID' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            const { status } = await request.json();
            console.log('收到状态更新请求，用户ID:', userId, '状态值:', status);
            
            // 验证状态值，接受前端可能发送的各种状态值格式
            const validStatuses = ['active', 'disabled', 'inactive', '正常', '禁用', '删除'];
            if (!validStatuses.includes(status)) {
                return new Response(JSON.stringify({ error: '无效的状态值，只能是 active、disabled、inactive、正常、禁用或删除' }), {
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
            
            // 将前端状态值映射到数据库需要的状态值
            let dbStatus;
            if (status === 'active' || status === '正常') {
                dbStatus = '正常';
            } else if (status === 'disabled' || status === 'inactive' || status === '禁用') {
                dbStatus = '禁用';
            } else if (status === '删除') {
                dbStatus = '删除';
            } else {
                // 默认情况下，保持原状态值
                dbStatus = status;
            }
            
            console.log('映射后的数据库状态值:', dbStatus);
            
            // 更新用户状态
            await env.DB.prepare('UPDATE users SET status = ? WHERE user_id = ?')
                .bind(dbStatus, userId)
                .run();
            
            // 返回前端可识别的状态值
            let responseStatus;
            if (dbStatus === '正常') {
                responseStatus = 'active';
            } else if (dbStatus === '禁用') {
                responseStatus = 'disabled';
            } else if (dbStatus === '删除') {
                responseStatus = 'inactive';
            } else {
                // 默认情况下，返回原状态值
                responseStatus = status;
            }
            
            return new Response(JSON.stringify({
                message: '用户状态更新成功',
                userId,
                status: responseStatus
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('更新用户状态失败:', error);
            return new Response(JSON.stringify({ error: '更新用户状态失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 获取商品销售分布数据
    if (path === '/api/admin/products/sales-distribution' && request.method === 'GET') {
        try {
            const startDate = url.searchParams.get('startDate');
            const endDate = url.searchParams.get('endDate');
            
            let dateCondition = '';
            const params = [];
            
            if (startDate && endDate) {
                dateCondition = 'AND o.created_at BETWEEN ? AND ?';
                params.push(startDate, endDate);
            } else if (startDate) {
                dateCondition = 'AND o.created_at >= ?';
                params.push(startDate);
            } else if (endDate) {
                dateCondition = 'AND o.created_at <= ?';
                params.push(endDate);
            }
            
            // 获取商品销售分布数据
            const { results: salesDistribution } = await env.DB.prepare(`
                SELECT 
                    p.product_id,
                    p.name as product_name,
                    SUM(oi.quantity) as quantity_sold,
                    SUM(oi.quantity * oi.price) as total_sales,
                    COUNT(DISTINCT o.order_id) as orders_count
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                JOIN products p ON oi.product_id = p.product_id
                WHERE o.status != 'cancelled' ${dateCondition}
                GROUP BY p.product_id
                ORDER BY quantity_sold DESC
                LIMIT 20
            `).bind(...params).all();
            
            return new Response(JSON.stringify(salesDistribution), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取商品销售分布数据失败', details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
    
    // 获取用户增长趋势数据
    if (path === '/api/admin/statistics/user-growth' && request.method === 'GET') {
        try {
            const period = url.searchParams.get('period') || 'month';
            const startDate = url.searchParams.get('startDate');
            const endDate = url.searchParams.get('endDate');
            
            let timeFormat, dateCondition;
            const params = [];
            
            // 根据时间周期设置SQL日期格式
            if (period === 'week') {
                timeFormat = '%Y-%m-%d'; // 按天
            } else if (period === 'year') {
                timeFormat = '%Y-%m'; // 按月
            } else { // month
                timeFormat = '%Y-%m-%d'; // 按天
            }
            
            // 构建日期条件
            if (startDate && endDate) {
                dateCondition = 'WHERE created_at BETWEEN ? AND ?';
                params.push(startDate, endDate);
            } else if (startDate) {
                dateCondition = 'WHERE created_at >= ?';
                params.push(startDate);
            } else if (endDate) {
                dateCondition = 'WHERE created_at <= ?';
                params.push(endDate);
            } else {
                // 默认查询最近30天
                dateCondition = 'WHERE created_at >= date("now", "-30 days")';
            }
            
            // 获取用户增长趋势数据
            const { results: userGrowthData } = await env.DB.prepare(`
                SELECT 
                    strftime('${timeFormat}', created_at) as time_period,
                    COUNT(*) as new_users
                FROM users
                ${dateCondition}
                GROUP BY time_period
                ORDER BY time_period ASC
            `).bind(...params).all();
            
            return new Response(JSON.stringify(userGrowthData), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取用户增长趋势数据失败', details: error.message }), {
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
        
        // 处理图片请求
        if (path.startsWith('/image/')) {
            const imageResponse = await handleImageRequest(request, env);
            if (imageResponse) {
                return imageResponse;
            }
        }
        
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