const db = require('../config/database');

// --- GETTERS ---

exports.getKanbanBoard = async (req, res, next) => {
    try {
        const [jobs] = await db.query(`
            SELECT 
                pd.id,
                pd.processing_id,
                pd.sq,
                pd.emp_id,
                pd.stage_id,
                pd.status,
                pd.processing_rate,
                pd.created_on,
                e.name as worker_name,
                cs.sq as cut_sq,
                cp.order_id,
                cp.article_id,
                oa.dress_name as article_name,
                o.branch as order_branch,
                org.org_name,
                ps.stage_name
            FROM processing_details pd
            JOIN processing p ON pd.processing_id = p.id
            JOIN emp_details e ON pd.emp_id = e.id
            JOIN emp_roles er ON e.role_id = er.id
            JOIN cut_stock cs ON p.cut_stock_id = cs.id
            JOIN cutting_process cp ON cs.cutting_process_id = cp.id
            JOIN articles a ON cp.article_id = a.id
            JOIN orders o ON cp.order_id = o.id
            JOIN organization org ON o.org_id = org.id
            LEFT JOIN orgs_articles oa ON o.org_id = oa.org_id AND cp.article_id = oa.article_id
            JOIN process_stage ps ON pd.stage_id = ps.id
            WHERE er.role != 'Fabricator' AND pd.status IN (?, ?)
            ORDER BY pd.stage_id, pd.created_on
        `, ['in_process', 'processed']);



        const [stages] = await db.query('SELECT * FROM process_stage ORDER BY id');

        const groupedStages = stages.map(stage => {
            return {
                id: stage.id,
                name: stage.stage_name,
                jobs: jobs.map(job => {
                    // Pre-calculate available SQ for display
                    let sq = {};
                    try {
                        sq = typeof job.sq === 'string' ? JSON.parse(job.sq) : job.sq;
                        const consumed = (sq._meta && sq._meta.consumed) ? sq._meta.consumed : {};
                        const availableSq = {};
                        Object.keys(sq).forEach(size => {
                            if (size === '_meta') return;
                            const total = Number(sq[size] || 0);
                            const cons = Number(consumed[size] || 0);
                            const rem = Math.max(0, total - cons);
                            if (rem >= 0) availableSq[size] = rem;
                        });
                        return { ...job, sq: availableSq };
                    } catch (e) { return job; }
                }).filter(job => {
                    // Filter by stage
                    if (job.stage_id !== stage.id) return false;
                    
                    if (stage.id === 16) {
                        return job.status === 'in_process';
                    }

                    // Filter out empty or fully consumed jobs
                    let hasQty = false;
                    const sq = job.sq; // Use pre-calculated available SQ
                    Object.values(sq).forEach(q => {
                        if (Number(q) > 0) hasQty = true;
                    });
                    
                    return hasQty;
                })
            };
        });

        res.status(200).json({
            success: true,
            stages: groupedStages
        });

    } catch (error) {
        next(error);
    }
};

exports.getAllStages = async (req, res, next) => {
    try {
        const [stages] = await db.query('SELECT * FROM process_stage ORDER BY id');
        res.status(200).json({ success: true, stages });
    } catch (error) {
        next(error);
    }
};

exports.getQueuedFabricatorJobs = async (req, res, next) => {
    try {
        const [jobs] = await db.query(`
            SELECT 
                pd.*,
                cs.sq as cut_sq,
                oa.dress_name as article_name,
                o.branch as order_branch,
                org.org_name
            FROM processing_details pd
            JOIN processing p ON pd.processing_id = p.id
            JOIN cut_stock cs ON p.cut_stock_id = cs.id
            JOIN cutting_process cp ON cs.cutting_process_id = cp.id
            JOIN articles a ON cp.article_id = a.id
            JOIN orders o ON cp.order_id = o.id
            JOIN organization org ON o.org_id = org.id
            LEFT JOIN orgs_articles oa ON o.org_id = oa.org_id AND cp.article_id = oa.article_id
            WHERE pd.emp_id IS NULL AND pd.status = ?
            ORDER BY pd.created_on DESC
        `, ['in_process']);

        res.status(200).json({ success: true, jobs });
    } catch (error) {
        next(error);
    }
};

exports.getFabricatorJobs = async (req, res, next) => {
    try {
        const [jobs] = await db.query(`
            SELECT 
                pd.*,
                e.name as worker_name,
                er.role as worker_role,
                cs.sq as cut_sq,
                oa.dress_name as article_name,
                o.branch as order_branch,
                org.org_name
            FROM processing_details pd
            JOIN processing p ON pd.processing_id = p.id
            JOIN emp_details e ON pd.emp_id = e.id
            JOIN emp_roles er ON e.role_id = er.id
            JOIN cut_stock cs ON p.cut_stock_id = cs.id
            JOIN cutting_process cp ON cs.cutting_process_id = cp.id
            JOIN articles a ON cp.article_id = a.id
            JOIN orders o ON cp.order_id = o.id
            JOIN organization org ON o.org_id = org.id
            LEFT JOIN orgs_articles oa ON o.org_id = oa.org_id AND cp.article_id = oa.article_id
            WHERE er.role = 'Fabricator' AND pd.status != ?
            ORDER BY pd.created_on DESC
        `, ['processed']);

        res.status(200).json({ success: true, jobs });
    } catch (error) {
        next(error);
    }
};

exports.getProcessingById = async (req, res, next) => {
    try {
        const { id } = req.params; // pd.id
        const [jobs] = await db.query(`
            SELECT pd.*, p.cut_stock_id 
            FROM processing_details pd
            JOIN processing p ON pd.processing_id = p.id
            WHERE pd.id = ?
        `, [id]);

        if (jobs.length === 0) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }

        res.status(200).json({ success: true, job: jobs[0] });

    } catch (error) {
        next(error);
    }
};

