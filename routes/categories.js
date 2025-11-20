const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticateToken } = require('../middleware/auth');
const { requireStoreAdmin } = require('../middleware/storeMiddleware');

// Public routes
router.get('/', categoryController.getCategories);
router.get('/:categoryId', categoryController.getCategory);

// Admin routes
router.post('/', authenticateToken, requireStoreAdmin, categoryController.createCategory);
router.put('/:categoryId', authenticateToken, requireStoreAdmin, categoryController.updateCategory);
router.delete('/:categoryId', authenticateToken, requireStoreAdmin, categoryController.deleteCategory);

module.exports = router;