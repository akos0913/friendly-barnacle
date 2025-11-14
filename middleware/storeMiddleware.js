const db = require('../database/connection');

const extractStore = async (req, res, next) => {
  try {
    const { storeDomain } = req.params;
    
    if (!storeDomain) {
      return res.status(400).json({ 
        error: 'Store domain is required' 
      });
    }

    // Query store by subdomain or domain
    const query = `
      SELECT id, name, subdomain, domain, description, logo_url,
             primary_color, secondary_color, accent_color, template,
             is_active, created_at
      FROM stores 
      WHERE subdomain = $1 OR domain = $1
      LIMIT 1
    `;
    
    const result = await db.query(query, [storeDomain]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Store not found' 
      });
    }

    const store = result.rows[0];
    
    if (!store.is_active) {
      return res.status(403).json({ 
        error: 'Store is inactive' 
      });
    }

    // Attach store to request object
    req.store = store;
    
    // Add store context to response headers
    res.setHeader('X-Store-ID', store.id);
    res.setHeader('X-Store-Name', store.name);
    
    next();
  } catch (error) {
    console.error('Store middleware error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
};

const requireStoreAdmin = async (req, res, next) => {
  try {
    const { store } = req;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }

    const query = `
      SELECT sa.id, sa.role, sa.permissions
      FROM store_admins sa
      WHERE sa.store_id = $1 AND sa.user_id = $2
      LIMIT 1
    `;
    
    const result = await db.query(query, [store.id, userId]);
    
    if (result.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Store admin access required' 
      });
    }

    req.storeAdmin = result.rows[0];
    next();
  } catch (error) {
    console.error('Store admin middleware error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
};

module.exports = {
  extractStore,
  requireStoreAdmin
};