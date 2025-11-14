const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../database/connection');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required' 
      });
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Verify user still exists and is active
    const query = `
      SELECT id, email, first_name, last_name, phone, email_verified, is_active
      FROM users 
      WHERE id = $1 AND is_active = true
      LIMIT 1
    `;
    
    const result = await db.query(query, [decoded.userId]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid or expired token' 
      });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired' 
      });
    }

    console.error('Authentication error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
};

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId }, 
    config.jwt.secret, 
    { expiresIn: config.jwt.expiresIn }
  );
  
  const refreshToken = jwt.sign(
    { userId }, 
    config.jwt.refreshSecret, 
    { expiresIn: config.jwt.refreshExpiresIn }
  );

  return { accessToken, refreshToken };
};

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.refreshSecret);
  } catch (error) {
    return null;
  }
};

module.exports = {
  authenticateToken,
  generateTokens,
  verifyRefreshToken
};