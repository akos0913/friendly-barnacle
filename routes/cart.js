const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticateToken } = require('../middleware/auth');

// Cart routes
router.get('/', cartController.getCart);
router.post('/items', authenticateToken, cartController.addToCart);
router.put('/items/:itemId', authenticateToken, cartController.updateCartItem);
router.delete('/items/:itemId', authenticateToken, cartController.removeFromCart);
router.delete('/', authenticateToken, cartController.clearCart);

// Cart totals and validation
router.get('/totals', cartController.getCartTotals);
router.post('/validate', cartController.validateCart);

module.exports = router;