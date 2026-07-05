const express = require('express');
const router = express.Router();
const labelController = require('../controllers/label.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/types', protect, labelController.getAllLabelTypes);
router.get('/types/:itemId', protect, labelController.getLabelTypesByItem);
router.get('/stockable', protect, labelController.getStockableLabels);
router.get('/available', protect, labelController.getAvailableLabelsToTrack);
router.post('/add-stock', protect, labelController.addLabelStock);
router.put('/status', protect, labelController.updateStockableStatus);

router.post('/types', protect, labelController.createLabelType);
router.delete('/types/:id', protect, labelController.deleteLabelType);

module.exports = router;
