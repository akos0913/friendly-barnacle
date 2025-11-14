const db = require('../database/connection');
const { v4: uuidv4 } = require('uuid');

class ProductController {
  // Get all products for a store
  async getProducts(req, res, next) {
    try {
      const { store } = req;
      const {
        page = 1,
        limit = 20,
        category,
        sortBy = 'created_at',
        sortOrder = 'DESC',
        minPrice,
        maxPrice,
        featured
      } = req.query;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE p.store_id = $1 AND p.is_active = true';
      let params = [store.id];
      let paramCount = 1;

      if (category) {
        paramCount++;
        whereClause += ` AND c.slug = $${paramCount}`;
        params.push(category);
      }

      if (minPrice) {
        paramCount++;
        whereClause += ` AND p.price >= $${paramCount}`;
        params.push(minPrice);
      }

      if (maxPrice) {
        paramCount++;
        whereClause += ` AND p.price <= $${paramCount}`;
        params.push(maxPrice);
      }

      if (featured === 'true') {
        whereClause += ' AND p.is_featured = true';
      }

      const countQuery = `
        SELECT COUNT(DISTINCT p.id)
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ${whereClause}
      `;

      const countResult = await db.query(countQuery, params);
      const totalCount = parseInt(countResult.rows[0].count);

      const query = `
        SELECT
          p.id, p.name, p.slug, p.description, p.short_description,
          p.sku, p.price, p.compare_at_price, p.inventory_quantity,
          p.is_featured, p.is_active, p.created_at, p.updated_at,
          c.name as category_name, c.slug as category_slug,
          (SELECT jsonb_agg(
            jsonb_build_object(
              'id', pi.id,
              'url', pi.url,
              'alt_text', pi.alt_text,
              'is_primary', pi.is_primary,
              'position', pi.position
            ) ORDER BY pi.position
          ) FROM product_images pi
          WHERE pi.product_id = p.id) as images
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      params.push(limit, offset);
      const result = await db.query(query, params);

      res.json({
        products: result.rows,
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

  // Search products
  async searchProducts(req, res, next) {
    try {
      const { store } = req;
      const { q, page = 1, limit = 20 } = req.query;

      if (!q) {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const offset = (page - 1) * limit;
      const searchTerm = `%${q}%`;

      const countQuery = `
        SELECT COUNT(DISTINCT p.id)
        FROM products p
        WHERE p.store_id = $1
        AND p.is_active = true
        AND (p.name ILIKE $2 OR p.description ILIKE $2 OR p.tags::text ILIKE $2)
      `;

      const countResult = await db.query(countQuery, [store.id, searchTerm]);
      const totalCount = parseInt(countResult.rows[0].count);

      const query = `
        SELECT
          p.id, p.name, p.slug, p.description, p.short_description,
          p.sku, p.price, p.compare_at_price, p.inventory_quantity,
          p.is_featured, p.is_active, p.created_at, p.updated_at,
          c.name as category_name, c.slug as category_slug,
          (SELECT jsonb_agg(
            jsonb_build_object(
              'id', pi.id,
              'url', pi.url,
              'alt_text', pi.alt_text,
              'is_primary', pi.is_primary,
              'position', pi.position
            ) ORDER BY pi.position
          ) FROM product_images pi
          WHERE pi.product_id = p.id) as images
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.store_id = $1
        AND p.is_active = true
        AND (p.name ILIKE $2 OR p.description ILIKE $2 OR p.tags::text ILIKE $2)
        ORDER BY
          CASE
            WHEN p.name ILIKE $2 THEN 1
            WHEN p.description ILIKE $2 THEN 2
            ELSE 3
          END,
          p.created_at DESC
        LIMIT $3 OFFSET $4
      `;

      const result = await db.query(query, [store.id, searchTerm, limit, offset]);

      res.json({
        products: result.rows,
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

  // Get featured products
  async getFeaturedProducts(req, res, next) {
    try {
      const { store } = req;
      const { limit = 10 } = req.query;

      const query = `
        SELECT
          p.id, p.name, p.slug, p.description, p.short_description,
          p.sku, p.price, p.compare_at_price, p.inventory_quantity,
          p.is_featured, p.is_active, p.created_at, p.updated_at,
          c.name as category_name, c.slug as category_slug,
          (SELECT jsonb_agg(
            jsonb_build_object(
              'id', pi.id,
              'url', pi.url,
              'alt_text', pi.alt_text,
              'is_primary', pi.is_primary,
              'position', pi.position
            ) ORDER BY pi.position
          ) FROM product_images pi
          WHERE pi.product_id = p.id) as images
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.store_id = $1
        AND p.is_active = true
        AND p.is_featured = true
        ORDER BY p.created_at DESC
        LIMIT $2
      `;

      const result = await db.query(query, [store.id, limit]);
      res.json(result.rows);
    } catch (error) {
      next(error);
    }
  }

  // Get products by category
  async getProductsByCategory(req, res, next) {
    try {
      const { store } = req;
      const { categorySlug } = req.params;
      const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;

      const offset = (page - 1) * limit;

      // First get the category
      const categoryQuery = `
        SELECT id, name, slug, description
        FROM categories
        WHERE store_id = $1 AND slug = $2 AND is_active = true
        LIMIT 1
      `;

      const categoryResult = await db.query(categoryQuery, [store.id, categorySlug]);

      if (categoryResult.rows.length === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }

      const category = categoryResult.rows[0];

      // Get products count
      const countQuery = `
        SELECT COUNT(DISTINCT p.id)
        FROM products p
        WHERE p.store_id = $1
        AND p.category_id = $2
        AND p.is_active = true
      `;

      const countResult = await db.query(countQuery, [store.id, category.id]);
      const totalCount = parseInt(countResult.rows[0].count);

      // Get products
      const query = `
        SELECT
          p.id, p.name, p.slug, p.description, p.short_description,
          p.sku, p.price, p.compare_at_price, p.inventory_quantity,
          p.is_featured, p.is_active, p.created_at, p.updated_at,
          c.name as category_name, c.slug as category_slug,
          (SELECT jsonb_agg(
            jsonb_build_object(
              'id', pi.id,
              'url', pi.url,
              'alt_text', pi.alt_text,
              'is_primary', pi.is_primary,
              'position', pi.position
            ) ORDER BY pi.position
          ) FROM product_images pi
          WHERE pi.product_id = p.id) as images
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.store_id = $1
        AND p.category_id = $2
        AND p.is_active = true
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $3 OFFSET $4
      `;

      const result = await db.query(query, [store.id, category.id, limit, offset]);

      res.json({
        category,
        products: result.rows,
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

  // Get single product
  async getProduct(req, res, next) {
    try {
      const { store } = req;
      const { productId } = req.params;

      const query = `
        SELECT
          p.id, p.name, p.slug, p.description, p.short_description,
          p.sku, p.price, p.compare_at_price, p.cost_price,
          p.weight, p.dimensions, p.inventory_quantity,
          p.track_inventory, p.allow_backorders,
          p.is_featured, p.is_active, p.meta_title, p.meta_description,
          p.tags, p.created_at, p.updated_at,
          c.name as category_name, c.slug as category_slug,
          (SELECT jsonb_agg(
            jsonb_build_object(
              'id', pi.id,
              'url', pi.url,
              'alt_text', pi.alt_text,
              'is_primary', pi.is_primary,
              'position', pi.position
            ) ORDER BY pi.position
          ) FROM product_images pi
          WHERE pi.product_id = p.id) as images,
          (SELECT jsonb_agg(
            jsonb_build_object(
              'id', pv.id,
              'name', pv.name,
              'sku', pv.sku,
              'price', pv.price,
              'compare_at_price', pv.compare_at_price,
              'inventory_quantity', pv.inventory_quantity,
              'weight', pv.weight,
              'dimensions', pv.dimensions,
              'options', pv.options,
              'is_active', pv.is_active
            )
          ) FROM product_variants pv
          WHERE pv.product_id = p.id AND pv.is_active = true) as variants
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.store_id = $1 AND p.id = $2
        LIMIT 1
      `;

      const result = await db.query(query, [store.id, productId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }

  // Create product (admin only)
  async createProduct(req, res, next) {
    try {
      const { store } = req;
      const {
        name,
        slug,
        description,
        short_description,
        category_id,
        sku,
        price,
        compare_at_price,
        cost_price,
        weight,
        dimensions,
        inventory_quantity,
        track_inventory,
        allow_backorders,
        is_featured,
        meta_title,
        meta_description,
        tags
      } = req.body;

      // Validate required fields
      if (!name || !slug || !sku || !price) {
        return res.status(400).json({
          error: 'Name, slug, SKU, and price are required'
        });
      }

      // Check if SKU already exists
      const skuCheck = await db.query(
        'SELECT id FROM products WHERE store_id = $1 AND sku = $2 LIMIT 1',
        [store.id, sku]
      );

      if (skuCheck.rows.length > 0) {
        return res.status(409).json({
          error: 'Product with this SKU already exists'
        });
      }

      const query = `
        INSERT INTO products (
          store_id, name, slug, description, short_description,
          category_id, sku, price, compare_at_price, cost_price,
          weight, dimensions, inventory_quantity, track_inventory,
          allow_backorders, is_featured, meta_title, meta_description, tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *
      `;

      const values = [
        store.id, name, slug, description, short_description,
        category_id, sku, price, compare_at_price, cost_price,
        weight, dimensions, inventory_quantity, track_inventory,
        allow_backorders, is_featured, meta_title, meta_description, tags
      ];

      const result = await db.query(query, values);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }

  // Update product (admin only)
  async updateProduct(req, res, next) {
    try {
      const { store } = req;
      const { productId } = req.params;
      const updates = req.body;

      // Build dynamic update query
      const allowedFields = [
        'name', 'slug', 'description', 'short_description', 'category_id',
        'sku', 'price', 'compare_at_price', 'cost_price', 'weight',
        'dimensions', 'inventory_quantity', 'track_inventory',
        'allow_backorders', 'is_featured', 'meta_title', 'meta_description', 'tags'
      ];

      const updateFields = [];
      const values = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = $${paramCount + 1}`);
          values.push(value);
          paramCount++;
        }
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          error: 'No valid fields to update'
        });
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(store.id, productId);

      const query = `
        UPDATE products
        SET ${updateFields.join(', ')}
        WHERE store_id = $${paramCount + 1} AND id = $${paramCount + 2}
        RETURNING *
      `;

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }

  // Delete product (admin only)
  async deleteProduct(req, res, next) {
    try {
      const { store } = req;
      const { productId } = req.params;

      const query = `
        UPDATE products
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE store_id = $1 AND id = $2
        RETURNING id
      `;

      const result = await db.query(query, [store.id, productId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // Upload product images (admin only)
  async uploadProductImages(req, res, next) {
    try {
      const { store } = req;
      const { productId } = req.params;

      // In a real implementation, you would handle file uploads here
      // For now, we'll simulate the response
      const images = [
        {
          id: uuidv4(),
          url: '/images/products/sample1.jpg',
          alt_text: 'Sample product image',
          is_primary: true,
          position: 1
        }
      ];

      res.status(201).json({ images });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController();