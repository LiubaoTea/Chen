/**
 * 管理后台用户API
 * 处理用户的查询和管理
 * 与D1数据库中的users表交互
 */

// 获取用户列表或用户详情
export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname.split('/');
    const endpoint = path[path.length - 1];
    
    // 如果不是users，则可能是用户ID，尝试获取用户详情
    if (endpoint !== 'users') {
      return await onRequestGetDetail(context);
    }
    
    // 否则是请求用户列表
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    const searchQuery = url.searchParams.get('q') || '';
    
    // 计算分页偏移量
    const offset = (page - 1) * pageSize;
    
    // 构建查询条件
    let query = `
      SELECT user_id, username, email, phone_number, created_at, last_login,
      (SELECT COUNT(*) FROM orders WHERE user_id = users.user_id) as orders_count
      FROM users
      WHERE 1=1
    `;
    let countQuery = `SELECT COUNT(*) as total FROM users WHERE 1=1`;
    const params = [];
    
    // 添加搜索条件
    if (searchQuery) {
      query += ` AND (username LIKE ? OR email LIKE ? OR phone_number LIKE ?)`;
      countQuery += ` AND (username LIKE ? OR email LIKE ? OR phone_number LIKE ?)`;
      params.push(`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`);
    }
    
    // 添加排序和分页
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(pageSize, offset);
    
    // 执行查询
    const users = await env.DB.prepare(query).bind(...params).all();
    const countResult = await env.DB.prepare(countQuery).bind(...params.slice(0, params.length - 2)).first();
    
    // 计算总页数
    const total = countResult.total;
    const totalPages = Math.ceil(total / pageSize);
    
    // 返回结果
    return new Response(
      JSON.stringify({
        users: users.results,
        page,
        pageSize,
        totalPages,
        total
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('获取用户数据失败:', error);
    
    return new Response(
      JSON.stringify({ error: '获取用户数据失败，请稍后再试' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 获取用户详情
async function onRequestGetDetail(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname.split('/');
    const userId = path[path.length - 1];
    
    // 如果是获取用户列表
    if (userId === 'users') {
      return await onRequestGet(context);
    }
    
    // 获取用户基本信息
    const user = await env.DB.prepare(`
      SELECT user_id, username, email, phone_number, created_at, last_login
      FROM users
      WHERE user_id = ?
    `).bind(userId).first();
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: '用户不存在' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 获取用户订单数
    const ordersCount = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM orders
      WHERE user_id = ?
    `).bind(userId).first();
    
    // 获取用户地址
    const addresses = await env.DB.prepare(`
      SELECT *
      FROM user_addresses
      WHERE user_id = ?
    `).bind(userId).all();
    
    // 获取用户设置
    const settings = await env.DB.prepare(`
      SELECT *
      FROM user_settings
      WHERE user_id = ?
    `).bind(userId).first();
    
    // 组合完整用户信息
    const userDetails = {
      ...user,
      orders_count: ordersCount.count,
      addresses: addresses.results,
      settings: settings || null
    };
    
    return new Response(
      JSON.stringify(userDetails),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('获取用户详情失败:', error);
    
    return new Response(
      JSON.stringify({ error: '获取用户详情失败，请稍后再试' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}