exports.getAvailableStock = async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                cs.id,
                cs.sq,
                cs.cutting_process_id,
                cp.article_id,
                oa.dress_name as article_name,
                org.org_name,
                o.branch,
                c.color_name,
                ct.type as fabric_type
            FROM cut_stock cs
            JOIN cutting_process cp ON cs.cutting_process_id = cp.id
            JOIN articles od ON cp.article_id = od.id
            JOIN orders o ON cp.order_id = o.id
            JOIN organization org ON o.org_id = org.id
            LEFT JOIN orgs_articles oa ON o.org_id = oa.org_id AND cp.article_id = oa.article_id
            LEFT JOIN cutting_details cdet ON cdet.cutting_process_id = cp.id
            LEFT JOIN cloth_quantity cq ON cdet.cloth_quantity_id = cq.id
            LEFT JOIN cloth_detail cdt ON cq.cloth_detail_id = cdt.id
            LEFT JOIN colors c ON cdt.color_id = c.id
            LEFT JOIN cloth_type ct ON cdt.cloth_type_id = ct.id
            GROUP BY cs.id, cp.article_id, o.branch, c.id, ct.id
            ORDER BY cs.created_on ASC
        `);

        // Filter out empty stock
        const availableStock = rows.filter(stock => {
            try {
                const sq = typeof stock.sq === 'string' ? JSON.parse(stock.sq) : stock.sq;
                let hasQty = false;
                Object.entries(sq).forEach(([key, val]) => {
                    if (key !== '_meta' && Number(val) > 0) hasQty = true;
                });
                return hasQty;
            } catch (e) { return true; }
        });

        res.status(200).json({
            success: true,
            availableStock
        });
    } catch (error) {
        next(error);
    }
};

exports.getFabricDetails = async (req, res, next) => {
    try {
        const { id } = req.params; // processing_id

        const [processing] = await db.query(`
            SELECT cut_stock_id FROM processing WHERE id = ?
        `, [id]);

        if (processing.length === 0) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        const [stock] = await db.query(`
            SELECT cutting_process_id FROM cut_stock WHERE id = ?
        `, [processing[0].cut_stock_id]);

        if (stock.length === 0) {
            return res.status(404).json({ success: false, message: 'Source stock not found' });
        }

        const [details] = await db.query(`
            SELECT 
                cd.bal_cloth,
                cd.cut_type,
                (cq.roll_quantity + cd.bal_cloth) as original_roll_quantity,
                ct.type as cloth_type,
                c.color_name,
                d.design_name,
                q.quality_name
            FROM cutting_details cd
            JOIN cloth_quantity cq ON cd.cloth_quantity_id = cq.id
            JOIN cloth_detail cdt ON cq.cloth_detail_id = cdt.id
            JOIN cloth_type ct ON cdt.cloth_type_id = ct.id
            JOIN colors c ON cdt.color_id = c.id
            JOIN design d ON cdt.design_id = d.id
            JOIN quality q ON cdt.quality_id = q.id
            WHERE cd.cutting_process_id = ?
        `, [stock[0].cutting_process_id]);

        res.status(200).json({
            success: true,
            details: details.map(d => ({
                ...d,
                used_qty: (Number(d.original_roll_quantity) - Number(d.bal_cloth)).toFixed(2)
            }))
        });

    } catch (error) {
        next(error);
    }
};

// --- ACTIONS ---

exports.assignWorker = async (req, res, next) => {

        const { 
            cut_stock_id, 
            emp_id, 
            stage_id, 
            sq, 
            processing_rate,
            stockUsed // { "M": 10 }
        } = req.body;

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // 1. Handle Stock Usage if provided
            if (stockUsed && Object.keys(stockUsed).length > 0) {
                // Get Order details to identify correct stock item
                const [stockDetails] = await connection.query(`
                    SELECT cp.article_id 
                    FROM cut_stock cs
                    JOIN cutting_process cp ON cs.cutting_process_id = cp.id
                    WHERE cs.id = ?
                `, [cut_stock_id]);

                if (stockDetails.length === 0) throw new Error('Invalid Cut Stock ID');
                const articleId = stockDetails[0].article_id;

                for (const [size, qty] of Object.entries(stockUsed)) {
                    if (Number(qty) <= 0) continue;
                    
                    // Deduct from Selling Stock (FIFO - Oldest First)
                    const [delRes] = await connection.query(`
                        DELETE FROM selling_stock 
                        WHERE article_id = ? AND TRIM(UPPER(size)) = TRIM(UPPER(?)) 
                        ORDER BY created_on ASC 
                        LIMIT ?
                    `, [articleId, size, Number(qty)]);

                    if (delRes.affectedRows < Number(qty)) {
                         throw new Error(`Insufficient stock for ${size}. Required: ${qty}, Found: ${delRes.affectedRows}`);
                    }
                }
            }
            
            // Removed overlap check to allow multiple workers for same stage
            // Quantity validation below prevents over-assignment

            const sqValue = (typeof sq === 'object') ? JSON.stringify(sq) : sq;

        // If SQ is empty (because everything was fulfilled by stock), we might skip assignment?
        // But user said "Remaining quantity continues". If remaining is 0, we should complete order?
        // Check if there is anything to assign
        let hasQuantity = false;
        try {
            const parsedSq = typeof sq === 'string' ? JSON.parse(sq) : sq;
             // Filter out _meta
            const realSizes = Object.entries(parsedSq).filter(([k]) => k !== '_meta');
            if (realSizes.some(([_, q]) => Number(q) > 0)) hasQuantity = true;
        } catch(e) {}

        if (hasQuantity) {
            // Check if Master Record exists
            let [masters] = await connection.query('SELECT id FROM processing WHERE cut_stock_id = ?', [cut_stock_id]);
            let processingId;
            if (masters.length === 0) {
                const [mRes] = await connection.query('INSERT INTO processing (cut_stock_id, sq, status) VALUES (?, ?, ?)', [cut_stock_id, sqValue, 'in_process']);
                processingId = mRes.insertId;
            } else {
                processingId = masters[0].id;
            }

            const [result] = await connection.query(`
                INSERT INTO processing_details
                (processing_id, sq, emp_id, stage_id, status, processing_rate)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [processingId, sqValue, emp_id, stage_id, 'in_process', processing_rate]);
            
            await connection.commit();
            
            res.status(201).json({
                success: true,
                message: 'Worker assigned successfully',
                processId: result.insertId
            });
        } else {
            // Fulfilled from stock
            let [masters] = await connection.query('SELECT id FROM processing WHERE cut_stock_id = ?', [cut_stock_id]);
            let processingId;
            if (masters.length === 0) {
                const [mRes] = await connection.query('INSERT INTO processing (cut_stock_id, sq, status) VALUES (?, ?, \'processed\')', [cut_stock_id, sqValue]);
                processingId = mRes.insertId;
            } else {
                processingId = masters[0].id;
                await connection.query('UPDATE processing SET status = ? WHERE id = ?', ['processed', processingId]);
            }

            const [result] = await connection.query(`
                INSERT INTO processing_details
                (processing_id, sq, emp_id, stage_id, status, processing_rate, remarks)
                VALUES (?, ?, ?, ?, ?, 0, 'Fulfilled from Stock')
            `, [processingId, sqValue, emp_id, 16, 'processed']);
            
            await connection.commit();
             res.status(200).json({ success: true, message: 'Order fulfilled from stock' });
        }

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

exports.receiveFromFabricator = async (req, res, next) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
        const { id } = req.params; // processing_details.id (from frontend)
        const { receivedQty, processing_rate } = req.body;

        // FIX: Frontend sends processing_details.id, not processing.id
        // Also fetch emp_id, processing_rate, and sq since they're in processing_details now
        const [detailRows] = await connection.query('SELECT processing_id, emp_id, processing_rate, sq FROM processing_details WHERE id = ?', [id]);
        if (detailRows.length === 0) throw new Error('Job not found');
        
        const processingId = detailRows[0].processing_id;
        const empId = detailRows[0].emp_id;
        const processingRate = detailRows[0].processing_rate;

        // Get sq from processing_details (not processing)
        let sq = detailRows[0].sq;
        if (typeof sq === 'string') sq = JSON.parse(sq);

        // Still need processing record for cut_stock_id reference
        const [rows] = await connection.query('SELECT cut_stock_id FROM processing WHERE id = ?', [processingId]);
        if (rows.length === 0) throw new Error('Processing record not found');
        const cutStockId = rows[0].cut_stock_id;

        if (!sq._meta) sq._meta = {};
        if (!sq._meta.received) sq._meta.received = {};


        // Update received counts
        let totalSent = 0;
        let totalRecv = 0;

        // Calculate Sent
        Object.entries(sq).forEach(([k, v]) => {
            if (k !== '_meta') totalSent += Number(v);
        });

        // Update Received & Prepare Stock Insert
        const stockInserts = [];
        
        // Need prices for stock insert
        const [dressRows] = await connection.query(`
            SELECT cp.article_id, org.org_name, o.org_id
            FROM cut_stock cs
            JOIN cutting_process cp ON cs.cutting_process_id = cp.id
            JOIN orders o ON cp.order_id = o.id
            JOIN organization org ON o.org_id = org.id
            LEFT JOIN orgs_articles oa ON o.org_id = oa.org_id AND cp.article_id = oa.article_id
            WHERE cs.id = ?
        `, [cutStockId]);


        let priceMap = {};
        let articleId = null;
        let isInternalStock = false;

        if (dressRows.length > 0) {
            articleId = dressRows[0].article_id;
            const orgName = dressRows[0].org_name;
            isInternalStock = (orgName === 'INTERNAL STOCK PRODUCTION' || orgName === 'INTERNAL STOCK');

            const [prices] = await connection.query(
                'SELECT size, price FROM price_list WHERE article_id = ?',
                [articleId]
            );
            prices.forEach(p => priceMap[p.size] = p.price);
        }

        Object.entries(receivedQty).forEach(([size, qty]) => {
            const current = sq._meta.received[size] || 0;
            sq._meta.received[size] = Number(current) + Number(qty);

            // Add to Stock Inserts ONLY if it's internal stock
            if (isInternalStock && articleId && Number(qty) > 0) {
                const price = priceMap[size] || 0;
                for (let i = 0; i < Number(qty); i++) {
                    stockInserts.push([articleId, null, size, price, 'Produced by Fabricator']);
                }
            }
        });

        // Calculate Total Received
        Object.values(sq._meta.received).forEach(v => totalRecv += Number(v));

        let status = 'in_process'; 

        if (totalRecv >= totalSent) {
            status = 'processed'; // "Completed"
        }

        // FIX: Update processing_details.sq (not processing.sq) since frontend reads from processing_details
        await connection.query(`
            UPDATE processing_details 
            SET sq = ?, status = ?, processing_rate = ?, updated_on = NOW() 
            WHERE id = ?
        `, [JSON.stringify(sq), status, Number(processing_rate) || 0, id]);



        // --- LABEL STOCK REDUCTION ---
        // If job is completed (processed), reduce stock for any stockable labels
        if (status === 'processed' && articleId) {
            const orgId = dressRows[0].org_id;
            const [labels] = await connection.query(`
                SELECT id FROM labelling 
                WHERE article_id = ? AND stockable = TRUE 
                AND (org_id = ? OR org_id IS NULL)
            `, [articleId, orgId]);

            if (labels.length > 0) {
                // Calculate total quantity across all sizes
                const totalFinished = Object.values(receivedQty).reduce((acc, q) => acc + Number(q), 0);
                
                for (const label of labels) {
                    await connection.query(`
                        UPDATE label_stock 
                        SET quantity = GREATEST(0, quantity - ?) 
                        WHERE labelling_id = ?
                    `, [totalFinished, label.id]);
                }
            }
        }

        // --- ACCOUNTING: Credit Fabricator for Work ---
        const totalReceivedNow = Object.values(receivedQty).reduce((acc, q) => acc + Number(q), 0);
        if (totalReceivedNow > 0) {
            const finalRate = processing_rate !== undefined ? Number(processing_rate) : Number(processingRate || 0);
            const amount = totalReceivedNow * finalRate;
            
            // Get current balance
            const [balRow] = await connection.query(
                'SELECT balance FROM emp_account WHERE emp_id = ? ORDER BY datetime DESC LIMIT 1',
                [empId]
            );
            const currentBal = balRow.length > 0 ? Number(balRow[0].balance) : 0;
            const newBalance = currentBal + amount;

            await connection.query(`
                INSERT INTO emp_account
                (emp_id, transaction, amount, balance, mode, remarks)
                VALUES (?, 'DR', ?, ?, 'Kind', ?)
            `, [empId, amount, newBalance, `Received ${totalReceivedNow} pcs from Fabricator (Job #${id})`]);
        }

        // Insert into Stock
        if (stockInserts.length > 0) {
            await connection.query(`
                INSERT INTO selling_stock (article_id, brand, size, price, remarks)
                VALUES ?
            `, [stockInserts]);
        }

        await connection.commit();
        res.status(200).json({ success: true, message: 'Received successfully', status });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

