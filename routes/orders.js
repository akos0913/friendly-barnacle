const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken } = require('../middleware/auth');

// Protected routes
router.get('/', authenticateToken, orderController.getOrders);
router.post('/', authenticateToken, orderController.createOrder);
router.get('/:orderId', authenticateToken, orderController.getOrder);

module.exports = router;