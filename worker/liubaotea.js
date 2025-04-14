// Cloudflare Worker for 陳記六堡茶

//==========================================================================
// 用户相关API路由处理
// 处理用户注册、登录和获取用户信息的相关请求
//==========================================================================
const handleUserAuth = async (request, env) => {
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
                headers: { 'Content-Type': 'application/json' }
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
                headers: { 'Content-Type': 'application/json' }
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
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    return new Response('Not Found', { status: 404 });
};

//==========================================================================
// 商品相关API路由处理
// 处理商品列表、商品详情、商品筛选和相关商品推荐的请求
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
            const conditions = [];
            
            if (category && category !== 'all') {
                conditions.push('category = ?');
                params.push(category);
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
            const products = await env.DB.prepare(sql).bind(...params).all();
            
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
            return new Response(JSON.stringify({ error: '获取商品列表失败', details: error.message }), {
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

    return new Response('Not Found', { status: 404 });
};

//==========================================================================
// 订单相关API路由处理
// 处理订单创建、订单列表查询和订单详情的相关请求
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

            return new Response(JSON.stringify(orders.results), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
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

    return new Response('Not Found', { status: 404 });
};

//==========================================================================
// 图片处理API
// 处理从R2存储获取商品图片的请求
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
    
    return new Response('Not Found', { status: 404 });
};

//==========================================================================
// 购物车相关API路由处理
// 处理购物车添加商品、查看购物车和更新购物车的相关请求
//==========================================================================
const handleCart = async (request, env) => {
    const url = new URL(request.url);
    const path = url.pathname;

    // 添加商品到购物车
    if (path === '/api/cart/add' && request.method === 'POST') {
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

            const { productId, quantity } = await request.json();

            // 验证商品库存
            const product = await env.DB.prepare(
                'SELECT stock FROM products WHERE product_id = ?'
            ).bind(productId).first();

            if (!product) {
                return new Response(JSON.stringify({ error: '商品不存在' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            if (product.stock < quantity) {
                return new Response(JSON.stringify({ error: '库存不足' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // 检查购物车中是否已存在该商品
            const existingItem = await env.DB.prepare(
                'SELECT cart_id, quantity FROM carts WHERE user_id = ? AND product_id = ?'
            ).bind(userId, productId).first();

            const timestamp = new Date().toISOString();

            if (existingItem) {
                // 更新现有购物车项的数量
                await env.DB.prepare(
                    'UPDATE carts SET quantity = quantity + ? WHERE cart_id = ?'
                ).bind(quantity, existingItem.cart_id).run();
            } else {
                // 添加新的购物车项
                await env.DB.prepare(
                    'INSERT INTO carts (user_id, product_id, quantity, added_at) VALUES (?, ?, ?, ?)'
                ).bind(userId, productId, quantity, timestamp).run();
            }

            return new Response(JSON.stringify({ message: '添加到购物车成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '添加到购物车失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 获取购物车内容
    if (path === '/api/cart' && request.method === 'GET') {
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

            // 获取用户的购物车内容
            const cartItems = await env.DB.prepare(
                `SELECT c.cart_id, c.quantity, c.added_at, 
                        p.product_id, p.name, p.price, p.image_filename
                 FROM carts c
                 JOIN products p ON c.product_id = p.product_id
                 WHERE c.user_id = ?`
            ).bind(userId).all();

            // 处理产品图片URL
            const itemsWithImages = cartItems.results.map(item => {
                const imageUrl = `https://${env.R2_DOMAIN}/image/Goods/${item.image_filename}`;
                return { ...item, image_url: imageUrl };
            });

            return new Response(JSON.stringify(itemsWithImages), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '获取购物车失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 更新购物车商品数量
    if (path === '/api/cart/update' && request.method === 'PUT') {
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

            const { cartId, quantity } = await request.json();

            // 验证购物车项属于当前用户
            const cartItem = await env.DB.prepare(
                'SELECT c.*, p.stock FROM carts c JOIN products p ON c.product_id = p.product_id WHERE c.cart_id = ? AND c.user_id = ?'
            ).bind(cartId, userId).first();

            if (!cartItem) {
                return new Response(JSON.stringify({ error: '购物车项不存在或无权访问' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // 检查库存
            if (cartItem.stock < quantity) {
                return new Response(JSON.stringify({ error: '库存不足' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // 更新数量
            await env.DB.prepare(
                'UPDATE carts SET quantity = ? WHERE cart_id = ?'
            ).bind(quantity, cartId).run();

            return new Response(JSON.stringify({ message: '更新成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '更新购物车失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 从购物车中删除商品
    if (path === '/api/cart/remove' && request.method === 'DELETE') {
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

            const { cartId } = await request.json();

            // 验证购物车项属于当前用户
            const cartItem = await env.DB.prepare(
                'SELECT * FROM carts WHERE cart_id = ? AND user_id = ?'
            ).bind(cartId, userId).first();

            if (!cartItem) {
                return new Response(JSON.stringify({ error: '购物车项不存在或无权访问' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // 删除购物车项
            await env.DB.prepare(
                'DELETE FROM carts WHERE cart_id = ?'
            ).bind(cartId).run();

            return new Response(JSON.stringify({ message: '删除成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '删除购物车项失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    return new Response('Not Found', { status: 404 });
};

// Worker主处理函数
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        
        // 处理CORS预检请求
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                }
            });
        }

        // 添加CORS头
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        };

        try {
            // 路由分发
            if (url.pathname.startsWith('/api/products')) {
                const response = await handleProducts(request, env);
                return new Response(response.body, {
                    status: response.status,
                    headers: { ...corsHeaders, ...response.headers }
                });
            }

            if (url.pathname.startsWith('/api/cart')) {
                const response = await handleCart(request, env);
                return new Response(response.body, {
                    status: response.status,
                    headers: { ...corsHeaders, ...response.headers }
                });
            }

            if (url.pathname.startsWith('/api/orders')) {
                const response = await handleOrders(request, env);
                return new Response(response.body, {
                    status: response.status,
                    headers: { ...corsHeaders, ...response.headers }
                });
            }

            if (url.pathname.startsWith('/api')) {
                const response = await handleUserAuth(request, env);
                return new Response(response.body, {
                    status: response.status,
                    headers: { ...corsHeaders, ...response.headers }
                });
            }

            if (url.pathname.startsWith('/image/')) {
                return await handleImageRequest(request, env);
            }

            return new Response('Not Found', { status: 404 });
        } catch (error) {
            return new Response(JSON.stringify({ error: '服务器错误', details: error.message }), {
                status: 500,
                headers: corsHeaders
            });
        }
    }
};