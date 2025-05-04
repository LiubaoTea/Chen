/**
 * 管理后台评价API
 * 处理评价的查询和审核
 * 与D1数据库中的product_reviews表交互
 */

// 获取评价列表
export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    
    // 获取查询参数
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    const status = url.searchParams.get('status') || '';
    const productId = url.searchParams.get('productId') || '';
    
    // 计算分页偏移量
    const offset = (page - 1) * pageSize;
    
    // 构建查询条件
    let query = `
      SELECT r.*, u.username, p.name as product_name
      FROM product_reviews r
      JOIN users u ON r.user_id = u.user_id
      JOIN products p ON r.product_id = p.product_id
      WHERE 1=1
    `;
    let countQuery = `SELECT COUNT(*) as total FROM product_reviews WHERE 1=1`;
    const params = [];
    
    // 添加状态筛选
    if (status) {
      query += ` AND r.status = ?`;
      countQuery += ` AND status = ?`;
      params.push(status);
    }
    
    // 添加商品筛选
    if (productId) {
      query += ` AND r.product_id = ?`;
      countQuery += ` AND product_id = ?`;
      params.push(productId);
    }
    
    // 添加排序和分页
    query += ` ORDER BY r.created_at DESC LIMIT ? OFFSET ?`;
    params.push(pageSize, offset);
    
    // 执行查询
    const reviews = await env.DB.prepare(query).bind(...params).all();
    const countResult = await env.DB.prepare(countQuery).bind(...params.slice(0, params.length - 2)).first();
    
    // 计算总页数
    const total = countResult.total;
    const totalPages = Math.ceil(total / pageSize);
    
    // 返回结果
    return new Response(
      JSON.stringify({
        reviews: reviews.results,
        page,
        pageSize,
        totalPages,
        total,
        currentPage: page
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('获取评价列表失败:', error);
    
    return new Response(
      JSON.stringify({ error: '获取评价列表失败，请稍后再试' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 更新评价状态（审核）
export async function onRequestPut(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname.split('/');
    const reviewId = path[path.length - 1];
    
    // 验证评价ID
    if (!reviewId || isNaN(parseInt(reviewId))) {
      return new Response(
        JSON.stringify({ error: '无效的评价ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const updateData = await request.json();
    
    // 验证状态值
    if (!updateData.status || !['pending', 'approved', 'rejected'].includes(updateData.status)) {
      return new Response(
        JSON.stringify({ error: '无效的评价状态' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 更新评价状态
    await env.DB.prepare(`
      UPDATE product_reviews SET
        status = ?
      WHERE review_id = ?
    `).bind(
      updateData.status,
      reviewId
    ).run();
    
    return new Response(
      JSON.stringify({
        success: true,
        message: '评价状态更新成功'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('更新评价状态失败:', error);
    
    return new Response(
      JSON.stringify({ error: '更新评价状态失败，请稍后再试' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 删除评价
export async function onRequestDelete(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname.split('/');
    const reviewId = path[path.length - 1];
    
    // 验证评价ID
    if (!reviewId || isNaN(parseInt(reviewId))) {
      return new Response(
        JSON.stringify({ error: '无效的评价ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 删除评价
    await env.DB.prepare(
      'DELETE FROM product_reviews WHERE review_id = ?'
    ).bind(reviewId).run();
    
    return new Response(
      JSON.stringify({
        success: true,
        message: '评价删除成功'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('删除评价失败:', error);
    
    return new Response(
      JSON.stringify({ error: '删除评价失败，请稍后再试' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}