// NEW: Multi-Employee Assignment
// NEW: Queue specifically for Fabricator (Unassigned/Bell Inbox)
exports.queueForFabricator = async (req, res, next) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
        const { cut_stock_ids } = req.body; // Array of cut_stock_ids

        if (!cut_stock_ids || cut_stock_ids.length === 0) {
            throw new Error('No items selected for queuing');
        }

        const createdDetailIds = [];

        for (const cs_id of cut_stock_ids) {
            // 1. Fetch cut stock SQ
            const [stockRows] = await connection.query(`
                SELECT cs.sq, cp.article_id, o.org_id, oa.stage_code
                FROM cut_stock cs
                JOIN cutting_process cp ON cs.cutting_process_id = cp.id
                JOIN orders o ON cp.order_id = o.id
                LEFT JOIN orgs_articles oa ON o.org_id = oa.org_id AND cp.article_id = oa.article_id
                WHERE cs.id = ? FOR UPDATE
            `, [cs_id]);
            if (stockRows.length === 0) continue;

            const stageCode = stockRows[0].stage_code !== null ? Number(stockRows[0].stage_code) : 131071;
            let firstActiveStage = 1;
            for (let s = 1; s < 16; s++) {
                if ((stageCode & (1 << s)) !== 0) {
                    firstActiveStage = s;
                    break;
                }
            }

            let stockSq = {};
            try {
                stockSq = typeof stockRows[0].sq === 'string' ? JSON.parse(stockRows[0].sq) : stockRows[0].sq;
            } catch (e) { continue; }

            // Filter out empty or meta
            const sizesWithQty = Object.entries(stockSq).filter(([k, v]) => k !== '_meta' && Number(v) > 0);
            if (sizesWithQty.length === 0) continue;

            // 2. Ensure Master Record exists
            let [masters] = await connection.query('SELECT id FROM processing WHERE cut_stock_id = ?', [cs_id]);
            let processingId;
            if (masters.length === 0) {
                 const [mRes] = await connection.query('INSERT INTO processing (cut_stock_id, sq, status) VALUES (?, ?, ?)', [cs_id, JSON.stringify(stockSq), 'in_process']);
                 processingId = mRes.insertId;
            } else {
                 processingId = masters[0].id;
            }

            // 3. Insert into processing_details (Unassigned Bell Inbox)
            const [result] = await connection.query(`
                INSERT INTO processing_details
                (processing_id, sq, emp_id, stage_id, status, processing_rate)
                VALUES (?, ?, NULL, ?, ?, 0)
            `, [processingId, JSON.stringify(stockSq), firstActiveStage, 'in_process']);
            
            createdDetailIds.push(result.insertId);

            // 4. Decrement from cut_stock (consume all)
            const emptySq = {};
            Object.keys(stockSq).forEach(size => {
                if (size === '_meta') return;
                emptySq[size] = 0;
            });
            await connection.query('UPDATE cut_stock SET sq = ? WHERE id = ?', [JSON.stringify(emptySq), cs_id]);
        }

        await connection.commit();
        res.status(201).json({ success: true, message: 'Items moved to Bell Inbox', detailIds: createdDetailIds });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

// NEW: Bulk Assign Fabricator (From Bell Inbox)
exports.bulkAssignFabricator = async (req, res, next) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
        const { job_ids, emp_id, processing_rate } = req.body;

        if (!job_ids || job_ids.length === 0) throw new Error('No jobs selected');
        if (!emp_id) throw new Error('Fabricator selection required');

        // Note: For Bell Inbox jobs, processing row exists but emp_id is in processing_details
        // Wait, the bell inbox logic might need adjustment if it was creating ONLY processing rows.
        // Let's check queueForFabricator.
        
        await connection.query(`
            UPDATE processing_details 
            SET emp_id = ?, processing_rate = ?, status = 'in_process', updated_on = NOW()
            WHERE id IN (?) AND emp_id IS NULL
        `, [emp_id, processing_rate || 0, job_ids]);

        await connection.commit();
        res.status(200).json({ success: true, message: 'Fabricator assigned successfully' });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

