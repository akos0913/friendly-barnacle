const db = require('../database/connection');
const { v4: uuidv4 } = require('uuid');

class CartController {
  // Get or create cart
  async getCart(req, res, next) {
    try {
      const { store } = req;
      const userId = req.user?.id;
      const sessionId = req.headers['x-session-id'] || uuidv4();

      let cart;

      if (userId) {
        // Try to find existing cart for logged-in user
        const userCartQuery = `
          SELECT id, store_id, user_id, session_id, created_at, updated_at
          FROM shopping_carts
          WHERE store_id = $1 AND user_id = $2
          LIMIT 1
        `;
        
        const userCartResult = await db.query(userCartQuery, [store.id, userId]);
        
        if (userCartResult.rows.length > 0) {
          cart = userCartResult.rows[0];
        } else {
          // Create new cart for user
          const createCartQuery = `
            INSERT INTO shopping_carts (store_id, user_id, session_id)
            VALUES ($1, $2, $3)
            RETURNING *
          `;
          
          const createCartResult = await db.query(createCartQuery, [store.id, userId, sessionId]);
          cart = createCartResult.rows[0];
        }
      } else {
        // Use session-based cart for guest users
        const sessionCartQuery = `
          SELECT id, store_id, user_id, session_id, created_at, updated_at
          FROM shopping_carts
          WHERE store_id = $1 AND session_id = $2
          LIMIT 1
        `;
        
        const sessionCartResult = await db.query(sessionCartQuery, [store.id, sessionId]);
        
        if (sessionCartResult.rows.length > 0) {
          cart = sessionCartResult.rows[0];
        } else {
          // Create new cart for session
          const createCartQuery = `
            INSERT INTO shopping_carts (store_id, session_id)
            VALUES ($1, $2)
            RETURNING *
          `;
          
          const createCartResult = await db.query(createCartQuery, [store.id, sessionId]);
          cart = createCartResult.rows[0];
        }
      }

      // Get cart items with product details
      const itemsQuery = `
        SELECT 
          sci.id, sci.product_id, sci.variant_id, sci.quantity, sci.price,
          p.name as product_name, p.slug as product_slug,
          p.sku, p.price as product_price,
          (
            SELECT url FROM product_images 
            WHERE product_id = p.id AND is_primary = true 
            LIMIT 1
          ) as image_url,
          pv.name as variant_name,
          pv.sku as variant_sku
        FROM shopping_cart_items sci
        JOIN products p ON sci.product_id = p.id
        LEFT JOIN product_variants pv ON sci.variant_id = pv.id
        WHERE sci.cart_id = $1
        ORDER BY sci.created_at
      `;

      const itemsResult = await db.query(itemsQuery, [cart.id]);

      res.json({
        cart: {
          id: cart.id,
          store_id: cart.store_id,
          user_id: cart.user_id,
          session_id: cart.session_id,
          created_at: cart.created_at,
          updated_at: cart.updated_at
        },
        items: itemsResult.rows
      });
    } catch (error) {
      next(error);
    }
  }

