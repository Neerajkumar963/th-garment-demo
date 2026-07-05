const db = require('../config/database');
const { checkFabricAvailability } = require('../helpers/cuttingHelpers');

// --- GETTERS ---

exports.doGetAllCuttingJobs = async (req, res, next) => {
    try {
        const [jobs] = await db.query(`
            SELECT 
                cp.*,
                e.name as cutter_name,
                oa.dress_name as article_name,
                i.name as item_name,
                a.cloth_detail_id,
                a.remarks as product_remarks,
                o.id as order_id,
                org.org_name
            FROM cutting_process cp
            JOIN emp_details e ON cp.emp_id = e.id
            JOIN articles a ON cp.article_id = a.id
            JOIN items i ON a.item_id = i.id
            JOIN orders o ON cp.order_id = o.id
            JOIN organization org ON o.org_id = org.id
            LEFT JOIN orgs_articles oa ON o.org_id = oa.org_id AND cp.article_id = oa.article_id
            ORDER BY cp.created_on ASC
        `);

        // Fetch details for each job? 
        // Prompt says: "For each job also fetch: SELECT * FROM cutting_details..."
        // Optimization: For a large list, this N+1 query is bad, but adhering to prompt requirements.
        
        const jobsWithDetails = await Promise.all(jobs.map(async (job) => {
            const [details] = await db.query(`
                SELECT 
                    cd.*,
                    cq.roll_quantity as original_roll_quantity,
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
            `, [job.id]);

            // NEW: Try to find assigned_fabric_id from remarks (for Stock Cutting starting from Inventory)
            let assigned_fabric_id = null;
            if (job.remarks && job.remarks.includes('Planned Fabric ID:')) {
                const match = job.remarks.match(/Planned Fabric ID: (\d+)/);
                if (match) assigned_fabric_id = match[1]; // Keep as string for Select component
            }

            return { ...job, fabric_usage_logs: details, assigned_fabric_id };
        }));

        res.status(200).json({
            success: true,
            jobs: jobsWithDetails
        });

    } catch (error) {
        next(error);
    }
};

exports.getCuttingById = async (req, res, next) => {
    try {
        const { id } = req.params;

        // 1. Process Info
        const [jobs] = await db.query(`
            SELECT 
                cp.*,
                e.name as cutter_name,
                oa.dress_name as article_name,
                i.name as item_name,
                a.cloth_detail_id,
                a.remarks as product_remarks,
                org.org_name
            FROM cutting_process cp
            JOIN emp_details e ON cp.emp_id = e.id
            JOIN articles a ON cp.article_id = a.id
            JOIN items i ON a.item_id = i.id
            JOIN orders o ON cp.order_id = o.id
            JOIN organization org ON o.org_id = org.id
            LEFT JOIN orgs_articles oa ON o.org_id = oa.org_id AND cp.article_id = oa.article_id
            WHERE cp.id = ?
        `, [id]);

        if (jobs.length === 0) {
            return res.status(404).json({ success: false, message: 'Cutting job not found' });
        }

        // 2. Details with complete fabric information
        const [details] = await db.query(`
            SELECT 
                cd.*,
                cq.roll_quantity as original_roll_quantity,
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
        `, [id]);

        // NEW: Try to find assigned_fabric_id from remarks
        let assigned_fabric_id = null;
        if (jobs[0].remarks && jobs[0].remarks.includes('Planned Fabric ID:')) {
            const match = jobs[0].remarks.match(/Planned Fabric ID: (\d+)/);
            if (match) assigned_fabric_id = match[1];
        }

        res.status(200).json({
            success: true,
            job: { ...jobs[0], fabric_usage_logs: details, assigned_fabric_id }
        });

    } catch (error) {
        next(error);
    }
};

