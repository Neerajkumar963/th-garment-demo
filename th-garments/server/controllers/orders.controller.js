const db = require('../config/database');
const { calculateOrderTotals } = require('../helpers/orderCalculations');

exports.getAllOrders = async (req, res, next) => {
    try {
        const { status, org_id } = req.query;

        let query = `
            SELECT 
                o.id, o.org_id, o.branch, o.date, o.order_type, o.advance, o.remarks, o.eta, o.customer_details, o.created_on, o.updated_on, o.dispatch_status,
                org.org_name,
                org.phone,
                o.status
            FROM orders o
            JOIN organization org ON o.org_id = org.id
            WHERE 1=1
        `;
        const params = [];

        if (status) { // Note: filtering by calculated status is hard in SQL. We might filter after JS calc if needed, or rely on stored status.
            query += ' AND o.status = ?';
            params.push(status);
        }
        if (org_id) {
            query += ' AND o.org_id = ?';
            params.push(org_id);
        }

        query += ' ORDER BY o.created_on DESC';

        const [orders] = await db.query(query, params);

        // Fetch details and stage breakdown for each order
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
            // Ensure table exists (catch error if not) - actually created in updateDispatchStatus, assumes it exists now.
            let deliveryHistory = [];
            try {
                const [dh] = await db.query(`SELECT * FROM delivery_history WHERE order_id = ?`, [order.id]);
                deliveryHistory = dh;
            } catch (e) {
                // Ignore if table doesn't exist yet
            }

            const packedQty = deliveryHistory.filter(h => !h.delivered_at).reduce((sum, h) => sum + h.quantity, 0);
            const deliveredQty = deliveryHistory.filter(h => h.delivered_at).reduce((sum, h) => sum + h.quantity, 0);
            const totalDispatched = packedQty + deliveredQty;

            // 2.1 Get Itemized stats
            const [orderItems] = await db.query(`
                SELECT od.article_id, oa.dress_name as article_name, od.sq 
                FROM order_details od 
                JOIN articles a ON od.article_id = a.id 
                JOIN orders o ON od.order_id = o.id LEFT JOIN orgs_articles oa ON o.org_id = oa.org_id AND od.article_id = oa.article_id 
                WHERE od.order_id = ?
            `, [order.id]);

            const itemizedStats = {};
            orderItems.forEach(item => {
                const sq = (typeof item.sq === 'string' ? JSON.parse(item.sq) : item.sq) || {};
                const pieces = Object.entries(sq).filter(([k]) => k !== '_meta').reduce((s, [_, q]) => s + (parseInt(q) || 0), 0);
                itemizedStats[item.article_id] = {
                    id: item.article_id,
                    name: item.article_name,
                    total: pieces,
                    processing: 0,
                    completed: 0,
                    packed: deliveryHistory.filter(h => h.article_id === item.article_id && !h.delivered_at).reduce((s, h) => s + h.quantity, 0),
                    delivered: deliveryHistory.filter(h => h.article_id === item.article_id && h.delivered_at).reduce((s, h) => s + h.quantity, 0)
                };
            });

            // 3. Get Active Processing Qty (Stage 0-16)
            // Show ALL active states (In Process or Ready for Next)
            const [processingRows] = await db.query(`
                SELECT pd.stage_id, pd.status, pd.sq, r.role as role_name, cp.article_id
                FROM processing_details pd
                JOIN processing p ON pd.processing_id = p.id
                JOIN cut_stock cs ON p.cut_stock_id = cs.id
                JOIN cutting_process cp ON cs.cutting_process_id = cp.id
                LEFT JOIN emp_details e ON pd.emp_id = e.id
                LEFT JOIN emp_roles r ON e.role_id = r.id
                WHERE cp.order_id = ?
            `, [order.id]);

            // 3.1 Get Cut Stock Qty (Stage 0.5)
            // Logic: Total Cut - Total sent to Processing (Handles split bundles)
            const [cutStockRows] = await db.query(`
                SELECT cs.id, cs.sq, cp.article_id, cp.sq as cutting_process_sq
                FROM cut_stock cs
                JOIN cutting_process cp ON cs.cutting_process_id = cp.id
                WHERE cp.order_id = ?
            `, [order.id]);
            
            let cutStockQty = 0;
            for (const cs of cutStockRows) {
                const totalCutSq = (typeof cs.sq === 'string' ? JSON.parse(cs.sq) : cs.sq) || {};
                let totalCutPieces = Object.entries(totalCutSq).filter(([k]) => k!=='_meta').reduce((s, [_, q]) => s + (parseInt(q)||0), 0);
                
                // Fallback to cutting process metadata if total cut pieces is 0
                if (totalCutPieces === 0 && cs.cutting_process_sq) {
                    const cpSq = (typeof cs.cutting_process_sq === 'string' ? JSON.parse(cs.cutting_process_sq) : cs.cutting_process_sq) || {};
                    if (cpSq._meta && cpSq._meta.finished_sq) {
                        totalCutPieces = Object.entries(cpSq._meta.finished_sq).reduce((s, [_, q]) => s + (parseInt(q)||0), 0);
                    }
                }

                // Find how much was already sent to processing
                const [pRows] = await db.query('SELECT sq FROM processing WHERE cut_stock_id = ?', [cs.id]);
                let sentToProcessing = 0;
                pRows.forEach(pr => {
                    const pSq = (typeof pr.sq === 'string' ? JSON.parse(pr.sq) : pr.sq) || {};
                    sentToProcessing += Object.entries(pSq).filter(([k]) => k!=='_meta').reduce((s, [_, q]) => s + (parseInt(q)||0), 0);
                });

                const remainingInCutStock = Math.max(0, totalCutPieces - sentToProcessing);
                cutStockQty += remainingInCutStock;

                if (itemizedStats[cs.article_id]) {
                    itemizedStats[cs.article_id].cut_stock = (itemizedStats[cs.article_id].cut_stock || 0) + remainingInCutStock;
                    itemizedStats[cs.article_id].processing += remainingInCutStock;
                }
            }

            // 3.2 Get Active Cutting Jobs (Stage 0)
            const [activeCuttings] = await db.query(`
                SELECT cp.sq, cp.article_id
                FROM cutting_process cp
                LEFT JOIN cut_stock cs ON cp.id = cs.cutting_process_id
                WHERE cp.order_id = ? AND cs.id IS NULL
            `, [order.id]);

            let activeCuttingQty = 0;
            activeCuttings.forEach(row => {
                const sq = (typeof row.sq === 'string' ? JSON.parse(row.sq) : row.sq) || {};
                const pieces = Object.entries(sq).filter(([k]) => k!=='_meta').reduce((s, [_, q]) => s + (parseInt(q)||0), 0);
                activeCuttingQty += pieces;
                if (itemizedStats[row.article_id]) {
                    itemizedStats[row.article_id].cutting = (itemizedStats[row.article_id].cutting || 0) + pieces;
                    itemizedStats[row.article_id].processing += pieces; // Count as processing for UI consistency
                }
            });

            // 3.3 Get Finished Stock Assignation (Uncompleted Cutting Jobs)
            const [cuttingProcessRows] = await db.query(`
                SELECT sq FROM cutting_process WHERE order_id = ?
            `, [order.id]);

            let finishedSassignedQty = 0;
            cuttingProcessRows.forEach(row => {
                const sq = (typeof row.sq === 'string' ? JSON.parse(row.sq) : row.sq) || {};
                if (sq._meta && sq._meta.finished_sq) {
                    const finishedSq = sq._meta.finished_sq;
                    const packedSq = sq._meta.finished_packed_sq || {};
                    Object.entries(finishedSq).forEach(([size, qty]) => {
                        const alreadyPacked = Number(packedSq[size] || 0);
                        finishedSassignedQty += Math.max(0, Number(qty) - alreadyPacked);
                    });
                }
            });

            let finishedQty = finishedSassignedQty;
            let otherStageQty = 0;
            
            // 3.4 Calculate Sequential Production Counts (Fixed Descending Iteration)
            const stagesMap = {}; // { stage_id: { size: qty } }
            processingRows.forEach(row => {
                if (!stagesMap[row.stage_id]) stagesMap[row.stage_id] = {};
                const sq = (typeof row.sq === 'string' ? JSON.parse(row.sq) : row.sq) || {};
                Object.entries(sq).forEach(([sz, q]) => {
                    if (sz === '_meta') return;
                    stagesMap[row.stage_id][sz] = (stagesMap[row.stage_id][sz] || 0) + (parseInt(q) || 0);
                });
            });

            // Get all stage IDs ordered descending for sequential subtraction
            const [allStagesRows] = await db.query('SELECT id FROM process_stage ORDER BY id DESC');
            const availableSids = allStagesRows.map(s => s.id);

            const accountedFor = {};
            for (const sid of availableSids) {
                const stageSq = stagesMap[sid];
                if (!stageSq) continue;
                
                const remSq = {};
                let hasRemValue = false;
                
                Object.entries(stageSq).forEach(([sz, q]) => {
                    const orig = q;
                    const alreadyFound = accountedFor[sz] || 0;
                    const rem = Math.max(0, orig - alreadyFound);
                    if (rem > 0) {
                        remSq[sz] = rem;
                        hasRemValue = true;
                    }
                    accountedFor[sz] = Math.max(alreadyFound, orig);
                });

                if (hasRemValue) {
                    const pieces = Object.values(remSq).reduce((s, q) => s + q, 0);
                    if (sid === 16) {
                        finishedQty += pieces;
                    } else {
                        otherStageQty += pieces;
                    }
                }
            }

            // Reconstruct breakdown array with names
             const [stageBreakdownRows] = await db.query(`
                SELECT pd.stage_id, s.stage_name, pd.sq, pd.emp_id, r.role as role_name, pd.status
                FROM processing_details pd
                JOIN processing p ON pd.processing_id = p.id
                JOIN cut_stock cs ON p.cut_stock_id = cs.id
                JOIN cutting_process cp ON cs.cutting_process_id = cp.id
                JOIN process_stage s ON pd.stage_id = s.id
                LEFT JOIN emp_details e ON pd.emp_id = e.id
                LEFT JOIN emp_roles r ON e.role_id = r.id
                WHERE cp.order_id = ?
                ORDER BY pd.stage_id ASC
            `, [order.id]);

             // 3.5 Reconstruct breakdown array with sequential subtraction
             const finalBreakdownMap = {};
             let fabricatorQty = 0;

             if (activeCuttingQty > 0) {
                 finalBreakdownMap[0] = { stage_id: 0, stage_name: 'In Cutting', total_pieces: activeCuttingQty };
             }
             if (cutStockQty > 0) {
                 finalBreakdownMap[0.5] = { stage_id: 0.5, stage_name: 'In Cut Stock', total_pieces: cutStockQty };
             }

             const orderJobsMap = {};
             stageBreakdownRows.forEach(row => {
                 if (!orderJobsMap[row.stage_id]) {
                     orderJobsMap[row.stage_id] = { sq: {}, stage_name: row.stage_name, status: row.status, emp_id: row.emp_id, role_name: row.role_name };
                 }
                 const sq = (typeof row.sq === 'string' ? JSON.parse(row.sq) : row.sq) || {};
                 Object.entries(sq).forEach(([sz, q]) => {
                     if (sz !== '_meta') orderJobsMap[row.stage_id].sq[sz] = (orderJobsMap[row.stage_id].sq[sz] || 0) + (parseInt(q) || 0);
                 });
             });

             const accountedForList = {};
             for (const sid of availableSids) {
                 const info = orderJobsMap[sid];
                 if (!info) continue;
                 
                 const remSq = {};
                 let hasRem = false;
                 Object.entries(info.sq).forEach(([sz, q]) => {
                     const orig = q;
                     const alreadySeen = accountedForList[sz] || 0;
                     const rem = Math.max(0, orig - alreadySeen);
                     if (rem > 0) {
                         remSq[sz] = rem;
                         hasRem = true;
                     }
                     accountedForList[sz] = Math.max(alreadySeen, orig);
                 });

                 if (hasRem) {
                     const pieces = Object.values(remSq).reduce((s, q) => s + q, 0);
                     if (info.role_name === 'Fabricator') {
                         fabricatorQty += pieces;
                     } else {
                         const isWaiting = info.status === 'processed' || !info.emp_id;
                         const stageKey = isWaiting ? `${sid}_waiting` : sid;
                         const stageName = isWaiting ? `${info.stage_name} (Waiting)` : info.stage_name;
                         if (!finalBreakdownMap[stageKey]) {
                             finalBreakdownMap[stageKey] = { stage_id: sid, stage_name: stageName, total_pieces: 0 };
                         }
                         finalBreakdownMap[stageKey].total_pieces += pieces;
                     }
                 }
             }

            const stageBreakdownList = Object.values(finalBreakdownMap);
            if (fabricatorQty > 0) {
                stageBreakdownList.push({ stage_id: 999, stage_name: 'With Fabricator', total_pieces: fabricatorQty });
            }

            // 4. Calculate STATUS
            const totalCompletedWork = finishedQty + totalDispatched;
            
            let calculatedStatus = order.status; // Default fallback;

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
            
            // Override 'Completed' from SQL if we have history support?
            // SQL returns 'Completed' if stage 8 exists.
            
            const allCompleted = (otherStageQty === 0 && (finishedQty > 0 || totalDispatched > 0) && finishedQty + totalDispatched >= totalOrderQty); // All active are stage 16

            return { 
                ...order, 
                items: await db.query(`SELECT od.*, oa.dress_name as article_name FROM order_details od JOIN articles a ON od.article_id = a.id JOIN orders o ON od.order_id = o.id LEFT JOIN orgs_articles oa ON o.org_id = oa.org_id AND od.article_id = oa.article_id WHERE od.order_id = ?`, [order.id]).then(([r])=>r),

                stage_breakdown: stageBreakdownList,
                all_completed: allCompleted, 
                completed_pieces: finishedQty, 
                
                status: calculatedStatus,
                total_qty: totalOrderQty,
                history: deliveryHistory,
                itemized_stats: Object.values(itemizedStats),
                stats: {
                    total: totalOrderQty,
                    cutting: activeCuttingQty,
                    cut_stock: cutStockQty,
                    processing: otherStageQty + activeCuttingQty + cutStockQty,
                    completed: finishedQty,
                    packed: packedQty,
                    delivered: deliveredQty
                }
            };
        }));

        res.status(200).json({
            success: true,
            orders: ordersWithDetails
        });

    } catch (error) {
        console.error("Error in getAllOrders:", error);
        next(error);
    }
};

