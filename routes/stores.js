const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');

// Public routes
router.get('/', storeController.getStores);
router.get('/:storeId', storeController.getStore);

module.exports = router;