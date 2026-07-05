const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const path = require('path');
const db = require('./config/database');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
app.set('trust proxy', 1);

const requestLogger = require('./middleware/requestLogger');
app.use(requestLogger);

const runStartupCheck = require('./utils/startup-check');

// Security Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));

// General API Rate Limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests from this IP, please try again later.' }
});
app.use('/api', apiLimiter);

// Middleware
app.use(cors({
    origin: function(origin, callback) {
        const allowedOrigins = [
            'http://localhost',
            'http://127.0.0.1',
            'http://localhost:5173', 
            'http://127.0.0.1:5173',
            'http://localhost:5177', 
            'http://127.0.0.1:5177',
            'https://th-garment.vercel.app',
            'https://th-garments.vercel.app',
            'https://thgarments.in',
            'https://www.thgarments.in',
            'http://thgarments.in',
            'http://www.thgarments.in',
            'https://thgarments.in/',
            'https://www.thgarments.in/',
            process.env.FRONTEND_URL,
            process.env.CORS_ORIGIN
        ].filter(Boolean);

        // Allow Cloudflare tunnel URLs (trycloudflare.com or custom CF tunnels)
        if (!origin || allowedOrigins.includes(origin) || /\.trycloudflare\.com$/.test(origin) || /\.cloudflareaccess\.com$/.test(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(cookieParser());

// Logging Middleware
// Moved to top

const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const fabricRoutes = require('./routes/fabric.routes');
const itemsRoutes = require('./routes/items.routes');
const clientsRoutes = require('./routes/clients.routes');
const ordersRoutes = require('./routes/orders.routes');
const cuttingRoutes = require('./routes/cutting.routes');
const processingRoutes = require('./routes/processing.routes');
const salesRoutes = require('./routes/sales.routes');
const employeesRoutes = require('./routes/employees.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const reportsRoutes = require('./routes/reports.routes');
const labelRoutes = require('./routes/label.routes');
const extensionsRoutes = require('./routes/extensions.routes');
const articlesRoutes = require('./routes/articles.routes');
const { protect } = require('./middleware/auth.middleware');
const errorHandler = require('./middleware/error.middleware');

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', protect, dashboardRoutes);
app.use('/api/fabric', protect, fabricRoutes);
app.use('/api/items', protect, itemsRoutes);
app.use('/api/clients', protect, clientsRoutes);
app.use('/api/orders', protect, ordersRoutes);
app.use('/api/cutting', protect, cuttingRoutes);
app.use('/api/processing', protect, processingRoutes);
app.use('/api/sales', protect, salesRoutes);
app.use('/api/employees', protect, employeesRoutes);
app.use('/api/attendance', protect, attendanceRoutes);
app.use('/api/reports', protect, reportsRoutes);
app.use('/api/labels', protect, labelRoutes);
app.use('/api/extensions', protect, extensionsRoutes);
app.use('/api/articles', protect, articlesRoutes);

// Health Check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: "ok",
        message: "TH Garments API running"
    });
});

// DB Test
app.get('/api/test-db', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT COUNT(*) as count FROM cloth_type');
        res.status(200).json({
            status: "success",
            message: "Database connection successful",
            count: rows[0].count
        });
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(500).json({
            status: "error",
            message: "Database connection failed",
            error: error.message
        });
    }
});

// Serve static frontend files (production build)
const clientBuildPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuildPath));

// Catch-all: serve React app for any non-API route (handles React Router)
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(clientBuildPath, 'index.html'));
    }
});

// Error Middleware
app.use(errorHandler);

// Start Server
// Start Server
const startServer = async () => {
    await runStartupCheck();
    
    app.listen(PORT, () => {
        console.log(`
        ============================================
        🚀 TH Garments ERP Server Running
        ============================================
        Port: ${PORT}
        Environment: ${process.env.NODE_ENV || 'development'}
        Database: ${process.env.DB_NAME}
        ============================================
        `);
    });
};

startServer();