  // Add item to cart
  async addToCart(req, res, next) {
    try {
      const { store } = req;
      const userId = req.user?.id;
      const { productId, variantId, quantity = 1 } = req.body;

      if (!productId || !quantity) {
        return res.status(400).json({ 
          error: 'Product ID and quantity are required' 
        });
      }

      if (quantity < 1) {
        return res.status(400).json({ 
          error: 'Quantity must be at least 1' 
        });
      }

      // Get or create cart
      const cartResult = await this._getOrCreateCart(store.id, userId);
      const cart = cartResult.rows[0];

      // Verify product exists and is active
      const productQuery = `
        SELECT id, price, inventory_quantity, track_inventory, allow_backorders
        FROM products
        WHERE id = $1 AND store_id = $2 AND is_active = true
        LIMIT 1
      `;

      const productResult = await db.query(productQuery, [productId, store.id]);
      
      if (productResult.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const product = productResult.rows[0];

      // Check inventory if tracking is enabled
      if (product.track_inventory && !product.allow_backorders) {
        if (product.inventory_quantity < quantity) {
          return res.status(400).json({ 
            error: 'Insufficient inventory available' 
          });
        }
      }

      // Check if item already exists in cart
      const existingItemQuery = `
        SELECT id, quantity FROM shopping_cart_items
        WHERE cart_id = $1 AND product_id = $2 AND variant_id = $3
        LIMIT 1
      `;

      const existingItemResult = await db.query(existingItemQuery, [
        cart.id, productId, variantId || null
      ]);

      let cartItem;

      if (existingItemResult.rows.length > 0) {
        // Update existing item quantity
        const existingItem = existingItemResult.rows[0];
        const newQuantity = existingItem.quantity + quantity;

        // Check inventory for updated quantity
        if (product.track_inventory && !product.allow_backorders) {
          if (product.inventory_quantity < newQuantity) {
            return res.status(400).json({ 
              error: 'Insufficient inventory available for updated quantity' 
            });
          }
        }

        const updateQuery = `
          UPDATE shopping_cart_items
          SET quantity = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING *
        `;

        const updateResult = await db.query(updateQuery, [
          newQuantity, existingItem.id
        ]);
        cartItem = updateResult.rows[0];
      } else {
        // Add new item to cart
        const insertQuery = `
          INSERT INTO shopping_cart_items (cart_id, product_id, variant_id, quantity, price)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;

        const insertResult = await db.query(insertQuery, [
          cart.id, productId, variantId || null, quantity, product.price
        ]);
        cartItem = insertResult.rows[0];
      }

      res.status(201).json(cartItem);
    } catch (error) {
      next(error);
    }
  }

  // Update cart item quantity
  async updateCartItem(req, res, next) {
    try {
      const { store } = req;
      const { itemId } = req.params;
      const { quantity } = req.body;

      if (!quantity || quantity < 1) {
        return res.status(400).json({ 
          error: 'Quantity must be at least 1' 
        });
      }

      // Get cart item with product details
      const itemQuery = `
        SELECT sci.id, sci.product_id, sci.quantity, p.track_inventory, 
               p.allow_backorders, p.inventory_quantity
        FROM shopping_cart_items sci
        JOIN products p ON sci.product_id = p.id
        JOIN shopping_carts sc ON sci.cart_id = sc.id
        WHERE sci.id = $1 AND sc.store_id = $2
        LIMIT 1
      `;

      const itemResult = await db.query(itemQuery, [itemId, store.id]);

      if (itemResult.rows.length === 0) {
        return res.status(404).json({ error: 'Cart item not found' });
      }

      const item = itemResult.rows[0];

      // Check inventory if tracking is enabled
      if (item.track_inventory && !item.allow_backorders) {
        if (item.inventory_quantity < quantity) {
          return res.status(400).json({ 
            error: 'Insufficient inventory available' 
          });
        }
      }

      // Update item quantity
      const updateQuery = `
        UPDATE shopping_cart_items
        SET quantity = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;

      const updateResult = await db.query(updateQuery, [quantity, itemId]);

      res.json(updateResult.rows[0]);
    } catch (error) {
      next(error);
    }
  }

  // Remove item from cart
  async removeFromCart(req, res, next) {
    try {
      const { store } = req;
      const { itemId } = req.params;

      const query = `
        DELETE FROM shopping_cart_items
        WHERE id = $1 AND cart_id IN (
          SELECT id FROM shopping_carts WHERE store_id = $2
        )
        RETURNING id
      `;

      const result = await db.query(query, [itemId, store.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Cart item not found' });
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // Clear cart
  async clearCart(req, res, next) {
    try {
      const { store } = req;
      const userId = req.user?.id;

      const query = `
        DELETE FROM shopping_cart_items
        WHERE cart_id IN (
          SELECT id FROM shopping_carts 
          WHERE store_id = $1 AND (user_id = $2 OR session_id = $3)
        )
      `;

      const sessionId = req.headers['x-session-id'];
      await db.query(query, [store.id, userId, sessionId]);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // Get cart totals
  async getCartTotals(req, res, next) {
    try {
      const { store } = req;
      const userId = req.user?.id;

      const cartResult = await this._getOrCreateCart(store.id, userId);
      
      if (cartResult.rows.length === 0) {
        return res.json({
          subtotal: 0,
          total_items: 0,
          items: []
        });
      }

      const cart = cartResult.rows[0];

      const totalsQuery = `
        SELECT 
          SUM(sci.quantity * sci.price) as subtotal,
          COUNT(sci.id) as total_items,
          jsonb_agg(
            jsonb_build_object(
              'id', sci.id,
              'product_id', sci.product_id,
              'quantity', sci.quantity,
              'price', sci.price,
              'total', sci.quantity * sci.price
            )
          ) as items
        FROM shopping_cart_items sci
        WHERE sci.cart_id = $1
      `;

      const result = await db.query(totalsQuery, [cart.id]);
      const totals = result.rows[0];

      res.json({
        subtotal: parseFloat(totals.subtotal) || 0,
        total_items: parseInt(totals.total_items) || 0,
        items: totals.items || []
      });
    } catch (error) {
      next(error);
    }
  }

  // Validate cart (check inventory, etc.)
  async validateCart(req, res, next) {
    try {
      const { store } = req;
      const userId = req.user?.id;

      const cartResult = await this._getOrCreateCart(store.id, userId);
      
      if (cartResult.rows.length === 0) {
        return res.json({ valid: true, issues: [] });
      }

      const cart = cartResult.rows[0];

      const validationQuery = `
        SELECT 
          sci.id,
          p.name as product_name,
          sci.quantity,
          p.inventory_quantity,
          p.track_inventory,
          p.allow_backorders,
          p.is_active,
          CASE 
            WHEN NOT p.is_active THEN 'Product no longer available'
            WHEN p.track_inventory AND NOT p.allow_backorders AND sci.quantity > p.inventory_quantity 
            THEN 'Insufficient inventory'
            ELSE NULL
          END as issue
        FROM shopping_cart_items sci
        JOIN products p ON sci.product_id = p.id
        WHERE sci.cart_id = $1
      `;

      const result = await db.query(validationQuery, [cart.id]);
      const issues = result.rows.filter(item => item.issue !== null);

      res.json({
        valid: issues.length === 0,
        issues: issues.map(item => ({
          item_id: item.id,
          product_name: item.product_name,
          issue: item.issue
        }))
      });
    } catch (error) {
      next(error);
    }
  }

  // Helper method to get or create cart
  async _getOrCreateCart(storeId, userId) {
    const sessionId = uuidv4();
    
    const query = `
      WITH existing_cart AS (
        SELECT id, store_id, user_id, session_id, created_at, updated_at
        FROM shopping_carts
        WHERE store_id = $1 AND (user_id = $2 OR ($2 IS NULL AND session_id = $3))
        LIMIT 1
      ),
      new_cart AS (
        INSERT INTO shopping_carts (store_id, user_id, session_id)
        SELECT $1, $2, $3
        WHERE NOT EXISTS (SELECT 1 FROM existing_cart)
        RETURNING id, store_id, user_id, session_id, created_at, updated_at
      )
      SELECT * FROM existing_cart
      UNION ALL
      SELECT * FROM new_cart
    `;

    return db.query(query, [storeId, userId, sessionId]);
  }
}

module.exports = new CartController();