const db = require('../config/database');

// Get all label types
exports.getAllLabelTypes = async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT lt.*, i.name as item_name 
            FROM label_type lt
            JOIN items i ON lt.item_id = i.id
            ORDER BY i.name, lt.label_type
        `);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// Get label types by item_id
exports.getLabelTypesByItem = async (req, res, next) => {
    try {
        const { itemId } = req.params;
        const [rows] = await db.query('SELECT * FROM label_type WHERE item_id = ?', [itemId]);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// Get stockable labels with their current stock
exports.getStockableLabels = async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                l.id as labelling_id, 
                CONCAT(i.name, ' - ', c.color_name) as article_name, 
                org.name as org_name,
                lt.label_type,
                COALESCE(ls.quantity, 0) as stock_quantity
            FROM labelling l
            JOIN articles a ON l.article_id = a.id
            JOIN items i ON a.item_id = i.id
            JOIN cloth_detail cd ON a.cloth_detail_id = cd.id
            JOIN colors c ON cd.color_id = c.id
            LEFT JOIN organization org ON l.org_id = org.id
            JOIN label_type lt ON l.label_type_id = lt.id
            LEFT JOIN label_stock ls ON l.id = ls.labelling_id
            WHERE l.stockable = TRUE
            ORDER BY article_name
        `);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// Update/Add stock for a label
exports.addLabelStock = async (req, res, next) => {
    try {
        const { labellingId, quantity } = req.body;
        
        if (!labellingId || !quantity) {
            return res.status(400).json({ success: false, message: "Labelling ID and quantity are required" });
        }

        // Check if stock entry exists
        const [existing] = await db.query('SELECT id, quantity FROM label_stock WHERE labelling_id = ?', [labellingId]);
        
        if (existing.length > 0) {
            await db.query('UPDATE label_stock SET quantity = quantity + ? WHERE labelling_id = ?', [quantity, labellingId]);
        } else {
            await db.query('INSERT INTO label_stock (labelling_id, quantity) VALUES (?, ?)', [labellingId, quantity]);
        }

        res.status(200).json({ success: true, message: "Stock updated successfully" });
    } catch (error) {
        next(error);
    }
};

// Get labels that are NOT currently stockable
exports.getAvailableLabelsToTrack = async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                l.id as labelling_id, 
                CONCAT(i.name, ' - ', c.color_name) as article_name, 
                org.name as org_name,
                lt.label_type
            FROM labelling l
            JOIN articles a ON l.article_id = a.id
            JOIN items i ON a.item_id = i.id
            JOIN cloth_detail cd ON a.cloth_detail_id = cd.id
            JOIN colors c ON cd.color_id = c.id
            LEFT JOIN organization org ON l.org_id = org.id
            JOIN label_type lt ON l.label_type_id = lt.id
            WHERE l.stockable = FALSE
            ORDER BY org.name, article_name
        `);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// Toggle stockable status
exports.updateStockableStatus = async (req, res, next) => {
    try {
        const { labellingId, stockable } = req.body;
        if (!labellingId) {
            return res.status(400).json({ success: false, message: "Labelling ID is required" });
        }
        await db.query('UPDATE labelling SET stockable = ? WHERE id = ?', [stockable, labellingId]);
        res.status(200).json({ success: true, message: "Status updated successfully" });
    } catch (error) {
        next(error);
    }
};
// Create new label type
exports.createLabelType = async (req, res, next) => {
    try {
        const { label_type, item_id } = req.body;
        if (!label_type || !item_id) {
            return res.status(400).json({ success: false, message: "Label type name and item ID are required" });
        }

        const [result] = await db.query('INSERT INTO label_type (label_type, item_id) VALUES (?, ?)', [label_type, item_id]);
        res.status(201).json({ success: true, data: { id: result.insertId, label_type, item_id } });
    } catch (error) {
        next(error);
    }
};

// Delete label type
exports.deleteLabelType = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Check if being used
        const [inUse] = await db.query('SELECT id FROM labelling WHERE label_type_id = ? LIMIT 1', [id]);
        if (inUse.length > 0) {
            return res.status(400).json({ success: false, message: "Cannot delete: This label is already used by some products. Please remove it from products first." });
        }

        await db.query('DELETE FROM label_type WHERE id = ?', [id]);
        res.status(200).json({ success: true, message: "Label type deleted" });
    } catch (error) {
        next(error);
    }
};