exports.getPendingOrders = async (req, res, next) => {
    try {
        const article_id = req.query.article_id;
        
        // Fetch all Pending or Partial orders
        // Use a more complex query to compare Ordered vs Assigned
        
        // 1. Get Candidate Orders (Pending or Processing, but not Completed/Stock)
        // We need to fetch orders and their details, effectively joining everything
        let orderQuery = `
            SELECT o.*, org.org_name
            FROM orders o
            JOIN organization org ON o.org_id = org.id
        `;
        let orderParams = [];
        
        if (article_id) {
            orderQuery += `
            JOIN order_details od ON o.id = od.order_id
            WHERE o.status NOT IN (?, ?, ?, ?) AND od.article_id = ?
            `;
            orderParams = ['Completed', 'Stock', 'Delivered', 'Packed', article_id];
        } else {
            orderQuery += `
            WHERE o.status NOT IN (?, ?, ?, ?)
            `;
            orderParams = ['Completed', 'Stock', 'Delivered', 'Packed'];
        }
        
        orderQuery += ` ORDER BY o.created_on ASC`;

        const [orders] = await db.query(orderQuery, orderParams);

        // 2. For each order, check coverage
        const pendingOrders = [];

        for (const order of orders) {
            // Get Ordered Items
            let itemsQuery = `
                SELECT 
                 od.*,
                 COALESCE(oa.dress_name, i.name) as article_name,
                 a.material_req
                FROM order_details od
                JOIN articles a ON od.article_id = a.id
                JOIN items i ON a.item_id = i.id
                LEFT JOIN orgs_articles oa ON od.article_id = oa.article_id AND oa.org_id = ?
                WHERE od.order_id = ?
            `;
            let itemsParams = [order.org_id, order.id];
            
            if (article_id) {
                itemsQuery += ` AND od.article_id = ?`;
                itemsParams.push(article_id);
            }

            const [orderItems] = await db.query(itemsQuery, itemsParams);

            // Get Assigned Items (Cutting Process)
            const [cuttingItems] = await db.query(`
                SELECT * FROM cutting_process WHERE order_id = ?
            `, [order.id]);

            const incompleteItems = [];
            let isPartiallyCut = false;

            for (const item of orderItems) {
                const orderedSq = typeof item.sq === 'string' ? JSON.parse(item.sq) : item.sq;
                
                // Aggregate assigned SQ for this item (article_id)
                const assignedSq = {};
                const relatedCuts = cuttingItems.filter(c => c.article_id === item.article_id);
                
                let assignedFabricId = null;
                if (relatedCuts.length > 0) {
                    isPartiallyCut = true;
                    // Find the fabric used (assuming only 1 fabric type allowed per item as per new strict rule)
                    const [fabricRows] = await db.query(`
                        SELECT cq.cloth_detail_id 
                        FROM cutting_details cd
                        JOIN cutting_process cp ON cd.cutting_process_id = cp.id
                        JOIN cloth_quantity cq ON cd.cloth_quantity_id = cq.id
                        WHERE cp.order_id = ? AND cp.article_id = ?
                        LIMIT 1
                    `, [order.id, item.article_id]);
                    
                    if (fabricRows.length > 0) {
                        assignedFabricId = fabricRows[0].cloth_detail_id;
                    }
                }

                relatedCuts.forEach(cut => {
                     const cSq = typeof cut.sq === 'string' ? JSON.parse(cut.sq) : cut.sq;
                     Object.entries(cSq).forEach(([size, qty]) => {
                         assignedSq[size] = (assignedSq[size] || 0) + Number(qty);
                     });
                });

                // Calculate Remaining
                const remainingSq = {};
                let hasRemaining = false;
                Object.entries(orderedSq).forEach(([size, qty]) => {
                    const assigned = assignedSq[size] || 0;
                    const rem = Number(qty) - assigned;
                    if (rem > 0) {
                        remainingSq[size] = rem;
                        hasRemaining = true;
                    }
                });

                if (hasRemaining) {
                    incompleteItems.push({
                        ...item,
                        sq: remainingSq, // Only show what is LEFT to cut
                        original_sq: orderedSq,
                        assigned_fabric_id: assignedFabricId // Send locked fabric ID
                    });
                }
            }

            if (incompleteItems.length > 0) {
                pendingOrders.push({
                    ...order,
                    status: isPartiallyCut ? 'Partial Cutting' : 'Pending', // Computed status for UI
                    items: incompleteItems
                });
            }
        }

        res.status(200).json({
            success: true,
            pending_orders: pendingOrders
        });

    } catch (error) {
        next(error);
    }
}

