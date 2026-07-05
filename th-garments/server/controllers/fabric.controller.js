const db = require('../config/database');

exports.getAllFabrics = async (req, res, next) => {
    try {
        const [fabrics] = await db.query(`
            SELECT 
                cd.id,
                cd.color_id,
                cd.cloth_type_id,
                cd.design_id,
                cd.quality_id,
                cd.total_quantity,
                cd.created_on,
                cd.updated_on,
                ct.type as cloth_type,
                c.color_name,
                d.design_name,
                q.quality_name,
                (SELECT unit FROM cloth_quantity WHERE cloth_detail_id = cd.id LIMIT 1) as unit,
                (SELECT COUNT(*) FROM cloth_quantity WHERE cloth_detail_id = cd.id AND roll_quantity >= 0.01) as roll_count
            FROM cloth_detail cd
            JOIN cloth_type ct ON cd.cloth_type_id = ct.id
            JOIN colors c ON cd.color_id = c.id
            JOIN design d ON cd.design_id = d.id
            JOIN quality q ON cd.quality_id = q.id
            ORDER BY cd.updated_on DESC
        `);

        // Compute status
        const fabricsWithStatus = fabrics.map(f => {
            let status = 'out';
            if (f.total_quantity >= 100) status = 'in';
            else if (f.total_quantity > 0) status = 'low';
            
            return { ...f, status };
        });

        res.status(200).json({
            success: true,
            fabrics: fabricsWithStatus
        });
    } catch (error) {
        next(error);
    }
};

exports.getFabricById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [fabric] = await db.query(`
            SELECT 
                cd.*,
                ct.type as cloth_type,
                c.color_name,
                d.design_name,
                q.quality_name
            FROM cloth_detail cd
            JOIN cloth_type ct ON cd.cloth_type_id = ct.id
            JOIN colors c ON cd.color_id = c.id
            JOIN design d ON cd.design_id = d.id
            JOIN quality q ON cd.quality_id = q.id
            WHERE cd.id = ?
        `, [id]);

        if (fabric.length === 0) {
            return res.status(404).json({ success: false, message: 'Fabric not found' });
        }

        const [rolls] = await db.query(`
            SELECT id, cloth_detail_id, roll_quantity, unit, created_on, updated_on 
            FROM cloth_quantity 
            WHERE cloth_detail_id = ? AND roll_quantity >= 0.01
            ORDER BY id ASC
        `, [id]);

        // Format UIDs and Status context on backend
        const formattedRolls = rolls.map(r => ({
            ...r,
            uid: `${r.cloth_detail_id}.${r.id}`
        }));

        res.status(200).json({
            success: true,
            fabric: fabric[0],
            rolls: formattedRolls
        });
    } catch (error) {
        next(error);
    }
};

// Helper to find or insert normalized attributes
async function findOrInsert(table, column, value, connection) {
    const [rows] = await connection.query(`SELECT id FROM ${table} WHERE ${column} = ?`, [value]);
    if (rows.length > 0) return rows[0].id;
    
    const [result] = await connection.query(`INSERT INTO ${table} (${column}) VALUES (?)`, [value]);
    return result.insertId;
}

exports.getRollById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [rolls] = await db.query('SELECT * FROM cloth_quantity WHERE id = ?', [id]);
        if (rolls.length === 0) {
            return res.status(404).json({ success: false, message: 'Roll not found' });
        }
        res.status(200).json(rolls[0]);
    } catch (error) {
        next(error);
    }
};

