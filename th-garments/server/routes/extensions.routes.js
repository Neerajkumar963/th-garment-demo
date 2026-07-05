const express = require('express');
const router = express.Router();
const { getExtensionsByItem, getAllExtensionTypes } = require('../controllers/extensions.controller');

router.get('/', getAllExtensionTypes);
router.get('/item/:itemId', getExtensionsByItem);

module.exports = router;
