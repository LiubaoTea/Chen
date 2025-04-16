// Cloudflare Worker for 陳記六堡茶

//==========================================================================
//                         一、用户相关API路由处理
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
//                      二、商品相关API路由处理
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
//                       三、购物车相关API路由处理
// 处理购物车的添加、删除、更新和查询操作
//==========================================================================
const handleCartOperations = async (request, env) => {
    const url = new URL(request.url);
    const path = url.pathname;

    // 获取用户ID
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

    // 获取购物车内容
    if (path === '/api/cart' && request.method === 'GET') {
        try {
            const cartItems = await env.DB.prepare(
                `SELECT c.*, p.name, p.price, p.image_filename 
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

    // 添加商品到购物车
    if (path === '/api/cart/add' && request.method === 'POST') {
        try {
            const { productId, quantity } = await request.json();

            // 检查商品是否已在购物车中
            const existingItem = await env.DB.prepare(
                'SELECT * FROM carts WHERE user_id = ? AND product_id = ?'
            ).bind(userId, productId).first();

            if (existingItem) {
                // 更新数量
                await env.DB.prepare(
                    'UPDATE carts SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?'
                ).bind(quantity, userId, productId).run();
            } else {
                // 添加新商品
                await env.DB.prepare(
                    'INSERT INTO carts (user_id, product_id, quantity, added_at) VALUES (?, ?, ?, ?)'
                ).bind(userId, productId, quantity, new Date().toISOString()).run();
            }

            return new Response(JSON.stringify({ message: '添加成功' }), {
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

    // 从购物车移除商品
    if (path === '/api/cart/remove' && request.method === 'POST') {
        try {
            const { productId } = await request.json();

            await env.DB.prepare(
                'DELETE FROM carts WHERE user_id = ? AND product_id = ?'
            ).bind(userId, productId).run();

            return new Response(JSON.stringify({ message: '移除成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: '从购物车移除失败', details: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 更新购物车商品数量
    if (path === '/api/cart/update' && request.method === 'POST') {
        try {
            const { productId, quantity } = await request.json();

            await env.DB.prepare(
                'UPDATE carts SET quantity = ? WHERE user_id = ? AND product_id = ?'
            ).bind(quantity, userId, productId).run();

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

    // 清空购物车
    if (path === '/api/cart/clear' && request.method === 'POST') {
        try {
            await env.DB.prepare(
                'DELETE FROM carts WHERE user_id = ?'
            ).bind(userId).run();

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

    return new Response('Not Found', { status: 404 });
};

//==========================================================================
//                            四、用户中心相关API路由处理
// 处理用户信息更新、地址管理和通知设置等功能
//==========================================================================
const handleUserCenter = async (request, env) => {
    const url = new URL(request.url);
    const path = url.pathname;

    // 获取用户ID
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
                headers: { 'Content-Type': 'application/json' }
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

            return new Response(JSON.stringify({ message: '更新成功' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
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
    if (path === '/api/addresses' && request.method === 'GET') {
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
    if (path === '/api/addresses' && request.method === 'POST') {
        try {
            const addressData = await request.json();
            const timestamp = new Date().toISOString();

            // 如果设置为默认地址，先将其他地址设置为非默认
            if (addressData.is_default) {
                await env.DB.prepare(
                    'UPDATE user_addresses SET is_default = 0 WHERE user_id = ?'
                ).bind(userId).run();
            }

            // 添加新地址
            await env.DB.prepare(
                `INSERT INTO user_addresses 
                (user_id, recipient_name, contact_phone, full_address, region, postal_code, is_default, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
                userId,
                addressData.recipient_name,
                addressData.contact_phone,
                addressData.full_address,
                addressData.region,
                addressData.postal_code,
                addressData.is_default ? 1 : 0,
                timestamp
            ).run();

            return new Response(JSON.stringify({ message: '添加地址成功' }), {
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

    // 更新地址
    if (path.match(/\/api\/addresses\/\d+$/) && request.method === 'PUT') {
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
    if (path.match(/\/api\/addresses\/\d+$/) && request.method === 'DELETE') {
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

    return new Response('Not Found', { status: 404 });
};

//==========================================================================
//                           五、订单相关API路由处理
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
//                                六、图片处理API
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
//                         七、用户地址管理API路由处理
// 处理用户地址的添加、查询、更新和删除
//==========================================================================
const handleUserAddress = async (request, env) => {
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

    // 添加新地址
    if (path === '/api/addresses' && request.method === 'POST') {
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
    if (path === '/api/addresses' && request.method === 'GET') {
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
    if (path.match(/\/api\/addresses\/\d+$/) && request.method === 'PUT') {
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
    if (path.match(/\/api\/addresses\/\d+$/) && request.method === 'DELETE') {
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

    return new Response('Not Found', { status: 404 });
};

//==========================================================================
//                            八、用户设置API路由处理
// 处理用户设置的查询和更新
//==========================================================================
const handleUserSettings = async (request, env) => {
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

    return new Response('Not Found', { status: 404 });
};

//==========================================================================
//                              九、商品分类API路由处理
// 处理商品分类的查询和管理
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

    return new Response('Not Found', { status: 404 });
};

//==========================================================================
//                              十、商品评价API路由处理
// 处理商品评价的添加、查询和管理
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

    return new Response('Not Found', { status: 404 });
};

//==========================================================================
//                           十一、主路由处理函数
// 根据请求路径分发到不同的处理函数
//==========================================================================
async function handleRequest(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 设置CORS头
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // 处理预检请求
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: corsHeaders
        });
    }

    // 根据路径前缀分发到不同的处理函数
    if (path.startsWith('/api/products')) {
        const response = await handleProducts(request, env);
        return addCorsHeaders(response, corsHeaders);
    }

    if (path.startsWith('/api/orders')) {
        const response = await handleOrders(request, env);
        return addCorsHeaders(response, corsHeaders);
    }

    if (['/api/register', '/api/login', '/api/user'].includes(path)) {
        const response = await handleUserAuth(request, env);
        return addCorsHeaders(response, corsHeaders);
    }

    if (path.startsWith('/api/cart')) {
        const response = await handleCart(request, env);
        return addCorsHeaders(response, corsHeaders);
    }

    if (path.startsWith('/api/user/') || path.startsWith('/api/addresses')) {
        const response = await handleUserCenter(request, env);
        return addCorsHeaders(response, corsHeaders);
    }

    return new Response('Not Found', { status: 404 });
}

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
//                           十二、购物会话API路由处理
// 处理购物会话的创建、更新和管理
//==========================================================================
const handleShoppingSession = async (request, env) => {
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

    return new Response('Not Found', { status: 404 });
}

//==========================================================================
//                              十三、购物车相关API路由处理
// 处理购物车添加商品、查看购物车和更新购物车的相关请求
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
                return handleCart(request, env);
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
//                         十四、购物车相关API路由处理
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

//                      十五、Worker主处理函数
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
                const response = await handleCartOperations(request, env);
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