const db = require('../database/connection');
const { v4: uuidv4 } = require('uuid');

class CategoryController {
  // Get all categories for a store
  async getCategories(req, res, next) {
    try {
      const { store } = req;
      const { parent_id } = req.query;

      let query = `
        SELECT id, name, slug, description, parent_id, image_url, sort_order, is_active, created_at
        FROM categories
        WHERE store_id = $1 AND is_active = true
      `;
      
      let params = [store.id];

      if (parent_id) {
        query += ' AND parent_id = $2';
        params.push(parent_id);
      } else {
        query += ' AND parent_id IS NULL';
      }

      query += ' ORDER BY sort_order, name';

      const result = await db.query(query, params);
      res.json(result.rows);
    } catch (error) {
      next(error);
    }
  }

  // Get single category
  async getCategory(req, res, next) {
    try {
      const { store } = req;
      const { categoryId } = req.params;

      const query = `
        SELECT id, name, slug, description, parent_id, image_url, sort_order, is_active, created_at
        FROM categories
        WHERE store_id = $1 AND id = $2
        LIMIT 1
      `;

      const result = await db.query(query, [store.id, categoryId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }

  // Create category (admin only)
  async createCategory(req, res, next) {
    try {
      const { store } = req;
      const { name, slug, description, parent_id, image_url, sort_order } = req.body;

      // Validate required fields
      if (!name || !slug) {
        return res.status(400).json({ 
          error: 'Name and slug are required' 
        });
      }

      // Check if slug already exists
      const slugCheck = await db.query(
        'SELECT id FROM categories WHERE store_id = $1 AND slug = $2 LIMIT 1',
        [store.id, slug]
      );

      if (slugCheck.rows.length > 0) {
        return res.status(409).json({ 
          error: 'Category with this slug already exists' 
        });
      }

      const query = `
        INSERT INTO categories (store_id, name, slug, description, parent_id, image_url, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const values = [
        store.id, name, slug, description, parent_id || null, image_url, sort_order || 0
      ];

      const result = await db.query(query, values);
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }

  // Update category (admin only)
  async updateCategory(req, res, next) {
    try {
      const { store } = req;
      const { categoryId } = req.params;
      const updates = req.body;

      // Build dynamic update query
      const allowedFields = ['name', 'slug', 'description', 'parent_id', 'image_url', 'sort_order', 'is_active'];
      
      const updateFields = [];
      const values = [];
      let paramCount = 0;

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
      values.push(store.id, categoryId);

      const query = `
        UPDATE categories 
        SET ${updateFields.join(', ')}
        WHERE store_id = $${paramCount + 1} AND id = $${paramCount + 2}
        RETURNING *
      `;

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }

  // Delete category (admin only)
  async deleteCategory(req, res, next) {
    try {
      const { store } = req;
      const { categoryId } = req.params;

      // Check if category has products
      const productCheck = await db.query(
        'SELECT COUNT(*) FROM products WHERE category_id = $1',
        [categoryId]
      );

      if (parseInt(productCheck.rows[0].count) > 0) {
        return res.status(409).json({ 
          error: 'Cannot delete category with existing products' 
        });
      }

      // Check if category has subcategories
      const subcategoryCheck = await db.query(
        'SELECT COUNT(*) FROM categories WHERE parent_id = $1',
        [categoryId]
      );

      if (parseInt(subcategoryCheck.rows[0].count) > 0) {
        return res.status(409).json({ 
          error: 'Cannot delete category with subcategories' 
        });
      }

      const query = `
        DELETE FROM categories
        WHERE store_id = $1 AND id = $2
        RETURNING id
      `;

      const result = await db.query(query, [store.id, categoryId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CategoryController();