const db = require('../database/connection');
const { v4: uuidv4 } = require('uuid');

class OrderController {
  // Get user's orders for a store
  async getOrders(req, res, next) {
    try {
      const { store } = req;
      const { user } = req;
      const { page = 1, limit = 10, status } = req.query;

      const offset = (page - 1) * limit;

      let whereClause = 'WHERE o.store_id = $1 AND o.user_id = $2';
      let params = [store.id, user.id];

      if (status) {
        whereClause += ' AND o.status = $3';
        params.push(status);
      }

      const countQuery = `
        SELECT COUNT(DISTINCT o.id)
        FROM orders o
        ${whereClause}
      `;

      const countResult = await db.query(countQuery, params);
      const totalCount = parseInt(countResult.rows[0].count);

      const query = `
        SELECT 
          o.id, o.order_number, o.status, o.subtotal, o.tax_amount,
          o.shipping_amount, o.discount_amount, o.total_amount, o.currency,
          o.created_at, o.updated_at,
          COUNT(oi.id) as item_count
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        ${whereClause}
        GROUP BY o.id
        ORDER BY o.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;

      params.push(limit, offset);
      const result = await db.query(query, params);

      res.json({
        orders: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get single order
  async getOrder(req, res, next) {
    try {
      const { store } = req;
      const { user } = req;
      const { orderId } = req.params;

      const orderQuery = `
        SELECT 
          o.id, o.order_number, o.status, o.subtotal, o.tax_amount,
          o.shipping_amount, o.discount_amount, o.total_amount, o.currency,
          o.shipping_address, o.billing_address, o.notes,
          o.created_at, o.updated_at
        FROM orders o
        WHERE o.store_id = $1 AND o.id = $2 AND o.user_id = $3
        LIMIT 1
      `;

      const orderResult = await db.query(orderQuery, [store.id, orderId, user.id]);

      if (orderResult.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = orderResult.rows[0];

      // Get order items
      const itemsQuery = `
        SELECT 
          oi.id, oi.product_id, oi.variant_id, oi.product_name, oi.product_sku,
          oi.quantity, oi.unit_price, oi.total_price,
          (
            SELECT url FROM product_images 
            WHERE product_id = oi.product_id AND is_primary = true 
            LIMIT 1
          ) as image_url
        FROM order_items oi
        WHERE oi.order_id = $1
      `;

      const itemsResult = await db.query(itemsQuery, [orderId]);

      // Get payment transaction
      const paymentQuery = `
        SELECT 
          pt.id, pt.payment_method, pt.transaction_id, pt.amount,
          pt.currency, pt.status, pt.created_at
        FROM payment_transactions pt
        WHERE pt.order_id = $1
        ORDER BY pt.created_at DESC
        LIMIT 1
      `;

      const paymentResult = await db.query(paymentQuery, [orderId]);

      res.json({
        order: {
          ...order,
          items: itemsResult.rows,
          payment: paymentResult.rows[0] || null
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Create order
  async createOrder(req, res, next) {
    const client = await db.getClient();
    
    try {
      const { store } = req;
      const { user } = req;
      const {
        shipping_address,
        billing_address,
        payment_method,
        notes
      } = req.body;

      // Start transaction
      await client.query('BEGIN');

      // Get user's cart
      const cartQuery = `
        SELECT sc.id, sc.user_id
        FROM shopping_carts sc
        WHERE sc.store_id = $1 AND (sc.user_id = $2 OR sc.session_id = $3)
        ORDER BY sc.updated_at DESC
        LIMIT 1
      `;

      const sessionId = req.headers['x-session-id'];
      const cartResult = await client.query(cartQuery, [store.id, user.id, sessionId]);

      if (cartResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'No cart found' });
      }

      const cart = cartResult.rows[0];

      // Get cart items
      const cartItemsQuery = `
        SELECT 
          sci.product_id, sci.variant_id, sci.quantity, sci.price,
          p.name as product_name, p.sku as product_sku,
          p.inventory_quantity, p.track_inventory, p.allow_backorders
        FROM shopping_cart_items sci
        JOIN products p ON sci.product_id = p.id
        WHERE sci.cart_id = $1
      `;

      const cartItemsResult = await client.query(cartItemsQuery, [cart.id]);

      if (cartItemsResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Cart is empty' });
      }

      const cartItems = cartItemsResult.rows;

      // Validate inventory
      for (const item of cartItems) {
        if (item.track_inventory && !item.allow_backorders) {
          if (item.quantity > item.inventory_quantity) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
              error: `Insufficient inventory for ${item.product_name}` 
            });
          }
        }
      }

      // Calculate totals
      const subtotal = cartItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const tax_amount = subtotal * 0.08; // 8% tax rate
      const shipping_amount = subtotal >= 75 ? 0 : 9.99; // Free shipping over $75
      const discount_amount = 0;
      const total_amount = subtotal + tax_amount + shipping_amount - discount_amount;

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Create order
      const orderQuery = `
        INSERT INTO orders (
          store_id, user_id, order_number, subtotal, tax_amount,
          shipping_amount, discount_amount, total_amount, currency,
          shipping_address, billing_address, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNing *
      `;

      const orderValues = [
        store.id, user.id, orderNumber, subtotal, tax_amount,
        shipping_amount, discount_amount, total_amount, 'USD',
        JSON.stringify(shipping_address), JSON.stringify(billing_address), notes
      ];

      const orderResult = await client.query(orderQuery, orderValues);
      const order = orderResult.rows[0];

      // Create order items
      const orderItemsQuery = `
        INSERT INTO order_items (
          order_id, product_id, variant_id, product_name, product_sku,
          quantity, unit_price, total_price
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;

      for (const item of cartItems) {
        const totalPrice = item.quantity * item.price;
        await client.query(orderItemsQuery, [
          order.id, item.product_id, item.variant_id, item.product_name,
          item.product_sku, item.quantity, item.price, totalPrice
        ]);
      }

      // Update inventory
      const updateInventoryQuery = `
        UPDATE products 
        SET inventory_quantity = inventory_quantity - $1
        WHERE id = $2 AND track_inventory = true
      `;

      for (const item of cartItems) {
        if (item.track_inventory) {
          await client.query(updateInventoryQuery, [item.quantity, item.product_id]);
        }
      }

      // Create payment transaction (placeholder)
      const paymentQuery = `
        INSERT INTO payment_transactions (
          order_id, payment_method, amount, currency, status
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNing *
      `;

      const paymentResult = await client.query(paymentQuery, [
        order.id, payment_method, total_amount, 'USD', 'pending'
      ]);

      // Clear cart
      await client.query('DELETE FROM shopping_cart_items WHERE cart_id = $1', [cart.id]);

      // Commit transaction
      await client.query('COMMIT');

      res.status(201).json({
        order,
        items: cartItems,
        payment: paymentResult.rows[0]
      });

    } catch (error) {
      await client.query('ROLLBACK');
      next(error);
    } finally {
      client.release();
    }
  }
}

module.exports = new OrderController();