// --- ACTIONS ---

exports.startCuttingJob = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        let { 
            order_id, 
            article_id, 
            emp_id, 
            sq, 
            pattern_series,
            assignments // Array of { emp_id, sq, cloth_quantity_id, fabric_used, cut_type, cut_rate }
        } = req.body;

        // normalization
        let jobsToCreate = [];
        if (assignments && Array.isArray(assignments) && assignments.length > 0) {
            jobsToCreate = assignments;
        } else {
            jobsToCreate = [{ emp_id, sq }]; // Legacy fallback (should ideally be blocked by frontend)
        }

        // ===== HARD VALIDATION: Prevent Over-Assignment =====
        if (order_id) {
            const [orderInfo] = await connection.query(`
                SELECT o.id, org.org_name 
                FROM orders o 
                JOIN organization org ON o.org_id = org.id
                WHERE o.id = ?
            `, [order_id]);

            const isStockOrder = orderInfo.length > 0 && orderInfo[0].org_name === 'INTERNAL STOCK PRODUCTION';

            if (!isStockOrder) {
                // 1. Get ordered quantities
                const [orderDetails] = await connection.query(`
                    SELECT sq FROM order_details 
                    WHERE order_id = ? AND article_id = ?
                `, [order_id, article_id]);

                if (orderDetails.length === 0) {
                    throw new Error('Order item not found');
                }

                let targetSq = (typeof orderDetails[0].sq === 'string' ? JSON.parse(orderDetails[0].sq) : orderDetails[0].sq) || {};

                // 2. Get EXISTING cutting quantities for this order item
                const [existingCuts] = await connection.query(`
                    SELECT sq FROM cutting_process 
                    WHERE order_id = ? AND article_id = ?
                `, [order_id, article_id]);

                const totalAssignedSoFar = {};
                existingCuts.forEach(cut => {
                    const cSq = (typeof cut.sq === 'string' ? JSON.parse(cut.sq) : cut.sq) || {};
                    Object.entries(cSq).forEach(([size, qty]) => {
                        if (size !== '_meta') totalAssignedSoFar[size] = (totalAssignedSoFar[size] || 0) + Number(qty);
                    });
                });

                // 3. Add CURRENT request quantities
                jobsToCreate.forEach(job => {
                    const jobSq = (typeof job.sq === 'string' ? JSON.parse(job.sq) : job.sq) || {};
                    Object.entries(jobSq).forEach(([size, qty]) => {
                        if (size !== '_meta') totalAssignedSoFar[size] = (totalAssignedSoFar[size] || 0) + Number(qty);
                    });
                });

                // 4. Compare against target
                const overAssigned = [];
                Object.entries(targetSq).forEach(([size, target]) => {
                    if (size === '_meta') return;
                    const assigned = totalAssignedSoFar[size] || 0;
                    if (assigned > Number(target)) {
                        overAssigned.push({
                            size,
                            target: Number(target),
                            assigned
                        });
                    }
                });

                if (overAssigned.length > 0) {
                    const errors = overAssigned.map(o => 
                        `Size ${o.size}: Max pieces allowed is ${o.target}, but total (including existing) would be ${o.assigned}`
                    ).join('; ');
                    
                    return res.status(422).json({
                        success: false,
                        message: `Over-assignment detected: ${errors}`,
                        overAssigned
                    });
                }
            }
        }
        // ===== END VALIDATION =====

        // Handle Stock Order Creation
        if (!order_id) {
            let [orgs] = await connection.query("SELECT id FROM organization WHERE name = 'INTERNAL_STOCK'");
            let orgId;
            if (orgs.length === 0) {
                const [res] = await connection.query("INSERT INTO organization (name, org_name, org_type) VALUES ('INTERNAL_STOCK', 'INTERNAL STOCK PRODUCTION', 'Internal')");
                orgId = res.insertId;
            } else {
                orgId = orgs[0].id;
            }
            let [orders] = await connection.query("SELECT id FROM orders WHERE org_id = ? AND status = 'Stock'", [orgId]);
            if (orders.length === 0) {
                const [res] = await connection.query("INSERT INTO orders (org_id, date, status, remarks) VALUES (?, CURDATE(), 'Stock', 'Sentinal order for stock production')", [orgId]);
                order_id = res.insertId;
            } else {
                order_id = orders[0].id;
            }
        }

        const createdJobIds = [];

        for (const job of jobsToCreate) {
             let bal_cloth = 0;
             if (job.cloth_quantity_id && job.fabric_used) {
                 const [rows] = await connection.query(
                    'SELECT id, roll_quantity, cloth_detail_id FROM cloth_quantity WHERE id = ? FOR UPDATE',
                    [job.cloth_quantity_id]
                 );

                 if (rows.length === 0) throw new Error(`Roll #${job.cloth_quantity_id} not found`);
                 
                 const roll = rows[0];
                 const currentLen = Number(roll.roll_quantity);
                 const usedLen = Number(job.fabric_used);

                 if (currentLen < usedLen) {
                     throw new Error(`Insufficient fabric in Roll #${job.cloth_quantity_id}. Avail: ${currentLen}, Req: ${usedLen}`);
                 }

                 bal_cloth = currentLen - usedLen;

                 // Update Roll
                 await connection.query('UPDATE cloth_quantity SET roll_quantity = ? WHERE id = ?', [bal_cloth, job.cloth_quantity_id]);
                 
                 // Update Totals
                 const [sumRow] = await connection.query('SELECT SUM(roll_quantity) as total FROM cloth_quantity WHERE cloth_detail_id = ?', [roll.cloth_detail_id]);
                 await connection.query('UPDATE cloth_detail SET total_quantity = ? WHERE id = ?', [sumRow[0].total || 0, roll.cloth_detail_id]);
             }

             const sqObj = typeof job.sq === 'string' ? JSON.parse(job.sq) : job.sq;
             if (job.cloth_quantity_id && job.fabric_used) {
                 if (!sqObj._meta) sqObj._meta = { fabric: {} };
                 sqObj._meta.fabric[job.cloth_quantity_id] = Number(job.fabric_used);
             }
             const sqString = JSON.stringify(sqObj);

             const [procRes] = await connection.query(`
                 INSERT INTO cutting_process
                 (emp_id, article_id, order_id, sq, pattern_series, remarks, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
             `, [job.emp_id, article_id, order_id, sqString, pattern_series, req.body.remarks, 'Pending']);
             
             const processId = procRes.insertId;
             createdJobIds.push(processId);
 
             if (job.cloth_quantity_id && job.fabric_used) {
                 await connection.query(`
                     INSERT INTO cutting_details
                     (cutting_process_id, cloth_quantity_id, bal_cloth, cut_type, cut_rate)
                     VALUES (?, ?, ?, ?, ?)
                 `, [processId, job.cloth_quantity_id, bal_cloth, (job.cut_type && ['primary', 'secondary', 'pocket', 'kharcha'].includes(job.cut_type)) ? job.cut_type : 'primary', job.cut_rate || 0]); 
             }
        }
        
        if (order_id) {
             const [ord] = await connection.query("SELECT status FROM orders WHERE id = ?", [order_id]);
             if (ord[0].status === 'Pending') {
                 await connection.query("UPDATE orders SET status = ? WHERE id = ?", ['Partial Cutting', order_id]);
             }
        }

        await connection.commit();
        res.status(201).json({ success: true, message: 'Cutting job(s) started', jobIds: createdJobIds, orderId: order_id });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