exports.createFabric = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { clothType, colorName, designName, qualityName, rolls } = req.body;

        // Validation
        if (!clothType || !colorName || !designName || !qualityName || !rolls || !Array.isArray(rolls)) {
            throw new Error('Missing required fields or invalid rolls array');
        }

        // Get IDs
        const clothTypeId = await findOrInsert('cloth_type', 'type', clothType, connection);
        const colorId = await findOrInsert('colors', 'color_name', colorName, connection); // Note: Colors table structure has applicability, defaulting null is fine
        const designId = await findOrInsert('design', 'design_name', designName, connection);
        const qualityId = await findOrInsert('quality', 'quality_name', qualityName, connection);

        // Check for existing fabric with same specs
        const [existing] = await connection.query(`
            SELECT id FROM cloth_detail 
            WHERE cloth_type_id = ? AND color_id = ? AND design_id = ? AND quality_id = ?
        `, [clothTypeId, colorId, designId, qualityId]);

        let clothDetailId;
        const normalizedRolls = rolls.map(r => ({
            quantity: Number(Number(typeof r === 'object' ? r.quantity : r).toFixed(2)),
            unit: (typeof r === 'object' ? r.unit : req.body.unit) || 'Mtr.'
        }));

        if (existing.length > 0) {
            clothDetailId = existing[0].id;
            // Add new rolls to existing fabric
            const rollValues = normalizedRolls.map(r => [clothDetailId, r.quantity, r.unit]);
            await connection.query(`
                INSERT INTO cloth_quantity (cloth_detail_id, roll_quantity, unit)
                VALUES ?
            `, [rollValues]);

            // Recalculate total quantity for existing
            const [sumRow] = await connection.query(
                'SELECT SUM(roll_quantity) as total FROM cloth_quantity WHERE cloth_detail_id = ?',
                [clothDetailId]
            );
            await connection.query(
                'UPDATE cloth_detail SET total_quantity = ? WHERE id = ?',
                [sumRow[0].total || 0, clothDetailId]
            );
        } else {
            // Calculate Total
            const totalQuantity = Number(normalizedRolls.reduce((a, b) => a + b.quantity, 0).toFixed(2));

            // Insert Cloth Detail
            const [cdResult] = await connection.query(`
                INSERT INTO cloth_detail 
                (cloth_type_id, color_id, design_id, quality_id, total_quantity)
                VALUES (?, ?, ?, ?, ?)
            `, [clothTypeId, colorId, designId, qualityId, totalQuantity]);

            clothDetailId = cdResult.insertId;

            // Insert Rolls
            if (normalizedRolls.length > 0) {
                const rollValues = normalizedRolls.map(r => [clothDetailId, r.quantity, r.unit]);
                await connection.query(`
                    INSERT INTO cloth_quantity (cloth_detail_id, roll_quantity, unit)
                    VALUES ?
                `, [rollValues]);
            }
        }

        await connection.commit();

        res.status(existing.length > 0 ? 200 : 201).json({
            success: true,
            message: existing.length > 0 ? 'New rolls added to existing fabric entry' : 'Fabric added successfully',
            fabricId: clothDetailId
        });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

exports.updateFabric = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { clothType, colorName, designName, qualityName, rolls } = req.body;

        const clothTypeId = await findOrInsert('cloth_type', 'type', clothType, connection);
        const colorId = await findOrInsert('colors', 'color_name', colorName, connection);
        const designId = await findOrInsert('design', 'design_name', designName, connection);
        const qualityId = await findOrInsert('quality', 'quality_name', qualityName, connection);

        const fabricId = parseInt(id);

        // 1. Update metadata
        await connection.query(`
            UPDATE cloth_detail 
            SET cloth_type_id = ?, color_id = ?, design_id = ?, quality_id = ?
            WHERE id = ?
        `, [clothTypeId, colorId, designId, qualityId, fabricId]);

        // 2. Precise Roll Sync (No full reset)
        let skippedRolls = [];
        if (rolls && Array.isArray(rolls)) {
            // Get existing rolls to identify deletions
            const [existingRolls] = await connection.query('SELECT id FROM cloth_quantity WHERE cloth_detail_id = ?', [fabricId]);
            const existingIds = existingRolls.map(r => r.id);
            const incomingIds = rolls.filter(r => r.id).map(r => r.id);
            const idsToDelete = existingIds.filter(id => !incomingIds.includes(id));

            // A. Update Existing & Insert New
            for (const roll of rolls) {
                const qty = Number(Number(roll.roll_quantity || roll.quantity || roll.length).toFixed(2));
                const unit = roll.unit || 'Mtr.';
                if (roll.id) {
                    await connection.query('UPDATE cloth_quantity SET roll_quantity = ?, unit = ? WHERE id = ?', [qty, unit, roll.id]);
                } else {
                    await connection.query('INSERT INTO cloth_quantity (cloth_detail_id, roll_quantity, unit) VALUES (?, ?, ?)', [fabricId, qty, unit]);
                }
            }

            // B. Safe Delete
            for (const deleteId of idsToDelete) {
                try {
                    await connection.query('DELETE FROM cloth_quantity WHERE id = ?', [deleteId]);
                } catch (err) {
                    // If deletion fails (FK constraint), we skip it and warn the user
                    console.warn(`Roll #${deleteId} is linked to production and cannot be deleted.`);
                    skippedRolls.push(deleteId);
                }
            }

            // 3. Recalculate total quantity (Include skipped rolls still in DB)
            const [sumRow] = await connection.query(
                'SELECT SUM(roll_quantity) as total FROM cloth_quantity WHERE cloth_detail_id = ?',
                [fabricId]
            );
            await connection.query(
                'UPDATE cloth_detail SET total_quantity = ? WHERE id = ?',
                [Number(Number(sumRow[0].total || 0).toFixed(2)), fabricId]
            );
        }

        await connection.commit();

        res.status(200).json({
            success: true,
            message: skippedRolls.length > 0 
                ? `Updated. Note: ${skippedRolls.length} roll(s) were kept because they have production history.` 
                : 'Fabric updated successfully',
            skipped_roll_ids: skippedRolls
        });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