exports.cancelQueuedFabricatorJobs = async (req, res, next) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
        const { job_ids } = req.body; // processing_details IDs

        if (!job_ids || job_ids.length === 0) {
            throw new Error('No items selected for cancellation');
        }

        for (const pd_id of job_ids) {
            // 1. Fetch job SQ and processing_id
            const [pdRows] = await connection.query(`
                SELECT pd.sq, pd.processing_id, p.cut_stock_id 
                FROM processing_details pd
                JOIN processing p ON pd.processing_id = p.id
                WHERE pd.id = ? FOR UPDATE
            `, [pd_id]);

            if (pdRows.length === 0) continue;

            const jobSq = typeof pdRows[0].sq === 'string' ? JSON.parse(pdRows[0].sq) : pdRows[0].sq;
            const cutStockId = pdRows[0].cut_stock_id;

            // 2. Fetch current cut stock SQ
            const [stockRows] = await connection.query('SELECT sq FROM cut_stock WHERE id = ? FOR UPDATE', [cutStockId]);
            if (stockRows.length === 0) continue;

            let currentStockSq = typeof stockRows[0].sq === 'string' ? JSON.parse(stockRows[0].sq) : stockRows[0].sq;

            // 3. Add job SQ back to cut stock SQ
            Object.entries(jobSq).forEach(([size, qty]) => {
                if (size === '_meta') return;
                currentStockSq[size] = (Number(currentStockSq[size]) || 0) + Number(qty);
            });

            // 4. Update cut_stock
            await connection.query('UPDATE cut_stock SET sq = ? WHERE id = ?', [JSON.stringify(currentStockSq), cutStockId]);

            // 5. Delete from processing_details
            await connection.query('DELETE FROM processing_details WHERE id = ?', [pd_id]);
        }

        await connection.commit();
        res.status(200).json({ success: true, message: 'Items moved back to Cut Stock successfully' });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

