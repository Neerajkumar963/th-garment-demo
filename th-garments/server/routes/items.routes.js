const express = require('express');
const router = express.Router();
const { 
    getAllItems, 
    createItem, 
    updateItem, 
    deleteItem,
    getDefaultMaterial,
    getArchivedItems,
    restoreItem
} = require('../controllers/items.controller');

router.get('/', getAllItems);
router.get('/archived', getArchivedItems);
router.get('/material/:itemId', getDefaultMaterial);
router.post('/', createItem);
router.put('/:id', updateItem);
router.put('/restore/:id', restoreItem);
router.delete('/:id', deleteItem);

module.exports = router;
