const db = require('../config/database');

exports.calculateOrderTotals = async (orderId) => {
    try {
        // 1. Fetch details with necessary rates
        const [details] = await db.query(`
            SELECT 
                od.id,
                od.sq,
                od.article_id
            FROM order_details od
            JOIN articles a ON od.article_id = a.id
            WHERE od.order_id = ?
        `, [orderId]);

        let totalPieces = 0;
        let laborCost = 0;
        let estimatedValue = 0;

        // 2. Process each line item
        for (const item of details) {
            // Parse sq JSON: { "S": 10, "M": 20 } or similar structure
            let sq = item.sq;
            
            if (typeof sq === 'string') {
                try {
                    sq = JSON.parse(sq);
                } catch (e) {
                    console.error('Failed to parse SQ JSON', e);
                    sq = {};
                }
            }

            // Sum quantity for this line item
            let itemQty = 0;
            // Also need to match prices. Fetch price list for this dress.
            // In a real optimized system, we would join differently, but this is safe and correct.
            const [prices] = await db.query(`
                SELECT size, price FROM price_list WHERE article_id = ?
            `, [item.article_id]);

            // Create price map for quick lookup
            const priceMap = {};
            prices.forEach(p => priceMap[p.size] = Number(p.price));

            // Iterate SQ keys (Sizes)
            for (const [size, qty] of Object.entries(sq)) {
                const quantity = Number(qty);
                if (quantity > 0) {
                    itemQty += quantity;
                    
                    // Value calculation: qty * price for that size
                    const price = priceMap[size] || 0;
                    estimatedValue += (quantity * price);
                }
            }

            totalPieces += itemQty;
            
            // laborCost += (itemQty * Number(item.processing_rate));
        }

        return {
            totalPieces,
            laborCost: parseFloat(laborCost.toFixed(2)),
            estimatedValue: parseFloat(estimatedValue.toFixed(2))
        };

    } catch (error) {
        console.error('Calculation Error:', error);
        throw error;
    }
};
