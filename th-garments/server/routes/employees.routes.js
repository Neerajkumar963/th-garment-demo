const express = require('express');
const router = express.Router();
const { requireFields } = require('../middleware/validate.middleware');
const { 
    getAllEmployees, 
    createEmployee, 
    updateEmployee, 
    getEmployeeAccount, 
    makePayment, 
    getRoles 
} = require('../controllers/employees.controller');

router.get('/', getAllEmployees);
router.post('/', requireFields(['name', 'role_id']), createEmployee);
router.put('/:id', requireFields(['name', 'role_id']), updateEmployee);

router.get('/roles', getRoles);

router.get('/:id/account', getEmployeeAccount);
router.post('/:id/payment', makePayment);

module.exports = router;
