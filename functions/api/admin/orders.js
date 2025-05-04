/**
 * 管理后台订单API
 * 处理订单的查询和状态更新
 * 与D1数据库中的orders表交互
 */

// 获取订单列表或订单详情
export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname.split('/');
    const endpoint = path[path.length - 1];
    
    // 如果是请求最近订单
    if (endpoint === 'recent') {
      const limit = parseInt(url.searchParams.get('limit') || '5');
      return await getRecentOrders(env, limit);
    }
    
    // 如果不是orders或recent，则可能是订单ID，尝试获取订单详情
    if (endpoint !== 'orders') {
      return await onRequestGetDetail(context);
    }
    
    // 否则是请求订单列表
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    const status = url.searchParams.get('status') || '';
    const searchQuery = url.searchParams.get('search') || '';
    
    // 计算分页偏移量
    const offset = (page - 1) * pageSize;
    
    // 构建查询条件
    let query = `
      SELECT o.*, u.username,
      (SELECT COUNT(*) FROM order_items WHERE order_id = o.order_id) as items_count
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.user_id
      WHERE 1=1
    `;
    let countQuery = `SELECT COUNT(*) as total FROM orders WHERE 1=1`;
    const params = [];
    
    // 添加状态筛选
    if (status) {
      query += ` AND o.status = ?`;
      countQuery += ` AND status = ?`;
      params.push(status);
    }
    
    // 添加搜索条件
    if (searchQuery) {
      query += ` AND (o.order_id LIKE ? OR u.username LIKE ?)`;
      countQuery += ` AND (order_id LIKE ?)`; // 简化计数查询
      params.push(`%${searchQuery}%`, `%${searchQuery}%`);
      params.push(`%${searchQuery}%`); // 为计数查询添加参数
    }
    
    // 添加排序和分页
    query += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
    params.push(pageSize, offset);
    
    // 执行查询
    const orders = await env.DB.prepare(query).bind(...params).all();
    const countResult = await env.DB.prepare(countQuery).bind(...params.slice(0, params.length - 2)).first();
    
    // 计算总页数
    const total = countResult.total;
    const totalPages = Math.ceil(total / pageSize);
    
    // 返回结果
    return new Response(
      JSON.stringify({
        orders: orders.results,
        page,
        pageSize,
        totalPages,
        total,
        currentPage: page
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('获取订单数据失败:', error);
    
    return new Response(
      JSON.stringify({ error: '获取订单数据失败，请稍后再试' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 获取最近订单
async function getRecentOrders(env, limit) {
  try {
    const orders = await env.DB.prepare(`
      SELECT o.order_id, o.total_amount, o.status, o.created_at, u.username 
      FROM orders o
      JOIN users u ON o.user_id = u.user_id
      ORDER BY o.created_at DESC
      LIMIT ?
    `).bind(limit).all();
    
    return new Response(
      JSON.stringify(orders.results),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('获取最近订单失败:', error);
    
    return new Response(
      JSON.stringify({ error: '获取最近订单失败' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 获取订单详情
async function onRequestGetDetail(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname.split('/');
    const orderId = path[path.length - 1];
    
    // 如果是获取订单列表
    if (orderId === 'orders' || orderId === 'recent') {
      return await onRequestGet(context);
    }
    
    // 获取订单基本信息
    const order = await env.DB.prepare(`
      SELECT o.*, u.username, u.email, u.phone_number
      FROM orders o
      JOIN users u ON o.user_id = u.user_id
      WHERE o.order_id = ?
    `).bind(orderId).first();
    
    if (!order) {
      return new Response(
        JSON.stringify({ error: '订单不存在' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 获取订单项
    const orderItems = await env.DB.prepare(`
      SELECT oi.*, p.name as product_name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.product_id
      WHERE oi.order_id = ?
    `).bind(orderId).all();
    
    // 获取收货地址
    const address = await env.DB.prepare(`
      SELECT *
      FROM user_addresses
      WHERE user_id = ? AND is_default = 1
      LIMIT 1
    `).bind(order.user_id).first();
    
    // 组合完整订单信息
    const orderDetails = {
      ...order,
      items: orderItems.results,
      address: address || null
    };
    
    return new Response(
      JSON.stringify(orderDetails),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('获取订单详情失败:', error);
    
    return new Response(
      JSON.stringify({ error: '获取订单详情失败，请稍后再试' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 更新订单状态
export async function onRequestPut(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname.split('/');
    const orderId = path[path.length - 1];
    
    // 验证订单ID
    if (!orderId) {
      return new Response(
        JSON.stringify({ error: '无效的订单ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const updateData = await request.json();
    
    // 验证状态值
    if (!updateData.status || !['pending', 'paid', 'shipped', 'delivered', 'cancelled'].includes(updateData.status)) {
      return new Response(
        JSON.stringify({ error: '无效的订单状态' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 更新订单状态
    await env.DB.prepare(`
      UPDATE orders SET
        status = ?,
        updated_at = CAST(strftime('%s','now') AS INTEGER)
      WHERE order_id = ?
    `).bind(
      updateData.status,
      orderId
    ).run();
    
    return new Response(
      JSON.stringify({
        success: true,
        message: '订单状态更新成功'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('更新订单状态失败:', error);
    
    return new Response(
      JSON.stringify({ error: '更新订单状态失败，请稍后再试' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 注意：onRequestGetList函数已被移除，其功能已整合到主要的onRequestGet函数中