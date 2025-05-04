/**
 * 管理后台仪表盘API
 * 处理仪表盘数据请求
 * 与D1数据库交互获取统计数据
 */

// 获取仪表盘统计数据
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.split('/');
  const endpoint = path[path.length - 1];

  try {
    // 根据不同的endpoint返回不同的数据
    if (endpoint === 'stats') {
      return await getDashboardStats(env);
    } else if (endpoint === 'recent-orders') {
      const limit = parseInt(url.searchParams.get('limit') || '5');
      return await getRecentOrders(env, limit);
    } else {
      return new Response(
        JSON.stringify({ error: '无效的仪表盘数据请求' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('获取仪表盘数据失败:', error);
    return new Response(
      JSON.stringify({ error: '获取仪表盘数据失败，请稍后再试' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 获取仪表盘统计数据
async function getDashboardStats(env) {
  // 获取订单总数
  const ordersCountResult = await env.DB.prepare(
    'SELECT COUNT(*) as total FROM orders'
  ).first();
  
  // 获取销售总额
  const salesResult = await env.DB.prepare(
    'SELECT SUM(total_amount) as total FROM orders WHERE status != "cancelled"'
  ).first();
  
  // 获取用户总数
  const usersCountResult = await env.DB.prepare(
    'SELECT COUNT(*) as total FROM users'
  ).first();
  
  // 获取商品总数
  const productsCountResult = await env.DB.prepare(
    'SELECT COUNT(*) as total FROM products'
  ).first();
  
  // 获取待处理订单数
  const pendingOrdersResult = await env.DB.prepare(
    'SELECT COUNT(*) as total FROM orders WHERE status = "pending" OR status = "paid"'
  ).first();
  
  // 获取库存不足商品数
  const lowStockResult = await env.DB.prepare(
    'SELECT COUNT(*) as total FROM products WHERE stock < 10 AND stock > 0'
  ).first();
  
  return new Response(
    JSON.stringify({
      totalOrders: ordersCountResult.total || 0,
      totalSales: salesResult.total || 0,
      totalUsers: usersCountResult.total || 0,
      totalProducts: productsCountResult.total || 0,
      pendingOrders: pendingOrdersResult.total || 0,
      lowStockProducts: lowStockResult.total || 0
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

// 获取最近订单
async function getRecentOrders(env, limit) {
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
}