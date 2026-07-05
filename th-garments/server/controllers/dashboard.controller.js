const db = require('../config/database');

exports.getStats = async (req, res, next) => {
    try {
        // 1. Pending Orders
        const [pending] = await db.query("SELECT COUNT(*) as count FROM orders WHERE status = 'Pending'");
        
        // 2. In Production
        // Status now in processing_details. "In Process" means distinct master jobs that have active details.
        // Or simply count master jobs? But master jobs don't have status.
        // We can count master jobs that have at least one 'in_process' detail.
        const [inProcess] = await db.query(`
            SELECT COUNT(DISTINCT p.cut_stock_id) as count 
            FROM processing_details pd
            JOIN processing p ON pd.processing_id = p.id
            WHERE pd.status = 'in_process'
        `);
        
        // 3. Completed Today (Details marked processed today)
        const [completed] = await db.query("SELECT COUNT(*) as count FROM processing_details WHERE status = 'processed' AND DATE(updated_on) = CURDATE()");
        
        // 4. Low Stock
        const [lowStock] = await db.query("SELECT COUNT(*) as count FROM cloth_detail WHERE total_quantity < 100");

        res.status(200).json({
            success: true,
            stats: {
                pendingOrders: pending[0].count,
                inProduction: inProcess[0].count,
                completedToday: completed[0].count,
                lowStock: lowStock[0].count
            }
        });
    } catch (error) {
        next(error);
    }
};

