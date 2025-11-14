const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

// Protected routes
router.get('/addresses', authenticateToken, userController.getAddresses);
router.post('/addresses', authenticateToken, userController.createAddress);
router.put('/addresses/:addressId', authenticateToken, userController.updateAddress);
router.delete('/addresses/:addressId', authenticateToken, userController.deleteAddress);

module.exports = router;