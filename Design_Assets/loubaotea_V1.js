var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker/liubaotea.js
var handleUserAuth = /* @__PURE__ */ __name(async (request, env) => {
  const url = new URL(request.url);
  const path = url.pathname;
  if (path === "/api/register" && request.method === "POST") {
    try {
      const { username, email, password } = await request.json();
      const existingUser = await env.DB.prepare(
        "SELECT username FROM users WHERE username = ?"
      ).bind(username).first();
      if (existingUser) {
        return new Response(JSON.stringify({ error: "\u7528\u6237\u540D\u5DF2\u5B58\u5728" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      await env.DB.prepare(
        "INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, ?)"
      ).bind(username, email, password, timestamp).run();
      return new Response(JSON.stringify({ message: "\u6CE8\u518C\u6210\u529F" }), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "\u6CE8\u518C\u5931\u8D25", details: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (path === "/api/login" && request.method === "POST") {
    try {
      const { username, password } = await request.json();
      const user = await env.DB.prepare(
        "SELECT * FROM users WHERE username = ? AND password_hash = ?"
      ).bind(username, password).first();
      if (!user) {
        return new Response(JSON.stringify({ error: "\u7528\u6237\u540D\u6216\u5BC6\u7801\u9519\u8BEF" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      const token = btoa(JSON.stringify({ username, userId: user.user_id, timestamp: (/* @__PURE__ */ new Date()).toISOString() }));
      return new Response(JSON.stringify({
        token,
        username: user.username,
        email: user.email
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "\u767B\u5F55\u5931\u8D25", details: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (path === "/api/user" && request.method === "GET") {
    try {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "\u672A\u6388\u6743\u8BBF\u95EE" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      const token = authHeader.split(" ")[1];
      const decoded = JSON.parse(atob(token));
      const username = decoded.username;
      const user = await env.DB.prepare(
        "SELECT user_id, username, email, created_at FROM users WHERE username = ?"
      ).bind(username).first();
      if (!user) {
        return new Response(JSON.stringify({ error: "\u7528\u6237\u4E0D\u5B58\u5728" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify(user), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "\u83B7\u53D6\u7528\u6237\u4FE1\u606F\u5931\u8D25", details: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  return new Response("Not Found", { status: 404 });
}, "handleUserAuth");
var handleProducts = /* @__PURE__ */ __name(async (request, env) => {
  const url = new URL(request.url);
  const path = url.pathname;
  if (path === "/api/products" && request.method === "GET") {
    try {
      const category = url.searchParams.get("category");
      const minPrice = url.searchParams.get("minPrice");
      const maxPrice = url.searchParams.get("maxPrice");
      const year = url.searchParams.get("year");
      let sql = "SELECT * FROM products";
      const params = [];
      const conditions = [];
      if (category && category !== "all") {
        conditions.push("category = ?");
        params.push(category);
      }
      if (minPrice) {
        conditions.push("price >= ?");
        params.push(parseFloat(minPrice));
      }
      if (maxPrice) {
        conditions.push("price <= ?");
        params.push(parseFloat(maxPrice));
      }
      if (year) {
        conditions.push("aging_years = ?");
        params.push(parseInt(year));
      }
      if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
      }
      const products = await env.DB.prepare(sql).bind(...params).all();
      const productsWithImages = products.results.map((product) => {
        const imageUrl = `https://${env.R2_DOMAIN}/image/Goods/${product.image_filename}`;
        return { ...product, image_url: imageUrl };
      });
      return new Response(JSON.stringify(productsWithImages), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "\u83B7\u53D6\u5546\u54C1\u5217\u8868\u5931\u8D25", details: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  const relatedMatch = path.match(/^\/api\/products\/related\/(\d+)$/);
  if (relatedMatch) {
    const productId = relatedMatch[1];
    try {
      const { results: currentProduct } = await env.DB.prepare(
        "SELECT category FROM products WHERE product_id = ?"
      ).bind(productId).all();
      if (currentProduct.length === 0) {
        return new Response(JSON.stringify({ error: "\u5546\u54C1\u4E0D\u5B58\u5728" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }
      const { results: relatedProducts } = await env.DB.prepare(
        "SELECT * FROM products WHERE category = ? AND product_id != ? LIMIT 4"
      ).bind(currentProduct[0].category, productId).all();
      const productsWithImages = relatedProducts.map((product) => {
        const imageUrl = `https://${env.R2_DOMAIN}/image/Goods/${product.image_filename}`;
        return { ...product, image_url: imageUrl };
      });
      return new Response(JSON.stringify(productsWithImages), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "\u83B7\u53D6\u76F8\u5173\u5546\u54C1\u5931\u8D25", details: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (path.match(/\/api\/products\/\d+$/) && request.method === "GET") {
    try {
      const productId = path.split("/").pop();
      const product = await env.DB.prepare(
        "SELECT * FROM products WHERE product_id = ?"
      ).bind(productId).first();
      if (!product) {
        return new Response(JSON.stringify({ error: "\u5546\u54C1\u4E0D\u5B58\u5728" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }
      const imageUrl = `https://${env.R2_DOMAIN}/image/Goods/${product.image_filename}`;
      product.image_url = imageUrl;
      return new Response(JSON.stringify(product), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "\u83B7\u53D6\u5546\u54C1\u8BE6\u60C5\u5931\u8D25", details: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  return new Response("Not Found", { status: 404 });
}, "handleProducts");
var handleCartOperations = /* @__PURE__ */ __name(async (request, env) => {
  const url = new URL(request.url);
  const path = url.pathname;
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "\u672A\u6388\u6743\u8BBF\u95EE" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const token = authHeader.split(" ")[1];
  const decoded = JSON.parse(atob(token));
  const userId = decoded.userId;
  if (path === "/api/cart" && request.method === "GET") {
    try {
      const cartItems = await env.DB.prepare(
        `SELECT c.*, p.name, p.price, p.image_filename 
                FROM carts c 
                JOIN products p ON c.product_id = p.product_id 
                WHERE c.user_id = ?`
      ).bind(userId).all();
      const itemsWithImages = cartItems.results.map((item) => {
        const imageUrl = `https://${env.R2_DOMAIN}/image/Goods/${item.image_filename}`;
        return { ...item, image_url: imageUrl };
      });
      return new Response(JSON.stringify(itemsWithImages), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "\u83B7\u53D6\u8D2D\u7269\u8F66\u5931\u8D25", details: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (path === "/api/cart/add" && request.method === "POST") {
    try {
      const { productId, quantity } = await request.json();
      const existingItem = await env.DB.prepare(
        "SELECT * FROM carts WHERE user_id = ? AND product_id = ?"
      ).bind(userId, productId).first();
      if (existingItem) {
        await env.DB.prepare(
          "UPDATE carts SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?"
        ).bind(quantity, userId, productId).run();
      } else {
        await env.DB.prepare(
          "INSERT INTO carts (user_id, product_id, quantity, added_at) VALUES (?, ?, ?, ?)"
        ).bind(userId, productId, quantity, (/* @__PURE__ */ new Date()).toISOString()).run();
      }
      return new Response(JSON.stringify({ message: "\u6DFB\u52A0\u6210\u529F" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "\u6DFB\u52A0\u5230\u8D2D\u7269\u8F66\u5931\u8D25", details: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (path === "/api/cart/remove" && request.method === "POST") {
    try {
      const { productId } = await request.json();
      await env.DB.prepare(
        "DELETE FROM carts WHERE user_id = ? AND product_id = ?"
      ).bind(userId, productId).run();
      return new Response(JSON.stringify({ message: "\u79FB\u9664\u6210\u529F" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "\u4ECE\u8D2D\u7269\u8F66\u79FB\u9664\u5931\u8D25", details: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (path === "/api/cart/update" && request.method === "POST") {
    try {
      const { productId, quantity } = await request.json();
      await env.DB.prepare(
        "UPDATE carts SET quantity = ? WHERE user_id = ? AND product_id = ?"
      ).bind(quantity, userId, productId).run();
      return new Response(JSON.stringify({ message: "\u66F4\u65B0\u6210\u529F" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "\u66F4\u65B0\u8D2D\u7269\u8F66\u5931\u8D25", details: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (path === "/api/cart/clear" && request.method === "POST") {
    try {
      await env.DB.prepare(
        "DELETE FROM carts WHERE user_id = ?"
      ).bind(userId).run();
      return new Response(JSON.stringify({ message: "\u6E05\u7A7A\u6210\u529F" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "\u6E05\u7A7A\u8D2D\u7269\u8F66\u5931\u8D25", details: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  return new Response("Not Found", { status: 404 });
}, "handleCartOperations");
var handleUserCenter = /* @__PURE__ */ __name(async (request, env) => {
  const url = new URL(request.url);
  const path = url.pathname;
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "\u672A\u6388\u6743\u8BBF\u95EE" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const token = authHeader.split(" ")[1];
  const decoded = JSON.parse(atob(token));
  const userId = decoded.userId;
  if (path === "/api/user/profile" && request.method === "GET") {
    try {
      const user = await env.DB.prepare(
        "SELECT user_id, username, email, created_at FROM users WHERE user_id = ?"
      ).bind(userId).first();
      if (!user) {
        return new Response(JSON.stringify({ error: "\u7528\u6237\u4E0D\u5B58\u5728" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify(user), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "\u83B7\u53D6\u7528\u6237\u4FE1\u606F\u5931\u8D25", details: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (path === "/api/user/profile" && request.method === "PUT") {
    try {
      const { username, email } = await request.json();
      await env.DB.prepare(
        "UPDATE users SET username = ?, email = ? WHERE user_id = ?"
      ).bind(username, email, userId).run();
      return new Response(JSON.stringify({ message: "\u66F4\u65B0\u6210\u529F" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "\u66F4\u65B0\u7528\u6237\u4FE1\u606F\u5931\u8D25", details: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (path === "/api/user/password" && request.method === "PUT") {
    try {
      const { oldPassword, newPassword } = await request.json();
      const user = await env.DB.prepare(
        "SELECT * FROM users WHERE user_id = ? AND password_hash = ?"
      ).bind(userId, oldPassword).first();
      if (!user) {
        return new Response(JSON.stringify({ error: "\u65E7\u5BC6\u7801\u9519\u8BEF" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      await env.DB.prepare(
        "UPDATE users SET password_hash = ? WHERE user_id = ?"
      ).bind(newPassword, userId).run();
      return new Response(JSON.stringify({ message: "\u5BC6\u7801\u66F4\u65B0\u6210\u529F" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "\u66F4\u65B0\u5BC6\u7801\u5931\u8D25", details: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (path === "/api/addresses" && request.method === "GET") {
    try {
      const addresses = await env.DB.prepare(
        "SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC"
      ).bind(userId).all();
      return new Response(JSON.stringify(addresses.results), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "\u83B7\u53D6\u5730\u5740\u5217\u8868\u5931\u8D25", details: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (path === "/api/addresses" && request.method === "POST") {
    try {
      const addressData = await request.json();
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      if (addressData.is_default) {
        await env.DB.prepare(
          "UPDATE user_addresses SET is_default = 0 WHERE user_id = ?"
        ).bind(userId).run();
      }
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
      return new Response(JSON.stringify({ message: "\u6DFB\u52A0\u5730\u5740\u6210\u529F" }), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "\u6DFB\u52A0\u5730\u5740\u5931\u8D25", details: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (path.match(/\/api\/addresses\/\d+$/) && request.method === "PUT") {
    try {
      const addressId = path.split("/").pop();
      const addressData = await request.json();
      if (addressData.is_default) {
        await env.DB.prepare(
          "UPDATE user_addresses SET is_default = 0 WHERE user_id = ?"
        ).bind(userId).run();
      }
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
      return new Response(JSON.stringify({ message: "\u66F4\u65B0\u5730\u5740\u6210\u529F" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "\u66F4\u65B0\u5730\u5740\u5931\u8D25", details: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (path.match(/\/api\/addresses\/\d+$/) && request.method === "DELETE") {
    try {
      const addressId = path.split("/").pop();
      await env.DB.prepare(
        "DELETE FROM user_addresses WHERE address_id = ? AND user_id = ?"
      ).bind(addressId, userId).run();
      return new Response(JSON.stringify({ message: "\u5220\u9664\u5730\u5740\u6210\u529F" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "\u5220\u9664\u5730\u5740\u5931\u8D25", details: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  return new Response("Not Found", { status: 404 });
}, "handleUserCenter");
var handleOrders = /* @__PURE__ */ __name(async (request, env) => {
  const url = new URL(request.url);
  const path = url.pathname;
  if (path === "/api/orders" && request.method === "POST") {
    try {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "\u672A\u6388\u6743\u8BBF\u95EE" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      const token = authHeader.split(" ")[1];
      const decoded = JSON.parse(atob(token));
      const userId = decoded.userId;
      const { items, shippingInfo, totalAmount } = await request.json();
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      const orderResult = await env.DB.prepare(
        "INSERT INTO orders (user_id, total_amount, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
      ).bind(userId, totalAmount, "pending", timestamp, timestamp).run();
      const orderId = orderResult.meta.last_row_id;
      for (const item of items) {
        await env.DB.prepare(
          "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)"
        ).bind(orderId, item.productId, item.quantity, item.price).run();
        await env.DB.prepare(
          "UPDATE products SET stock = stock - ? WHERE product_id = ?"
        ).bind(item.quantity, item.productId).run();
      }
      return new Response(JSON.stringify({
        message: "\u8BA2\u5355\u521B\u5EFA\u6210\u529F",
        orderId,
        orderNumber: `ORD${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1e3)}`
      }), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "\u521B\u5EFA\u8BA2\u5355\u5931\u8D25", details: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (path === "/api/orders" && request.method === "GET") {
    try {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "\u672A\u6388\u6743\u8BBF\u95EE" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      const token = authHeader.split(" ")[1];
      const decoded = JSON.parse(atob(token));
      const userId = decoded.userId;
      const orders = await env.DB.prepare(
        "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC"
      ).bind(userId).all();
      return new Response(JSON.stringify(orders.results), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "\u83B7\u53D6\u8BA2\u5355\u5217\u8868\u5931\u8D25", details: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (path.match(/\/api\/orders\/\d+$/) && request.method === "GET") {
    try {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "\u672A\u6388\u6743\u8BBF\u95EE" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      const token = authHeader.split(" ")[1];
      const decoded = JSON.parse(atob(token));
      const userId = decoded.userId;
      const orderId = path.split("/").pop();
      const order = await env.DB.prepare(
        "SELECT * FROM orders WHERE order_id = ? AND user_id = ?"
      ).bind(orderId, userId).first();
      if (!order) {
        return new Response(JSON.stringify({ error: "\u8BA2\u5355\u4E0D\u5B58\u5728\u6216\u65E0\u6743\u8BBF\u95EE" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }
      const orderItems = await env.DB.prepare(
        `SELECT oi.*, p.name, p.image_filename 
                FROM order_items oi 
                JOIN products p ON oi.product_id = p.product_id 
                WHERE oi.order_id = ?`
      ).bind(orderId).all();
      const itemsWithImages = orderItems.results.map((item) => {
        const imageUrl = `https://${env.R2_DOMAIN}/image/Goods/${item.image_filename}`;
        return { ...item, image_url: imageUrl };
      });
      return new Response(JSON.stringify({
        order,
        items: itemsWithImages
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "\u83B7\u53D6\u8BA2\u5355\u8BE6\u60C5\u5931\u8D25", details: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  return new Response("Not Found", { status: 404 });
}, "handleOrders");
var handleImageRequest = /* @__PURE__ */ __name(async (request, env) => {
  const url = new URL(request.url);
  const path = url.pathname;
  if (path.startsWith("/image/")) {
    try {
      const imagePath = path.substring(1);
      const object = await env.BUCKET.get(imagePath);
      if (!object) {
        return new Response("Image not found", { status: 404 });
      }
      const headers = new Headers();
      headers.set("Content-Type", object.httpMetadata.contentType || "image/jpeg");
      headers.set("Cache-Control", "public, max-age=31536000");
      return new Response(object.body, { headers });
    } catch (error) {
      return new Response("Error fetching image: " + error.message, { status: 500 });
    }
  }
  return new Response("Not Found", { status: 404 });
}, "handleImageRequest");
var liubaotea_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    try {
      let response;
      if (url.pathname.startsWith("/api/products")) {
        response = await handleProducts(request, env);
      } else if (url.pathname.startsWith("/api/cart")) {
        response = await handleCartOperations(request, env);
      } else if (url.pathname.startsWith("/api/orders")) {
        response = await handleOrders(request, env);
      } else if (url.pathname.startsWith("/api/user/") || url.pathname.startsWith("/api/addresses")) {
        response = await handleUserCenter(request, env);
      } else if (["/api/register", "/api/login", "/api/user"].includes(url.pathname)) {
        response = await handleUserAuth(request, env);
      } else if (url.pathname.startsWith("/image/")) {
        return await handleImageRequest(request, env);
      } else {
        return new Response("Not Found", {
          status: 404,
          headers: corsHeaders
        });
      }
      return new Response(response.body, {
        status: response.status,
        headers: { ...corsHeaders, ...response.headers }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "\u670D\u52A1\u5668\u9519\u8BEF",
        details: error.message
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};
export {
  liubaotea_default as default
};
//# sourceMappingURL=liubaotea.js.map
