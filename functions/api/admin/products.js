/**
 * 管理后台商品API
 * 处理商品的增删改查操作
 * 与D1数据库中的products表交互
 */

// 获取商品列表
export async function onRequestGet(context) {
  try {
    const { request, env, admin } = context;
    const url = new URL(request.url);
    
    // 获取查询参数
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    const categoryId = url.searchParams.get('categoryId') || '';
    const searchQuery = url.searchParams.get('search') || '';
    
    // 计算分页偏移量
    const offset = (page - 1) * pageSize;
    
    // 构建查询条件
    let query = `
      SELECT p.*, c.category_name 
      FROM products p
      LEFT JOIN product_categories c ON p.category_id = c.category_id
      WHERE 1=1
    `;
    let countQuery = `SELECT COUNT(*) as total FROM products WHERE 1=1`;
    const params = [];
    
    // 添加分类筛选
    if (categoryId) {
      query += ` AND p.category_id = ?`;
      countQuery += ` AND category_id = ?`;
      params.push(categoryId);
    }
    
    // 添加搜索条件
    if (searchQuery) {
      query += ` AND (p.name LIKE ? OR p.description LIKE ?)`;
      countQuery += ` AND (name LIKE ? OR description LIKE ?)`;
      params.push(`%${searchQuery}%`, `%${searchQuery}%`);
    }
    
    // 添加排序和分页
    query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    params.push(pageSize, offset);
    
    // 执行查询
    const products = await env.DB.prepare(query).bind(...params).all();
    const countResult = await env.DB.prepare(countQuery).bind(...params.slice(0, params.length - 2)).first();
    
    // 计算总页数
    const total = countResult.total;
    const totalPages = Math.ceil(total / pageSize);
    
    // 返回结果
    return new Response(
      JSON.stringify({
        products: products.results,
        page,
        pageSize,
        totalPages,
        total,
        currentPage: page
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('获取商品列表失败:', error);
    
    return new Response(
      JSON.stringify({ error: '获取商品列表失败，请稍后再试' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 创建商品
export async function onRequestPost(context) {
  try {
    const { request, env, admin } = context;
    const productData = await request.json();
    
    // 验证必填字段
    if (!productData.name || !productData.price || !productData.category_id) {
      return new Response(
        JSON.stringify({ error: '商品名称、价格和分类为必填项' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 插入商品数据
    const result = await env.DB.prepare(`
      INSERT INTO products (
        name, description, price, original_price, 
        stock, category_id, status, specifications, 
        aging_years, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(strftime('%s','now') AS INTEGER))
    `).bind(
      productData.name,
      productData.description || '',
      productData.price,
      productData.original_price || null,
      productData.stock || 0,
      productData.category_id,
      productData.status || 'active',
      productData.specifications || '{}',
      productData.aging_years || 0
    ).run();
    
    // 获取新创建的商品ID
    const newProductId = result.meta.last_row_id;
    
    // 获取新创建的商品详情
    const newProduct = await env.DB.prepare(`
      SELECT p.*, c.category_name 
      FROM products p
      LEFT JOIN product_categories c ON p.category_id = c.category_id
      WHERE p.product_id = ?
    `).bind(newProductId).first();
    
    // 返回结果
    return new Response(
      JSON.stringify({
        message: '商品创建成功',
        product: newProduct
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('创建商品失败:', error);
    
    return new Response(
      JSON.stringify({ error: '创建商品失败，请稍后再试' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 更新商品
export async function onRequestPut(context) {
  try {
    const { request, env, admin } = context;
    const url = new URL(request.url);
    const productId = url.pathname.split('/').pop();
    const productData = await request.json();
    
    // 验证商品ID
    if (!productId) {
      return new Response(
        JSON.stringify({ error: '商品ID不能为空' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 检查商品是否存在
    const existingProduct = await env.DB.prepare(`
      SELECT * FROM products WHERE product_id = ?
    `).bind(productId).first();
    
    if (!existingProduct) {
      return new Response(
        JSON.stringify({ error: '商品不存在' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 构建更新字段
    const updateFields = [];
    const params = [];
    
    if (productData.name !== undefined) {
      updateFields.push('name = ?');
      params.push(productData.name);
    }
    
    if (productData.description !== undefined) {
      updateFields.push('description = ?');
      params.push(productData.description);
    }
    
    if (productData.price !== undefined) {
      updateFields.push('price = ?');
      params.push(productData.price);
    }
    
    if (productData.original_price !== undefined) {
      updateFields.push('original_price = ?');
      params.push(productData.original_price);
    }
    
    if (productData.stock !== undefined) {
      updateFields.push('stock = ?');
      params.push(productData.stock);
    }
    
    if (productData.category_id !== undefined) {
      updateFields.push('category_id = ?');
      params.push(productData.category_id);
    }
    
    if (productData.status !== undefined) {
      updateFields.push('status = ?');
      params.push(productData.status);
    }
    
    if (productData.specifications !== undefined) {
      updateFields.push('specifications = ?');
      params.push(productData.specifications);
    }
    
    if (productData.aging_years !== undefined) {
      updateFields.push('aging_years = ?');
      params.push(productData.aging_years);
    }
    
    // 如果没有要更新的字段，直接返回成功
    if (updateFields.length === 0) {
      return new Response(
        JSON.stringify({
          message: '商品未做任何更改',
          product: existingProduct
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 更新商品数据
    params.push(productId);
    await env.DB.prepare(`
      UPDATE products SET ${updateFields.join(', ')} WHERE product_id = ?
    `).bind(...params).run();
    
    // 获取更新后的商品详情
    const updatedProduct = await env.DB.prepare(`
      SELECT p.*, c.category_name 
      FROM products p
      LEFT JOIN product_categories c ON p.category_id = c.category_id
      WHERE p.product_id = ?
    `).bind(productId).first();
    
    // 返回结果
    return new Response(
      JSON.stringify({
        message: '商品更新成功',
        product: updatedProduct
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('更新商品失败:', error);
    
    return new Response(
      JSON.stringify({ error: '更新商品失败，请稍后再试' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 删除商品
export async function onRequestDelete(context) {
  try {
    const { request, env, admin } = context;
    const url = new URL(request.url);
    const productId = url.pathname.split('/').pop();
    
    // 验证商品ID
    if (!productId) {
      return new Response(
        JSON.stringify({ error: '商品ID不能为空' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 检查商品是否存在
    const existingProduct = await env.DB.prepare(`
      SELECT * FROM products WHERE product_id = ?
    `).bind(productId).first();
    
    if (!existingProduct) {
      return new Response(
        JSON.stringify({ error: '商品不存在' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 删除商品
    await env.DB.prepare(`
      DELETE FROM products WHERE product_id = ?
    `).bind(productId).run();
    
    // 返回结果
    return new Response(
      JSON.stringify({
        message: '商品删除成功',
        productId
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('删除商品失败:', error);
    
    return new Response(
      JSON.stringify({ error: '删除商品失败，请稍后再试' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}