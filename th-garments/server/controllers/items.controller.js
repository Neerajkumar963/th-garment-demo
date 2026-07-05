const db = require('../config/database');

exports.getAllItems = async (req, res, next) => {
    try {
        const [items] = await db.query(`
            SELECT i.*, m.material_required 
            FROM items i 
            LEFT JOIN material_required m ON i.id = m.item_id 
            WHERE i.is_active = 1
            ORDER BY i.name ASC
        `);
        res.status(200).json({
            success: true,
            items
        });
    } catch (error) {
        const logger = require('../utils/logger');
        logger.error('Error in getAllItems:', error.stack || error.message);
        next(error);
    }
};

exports.createItem = async (req, res, next) => {
    try {
        const { name, symbol, item_type, gender, material_required } = req.body;

        if (!name || !symbol || !item_type || !gender) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        if (symbol.length > 4) {
            return res.status(400).json({ success: false, message: 'Symbol must be max 4 chars' });
        }

        // Check uniqueness
        const [existing] = await db.query('SELECT id FROM items WHERE symbol = ?', [symbol]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Symbol already exists' });
        }

        const [result] = await db.query(
            'INSERT INTO items (name, symbol, item_type, gender) VALUES (?, ?, ?, ?)',
            [name, symbol, item_type, gender]
        );

        const itemId = result.insertId;

        // Insert material required if provided
        if (material_required) {
            await db.query(
                'INSERT INTO material_required (item_id, material_required) VALUES (?, ?)',
                [itemId, material_required]
            );
        }

        res.status(201).json({
            success: true,
            message: 'Item created successfully',
            itemId: itemId
        });

    } catch (error) {
        next(error);
    }
};

exports.updateItem = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, symbol, item_type, gender, material_required } = req.body;

        await db.query(
            'UPDATE items SET name=?, symbol=?, item_type=?, gender=? WHERE id=?',
            [name, symbol, item_type, gender, id]
        );

        // Update material required (UPSERT logic)
        const [existingMat] = await db.query('SELECT id FROM material_required WHERE item_id = ?', [id]);
        if (existingMat.length > 0) {
            await db.query(
                'UPDATE material_required SET material_required = ? WHERE item_id = ?',
                [material_required, id]
            );
        } else if (material_required) {
            await db.query(
                'INSERT INTO material_required (item_id, material_required) VALUES (?, ?)',
                [id, material_required]
            );
        }

        res.status(200).json({
            success: true,
            message: 'Item updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

exports.deleteItem = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [result] = await db.query('UPDATE items SET is_active = 0 WHERE id=?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Item archived successfully'
        });
    } catch (error) {
        next(error);
    }
};

exports.getArchivedItems = async (req, res, next) => {
    try {
        const [items] = await db.query(`
            SELECT i.*, m.material_required 
            FROM items i 
            LEFT JOIN material_required m ON i.id = m.item_id 
            WHERE i.is_active = 0
            ORDER BY i.name ASC
        `);
        res.status(200).json({
            success: true,
            items
        });
    } catch (error) {
        next(error);
    }
};

exports.restoreItem = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [result] = await db.query('UPDATE items SET is_active = 1 WHERE id=?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Item restored successfully'
        });
    } catch (error) {
        next(error);
    }
};
exports.getDefaultMaterial = async (req, res, next) => {
    try {
        const { itemId } = req.params;
        const [rows] = await db.query('SELECT material_required FROM material_required WHERE item_id = ?', [itemId]);
        
        res.status(200).json({
            success: true,
            material: rows.length > 0 ? rows[0].material_required : ""
        });
    } catch (error) {
        next(error);
    }
};
