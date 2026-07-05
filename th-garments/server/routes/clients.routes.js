const express = require('express');
const router = express.Router();
const { requireFields } = require('../middleware/validate.middleware');
const { 
    getAllClients, 
    getClientById, 
    createClient, 
    updateClient, 
    deleteClient,
    getClientProducts,
    createClientProduct,
    updateClientProduct,
    deleteClientProduct,
    getClientAccount,
    getClientBalance,
    getAllProducts
} = require('../controllers/clients.controller');

// Main Client CRUD
router.get('/', getAllClients);
router.get('/all-products', getAllProducts);
router.get('/:id', getClientById);
router.post('/', requireFields(['name', 'org_name']), createClient);
router.put('/:id', requireFields(['name', 'org_name']), updateClient);
router.delete('/:id', deleteClient);

// Products Sub-resource
router.get('/:id/products', getClientProducts);
router.post('/:id/products', createClientProduct);
router.put('/:id/products/:productId', updateClientProduct);
router.delete('/:id/products/:productId', deleteClientProduct);

// Account/Ledger Sub-resource
router.get('/:id/account', getClientAccount);
router.get('/:id/balance', getClientBalance);

module.exports = router;
