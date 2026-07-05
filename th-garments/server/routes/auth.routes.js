const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { login, logout, checkAuth } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // limit each IP to 15 login requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many login attempts from this IP, please try again after 15 minutes.' }
});

router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.get('/me', protect, checkAuth);

module.exports = router;
