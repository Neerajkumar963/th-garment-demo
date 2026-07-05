const db = require('../config/database');

exports.getExtensionsByItem = async (req, res, next) => {
    try {
        const { itemId } = req.params;
        const [extensions] = await db.query(
            'SELECT * FROM extension_type WHERE item_id = ? ORDER BY extension_type ASC',
            [itemId]
        );

        res.status(200).json({
            success: true,
            data: extensions
        });
    } catch (error) {
        next(error);
    }
};

exports.getAllExtensionTypes = async (req, res, next) => {
    try {
        const [extensions] = await db.query('SELECT * FROM extension_type ORDER BY extension_type ASC');
        res.status(200).json({
            success: true,
            data: extensions
        });
    } catch (error) {
        next(error);
    }
};