exports.deleteFabric = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // cloth_quantity deletes cascade via FOREIGN KEY config
        const [result] = await db.query('DELETE FROM cloth_detail WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Fabric not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Fabric deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

exports.addRolls = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { rolls } = req.body; // Array of numbers

        if (!rolls || !Array.isArray(rolls) || rolls.length === 0) {
            throw new Error('Invalid rolls data');
        }

        // 1. Insert Rolls
        const normalizedRolls = rolls.map(r => ({
            quantity: Number(Number(typeof r === 'object' ? r.quantity : r).toFixed(2)),
            unit: (typeof r === 'object' ? r.unit : (req.body.unit || 'Mtr.'))
        }));
        
        const rollValues = normalizedRolls.map(r => [id, r.quantity, r.unit]);
        await connection.query(`
            INSERT INTO cloth_quantity (cloth_detail_id, roll_quantity, unit)
            VALUES ?
        `, [rollValues]);

        // 2. Recalculate Total
        const [sumResult] = await connection.query(`
            SELECT SUM(roll_quantity) as total 
            FROM cloth_quantity 
            WHERE cloth_detail_id = ?
        `, [id]);
        
        const newTotal = Number(Number(sumResult[0].total || 0).toFixed(2));

        // 3. Update Cloth Detail
        await connection.query(`
            UPDATE cloth_detail 
            SET total_quantity = ? 
            WHERE id = ?
        `, [newTotal, id]);

        await connection.commit();

        res.status(200).json({
            success: true,
            message: 'Rolls added successfully',
            newTotal
        });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

exports.getClothTypes = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM cloth_type ORDER BY type ASC');
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

exports.getColors = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM colors ORDER BY color_name ASC');
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

exports.getDesigns = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM design ORDER BY design_name ASC');
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

exports.getQualities = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM quality ORDER BY quality_name ASC');
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

exports.getClothDetails = async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                cd.id,
                cd.color_id,
                cd.cloth_type_id,
                cd.design_id,
                cd.quality_id,
                c.applicability,
                ct.type as cloth_type,
                c.color_name,
                d.design_name,
                q.quality_name
            FROM cloth_detail cd
            JOIN cloth_type ct ON cd.cloth_type_id = ct.id
            JOIN colors c ON cd.color_id = c.id
            JOIN design d ON cd.design_id = d.id
            JOIN quality q ON cd.quality_id = q.id
            ORDER BY cd.id DESC
        `);
        res.status(200).json(rows);
    } catch (error) {
        next(error);
    }
};


exports.sellFabric = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params; // cloth_detail_id
        const { rollId, soldLength } = req.body;

        if (!rollId || !soldLength || soldLength <= 0) {
            throw new Error('Invalid roll selection or sold length');
        }

        // 1. Get current roll info
        const [rolls] = await connection.query(
            'SELECT roll_quantity FROM cloth_quantity WHERE id = ? AND cloth_detail_id = ?',
            [rollId, id]
        );

        if (rolls.length === 0) {
            throw new Error('Roll not found for this fabric');
        }

        const currentQuantity = Number(rolls[0].roll_quantity);
        if (currentQuantity < soldLength) {
            throw new Error(`Insufficient stock in selected roll. Available: ${currentQuantity}`);
        }

        // 2. Reduce roll quantity
        const newRollQuantity = Number((currentQuantity - soldLength).toFixed(2));
        await connection.query(
            'UPDATE cloth_quantity SET roll_quantity = ? WHERE id = ?',
            [newRollQuantity, rollId]
        );

        // 3. Recalculate Total for cloth_detail
        const [sumResult] = await connection.query(
            'SELECT SUM(roll_quantity) as total FROM cloth_quantity WHERE cloth_detail_id = ?',
            [id]
        );
        const newTotal = Number(Number(sumResult[0].total || 0).toFixed(2));

        await connection.query(
            'UPDATE cloth_detail SET total_quantity = ? WHERE id = ?',
            [newTotal, id]
        );

        await connection.commit();

        res.status(200).json({
            success: true,
            message: 'Fabric sold and stock reduced successfully',
            newRollQuantity,
            newTotal
        });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};
