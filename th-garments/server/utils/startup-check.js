const db = require('../config/database');
const logger = require('./logger');

const REQUIRED_ENV = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
const REQUIRED_TABLES = ['users', 'orders', 'processing', 'cutting_process', 'sales_history', 'emp_details'];

const runStartupCheck = async () => {
    logger.info('Running startup checks...');

    // 1. Env Vars
    const missingEnv = REQUIRED_ENV.filter(key => !process.env[key]);
    if (missingEnv.length > 0) {
        logger.error(`Missing Environment Variables: ${missingEnv.join(', ')}`);
        process.exit(1);
    }

    // 2. DB Connection & Tables
    let retries = 5;
    while (retries > 0) {
        try {
            const connection = await db.getConnection();
            
            // Check tables
            const [rows] = await connection.query('SHOW TABLES');
            const existingTables = rows.map(r => Object.values(r)[0]);
            
            const missingTables = REQUIRED_TABLES.filter(t => !existingTables.includes(t));
            
            if (missingTables.length > 0) {
                logger.error(`Missing Critical Tables: ${missingTables.join(', ')}`);
                process.exit(1);
            }

            connection.release();
            logger.info('Database check passed.');
            break; // Success

        } catch (error) {
            logger.error(`Startup Check Failed (DB): ${error.code || error.message}. Details:`, error);
            retries--;
            if (retries === 0) {
                logger.error('Checking DNS resolution for DB_HOST...');
                const dns = require('dns');
                try {
                    const addresses = await dns.promises.resolve(process.env.DB_HOST);
                    logger.info('DNS Resolution success:', addresses);
                } catch (dnsError) {
                    logger.error('DNS Resolution failed:', dnsError.message);
                }
                process.exit(1);
            }
            // Wait 5 seconds before retrying
            await new Promise(res => setTimeout(res, 5000));
        }
    }

    logger.info('All startup checks passed. Server healthy.');
};

module.exports = runStartupCheck;
