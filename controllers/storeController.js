const db = require('../database/connection');

class StoreController {
  // Get all stores
  async getStores(req, res, next) {
    try {
      const { is_active = true } = req.query;

      const query = `
        SELECT id, name, subdomain, domain, description, logo_url,
               primary_color, secondary_color, accent_color, template,
               is_active, created_at
        FROM stores
        WHERE is_active = $1
        ORDER BY name
      `;

      const result = await db.query(query, [is_active]);
      res.json(result.rows);
    } catch (error) {
      next(error);
    }
  }

  // Get single store
  async getStore(req, res, next) {
    try {
      const { storeId } = req.params;

      const query = `
        SELECT id, name, subdomain, domain, description, logo_url,
               primary_color, secondary_color, accent_color, template,
               is_active, created_at
        FROM stores
        WHERE (id = $1 OR subdomain = $1 OR domain = $1) AND is_active = true
        LIMIT 1
      `;

      const result = await db.query(query, [storeId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Store not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StoreController();