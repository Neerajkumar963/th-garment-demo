const db = require('../config/database');

exports.checkFabricAvailability = async (article_id, sq) => {
    try {
        // 1. Get material requirement for the article
        const [articleRows] = await db.query(
            'SELECT item_id, cloth_detail_id FROM articles WHERE id = ?', 
            [article_id]
        );

        if (articleRows.length === 0) {
            throw new Error('Article not found');
        }

        const { cloth_detail_id } = articleRows[0];

        // 2. Calculate Total Pieces from SQ
        let totalPieces = 0;
        let sqObj = sq;
        if (typeof sq === 'string') {
            try {
                sqObj = JSON.parse(sq);
            } catch (e) {
                sqObj = {};
            }
        }

        for (const qty of Object.values(sqObj)) {
            totalPieces += Number(qty);
        }

        // Since material_req is removed, we don't calculate fabric needed here.
        // Fabric selection is now manual during cutting.
        const needed = 0; 


        // 3. Check Available Stock
        // We need to find the specific cloth_detail entry that matches this item/color
        // Start by finding matching cloth_types/colors/designs? 
        // Actually, org_dress links to item_id (which might imply cloth type) and color_id.
        // Assuming implicit link: items.id -> cloth_types?? No, schema is different.
        
        // Wait, org_dress uses `item_id` (from items table) and `color_id`.
        // `cloth_detail` uses `cloth_type_id`, `color_id`, `design_id`, `quality_id`.
        // There is no direct link unless we assume `items` maps to `cloth_types` or we look up by name?
        // OR, the system relies on manual selection of fabric.
        
        // However, the prompt says:
        // "Logic: SELECT material_req FROM org_dress... available: SELECT SUM(total_quantity) FROM cloth_detail"
        // It implies a global check or a specific check.
        // Without precise mapping logic in prompt, I will implement a GENERIC availability check 
        // that returns the global stock if filtering isn't specified, OR 
        // strictly follows the prompt's simplicity: "SELECT SUM(total_quantity) FROM cloth_detail".
        // But that would be sum of ALL fabric, which is wrong.
        
        // Let's TRY to match `color_id` at least.
        const [stockRows] = await db.query(`
            SELECT total_quantity as total 
            FROM cloth_detail 
            WHERE id = ?
        `, [cloth_detail_id]);

        const available = stockRows[0].total || 0;

        return {
            available: Number(available) >= Number(needed),
            needed: parseFloat(needed.toFixed(2)),
            stock: parseFloat(available) // 'available' variable name conflict in return object key vs value
        };

    } catch (error) {
        console.error('Availability Check Error:', error);
        throw error;
    }
};