exports.getRecentOrders = async (req, res, next) => {
    try {
        const [orders] = await db.query(`
            SELECT 
                o.*,
                org.org_name,
                org.phone
            FROM orders o
            JOIN organization org ON o.org_id = org.id
            ORDER BY o.created_on DESC
            LIMIT 10
        `);

        // Fetch details and stage breakdown for each order (Logic copied from orders.controller.js)
        const ordersWithDetails = await Promise.all(orders.map(async (order) => {
            // 1. Get Order Details (Total Qty)
            const [details] = await db.query(`
                SELECT sq FROM order_details WHERE order_id = ?
            `, [order.id]);

            let totalOrderQty = 0;
            details.forEach(row => {
               const sq = (typeof row.sq === 'string' ? JSON.parse(row.sq) : row.sq) || {};
               const pieces = Object.entries(sq)
                   .filter(([key]) => key !== '_meta')
                   .reduce((sum, [_, qty]) => sum + (parseInt(qty) || 0), 0);
               totalOrderQty += pieces;
            });

            // 2. Get Delivery History (Packed/Delivered Qty)
            let deliveryHistory = [];
            try {
                const [dh] = await db.query(`SELECT * FROM delivery_history WHERE order_id = ?`, [order.id]);
                deliveryHistory = dh;
            } catch (e) {}

            const packedQty = deliveryHistory.filter(h => !h.delivered_at).reduce((sum, h) => sum + h.quantity, 0);
            const deliveredQty = deliveryHistory.filter(h => h.delivered_at).reduce((sum, h) => sum + h.quantity, 0);
            const totalDispatched = packedQty + deliveredQty;

            // 3. Get Active Processing Qty (Stage 1-16)
            // Show ALL active states (In Process or Ready for Next)
            const [processingRows] = await db.query(`
                SELECT pd.stage_id, pd.status, pd.sq, r.role as role_name
                FROM processing_details pd
                JOIN processing p ON pd.processing_id = p.id
                JOIN cut_stock cs ON p.cut_stock_id = cs.id
                JOIN cutting_process cp ON cs.cutting_process_id = cp.id
                LEFT JOIN emp_details e ON pd.emp_id = e.id
                LEFT JOIN emp_roles r ON e.role_id = r.id
                WHERE cp.order_id = ?
            `, [order.id]);

            // 3.1 Get Cut Stock Qty (Smart Subtraction)
            const [cutStockList] = await db.query(`
                SELECT cs.id, cs.sq, cp.sq as cutting_process_sq
                FROM cut_stock cs
                JOIN cutting_process cp ON cs.cutting_process_id = cp.id
                WHERE cp.order_id = ?
            `, [order.id]);
            
            let totalCutOrInProgress = 0;
            let cutStockQty = 0;
            for (const cs of cutStockList) {
                const totalCutSq = (typeof cs.sq === 'string' ? JSON.parse(cs.sq) : cs.sq) || {};
                let totalPieces = Object.entries(totalCutSq).filter(([k]) => k!=='_meta').reduce((s, [_, q]) => s + (parseInt(q)||0), 0);
                
                // Fallback to cutting process metadata if total cut pieces is 0
                if (totalPieces === 0 && cs.cutting_process_sq) {
                    const cpSq = (typeof cs.cutting_process_sq === 'string' ? JSON.parse(cs.cutting_process_sq) : cs.cutting_process_sq) || {};
                    if (cpSq._meta && cpSq._meta.finished_sq) {
                        totalPieces = Object.entries(cpSq._meta.finished_sq).reduce((s, [_, q]) => s + (parseInt(q)||0), 0);
                    }
                }

                const [pRows] = await db.query('SELECT sq FROM processing WHERE cut_stock_id = ?', [cs.id]);
                let sentToProcessing = 0;
                pRows.forEach(pr => {
                    const pSq = (typeof pr.sq === 'string' ? JSON.parse(pr.sq) : pr.sq) || {};
                    sentToProcessing += Object.entries(pSq).filter(([k]) => k!=='_meta').reduce((s, [_, q]) => s + (parseInt(q)||0), 0);
                });
                cutStockQty += Math.max(0, totalPieces - sentToProcessing);
                totalCutOrInProgress += totalPieces;
            }

            // 3.2 Get Active Cutting Jobs AND calculate remaining to be cut
            const [orderItemsSum] = await db.query('SELECT sq FROM order_details WHERE order_id = ?', [order.id]);
            let totalOrdered = 0;
            orderItemsSum.forEach(item => {
                const sq = (typeof item.sq === 'string' ? JSON.parse(item.sq) : item.sq) || {};
                totalOrdered += Object.entries(sq).filter(([k]) => k!=='_meta').reduce((s, [_, q]) => s + (parseInt(q)||0), 0);
            });

            const [activeCuttings] = await db.query(`
                SELECT cp.sq
                FROM cutting_process cp
                LEFT JOIN cut_stock cs ON cp.id = cs.cutting_process_id
                WHERE cp.order_id = ? AND cs.id IS NULL
            `, [order.id]);

            let activeCuttingQty = 0;
            activeCuttings.forEach(row => {
                const sq = (typeof row.sq === 'string' ? JSON.parse(row.sq) : row.sq) || {};
                activeCuttingQty += Object.entries(sq).filter(([k]) => k!=='_meta').reduce((s, [_, q]) => s + (parseInt(q)||0), 0);
            });

            // Stage 0 (Cutting) = (Total Ordered - Total officially Cut) OR Active Cutting jobs
            const remainingToCut = Math.max(0, totalOrdered - totalCutOrInProgress);
            activeCuttingQty = Math.max(activeCuttingQty, remainingToCut);

            let finishedQty = 0;
            let otherStageQty = 0;
            
            // 4. Calculate Sequential Production Counts (Article-wide)
            const articleStagesMap = {};
            processingRows.forEach(row => {
                const aid = row.article_id || 'default';
                if (!articleStagesMap[aid]) articleStagesMap[aid] = {};
                if (!articleStagesMap[aid][row.stage_id]) articleStagesMap[aid][row.stage_id] = {};
                
                const sq = (typeof row.sq === 'string' ? JSON.parse(row.sq) : row.sq) || {};
                Object.entries(sq).forEach(([sz, q]) => {
                    if (sz === '_meta') return;
                    articleStagesMap[aid][row.stage_id][sz] = (articleStagesMap[aid][row.stage_id][sz] || 0) + (parseInt(q) || 0);
                });
            });

            Object.keys(articleStagesMap).forEach(aid => {
                const accountedFor = {};
                for (let sid = 16; sid >= 1; sid--) {
                    const stageSq = articleStagesMap[aid][sid];
                    if (!stageSq) continue;
                    
                    const remSq = {};
                    let hasRem = false;
                    Object.entries(stageSq).forEach(([sz, q]) => {
                        const orig = q;
                        const alreadyCounted = accountedFor[sz] || 0;
                        const rem = Math.max(0, orig - alreadyCounted);
                        if (rem > 0) {
                            remSq[sz] = rem;
                            hasRem = true;
                        }
                        accountedFor[sz] = Math.max(alreadyCounted, orig);
                    });

                    if (hasRem) {
                        const pieces = Object.values(remSq).reduce((s, q) => s + q, 0);
                        if (sid === 16) {
                            finishedQty += pieces;
                        } else {
                            otherStageQty += pieces;
                        }
                    }
                }
            });

            // 4. Calculate STATUS
            const totalCompletedWork = finishedQty + totalDispatched;
            let calculatedStatus = order.status; 

            if (order.dispatch_status === 'Delivered') {
                calculatedStatus = 'Delivered';
            } else if (totalOrderQty > 0) {
                 if (deliveredQty === totalOrderQty) {
                     calculatedStatus = 'Delivered';
                 } else if (totalDispatched === totalOrderQty) {
                     calculatedStatus = 'Packed';
                 } else if (totalCompletedWork >= totalOrderQty) {
                     calculatedStatus = 'Completed'; 
                 } else if (otherStageQty > 0 || totalCompletedWork > 0) {
                     calculatedStatus = 'In Progress';
                 } else if (cutStockQty > 0) {
                     calculatedStatus = 'In Cut Stock';
                 } else if (activeCuttingQty > 0) {
                     calculatedStatus = 'In Cutting';
                 } else {
                     calculatedStatus = 'Pending';
                 }
            } else {
                 calculatedStatus = 'Pending';
            }

            return { 
                ...order, 
                status: calculatedStatus,
            };
        }));

        res.status(200).json({
            success: true,
            orders: ordersWithDetails
        });
    } catch (error) {
        next(error);
    }
};