exports.assignMultipleWorkers = async (req, res, next) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
        let { cut_stock_id, stage_id, assignments, stockUsed, parent_job_id } = req.body;
        // stockUsed = { "M": 10 }

        if ((!assignments || assignments.length === 0) && (!stockUsed || Object.keys(stockUsed).length === 0)) {
            throw new Error('At least one assignment or stock usage is required');
        }

        // 1. Get cut stock (Always needed for article_id)
        // 1. Get cut stock (Always needed for article_id)
        if (!cut_stock_id && parent_job_id) {
             const [pJob] = await connection.query(`
                SELECT p.cut_stock_id 
                FROM processing_details pd
                JOIN processing p ON pd.processing_id = p.id
                WHERE pd.id = ?
             `, [parent_job_id]);
             if (pJob.length > 0) {
                 cut_stock_id = pJob[0].cut_stock_id;
             }
        }

        const [stockRows] = await connection.query(
            `SELECT cs.sq, cp.article_id 
             FROM cut_stock cs
             JOIN cutting_process cp ON cs.cutting_process_id = cp.id
             WHERE cs.id = ?`,
            [cut_stock_id]
        );

        if (stockRows.length === 0) throw new Error('Cut stock not found');

        const articleId = stockRows[0].article_id;
        let availableSq = {};

        // 2. Determine Available SQ
        // Detection: If no parent_job_id is provided, it's the FIRST active stage (sources from cut_stock)
        if (!parent_job_id) {
            // For Stage 1, available is what's in cut_stock
            try {
                availableSq = typeof stockRows[0].sq === 'string' 
                    ? JSON.parse(stockRows[0].sq) 
                    : stockRows[0].sq;
            } catch (e) { availableSq = {}; }
        } else {
            // For Stage > 1, available is what's in the PARENT ASSIGNMENT (processing_details)
            if (parent_job_id) {
                const [jobRows] = await connection.query('SELECT sq FROM processing_details WHERE id = ?', [parent_job_id]);
                if (jobRows.length === 0) throw new Error(`Source assignment #${parent_job_id} not found`);
                
                try {
                    availableSq = typeof jobRows[0].sq === 'string' ? JSON.parse(jobRows[0].sq) : jobRows[0].sq;
                } catch (e) { availableSq = {}; }
            } else {
                 throw new Error('Internal Error: Missing source assignment ID for transfer.');
            }
        }

        // 3. Validate Stock & Deduct
        if (stockUsed && Object.keys(stockUsed).length > 0) {
             for (const [size, qty] of Object.entries(stockUsed)) {
                if (Number(qty) <= 0) continue;
                
                const [delRes] = await connection.query(`
                    DELETE FROM selling_stock 
                    WHERE article_id = ? AND TRIM(UPPER(size)) = TRIM(UPPER(?)) 
                    ORDER BY created_on ASC 
                    LIMIT ?
                `, [articleId, size, Number(qty)]);

                if (delRes.affectedRows < Number(qty)) {
                     throw new Error(`Insufficient stock for ${size}. Required: ${qty}, Found: ${delRes.affectedRows}`);
                }
            }
        }

        // 4. Calculate total assigned
        const totalAssigned = {};
        
        // From Employees
        if (assignments) {
            assignments.forEach(assignment => {
                let sq = {};
                try {
                    sq = typeof assignment.sq === 'string' ? JSON.parse(assignment.sq) : assignment.sq;
                } catch(e) {}
                
                Object.entries(sq).forEach(([size, qty]) => {
                    totalAssigned[size] = (totalAssigned[size] || 0) + Number(qty);
                });
            });
        }

        // From Stock
        if (stockUsed) {
            Object.entries(stockUsed).forEach(([size, qty]) => {
                totalAssigned[size] = (totalAssigned[size] || 0) + Number(qty);
            });
        }

        // 5. Validate Over-assignment
        const overAssigned = [];
        Object.keys(availableSq).forEach(size => {
            if (size === '_meta') return;
            const available = Number(availableSq[size] || 0);
            const assigned = totalAssigned[size] || 0;
            if (assigned > available) {
                overAssigned.push({ size, available, assigned });
            }
        });

        if (overAssigned.length > 0) {
            // Rollback happens in catch block
            const errors = overAssigned.map(o =>
                `Size ${o.size}: Available ${o.available}, Assigned ${o.assigned}`
            ).join('; ');
            throw new Error(`Over-assignment detected: ${errors}`); 
        }

        const createdIds = [];

        // 6. Create Employee Records
        if (assignments) {
            // Ensure Master Record exists
            let [masters] = await connection.query('SELECT id FROM processing WHERE cut_stock_id = ?', [cut_stock_id]);
            let processingId;
            if (masters.length === 0) {
                 const [mRes] = await connection.query('INSERT INTO processing (cut_stock_id, sq, status) VALUES (?, ?, ?)', [cut_stock_id, JSON.stringify(availableSq), 'in_process']);
                 processingId = mRes.insertId;
            } else {
                 processingId = masters[0].id;
            }

            for (const assignment of assignments) {
                const sqValue = typeof assignment.sq === 'object' ? JSON.stringify(assignment.sq) : assignment.sq;
                const [result] = await connection.query(`
                    INSERT INTO processing_details
                    (processing_id, sq, emp_id, stage_id, status, processing_rate)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [processingId, sqValue, assignment.emp_id, stage_id, 'in_process', assignment.processing_rate || 0]);
                createdIds.push(result.insertId);
            }
        }

        // 7. Create Stock Record (if used)
        if (stockUsed && Object.keys(stockUsed).length > 0) {
            let [masters] = await connection.query('SELECT id FROM processing WHERE cut_stock_id = ?', [cut_stock_id]);
            let processingId = masters.length > 0 ? masters[0].id : null;
            
            let stockEmpId = 0;
            if (assignments && assignments.length > 0) {
                stockEmpId = assignments[0].emp_id;
            } else {
                const [empRows] = await connection.query('SELECT id FROM emp_details LIMIT 1');
                if (empRows.length > 0) stockEmpId = empRows[0].id;
            }

             const [result] = await connection.query(`
                INSERT INTO processing_details
                (processing_id, sq, emp_id, stage_id, status, processing_rate, remarks)
                VALUES (?, ?, ?, ?, ?, 0, 'Fulfilled from Stock')
            `, [processingId, JSON.stringify(stockUsed), stockEmpId, 16, 'processed']);
            createdIds.push(result.insertId);
        }

        // 8. DECREMENT LOGIC: Reduce quantity from previous stage jobs
        if (stage_id > 1 && parent_job_id) {
            
            // Fetch ONLY the specific parent job
            const [prevJobRows] = await connection.query(`
                SELECT id, sq, status
                FROM processing_details
                WHERE id = ?
                FOR UPDATE
            `, [parent_job_id]);

            if (prevJobRows.length > 0) {
                const prevJob = prevJobRows[0];
                let prevSq = {};
                try {
                    prevSq = typeof prevJob.sq === 'string' ? JSON.parse(prevJob.sq) : prevJob.sq;
                } catch(e) { prevSq = {}; }

                let modified = false;
                let remainingTotal = 0;

                // Initialize meta if missing
                if (!prevSq._meta) prevSq._meta = {};
                if (!prevSq._meta.consumed) prevSq._meta.consumed = {};



                Object.keys(prevSq).forEach(size => {
                    if (size === '_meta') return;
                    
                    // Logic: Available = Total - Consumed
                    const totalQty = Number(prevSq[size] || 0);
                    const previouslyConsumed = Number(prevSq._meta.consumed[size] || 0);
                    const available = totalQty - previouslyConsumed;
                    
                    const deducted = totalAssigned[size] || 0;
                    
                    if (available > 0 && deducted > 0) {
                        const actualDeduct = Math.min(available, deducted);
                        // Update CONSUMED, do NOT touch main SQ
                        prevSq._meta.consumed[size] = previouslyConsumed + actualDeduct;
                        modified = true;
                    }
                });

                if (modified) {
                    await connection.query(`
                        UPDATE processing_details
                        SET sq = ?, updated_on = NOW()
                        WHERE id = ?
                    `, [JSON.stringify(prevSq), prevJob.id]);
                }
            }
        } else if (stage_id === 1 && (assignments?.length > 0 || (stockUsed && Object.keys(stockUsed).length > 0))) {
             // 9. DECREMENT LOGIC FOR STAGE 1 (Cut Stock -> Limit)
             const [stockRows] = await connection.query('SELECT sq FROM cut_stock WHERE id = ? FOR UPDATE', [cut_stock_id]);
             if (stockRows.length > 0) {
                 let stockSq = {};
                 try {
                     stockSq = typeof stockRows[0].sq === 'string' ? JSON.parse(stockRows[0].sq) : stockRows[0].sq;
                 } catch (e) { stockSq = {}; }
                 
                 let modified = false;
                 
                 Object.keys(stockSq).forEach(size => {
                     if (size === '_meta') return;
                     const available = Number(stockSq[size] || 0);
                     const deducted = totalAssigned[size] || 0;
                     
                     if (available > 0 && deducted > 0) {
                         const actualDeduct = Math.min(available, deducted);
                         const remaining = available - actualDeduct;
                         if (remaining > 0) {
                             stockSq[size] = remaining;
                         } else {
                             delete stockSq[size];
                         }
                         modified = true;
                     }
                 });
                 
                 if (modified) {
                     await connection.query('UPDATE cut_stock SET sq = ? WHERE id = ?', [JSON.stringify(stockSq), cut_stock_id]);
                 }
             }
        }

        await connection.commit();

        res.status(201).json({
            success: true,
            message: `Assignments created successfully`,
            processIds: createdIds
        });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};


// Note: updateAssignment is at the end of this file

exports.updateProgress = async (req, res, next) => {
    try {
        const { id } = req.params; // pd.id
        const { remarks } = req.body;

        const [result] = await db.query(`
            UPDATE processing_details
            SET status = ?, remarks = ?, updated_on = NOW()
            WHERE id = ?
        `, ['in_process', remarks || 'In Process', id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }

        res.status(200).json({ success: true, message: 'Progress updated' });

    } catch (error) {
        next(error);
    }
};

exports.completeStage = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;

        const [jobs] = await connection.query(`
            SELECT pd.*, p.cut_stock_id, cp.article_id, o.org_id, oa.stage_code
            FROM processing_details pd
            JOIN processing p ON pd.processing_id = p.id
            JOIN cut_stock cs ON p.cut_stock_id = cs.id
            JOIN cutting_process cp ON cs.cutting_process_id = cp.id
            JOIN orders o ON cp.order_id = o.id
            LEFT JOIN orgs_articles oa ON o.org_id = oa.org_id AND cp.article_id = oa.article_id
            WHERE pd.id = ?
        `, [id]);
        if (jobs.length === 0) {
            throw new Error('Assignment not found');
        }
        const job = jobs[0];

        if (job.status === 'processed') {
             throw new Error('Stage already completed');
        }

        // --- DYNAMIC FUTURE-PROOF BIT-SKIPPING LOGIC ---
        const stageCode = BigInt(job.stage_code !== null ? job.stage_code : "131071"); 
        const currentStageId = Number(job.stage_id);

        let nextStageId = currentStageId;
        let nextStatus = 'processed';

        // 1. Fetch all stages ordered by ID to find the next available one
        const [allStages] = await connection.query('SELECT id FROM process_stage ORDER BY id');
        
        // Final "Processed" stage is usually the one with the highest ID (currently 16)
        const finalStageId = allStages.length > 0 ? allStages[allStages.length - 1].id : 16;

        if (currentStageId < finalStageId) {
             let found = false;
             // Find the current stage index in the list
             const currentIndex = allStages.findIndex(s => s.id === currentStageId);
             
             // Loop through subsequent stages in the database sequence
             for (let i = currentIndex + 1; i < allStages.length; i++) {
                 const sId = allStages[i].id;
                 // Check if this stage is enabled in the article's custom route
                 // Native BigInt bitwise handles > 31 stages safely
                 if ((stageCode & (1n << BigInt(sId))) !== 0n) {
                     nextStageId = sId;
                     found = true;
                     break;
                 }
             }
             
             // If no enabled stages found, move to final "Processed" state
             if (!found) {
                 nextStageId = finalStageId;
             }
        }

        await connection.query(`
            UPDATE processing_details 
            SET status = ?, stage_id = ?, updated_on = NOW() 
            WHERE id = ?
        `, [nextStatus, nextStageId, id]);

        let sqObj = job.sq;
        if (typeof sqObj === 'string') {
            try { sqObj = JSON.parse(sqObj); } catch (e) { sqObj = {}; }
        }

        let totalPieces = 0;
        for (const qty of Object.values(sqObj)) {
            totalPieces += Number(qty);
        }

        const amount = totalPieces * Number(job.processing_rate);

        const [balRow] = await connection.query(
            'SELECT balance FROM emp_account WHERE emp_id = ? ORDER BY datetime DESC LIMIT 1',
            [job.emp_id]
        );
        const currentBal = balRow.length > 0 ? Number(balRow[0].balance) : 0;
        const newBalance = currentBal + amount;

        await connection.query(`
            INSERT INTO emp_account
            (emp_id, transaction, amount, balance, mode, remarks)
            VALUES (?, 'DR', ?, ?, 'Kind', ?)
        `, [job.emp_id, amount, newBalance, `Stage ${job.stage_id} Completed`]);

        if (Number(nextStageId) === 16) {
            const [dressRows] = await connection.query(`
                SELECT cp.article_id, org.org_name
                FROM cut_stock cs
                JOIN cutting_process cp ON cs.cutting_process_id = cp.id
                JOIN orders o ON cp.order_id = o.id
                JOIN organization org ON o.org_id = org.id
            LEFT JOIN orgs_articles oa ON o.org_id = oa.org_id AND cp.article_id = oa.article_id
                WHERE cs.id = ?
            `, [job.cut_stock_id]);
            
            if (dressRows.length > 0) {
                const { article_id: articleId, org_name } = dressRows[0];

                // ONLY insert into selling_stock if it's an internal production job
                // Client orders bypass finished stock and stay in the Order Pipeline
                if (org_name === 'INTERNAL STOCK PRODUCTION' || org_name === 'INTERNAL STOCK') {
                    const [prices] = await connection.query(
                        'SELECT size, price FROM price_list WHERE article_id = ?',
                        [articleId]
                    );
                    const priceMap = {};
                    prices.forEach(p => priceMap[p.size] = p.price);

                    const stockInserts = [];
                    for (const [size, qty] of Object.entries(sqObj)) {
                        if (size === '_meta') continue;
                        const count = Number(qty);
                        const price = priceMap[size] || 0;
                        for (let i = 0; i < count; i++) {
                            stockInserts.push([articleId, null, size, price, 'Produced']);
                        }
                    }

                }
            }
        }

        // --- CORE CHANGE: PRESERVE HISTORY ---
        // 1. Mark current stage as PROCESSED
        // We keep the record in the current stage but mark it as processed
        // so the frontend can show the "Assign Next Stage" button.
        await connection.query(`
            UPDATE processing_details 
            SET status = ?, updated_on = NOW() 
            WHERE id = ?
        `, ['processed', id]);

        await connection.commit();

        res.status(200).json({
            success: true,
            message: 'Stage completed successfully'
        });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

exports.deleteJob = async (req, res, next) => {
    try {
        const { id } = req.params; // pd.id
        const [result] = await db.query('DELETE FROM processing_details WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }

        res.status(200).json({ success: true, message: 'Assignment deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// Note: Original updateAssignment restored here

exports.updateAssignment = async (req, res, next) => {
    try {
        const { id } = req.params; // pd.id
        const { emp_id, processing_rate } = req.body;

        if (processing_rate === undefined && emp_id === undefined) {
            return res.status(400).json({ success: false, message: 'Nothing to update' });
        }

        let query = "UPDATE processing_details SET ";
        const params = [];
        const updates = [];

        if (processing_rate !== undefined) {
            updates.push("processing_rate = ?");
            params.push(processing_rate);
        }
        if (emp_id !== undefined) {
            updates.push("emp_id = ?");
            params.push(emp_id);
        }

        query += updates.join(", ") + " WHERE id = ?";
        params.push(id);

        const [result] = await db.query(query, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }

        res.status(200).json({ success: true, message: 'Assignment updated' });

    } catch (error) {
        next(error);
    }
};

exports.getProductionHistory = async (req, res, next) => {
    try {
        const { search, worker, stage, fromDate, toDate } = req.query;
        
        let query = `
            SELECT 
                pd.*,
                e.name as worker_name,
                er.role as worker_role,
                ps.stage_name,
                oa.dress_name as article_name,
                org.org_name,
                o.id as master_order_id
            FROM processing_details pd
            JOIN processing p ON pd.processing_id = p.id
            JOIN emp_details e ON pd.emp_id = e.id
            JOIN emp_roles er ON e.role_id = er.id
            JOIN process_stage ps ON pd.stage_id = ps.id
            JOIN cut_stock cs ON p.cut_stock_id = cs.id
            JOIN cutting_process cp ON cs.cutting_process_id = cp.id
            JOIN articles a ON cp.article_id = a.id
            JOIN orders o ON cp.order_id = o.id
            JOIN organization org ON o.org_id = org.id
            LEFT JOIN orgs_articles oa ON o.org_id = oa.org_id AND cp.article_id = oa.article_id
            WHERE pd.status = ?
        `;


        
        const params = ['processed'];
        
        if (search) {
            query += ` AND (oa.dress_name LIKE ? OR pd.id LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }
        
        if (worker && worker !== 'undefined' && worker !== 'null') {
            query += ` AND pd.emp_id = ?`;
            params.push(worker);
        }
        
        if (stage && stage !== 'undefined' && stage !== 'null') {
            query += ` AND pd.stage_id = ?`;
            params.push(stage);
        }
        
        if (fromDate && fromDate !== 'undefined' && fromDate !== 'null') {
            query += ` AND pd.created_on >= ?`;
            params.push(fromDate);
        }
        
        if (toDate && toDate !== 'undefined' && toDate !== 'null') {
            query += ` AND pd.created_on <= ?`;
            params.push(toDate);
        }
        
        query += ` ORDER BY pd.updated_on DESC LIMIT 500`;
        
        const [history] = await db.query(query, params);
        res.status(200).json({ success: true, history });
        
    } catch (error) {
        next(error);
    }
};

exports.getFabricDetails = async (req, res, next) => {
    try {
        const { id } = req.params; // processing_details.id

        // Find the cutting_process_id from processing_details
        const [jobRows] = await db.query(`
            SELECT cs.cutting_process_id, cp.sq 
            FROM processing_details pd
            JOIN processing p ON pd.processing_id = p.id
            JOIN cut_stock cs ON p.cut_stock_id = cs.id
            JOIN cutting_process cp ON cs.cutting_process_id = cp.id
            WHERE pd.id = ?
        `, [id]);

        if (jobRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }

        const processId = jobRows[0].cutting_process_id;
        let sqParsed = {};
        try {
            sqParsed = typeof jobRows[0].sq === 'string' ? JSON.parse(jobRows[0].sq) : jobRows[0].sq;
        } catch (e) {
            sqParsed = {};
        }

        // Fetch fabric details (cutting_details) 
        const [details] = await db.query(`
            SELECT 
                cd.*, 
                cq.id as roll_id,
                cq.roll_quantity,
                ct.type as cloth_type, 
                q.quality_name, 
                c.color_name, 
                d.design_name
            FROM cutting_details cd
            JOIN cloth_quantity cq ON cd.cloth_quantity_id = cq.id
            JOIN cloth_detail cdt ON cq.cloth_detail_id = cdt.id
            JOIN cloth_type ct ON cdt.cloth_type_id = ct.id
            JOIN colors c ON cdt.color_id = c.id
            JOIN design d ON cdt.design_id = d.id
            JOIN quality q ON cdt.quality_id = q.id
            WHERE cd.cutting_process_id = ?
        `, [processId]);

        // Map used quantities
        const fabricMeta = (sqParsed._meta && sqParsed._meta.fabric) ? sqParsed._meta.fabric : {};
        
        const mappedDetails = details.map(d => ({
            ...d,
            used_qty: fabricMeta[d.roll_id] || 'Unknown'
        }));

        res.status(200).json({ success: true, details: mappedDetails });

    } catch (error) {
        console.error("Error fetching fabric details:", error);
        res.status(500).json({ success: false, message: 'Failed to fetch fabric details' });
    }
};
