const db = require('../database/connection');
const { v4: uuidv4 } = require('uuid');

class UserController {
  // Get user's addresses
  async getAddresses(req, res, next) {
    try {
      const { user } = req;

      const query = `
        SELECT 
          id, first_name, last_name, company,
          address_line1, address_line2, city, state_province,
          postal_code, country, phone,
          is_default_shipping, is_default_billing,
          created_at, updated_at
        FROM user_addresses
        WHERE user_id = $1
        ORDER BY is_default_shipping DESC, is_default_billing DESC, created_at
      `;

      const result = await db.query(query, [user.id]);
      res.json(result.rows);
    } catch (error) {
      next(error);
    }
  }

  // Create address
  async createAddress(req, res, next) {
    try {
      const { user } = req;
      const {
        first_name,
        last_name,
        company,
        address_line1,
        address_line2,
        city,
        state_province,
        postal_code,
        country,
        phone,
        is_default_shipping = false,
        is_default_billing = false
      } = req.body;

      // Validate required fields
      if (!first_name || !last_name || !address_line1 || !city || !state_province || !postal_code || !country) {
        return res.status(400).json({ 
          error: 'First name, last name, address line 1, city, state/province, postal code, and country are required' 
        });
      }

      // If setting as default, clear other defaults
      if (is_default_shipping) {
        await db.query(
          'UPDATE user_addresses SET is_default_shipping = false WHERE user_id = $1',
          [user.id]
        );
      }

      if (is_default_billing) {
        await db.query(
          'UPDATE user_addresses SET is_default_billing = false WHERE user_id = $1',
          [user.id]
        );
      }

      const query = `
        INSERT INTO user_addresses (
          user_id, first_name, last_name, company,
          address_line1, address_line2, city, state_province,
          postal_code, country, phone,
          is_default_shipping, is_default_billing
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNing *
      `;

      const values = [
        user.id, first_name, last_name, company,
        address_line1, address_line2, city, state_province,
        postal_code, country, phone,
        is_default_shipping, is_default_billing
      ];

      const result = await db.query(query, values);
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }

  // Update address
  async updateAddress(req, res, next) {
    try {
      const { user } = req;
      const { addressId } = req.params;
      const updates = req.body;

      // Check if address exists and belongs to user
      const checkQuery = `
        SELECT id FROM user_addresses 
        WHERE id = $1 AND user_id = $2
        LIMIT 1
      `;

      const checkResult = await db.query(checkQuery, [addressId, user.id]);

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Address not found' });
      }

      // If setting as default, clear other defaults
      if (updates.is_default_shipping) {
        await db.query(
          'UPDATE user_addresses SET is_default_shipping = false WHERE user_id = $1',
          [user.id]
        );
      }

      if (updates.is_default_billing) {
        await db.query(
          'UPDATE user_addresses SET is_default_billing = false WHERE user_id = $1',
          [user.id]
        );
      }

      // Build dynamic update query
      const allowedFields = [
        'first_name', 'last_name', 'company', 'address_line1', 'address_line2',
        'city', 'state_province', 'postal_code', 'country', 'phone',
        'is_default_shipping', 'is_default_billing'
      ];
      
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
      values.push(addressId);

      const query = `
        UPDATE user_addresses 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount + 1}
        RETURNING *
      `;

      const result = await db.query(query, values);
      res.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }

  // Delete address
  async deleteAddress(req, res, next) {
    try {
      const { user } = req;
      const { addressId } = req.params;

      const query = `
        DELETE FROM user_addresses
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `;

      const result = await db.query(query, [addressId, user.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Address not found' });
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();