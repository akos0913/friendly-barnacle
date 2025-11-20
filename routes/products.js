const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireStoreAdmin } = require('../middleware/storeMiddleware');
const productController = require('../controllers/productController');

// Public routes
router.get('/', productController.getProducts);
router.get('/search', productController.searchProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/category/:categorySlug', productController.getProductsByCategory);
router.get('/:productId', productController.getProduct);

// Admin routes
router.post('/', authenticateToken, requireStoreAdmin, productController.createProduct);
router.put('/:productId', authenticateToken, requireStoreAdmin, productController.updateProduct);
router.delete('/:productId', authenticateToken, requireStoreAdmin, productController.deleteProduct);
router.post('/:productId/images', authenticateToken, requireStoreAdmin, productController.uploadProductImages);

module.exports = router;