exports.getOrderById = async (req, res, next) => {
    try {
        const { id } = req.params;

        // 1. Order Info
        const [orders] = await db.query(`
            SELECT 
                o.id, o.org_id, o.branch, o.date, o.order_type, o.advance, o.remarks, o.eta, o.customer_details, o.created_on, o.updated_on, o.dispatch_status,
                org.org_name, org.phone,
                o.status
            FROM orders o
            JOIN organization org ON o.org_id = org.id
            WHERE o.id = ?
        `, [id]);

        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const order = orders[0];

        // 2. Order Details
        const [details] = await db.query(`
            SELECT 
                od.*,
                oa.dress_name as article_name,
                a.material_req
            FROM order_details od
            JOIN articles a ON od.article_id = a.id
            JOIN orders o ON od.order_id = o.id
            LEFT JOIN orgs_articles oa ON o.org_id = oa.org_id AND od.article_id = oa.article_id
            WHERE od.order_id = ?
        `, [id]);

        // Calculate Total Qty
        let totalOrderQty = 0;
        details.forEach(row => {
            const sq = typeof row.sq === 'string' ? JSON.parse(row.sq) : row.sq;
            const pieces = Object.entries(sq)
                .filter(([key]) => key !== '_meta')
                .reduce((sum, [_, qty]) => sum + (parseInt(qty) || 0), 0);
            totalOrderQty += pieces;
        });

        // 3. Attach Price List to each detail for reference
        const detailsWithPrices = await Promise.all(details.map(async (item) => {
            const [prices] = await db.query(`
                SELECT size, price FROM price_list WHERE article_id = ? ORDER BY size
            `, [item.article_id]);
            return { ...item, prices };
        }));

        // 4. Delivery History
        let deliveryHistory = [];
        try {
            const [dh] = await db.query(`SELECT * FROM delivery_history WHERE order_id = ?`, [id]);
            deliveryHistory = dh;
        } catch (e) {
            // Ignore
        }
        const packedQty = deliveryHistory.filter(h => !h.delivered_at).reduce((sum, h) => sum + h.quantity, 0);
        const deliveredQty = deliveryHistory.filter(h => h.delivered_at).reduce((sum, h) => sum + h.quantity, 0);
        const totalDispatched = packedQty + deliveredQty;

        const [processingRows] = await db.query(`
            SELECT pd.stage_id, s.stage_name, pd.sq, pd.emp_id, r.role as role_name, pd.status, cp.article_id, pd.processing_id
            FROM processing_details pd
            JOIN processing p ON pd.processing_id = p.id
            JOIN cut_stock cs ON p.cut_stock_id = cs.id
            JOIN cutting_process cp ON cs.cutting_process_id = cp.id
            JOIN process_stage s ON pd.stage_id = s.id
            LEFT JOIN emp_details e ON pd.emp_id = e.id
            LEFT JOIN emp_roles r ON e.role_id = r.id
            WHERE cp.order_id = ?
        `, [id]);

        // 5. Stage Breakdown Logic
        const stageBreakdownMap = {};
        const itemizedStats = {};
        details.forEach(item => {
            const sq = typeof item.sq === 'string' ? JSON.parse(item.sq) : item.sq;
            const pieces = Object.entries(sq)
                .filter(([key]) => key !== '_meta')
                .reduce((sum, [_, qty]) => sum + (parseInt(qty) || 0), 0);
            
            itemizedStats[item.article_id] = {
                article_id: item.article_id,
                article_name: item.article_name,
                total: pieces,
                cutting: pieces, // Start with total pieces remaining to cut
                cut_stock: 0,
                processing: 0,
                completed: 0,
                packed: deliveryHistory.filter(h => h.article_id === item.article_id && !h.delivered_at).reduce((s, h) => s + h.quantity, 0),
                delivered: deliveryHistory.filter(h => h.article_id === item.article_id && h.delivered_at).reduce((s, h) => s + h.quantity, 0)
            };
        });

        // 5.1 Get Cut Stock Qty (Stage 0.5)
        const [cutStockRows] = await db.query(`
            SELECT cs.id, cs.sq, cp.article_id, cp.sq as cutting_process_sq
            FROM cut_stock cs
            JOIN cutting_process cp ON cs.cutting_process_id = cp.id
            WHERE cp.order_id = ?
        `, [id]);
        
        let cutStockQty = 0;
        for (const cs of cutStockRows) {
            const totalCutSq = (typeof cs.sq === 'string' ? JSON.parse(cs.sq) : cs.sq) || {};
            let totalCutPieces = Object.entries(totalCutSq).filter(([k]) => k!=='_meta').reduce((s, [_, q]) => s + (parseInt(q)||0), 0);
            
            if (totalCutPieces === 0 && cs.cutting_process_sq) {
                const cpSq = (typeof cs.cutting_process_sq === 'string' ? JSON.parse(cs.cutting_process_sq) : cs.cutting_process_sq) || {};
                if (cpSq._meta && cpSq._meta.finished_sq) {
                    totalCutPieces = Object.entries(cpSq._meta.finished_sq).reduce((s, [_, q]) => s + (parseInt(q)||0), 0);
                }
            }

            const [pRows] = await db.query('SELECT sq FROM processing WHERE cut_stock_id = ?', [cs.id]);
            let sentToProcessing = 0;
            pRows.forEach(pr => {
                const pSq = (typeof pr.sq === 'string' ? JSON.parse(pr.sq) : pr.sq) || {};
                sentToProcessing += Object.entries(pSq).filter(([k]) => k!=='_meta').reduce((s, [_, q]) => s + (parseInt(q)||0), 0);
            });

            const remainingInCutStock = Math.max(0, totalCutPieces - sentToProcessing);
            cutStockQty += remainingInCutStock;

            if (itemizedStats[cs.article_id]) {
                itemizedStats[cs.article_id].cut_stock = (itemizedStats[cs.article_id].cut_stock || 0) + remainingInCutStock;
                itemizedStats[cs.article_id].cutting -= totalCutPieces; 
                if (itemizedStats[cs.article_id].cutting < 0) itemizedStats[cs.article_id].cutting = 0;
            }
        }

        // 5.2 Get Active Cutting Jobs (Stage 0)
        const [activeCuttings] = await db.query(`
            SELECT cp.sq, cp.article_id
            FROM cutting_process cp
            LEFT JOIN cut_stock cs ON cp.id = cs.cutting_process_id
            WHERE cp.order_id = ? AND cs.id IS NULL
        `, [id]);

        let activeCuttingQty = 0;
        activeCuttings.forEach(row => {
            const sq = (typeof row.sq === 'string' ? JSON.parse(row.sq) : row.sq) || {};
            const pieces = Object.entries(sq).filter(([k]) => k!=='_meta').reduce((s, [_, q]) => s + (parseInt(q)||0), 0);
            activeCuttingQty += pieces;
            if (itemizedStats[row.article_id]) {
                itemizedStats[row.article_id].cutting = (itemizedStats[row.article_id].cutting || 0) + pieces;
                itemizedStats[row.article_id].processing += pieces;
            }
        });

        if (activeCuttingQty > 0) {
            stageBreakdownMap[0] = { stage_id: 0, stage_name: 'In Cutting', total_pieces: activeCuttingQty };
        }
        if (cutStockQty > 0) {
            stageBreakdownMap[0.5] = { stage_id: 0.5, stage_name: 'In Cut Stock', total_pieces: cutStockQty };
        }

        let completedQty = 0;
        const [cuttingProcessRows] = await db.query(`SELECT sq FROM cutting_process WHERE order_id = ?`, [id]);
        cuttingProcessRows.forEach(row => {
            const sq = (typeof row.sq === 'string' ? JSON.parse(row.sq) : row.sq) || {};
            if (sq._meta && sq._meta.finished_sq) {
                Object.entries(sq._meta.finished_sq).forEach(([size, qty]) => {
                    const packed = (sq._meta.finished_packed_sq || {})[size] || 0;
                    completedQty += Math.max(0, Number(qty) - Number(packed));
                });
            }
        });

        let otherStageQty = 0;
        let fabricatorQty = 0;

        // 5. Build Stage Breakdown with Fixed Descending Iteration
        const orderStagesMap = {};
        processingRows.forEach(row => {
            if (!orderStagesMap[row.stage_id]) {
                orderStagesMap[row.stage_id] = {
                    sq: {}, 
                    stage_name: row.stage_name, 
                    status: row.status, 
                    emp_id: row.emp_id, 
                    role_name: row.role_name
                };
            }
            const sq = (typeof row.sq === 'string' ? JSON.parse(row.sq) : row.sq) || {};
            Object.entries(sq).forEach(([sz, q]) => {
                if (sz === '_meta') return;
                orderStagesMap[row.stage_id].sq[sz] = (orderStagesMap[row.stage_id].sq[sz] || 0) + (parseInt(q) || 0);
            });
            if (sq._meta) orderStagesMap[row.stage_id].meta = sq._meta;
        });

        // Get stage IDs for sequential subtraction
        const [allStageIdsRows] = await db.query('SELECT id FROM process_stage ORDER BY id DESC');
        const sortedSids = allStageIdsRows.map(s => s.id);

        const accountedForFinal = {};
        for (const sid of sortedSids) {
            const info = orderStagesMap[sid];
            if (!info) continue;

            const remSq = {};
            let hasRemFinal = false;
            
            Object.entries(info.sq).forEach(([sz, q]) => {
                const orig = q;
                const alreadyCountedTotal = accountedForFinal[sz] || 0;
                const remResult = Math.max(0, orig - alreadyCountedTotal);
                if (remResult > 0) {
                    remSq[sz] = remResult;
                    hasRemFinal = true;
                }
                accountedForFinal[sz] = Math.max(alreadyCountedTotal, orig);
            });

            if (hasRemFinal) {
                const pieces = Object.values(remSq).reduce((s, q) => s + q, 0);
                if (sid === 16 && info.status === 'processed') {
                    completedQty += pieces;
                } else if (info.role_name === 'Fabricator') {
                    let rec = 0;
                    if (info.meta && info.meta.received) rec = Object.values(info.meta.received).reduce((a, b) => a + Number(b), 0);
                    const act = (pieces - rec);
                    if (act > 0) fabricatorQty += act;
                } else {
                    otherStageQty += pieces;
                    if (sid < 16) {
                        const isW = info.status === 'processed' || !info.emp_id;
                        const skey = isW ? `${sid}_waiting` : sid;
                        const sname = isW ? `${info.stage_name} (Waiting)` : info.stage_name;
                        if (!stageBreakdownMap[skey]) {
                            stageBreakdownMap[skey] = { stage_id: sid, stage_name: sname, total_pieces: 0 };
                        }
                        stageBreakdownMap[skey].total_pieces += pieces;
                    }
                }
            }
        }

        const stageBreakdown = Object.values(stageBreakdownMap);
        if (fabricatorQty > 0) {
            stageBreakdown.push({ stage_id: 999, stage_name: 'With Fabricator', total_pieces: fabricatorQty });
        }
        
        // 6. Calculations & Status
        const totals = await calculateOrderTotals(id);
        const totalCompletedWork = completedQty + totalDispatched;
        
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
        }

        const allCompleted = (otherStageQty === 0 && completedQty > 0 && completedQty + totalDispatched === totalOrderQty);

        res.status(200).json({
            success: true,
            order: {
                ...order,
                items: details,
                calculations: totals,
                stage_breakdown: stageBreakdown,
                all_completed: allCompleted,
                completed_pieces: completedQty,
                status: calculatedStatus,
                total_qty: totalOrderQty,
                history: deliveryHistory,
                itemized_stats: Object.values(itemizedStats),
                stats: {
                    total: totalOrderQty,
                    cutting: activeCuttingQty,
                    cut_stock: cutStockQty,
                    processing: otherStageQty + activeCuttingQty + cutStockQty + fabricatorQty,
                    completed: completedQty,
                    packed: packedQty,
                    delivered: deliveredQty
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

exports.createOrder = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { 
            org_id, 
            branch, 
            date, 
            order_type, 
            advance, 
            eta, 
            customer_details, 
            remarks, 
            items // Array of objects
        } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            throw new Error('Order must contain at least one item');
        }

        // 1. Insert Order
        const branchJson = JSON.stringify(branch || {});
        const [orderRes] = await connection.query(`
            INSERT INTO orders 
            (org_id, branch, date, order_type, advance, eta, customer_details, remarks)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [org_id, branchJson, date, order_type, advance || 0, eta, customer_details, remarks]);

        const orderId = orderRes.insertId;

        // 2. Insert Order Details
        const detailValues = items.map(item => [
            orderId,
            item.article_id,
            JSON.stringify(item.sq), // Ensure stored as JSON string
            item.customization,
            item.remarks
        ]);

        await connection.query(`
            INSERT INTO order_details 
            (order_id, article_id, sq, customization, remarks)
            VALUES ?
        `, [detailValues]);

        // 3. Handle Advance Payment (Credit to Org Account)
        if (Number(advance) > 0) {
             const [balRow] = await connection.query(`
                SELECT balance FROM org_account 
                WHERE org_id = ? 
                ORDER BY datetime DESC LIMIT 1
            `, [org_id]);
            
            const currentBalance = balRow.length > 0 ? Number(balRow[0].balance) : 0;
            // Advance payment reduces balance (credit)
            const newBalance = currentBalance - Number(advance);

            await connection.query(`
                INSERT INTO org_account 
                (org_id, transaction, amount, balance, mode, remarks)
                VALUES (?, 'CR', ?, ?, 'Cash', 'Advance payment for Order #${orderId}')
            `, [org_id, Number(advance), newBalance]);
        }

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            orderId
        });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

exports.updateOrderStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
             return res.status(400).json({ success: false, message: 'Status is required' });
        }

        const [result] = await db.query(`
            UPDATE orders 
            SET status = ?, updated_on = NOW() 
            WHERE id = ?
        `, [status, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Order status updated'
        });

    } catch (error) {
        next(error);
    }
};

exports.updateDispatchStatus = async (req, res, next) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
        const { id } = req.params;
        const { dispatch_status } = req.body;

        if (!dispatch_status || !['Packed', 'Delivered'].includes(dispatch_status)) {
            throw new Error('Invalid dispatch status');
        }

        // Ensure history table exists
        await connection.query(`
            CREATE TABLE IF NOT EXISTS delivery_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                quantity INT NOT NULL,
                packed_at DATETIME,
                delivered_at DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
            )
        `);

        if (dispatch_status === 'Packed') {
            const { article_id, quantity: manualQty } = req.body;

            // 1. Identify Stage 8 (Finished) Jobs - FROM processing_details
            let query8 = `
                SELECT pd.id, pd.sq, cp.article_id 
                FROM processing_details pd
                JOIN processing p ON pd.processing_id = p.id
                JOIN cut_stock cs ON p.cut_stock_id = cs.id
                JOIN cutting_process cp ON cs.cutting_process_id = cp.id
                WHERE pd.stage_id = 8 AND pd.status = ? 
                  AND cp.order_id = ?
            `;
            const params8 = ['processed', id];
            if (article_id) {
                query8 += ` AND cp.article_id = ?`;
                params8.push(article_id);
            }
            const [stage8Jobs] = await connection.query(query8, params8);

            // 1.1 Identify Fabricator Jobs with Received Qty
            let queryFab = `
                SELECT pd.id, pd.sq, cp.article_id 
                FROM processing_details pd
                JOIN processing p ON pd.processing_id = p.id
                JOIN cut_stock cs ON p.cut_stock_id = cs.id
                JOIN cutting_process cp ON cs.cutting_process_id = cp.id
                LEFT JOIN emp_details e ON pd.emp_id = e.id
                LEFT JOIN emp_roles r ON e.role_id = r.id
                WHERE pd.stage_id < 8 
                  AND r.role = 'Fabricator'
                  AND pd.sq LIKE '%"received":%'
                  AND cp.order_id = ?
            `;
            const paramsFab = [id];
            if (article_id) {
                queryFab += ` AND cp.article_id = ?`;
                paramsFab.push(article_id);
            }
            const [fabricatorJobs] = await connection.query(queryFab, paramsFab);

            // 1.2 Identify Pieces fulfilled from Finished Stock in Pending/Active Cutting Jobs
            let queryCP = `
                SELECT id, sq, article_id
                FROM cutting_process
                WHERE order_id = ? AND sq LIKE '%"finished_sq":%'
            `;
            const paramsCP = [id];
            if (article_id) {
                queryCP += ` AND article_id = ?`;
                paramsCP.push(article_id);
            }
            const [cuttingProcessJobs] = await connection.query(queryCP, paramsCP);

            let totalPacked = 0;
            const stage8JobIds = [];
            const fabricatorUpdates = [];
            const cuttingProcessUpdates = [];

            // Process Stage 8 Jobs
            stage8Jobs.forEach(job => {
                const sq = (typeof job.sq === 'string' ? JSON.parse(job.sq) : job.sq) || {};
                Object.entries(sq).forEach(([key, val]) => {
                    if (key !== '_meta') totalPacked += Number(val);
                });
                stage8JobIds.push(job.id);
            });

            // Process Fabricator Jobs
            fabricatorJobs.forEach(job => {
                const sq = (typeof job.sq === 'string' ? JSON.parse(job.sq) : job.sq) || {};
                let receivedTotal = 0;
                
                if (sq._meta && sq._meta.received) {
                    // Sum up received
                    Object.values(sq._meta.received).forEach(val => receivedTotal += Number(val));
                    
                    // Determine how much is already packed
                    const alreadyPacked = sq._meta.packed_qty || 0;
                    
                    // Calculate quantity available to pack
                    const toPack = receivedTotal - alreadyPacked;

                    if (toPack > 0) {
                        // Add to global pack count
                        totalPacked += toPack;

                        // Update packed_qty in meta (Cumulative)
                        sq._meta.packed_qty = alreadyPacked + toPack;
                        
                        // We do NOT delete 'received' so fabricator stats stay correct
                        fabricatorUpdates.push({ id: job.id, sq: JSON.stringify(sq) });
                    }
                }
            });

            // Process Cutting Process Jobs (Finished Stock Usage)
            cuttingProcessJobs.forEach(job => {
                const sq = (typeof job.sq === 'string' ? JSON.parse(job.sq) : job.sq) || {};
                if (sq._meta && sq._meta.finished_sq) {
                    const finishedSq = sq._meta.finished_sq;
                    const packedSq = sq._meta.finished_packed_sq || {};
                    
                    let toPack_this_job = 0;
                    Object.entries(finishedSq).forEach(([size, totalQty]) => {
                        const alreadyPacked = Number(packedSq[size] || 0);
                        const canPack = Number(totalQty) - alreadyPacked;
                        if (canPack > 0) {
                            toPack_this_job += canPack;
                            packedSq[size] = alreadyPacked + canPack;
                        }
                    });

                    if (toPack_this_job > 0) {
                        totalPacked += toPack_this_job;
                        sq._meta.finished_packed_sq = packedSq;
                        cuttingProcessUpdates.push({ id: job.id, sq: JSON.stringify(sq) });
                    }
                }
            });

            if (totalPacked > 0) {
                // 2. Insert into delivery_history (Grouped by product if multiple)
                // For now, if we have article_id in request, we use it for all found pieces.
                // If not (legacy batch pack), we might need to distribute. 
                // But the new UI will always send article_id.
                
                await connection.query(`
                    INSERT INTO delivery_history (order_id, article_id, quantity, packed_at)
                    VALUES (?, ?, ?, NOW())
                `, [id, article_id || null, totalPacked]);

                // 3. DELETE Stage 8 jobs (assignments)
                if (stage8JobIds.length > 0) {
                    await connection.query(`DELETE FROM processing_details WHERE id IN (?)`, [stage8JobIds]);
                }

                // 4. UPDATE Fabricator Jobs (Update packed_qty)
                for (const update of fabricatorUpdates) {
                    await connection.query(`UPDATE processing_details SET sq = ? WHERE id = ?`, [update.sq, update.id]);
                }

                // 5. UPDATE Cutting Process Jobs (Update finished_packed_sq)
                for (const update of cuttingProcessUpdates) {
                    await connection.query(`UPDATE cutting_process SET sq = ? WHERE id = ?`, [update.sq, update.id]);
                }
            } else {
                 // Check if we already have packed items?
                 // Or maybe user clicked "Packed" but nothing new to pack.
                 // We should proceed to update status if applicable.
            }

            // Always update order's dispatch_status to 'Packed' if it was Pending?
            await connection.query('UPDATE orders SET dispatch_status = ?, updated_on = NOW() WHERE id = ?', ['Packed', id]);

        } else if (dispatch_status === 'Delivered') {
            // Update history: Mark all 'Packed' items as 'Delivered'
            // (Assumes we deliver everything that is packed)
            await connection.query(`
                UPDATE delivery_history 
                SET delivered_at = NOW() 
                WHERE order_id = ? AND delivered_at IS NULL
            `, [id]);

            // Check if FULLY delivered
            const totals = await calculateOrderTotals(id); 
            // Must use 'connection' query for delivery_history to see checks within transaction? 
            // Actually, we just updated it above.
            const [dRows] = await connection.query('SELECT SUM(quantity) as delivered FROM delivery_history WHERE order_id = ? AND delivered_at IS NOT NULL', [id]);
            const totalDelivered = (dRows[0].delivered ? Number(dRows[0].delivered) : 0);

            if (totalDelivered >= totals.totalPieces) {
                 await connection.query('UPDATE orders SET dispatch_status = ?, delivered_on = NOW(), updated_on = NOW() WHERE id = ?', ['Delivered', id]);
            } else {
                 // Partial Delivery: Do NOT mark as Delivered.
                 // Optionally update updated_on
                 await connection.query('UPDATE orders SET updated_on = NOW() WHERE id = ?', [id]);
            }
        }

        await connection.commit();
        res.status(200).json({
            success: true,
            message: `Order marked as ${dispatch_status}`
        });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

exports.deleteOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Cascade delete will remove details
        const [result] = await db.query('DELETE FROM orders WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
             return res.status(404).json({ success: false, message: 'Order not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Order deleted successfully'
        });

    } catch (error) {
        next(error);
    }
};

exports.fulfillOrderFromStock = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params; // order_id
        const { article_id, fulfillments } = req.body; // fulfillments: Array of { selling_stock_id, quantity_sq }

        if (!fulfillments || fulfillments.length === 0) {
            throw new Error('Selection from stock is required');
        }

        // 1. Create a dummy cutting_process record (Status: Stock Injection)
        // This ensures all existing joins work but skips the factory list
        const sqObj = {};
        fulfillments.forEach(f => {
            Object.entries(f.quantity_sq).forEach(([size, qty]) => {
                sqObj[size] = (sqObj[size] || 0) + Number(qty);
            });
        });

        const [cpRes] = await connection.query(`
            INSERT INTO cutting_process (article_id, order_id, emp_id, sq, status, remarks)
            VALUES (?, ?, NULL, ?, 'Completed', 'Stock Injection: Fulfilled from Internal Inventory')
        `, [article_id, id, JSON.stringify(sqObj)]);
        
        const cuttingProcessId = cpRes.insertId;

        // 2. Create the Virtual Cut Stock record (is_virtual = 1)
        const [csRes] = await connection.query(`
            INSERT INTO cut_stock (cutting_process_id, sq, is_virtual)
            VALUES (?, ?, 1)
        `, [cuttingProcessId, JSON.stringify(sqObj)]);

        const cutStockId = csRes.insertId;

        // 3. Create the Processing (Hub) record
        const [pRes] = await connection.query(`
            INSERT INTO processing (cut_stock_id, sq)
            VALUES (?, ?)
        `, [cutStockId, JSON.stringify(sqObj)]);

        const processingId = pRes.insertId;

        // 4. Create the First Stage (e.g., stage_id 1 - Embroidery/Labels or similar)
        // Note: Defaulting to stage 1. Adjust if business logic requires starting elsewhere.
        await connection.query(`
            INSERT INTO processing_details (processing_id, stage_id, status, sq)
            VALUES (?, 1, 'in_process', ?)
        `, [processingId, JSON.stringify(sqObj)]);

        // 5. Handle Inventory Deduction & Log in selling_stock_processing
        for (const fuel of fulfillments) {
            const { selling_stock_id, quantity_sq } = fuel;

            // Log the bridge (Simplified as requested: No cut_stock_id)
            await connection.query(`
                INSERT INTO selling_stock_processing (selling_stock_id, processing_id, quantity_sq)
                VALUES (?, ?, ?)
            `, [selling_stock_id, processingId, JSON.stringify(quantity_sq)]);

            // Deduct from selling_stock (Assuming 'selling_stock' row represents a specific size or has sub-logic)
            // Wait: If selling_stock is itemized by size + serial, we delete serials.
            // If selling_stock is bulk by size, we update counts.
            // Based on system context, selling_stock usually stores individual piece-level serials in some orgs, 
             // but here we deduct from the total count in selling_stock table.
             
             // Check if selling_stock has a 'quantity' column or we need to delete individual pieces
             const [stockRows] = await connection.query('SELECT article_id, size FROM selling_stock WHERE id = ?', [selling_stock_id]);
             if (stockRows.length > 0) {
                 const totalPiecesToDeduct = Object.values(quantity_sq).reduce((a, b) => a + Number(b), 0);
                 // We need to delete 'totalPiecesToDeduct' rows for this article_id and size
                 await connection.query(`
                    DELETE FROM selling_stock 
                    WHERE article_id = ? AND size = ? 
                    LIMIT ?
                 `, [stockRows[0].article_id, stockRows[0].size, totalPiecesToDeduct]);
             }
        }

        // 6. Update Order Status to show progress
        await connection.query("UPDATE orders SET status = 'Partial Cutting' WHERE id = ? AND status = 'Pending'", [id]);

        await connection.commit();
        res.status(200).json({ 
            success: true, 
            message: 'Order items injected into processing from stock',
            processing_id: processingId
        });

    } catch (error) {
        await connection.rollback();
        console.error("Fulfillment Error:", error);
        next(error);
    } finally {
        connection.release();
    }
};