exports.transferStock = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { source_stock_id, target_order_id, transfer_sq } = req.body;
        const [sourceRows] = await connection.query('SELECT * FROM cut_stock WHERE id = ? FOR UPDATE', [source_stock_id]);
        if (sourceRows.length === 0) throw new Error('Source stock not found');
        const sourceStock = sourceRows[0];
        const [procRows] = await connection.query('SELECT article_id, pattern_series FROM cutting_process WHERE id = ?', [sourceStock.cutting_process_id]);
        const article_id = procRows[0].article_id;
        const pattern_series = procRows[0].pattern_series;
        let sourceSq = typeof sourceStock.sq === 'string' ? JSON.parse(sourceStock.sq) : sourceStock.sq;
        let transferSqMap = typeof transfer_sq === 'string' ? JSON.parse(transfer_sq) : transfer_sq;

        for (const [size, qty] of Object.entries(transferSqMap)) {
            const transferQty = Number(qty);
            const availableQty = Number(sourceSq[size] || 0);
            if (transferQty > availableQty) throw new Error(`Insufficient stock for size ${size}. Available: ${availableQty}, Requested: ${transferQty}`);
            sourceSq[size] = availableQty - transferQty;
            if (sourceSq[size] <= 0) delete sourceSq[size];
        }

        if (Object.keys(sourceSq).length === 0) await connection.query('DELETE FROM cut_stock WHERE id = ?', [source_stock_id]);
        else await connection.query('UPDATE cut_stock SET sq = ? WHERE id = ?', [JSON.stringify(sourceSq), source_stock_id]);

        const [originalProc] = await connection.query('SELECT emp_id FROM cutting_process WHERE id = ?', [sourceStock.cutting_process_id]);
        const empIdToUse = originalProc[0].emp_id;

        const [procRes] = await connection.query(`
            INSERT INTO cutting_process
            (emp_id, article_id, order_id, sq, pattern_series, status, remarks)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [empIdToUse, article_id, target_order_id, JSON.stringify(transferSqMap), pattern_series, 'Completed', 'Transferred from Internal Stock']);
        
        const newProcessId = procRes.insertId;
        await connection.query(`INSERT INTO cut_stock (cutting_process_id, sq) VALUES (?, ?)`, [newProcessId, JSON.stringify(transferSqMap)]);
        await connection.commit();
        res.status(200).json({ success: true, message: 'Stock transferred successfully' });
    } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); }
};

exports.getInternalStock = async (req, res, next) => {
    try {
        const { article_id } = req.query;
        if (!article_id) return res.status(400).json({ success: false, message: 'Product ID (article_id) is required' });
        const [cutStock] = await db.query(`
            SELECT cs.id, cs.sq, cp.article_id, cq.cloth_detail_id, cdt.cloth_type_id, cdt.color_id, cdt.design_id, cdt.quality_id,
                   ct.type as cloth_type, c.color_name, d.design_name, q.quality_name, org.org_name
            FROM cut_stock cs
            JOIN cutting_process cp ON cs.cutting_process_id = cp.id
            JOIN orders o ON cp.order_id = o.id
            JOIN organization org ON o.org_id = org.id
            JOIN cutting_details cd ON cd.cutting_process_id = cp.id
            JOIN cloth_quantity cq ON cd.cloth_quantity_id = cq.id
            JOIN cloth_detail cdt ON cq.cloth_detail_id = cdt.id
            JOIN cloth_type ct ON cdt.cloth_type_id = ct.id
            JOIN colors c ON cdt.color_id = c.id
            JOIN design d ON cdt.design_id = d.id
            JOIN quality q ON cdt.quality_id = q.id
            WHERE (org.org_name = 'INTERNAL STOCK' OR o.org_id IN (SELECT org_id FROM orgs_articles WHERE article_id = ?))
            AND cp.article_id = ?
            AND cs.id NOT IN (SELECT cut_stock_id FROM processing)
            GROUP BY cs.id, cp.article_id, cq.cloth_detail_id, ct.type, c.color_name, d.design_name, q.quality_name,
                     cdt.cloth_type_id, cdt.color_id, cdt.design_id, cdt.quality_id, org.org_name
        `, [article_id, article_id]);

        const [sellingStockRows] = await db.query(`
            SELECT ss.article_id, oa.dress_name as article_name, a.remarks as dress_remarks, ss.size, COUNT(*) as qty, c.color_name, cd.color_id
            FROM selling_stock ss
            JOIN articles a ON ss.article_id = a.id
            JOIN cloth_detail cd ON a.cloth_detail_id = cd.id
            JOIN colors c ON cd.color_id = c.id
            LEFT JOIN orgs_articles oa ON ss.article_id = oa.article_id
            WHERE ss.article_id = ?
            GROUP BY ss.size
        `, [article_id]);

        let unifiedStock = [...cutStock];
        if (sellingStockRows.length > 0) {
            const sq = {};
            sellingStockRows.forEach(row => { sq[row.size] = row.qty; });
            unifiedStock.unshift({
                id: `finished-${sellingStockRows[0].article_id}`, sq: sq, article_id: sellingStockRows[0].article_id,
                color_name: sellingStockRows[0].color_name, cloth_type: "Finished Goods", design_name: "In Inventory",
                quality_name: "Ready to Dispatch", is_finished: true
            });
        }
        res.status(200).json({ success: true, stock: unifiedStock });
    } catch (error) { next(error); }
};

exports.recordFabricUsage = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { assigned_rolls } = req.body;
        const [procRows] = await connection.query('SELECT sq, remarks FROM cutting_process WHERE id = ? FOR UPDATE', [id]);
        if (procRows.length === 0) throw new Error('Cutting process not found');
        let currentSq = typeof procRows[0].sq === 'string' ? JSON.parse(procRows[0].sq) : procRows[0].sq;
        let remarks = procRows[0].remarks || "";
        if (!currentSq._meta) currentSq._meta = { fabric: {}, stock: {}, finished_sq: {}, assigned_rolls: [] };
        if (assigned_rolls && assigned_rolls.length > 0) {
            for (const rollId of assigned_rolls) {
                const [rows] = await connection.query('SELECT id FROM cloth_quantity WHERE id = ?', [rollId]);
                if (rows.length === 0) throw new Error(`Roll ID ${rollId} not found`);
            }
            const existingRolls = new Set(currentSq._meta.assigned_rolls || []);
            assigned_rolls.forEach(r => existingRolls.add(r));
            currentSq._meta.assigned_rolls = Array.from(existingRolls);
            remarks += ` | Assigned Rolls: ${assigned_rolls.join(', ')}`;
        }
        await connection.query('UPDATE cutting_process SET sq = ?, remarks = ?, status = ? WHERE id = ?', [JSON.stringify(currentSq), remarks, 'In Process', id]);
        await connection.commit();
        res.status(200).json({ success: true, message: 'Fabric/Stock usage recorded successfully' });
    } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); }
};

exports.completeCutting = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { roll_consumptions } = req.body;
        await connection.query("UPDATE cutting_process SET status='Completed' WHERE id = ?", [id]);
        const [rows] = await connection.query('SELECT sq, order_id, article_id, emp_id FROM cutting_process WHERE id = ?', [id]);
        if (rows.length === 0) throw new Error('Cutting job not found');
        const { sq, order_id, article_id, emp_id } = rows[0];

        if (roll_consumptions && roll_consumptions.length > 0) {
            for (const consumption of roll_consumptions) {
                const { roll_id, remaining_length } = consumption;
                await connection.query('UPDATE cloth_quantity SET roll_quantity = ? WHERE id = ?', [remaining_length, roll_id]);
                const [rollRows] = await connection.query('SELECT cloth_detail_id FROM cloth_quantity WHERE id = ?', [roll_id]);
                const [sumRow] = await connection.query('SELECT SUM(roll_quantity) as total FROM cloth_quantity WHERE cloth_detail_id = ?', [rollRows[0].cloth_detail_id]);
                await connection.query('UPDATE cloth_detail SET total_quantity = ? WHERE id = ?', [sumRow[0].total || 0, rollRows[0].cloth_detail_id]);
            }
        }

        await connection.query("INSERT INTO cut_stock (cutting_process_id, sq) VALUES (?, ?)", [id, sq]);
        await connection.commit();
        res.status(200).json({ success: true, message: 'Cutting completed successfully' });
    } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); }
};

exports.updateCutting = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { sq, pattern_series, remarks, status } = req.body;
        await db.query(`UPDATE cutting_process SET sq = ?, pattern_series = ?, remarks = ?, status = ? WHERE id = ?`, [JSON.stringify(sq), pattern_series, remarks, status, id]);
        res.status(200).json({ success: true, message: 'Cutting job updated' });
    } catch (error) { next(error); }
};

exports.deleteCutting = async (req, res, next) => {
    try {
        const { id } = req.params;
        await db.query("DELETE FROM cutting_process WHERE id = ?", [id]);
        res.status(200).json({ success: true, message: 'Cutting job deleted' });
    } catch (error) { next(error); }
};
