/**
 * 管理后台分类API
 * 处理分类的增删改查操作
 * 与D1数据库中的product_categories表交互
 */

// 获取分类列表或分类分布数据
export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname.split('/');
    const endpoint = path[path.length - 1];
    
    // 如果是请求分类分布数据
    if (endpoint === 'distribution') {
      return await getCategoryDistribution(env);
    }
    
    // 否则是请求分类列表
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    const searchQuery = url.searchParams.get('search') || '';
    
    // 计算分页偏移量
    const offset = (page - 1) * pageSize;
    
    // 构建查询条件
    let query = `
      SELECT c.*, 
      (SELECT COUNT(*) FROM products WHERE category_id = c.category_id) as product_count
      FROM product_categories c
      WHERE 1=1
    `;
    let countQuery = `SELECT COUNT(*) as total FROM product_categories WHERE 1=1`;
    const params = [];
    
    // 添加搜索条件
    if (searchQuery) {
      query += ` AND (c.category_name LIKE ? OR c.description LIKE ?)`;
      countQuery += ` AND (category_name LIKE ? OR description LIKE ?)`;
      params.push(`%${searchQuery}%`, `%${searchQuery}%`);
    }
    
    // 添加排序和分页
    query += ` ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
    params.push(pageSize, offset);
    
    // 执行查询
    const categories = await env.DB.prepare(query).bind(...params).all();
    const countResult = await env.DB.prepare(countQuery).bind(...params.slice(0, params.length - 2)).first();
    
    // 计算总页数
    const total = countResult.total;
    const totalPages = Math.ceil(total / pageSize);
    
    // 返回结果
    return new Response(
      JSON.stringify({
        categories: categories.results,
        page,
        pageSize,
        totalPages,
        total,
        currentPage: page
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('获取分类数据失败:', error);
    
    return new Response(
      JSON.stringify({ error: '获取分类数据失败，请稍后再试' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 获取分类分布数据（用于仪表盘图表）
async function getCategoryDistribution(env) {
  try {
    // 查询每个分类的商品数量
    const query = `
      SELECT c.category_name as name, 
      COUNT(p.product_id) as value
      FROM product_categories c
      LEFT JOIN products p ON c.category_id = p.category_id
      GROUP BY c.category_id
      ORDER BY value DESC
    `;
    
    const result = await env.DB.prepare(query).all();
    
    // 确保至少返回一个空数组，而不是null
    const data = result.results && result.results.length > 0 ? result.results : [];
    
    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('获取分类分布数据失败:', error);
    
    return new Response(
      JSON.stringify({ error: '获取分类分布数据失败' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 创建分类
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const categoryData = await request.json();
    
    // 验证必填字段
    if (!categoryData.category_name) {
      return new Response(
        JSON.stringify({ error: '分类名称为必填项' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 插入分类数据
    const result = await env.DB.prepare(`
      INSERT INTO product_categories (
        category_name, parent_category_id, description, created_at
      ) VALUES (?, ?, ?, CAST(strftime('%s','now') AS INTEGER))
    `).bind(
      categoryData.category_name,
      categoryData.parent_category_id || null,
      categoryData.description || ''
    ).run();
    
    // 获取新创建的分类ID
    const newCategoryId = result.meta.last_row_id;
    
    return new Response(
      JSON.stringify({
        success: true,
        message: '分类创建成功',
        category_id: newCategoryId
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('创建分类失败:', error);
    
    return new Response(
      JSON.stringify({ error: '创建分类失败，请稍后再试' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 更新分类
export async function onRequestPut(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname.split('/');
    const categoryId = path[path.length - 1];
    
    // 验证分类ID
    if (!categoryId || isNaN(parseInt(categoryId))) {
      return new Response(
        JSON.stringify({ error: '无效的分类ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const categoryData = await request.json();
    
    // 验证必填字段
    if (!categoryData.category_name) {
      return new Response(
        JSON.stringify({ error: '分类名称为必填项' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 更新分类数据
    await env.DB.prepare(`
      UPDATE product_categories SET
        category_name = ?,
        parent_category_id = ?,
        description = ?
      WHERE category_id = ?
    `).bind(
      categoryData.category_name,
      categoryData.parent_category_id || null,
      categoryData.description || '',
      categoryId
    ).run();
    
    return new Response(
      JSON.stringify({
        success: true,
        message: '分类更新成功'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('更新分类失败:', error);
    
    return new Response(
      JSON.stringify({ error: '更新分类失败，请稍后再试' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 删除分类
export async function onRequestDelete(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname.split('/');
    const categoryId = path[path.length - 1];
    
    // 验证分类ID
    if (!categoryId || isNaN(parseInt(categoryId))) {
      return new Response(
        JSON.stringify({ error: '无效的分类ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 检查是否有商品使用此分类
    const productsCount = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ?'
    ).bind(categoryId).first();
    
    if (productsCount.count > 0) {
      return new Response(
        JSON.stringify({ error: '无法删除此分类，因为有商品正在使用它' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 检查是否有子分类
    const childrenCount = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM product_categories WHERE parent_category_id = ?'
    ).bind(categoryId).first();
    
    if (childrenCount.count > 0) {
      return new Response(
        JSON.stringify({ error: '无法删除此分类，因为它有子分类' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 删除分类
    await env.DB.prepare(
      'DELETE FROM product_categories WHERE category_id = ?'
    ).bind(categoryId).run();
    
    return new Response(
      JSON.stringify({
        success: true,
        message: '分类删除成功'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('删除分类失败:', error);
    
    return new Response(
      JSON.stringify({ error: '删除分类失败，请稍后再试' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}