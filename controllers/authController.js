const bcrypt = require('bcryptjs');
const db = require('../database/connection');
const { generateTokens, verifyRefreshToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

class AuthController {
  async register(req, res, next) {
    try {
      const { email, password, firstName, lastName, phone } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ 
          error: 'Email and password are required' 
        });
      }

      if (password.length < 6) {
        return res.status(400).json({ 
          error: 'Password must be at least 6 characters long' 
        });
      }

      // Check if user already exists
      const existingUser = await db.query(
        'SELECT id FROM users WHERE email = $1 LIMIT 1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({ 
          error: 'User with this email already exists' 
        });
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const query = `
        INSERT INTO users (email, password_hash, first_name, last_name, phone)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, first_name, last_name, phone, email_verified, is_active, created_at
      `;

      const result = await db.query(query, [
        email, passwordHash, firstName, lastName, phone
      ]);

      const user = result.rows[0];
      const tokens = generateTokens(user.id);

      res.status(201).json({
        user,
        tokens
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ 
          error: 'Email and password are required' 
        });
      }

      // Find user
      const query = `
        SELECT id, email, password_hash, first_name, last_name, phone,
               email_verified, is_active, created_at
        FROM users 
        WHERE email = $1 AND is_active = true
        LIMIT 1
      `;

      const result = await db.query(query, [email]);

      if (result.rows.length === 0) {
        return res.status(401).json({ 
          error: 'Invalid email or password' 
        });
      }

      const user = result.rows[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ 
          error: 'Invalid email or password' 
        });
      }

      // Generate tokens
      const tokens = generateTokens(user.id);

      // Remove password hash from response
      delete user.password_hash;

      res.json({
        user,
        tokens
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ 
          error: 'Refresh token is required' 
        });
      }

      const decoded = verifyRefreshToken(refreshToken);

      if (!decoded) {
        return res.status(401).json({ 
          error: 'Invalid refresh token' 
        });
      }

      // Verify user still exists and is active
      const query = `
        SELECT id, email, first_name, last_name, phone,
               email_verified, is_active, created_at
        FROM users 
        WHERE id = $1 AND is_active = true
        LIMIT 1
      `;

      const result = await db.query(query, [decoded.userId]);

      if (result.rows.length === 0) {
        return res.status(401).json({ 
          error: 'User not found or inactive' 
        });
      }

      const tokens = generateTokens(decoded.userId);

      res.json({ tokens });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ 
          error: 'Email is required' 
        });
      }

      // In a real implementation, you would:
      // 1. Generate a reset token
      // 2. Store it in the database with expiration
      // 3. Send an email with the reset link

      res.json({ 
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ 
          error: 'Token and new password are required' 
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ 
          error: 'Password must be at least 6 characters long' 
        });
      }

      // In a real implementation, you would:
      // 1. Verify the reset token
      // 2. Update the user's password
      // 3. Invalidate the reset token

      res.json({ 
        message: 'Password has been reset successfully' 
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      // In a real implementation, you might:
      // 1. Add the token to a blacklist
      // 2. Clear refresh tokens from database
      // 3. Log the logout event

      res.json({ 
        message: 'Logged out successfully' 
      });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      const { user } = req;
      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const { user } = req;
      const { firstName, lastName, phone } = req.body;

      const updateFields = [];
      const values = [];
      let paramCount = 0;

      if (firstName !== undefined) {
        updateFields.push(`first_name = $${paramCount + 1}`);
        values.push(firstName);
        paramCount++;
      }

      if (lastName !== undefined) {
        updateFields.push(`last_name = $${paramCount + 1}`);
        values.push(lastName);
        paramCount++;
      }

      if (phone !== undefined) {
        updateFields.push(`phone = $${paramCount + 1}`);
        values.push(phone);
        paramCount++;
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ 
          error: 'No fields to update' 
        });
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(user.id);

      const query = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount + 1}
        RETURNING id, email, first_name, last_name, phone, email_verified, is_active, created_at
      `;

      const result = await db.query(query, values);
      res.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { user } = req;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ 
          error: 'Current password and new password are required' 
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ 
          error: 'New password must be at least 6 characters long' 
        });
      }

      // Get current password hash
      const query = `
        SELECT password_hash FROM users WHERE id = $1 LIMIT 1
      `;

      const result = await db.query(query, [user.id]);
      const currentUser = result.rows[0];

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, currentUser.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ 
          error: 'Current password is incorrect' 
        });
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      const updateQuery = `
        UPDATE users 
        SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;

      await db.query(updateQuery, [newPasswordHash, user.id]);

      res.json({ 
        message: 'Password changed successfully' 
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();