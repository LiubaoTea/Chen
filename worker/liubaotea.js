// Cloudflare Worker for 陳記六堡茶

// CORS配置
//==========================================================================
//                        一、CORS配置
//==========================================================================
const corsHeaders = {
   
    'Access-Control-Allow-Origin': 'https://www.liubaotea.online',
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

            // 创建新用户
            const timestamp = new Date().toISOString();
            await env.DB.prepare(
                'INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, ?)'
            ).bind(username, email, password, timestamp).run();

            return new Response(JSON.stringify({ message: '注册成功' }), {
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
//                      五、商品相关API路由处理
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
            return new Response(JSON.stringify({ error: '创建订单失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
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
            return new Response(JSON.stringify({ error: '获取订单列表失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
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
            return new Response(JSON.stringify({ error: '获取订单详情失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
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

    // 获取用户通知设置
    if (path === '/api/user/settings' && request.method === 'GET') {
        try {
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

            // 验证旧密码
            const user = await env.DB.prepare(
                'SELECT * FROM users WHERE user_id = ? AND password_hash = ?'
            ).bind(userId, oldPassword).first();

            if (!user) {
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
            const { items, shippingInfo, totalAmount } = await request.json();
            
            // 开始数据库事务
            const timestamp = new Date().toISOString();
            
            // 创建订单
            const orderResult = await env.DB.prepare(
                'INSERT INTO orders (user_id, total_amount, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
            ).bind(userId, totalAmount, 'pending', timestamp, timestamp).run();
            
            const orderId = orderResult.meta.last_row_id;
            
            // 添加订单项
            for (const item of items) {
                await env.DB.prepare(
                    'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)'
                ).bind(orderId, item.productId, item.quantity, item.price).run();
                
                // 更新库存
                await env.DB.prepare(
                    'UPDATE products SET stock = stock - ? WHERE product_id = ?'
                ).bind(item.quantity, item.productId).run();
            }

            return new Response(JSON.stringify({ 
                message: '订单创建成功', 
                orderId,
                orderNumber: `ORD${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000)}`
            }), {
                status: 201,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '创建订单失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
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
            return new Response(JSON.stringify({ error: '获取订单列表失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 获取订单详情
    if (path.match(/\/api\/orders\/\d+$/) && request.method === 'GET') {
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
                return new Response(JSON.stringify({ error: '订单不存在或无权访问' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // 获取订单项
            const orderItems = await env.DB.prepare(
                `SELECT oi.*, p.name, p.image_filename 
                FROM order_items oi 
                JOIN products p ON oi.product_id = p.product_id 
                WHERE oi.order_id = ?`
            ).bind(orderId).all();

            // 处理产品图片URL
            const itemsWithImages = orderItems.results.map(item => {
                const imageUrl = `https://${env.R2_DOMAIN}/image/Goods/${item.image_filename}`;
                return { ...item, image_url: imageUrl };
            });

            return new Response(JSON.stringify({
                order,
                items: itemsWithImages
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取订单详情失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 获取用户通知设置
    if (path === '/api/user/settings' && request.method === 'GET') {
        try {
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
    const url = new URL(request.url);
    const path = url.pathname;

    // 添加商品评价
    if (path === '/api/reviews' && request.method === 'POST') {
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

            const { product_id, rating, review_content } = await request.json();
            const timestamp = new Date().toISOString();

            // 验证用户是否购买过该商品
            const orderItem = await env.DB.prepare(
                `SELECT oi.* FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'completed'`
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

            // 添加评价
            await env.DB.prepare(
                'INSERT INTO product_reviews (user_id, product_id, rating, review_content, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
            ).bind(userId, product_id, rating, review_content, 'published', timestamp).run();

            return new Response(JSON.stringify({ message: '评价添加成功' }), {
                status: 201,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
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

            // 处理购物会话相关请求
            if (path.startsWith('/api/shopping-session')) {
                return handleShoppingSession(request, env);
            }

            // 获取用户通知设置
    if (path === '/api/user/settings' && request.method === 'GET') {
        try {
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
            } else if (url.pathname.startsWith('/api/user/') || url.pathname.startsWith('/api/addresses')) {
                response = await handleUserCenter(request, env);
            } else if (['/api/register', '/api/login', '/api/user'].includes(url.pathname)) {
                response = await handleUserAuth(request, env);
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