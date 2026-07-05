const db = require('../config/database');

// --- CLIENTS / ORGANIZATIONS ---

exports.getAllClients = async (req, res, next) => {
    try {
        const [clients] = await db.query(`
            SELECT 
                o.*,
                COALESCE(
                    (SELECT balance FROM org_account 
                     WHERE org_id = o.id 
                     ORDER BY datetime DESC LIMIT 1),
                    0
                ) as current_balance
            FROM organization o
            ORDER BY o.org_name ASC
        `);

        res.status(200).json({
            success: true,
            clients
        });
    } catch (error) {
        next(error);
    }
};

exports.getClientById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [orgs] = await db.query('SELECT * FROM organization WHERE id = ?', [id]);
        
        if (orgs.length === 0) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }

        const [balanceRow] = await db.query(`
            SELECT balance FROM org_account 
            WHERE org_id = ? 
            ORDER BY datetime DESC LIMIT 1
        `, [id]);

        const currentBalance = balanceRow.length > 0 ? balanceRow[0].balance : 0;

        res.status(200).json({
            success: true,
            client: { ...orgs[0], current_balance: currentBalance }
        });

    } catch (error) {
        next(error);
    }
};

exports.createClient = async (req, res, next) => {
    try {
        const { name, org_name, phone, email, gstin, adhaar, branch, org_type } = req.body;
        const branchJson = JSON.stringify(branch || []);

        const [result] = await db.query(`
            INSERT INTO organization 
            (name, org_name, phone, email, gstin, adhaar, branch, org_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [name, org_name, phone, email, gstin, adhaar, branchJson, org_type]);

        res.status(201).json({
            success: true,
            message: 'Client created successfully',
            clientId: result.insertId
        });

    } catch (error) {
        next(error);
    }
};

exports.updateClient = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, org_name, phone, email, gstin, adhaar, branch, org_type } = req.body;
        const branchJson = JSON.stringify(branch || []);

        const [result] = await db.query(`
            UPDATE organization 
            SET name=?, org_name=?, phone=?, email=?, gstin=?, adhaar=?, branch=?, org_type=?
            WHERE id=?
        `, [name, org_name, phone, email, gstin, adhaar, branchJson, org_type, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Client updated successfully'
        });

    } catch (error) {
        next(error);
    }
};

exports.deleteClient = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [result] = await db.query('DELETE FROM organization WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Client deleted successfully'
        });

    } catch (error) {
        next(error);
    }
};

exports.getAllProducts = async (req, res, next) => {
    try {
        const [products] = await db.query(`
            SELECT 
                a.*,
                org.org_name,
                oa.org_id,
                oa.dress_name as article_name,
                i.name as item_name,
                c.color_name,
                cd.cloth_type_id,
                cd.design_id,
                cd.quality_id,
                cd.color_id
            FROM articles a
            JOIN orgs_articles oa ON a.id = oa.article_id
            JOIN organization org ON oa.org_id = org.id
            JOIN items i ON a.item_id = i.id
            JOIN cloth_detail cd ON a.cloth_detail_id = cd.id
            JOIN colors c ON cd.color_id = c.id
            WHERE oa.status = 1
            ORDER BY oa.dress_name ASC
        `);

        // Attach labels and extensions for each product
        const productsWithLabels = await Promise.all(products.map(async (prod) => {
            const [labels] = await db.query(`
                SELECT l.*, lt.label_type 
                FROM labelling l
                JOIN label_type lt ON l.label_type_id = lt.id
                WHERE l.article_id = ? AND l.org_id = ?
            `, [prod.id, prod.org_id]);
            const [extensions] = await db.query(`
                SELECT ae.*, et.extension_type 
                FROM article_extension ae
                JOIN extension_type et ON ae.extension_type_id = et.id
                WHERE ae.article_id = ?
            `, [prod.id]);
            return { ...prod, labels, extensions };
        }));

        res.status(200).json({
            success: true,
            products: productsWithLabels
        });
    } catch (error) {
        next(error);
    }
};

// --- PRODUCTS ---

exports.getClientProducts = async (req, res, next) => {
    try {
        const { id } = req.params; // org_id

        const [products] = await db.query(`
            SELECT 
                a.*,
                oa.dress_name as article_name,
                oa.stage_code,
                i.name as item_name,
                c.color_name,
                ct.type as cloth_type,
                d.design_name,
                q.quality_name
            FROM articles a
            JOIN orgs_articles oa ON a.id = oa.article_id
            JOIN items i ON a.item_id = i.id
            JOIN cloth_detail cd ON a.cloth_detail_id = cd.id
            JOIN colors c ON cd.color_id = c.id
            JOIN cloth_type ct ON cd.cloth_type_id = ct.id
            JOIN design d ON cd.design_id = d.id
            JOIN quality q ON cd.quality_id = q.id
            WHERE oa.org_id = ? AND oa.status = 1
            ORDER BY oa.dress_name ASC
        `, [id]);

        const productsWithDetails = await Promise.all(products.map(async (prod) => {
            const [prices] = await db.query(`
                SELECT * FROM price_list 
                WHERE article_id = ? 
                ORDER BY size
            `, [prod.id]);
            const [labels] = await db.query(`
                SELECT l.*, lt.label_type 
                FROM labelling l
                JOIN label_type lt ON l.label_type_id = lt.id
                WHERE l.article_id = ? AND l.org_id = ?
            `, [prod.id, id]);
            const [extensions] = await db.query(`
                SELECT 
                    ae.*, 
                    et.extension_type,
                    c.color_name,
                    ct.type as cloth_type,
                    d.design_name,
                    q.quality_name
                FROM article_extension ae
                JOIN extension_type et ON ae.extension_type_id = et.id
                JOIN cloth_detail cd ON ae.cloth_detail_id = cd.id
                JOIN colors c ON cd.color_id = c.id
                JOIN cloth_type ct ON cd.cloth_type_id = ct.id
                JOIN design d ON cd.design_id = d.id
                JOIN quality q ON cd.quality_id = q.id
                WHERE ae.article_id = ?
            `, [prod.id]);
            return { ...prod, prices, labels, extensions };
        }));

        res.status(200).json({
            success: true,
            products: productsWithDetails
        });

    } catch (error) {
        next(error);
    }
};

exports.createClientProduct = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params; // org_id
        const { 
            dress_name, 
            item_id, 
            cloth_detail_id, 
            material_req, 
            prices,
            labels, 
            extensions,
            stage_code
        } = req.body;

        // Validation for extensions...
        if (extensions && Array.isArray(extensions) && extensions.length > 0) {
            const extensionTypeIds = extensions.map(e => e.extension_type_id);
            const [extTypes] = await connection.query(
                'SELECT id, item_id FROM extension_type WHERE id IN (?)',
                [extensionTypeIds]
            );
            
            for (const et of extTypes) {
                if (et.item_id !== parseInt(item_id)) {
                    throw new Error(`Extension ID ${et.id} is not compatible with the selected item.`);
                }
            }
        }

        let articleId = req.body.article_id;

        if (!articleId) {
            // 1. Insert Article (Master Template) if it doesn't exist
            const [articleResult] = await connection.query(`
                INSERT INTO articles 
                (item_id, cloth_detail_id, material_req, remarks)
                VALUES (?, ?, ?, ?)
            `, [item_id, cloth_detail_id, material_req, remarks]);
            articleId = articleResult.insertId;
        }

        // 2. Link to Organization with specific route
        await connection.query(`
            INSERT INTO orgs_articles (article_id, org_id, dress_name, stage_code, status)
            VALUES (?, ?, ?, ?, 1)
            ON DUPLICATE KEY UPDATE dress_name = VALUES(dress_name), stage_code = VALUES(stage_code), status = 1
        `, [articleId, id, dress_name, stage_code || 131071]);

        // 3. Insert Price List
        if (prices && Array.isArray(prices) && prices.length > 0) {
            const priceValues = prices.map(p => [articleId, p.size, p.price]);
            await connection.query(`
                INSERT INTO price_list (article_id, size, price)
                VALUES ?
            `, [priceValues]);
        }

        // 4. Insert Labelling
        if (labels && Array.isArray(labels) && labels.length > 0) {
            const labelValues = labels.map(l => [articleId, l.label_type_id, l.stockable || false, id]);
            await connection.query(`
                INSERT INTO labelling (article_id, label_type_id, stockable, org_id)
                VALUES ?
            `, [labelValues]);
        }

        // 5. Insert Extensions
        if (extensions && Array.isArray(extensions) && extensions.length > 0) {
            const extValues = extensions.map(e => [articleId, e.cloth_detail_id, e.extension_type_id]);
            await connection.query(`
                INSERT INTO article_extension (article_id, cloth_detail_id, extension_type_id)
                VALUES ?
            `, [extValues]);
        }

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Article created and linked successfully',
            productId: articleId
        });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

exports.updateClientProduct = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id, productId } = req.params;
        const { 
            dress_name, 
            item_id,
            cloth_detail_id,
            material_req, 
            prices,
            labels,
            extensions,
            stage_code,
            remarks
        } = req.body;

        // --- VALIDATION: Item matching for extensions ---
        if (extensions && Array.isArray(extensions) && extensions.length > 0) {
            // Get item_id of the product
            const [productRow] = await connection.query('SELECT item_id FROM articles WHERE id = ?', [productId]);
            if (productRow.length > 0) {
                const existingItemId = productRow[0].item_id;
                const extensionTypeIds = extensions.map(e => e.extension_type_id);
                const [extTypes] = await connection.query(
                    'SELECT id, item_id FROM extension_type WHERE id IN (?)',
                    [extensionTypeIds]
                );
                
                for (const et of extTypes) {
                    if (et.item_id !== existingItemId) {
                        throw new Error(`Extension ID ${et.id} is not compatible with this product's item type.`);
                    }
                }
            }
        }

        // 1. Update Article (Master Info)
        await connection.query(`
            UPDATE articles 
            SET item_id = ?, cloth_detail_id = ?, material_req = ?, remarks = ?
            WHERE id = ?
        `, [item_id, cloth_detail_id, material_req, remarks, productId]);

        // 1.5 Update Link (Dress Name & Organization-Specific Route)
        await connection.query(`
            UPDATE orgs_articles 
            SET dress_name = ?, stage_code = ?
            WHERE org_id = ? AND article_id = ?
        `, [dress_name, stage_code || 131071, id, productId]);

        // 2. Update Price List (Delete and re-insert for simplicity)
        if (prices && Array.isArray(prices) && prices.length > 0) {
            await connection.query('DELETE FROM price_list WHERE article_id = ?', [productId]);
            
            const priceValues = prices.map(p => [productId, p.size, p.price]);
            await connection.query(`
                INSERT INTO price_list (article_id, size, price)
                VALUES ?
            `, [priceValues]);
        }

        // 3. Update Labelling
        if (labels && Array.isArray(labels) && labels.length > 0) {
            await connection.query('DELETE FROM labelling WHERE article_id = ? AND org_id = ?', [productId, id]);
            const labelValues = labels.map(l => [productId, l.label_type_id, l.stockable || false, id]);
            await connection.query(`
                INSERT INTO labelling (article_id, label_type_id, stockable, org_id)
                VALUES ?
            `, [labelValues]);
        }

        // 4. Update Extensions
        if (extensions && Array.isArray(extensions) && extensions.length > 0) {
            await connection.query('DELETE FROM article_extension WHERE article_id = ?', [productId]);
            const extValues = extensions.map(e => [productId, e.cloth_detail_id, e.extension_type_id]);
            await connection.query(`
                INSERT INTO article_extension (article_id, cloth_detail_id, extension_type_id)
                VALUES ?
            `, [extValues]);
        }

        await connection.commit();

        res.status(200).json({
            success: true,
            message: 'Article updated successfully'
        });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

exports.deleteClientProduct = async (req, res, next) => {
    try {
        const { id, productId } = req.params;
        const [result] = await db.query(
            'UPDATE orgs_articles SET status = 0 WHERE org_id = ? AND article_id = ?', 
            [id, productId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Product link not found' });
        }
        res.status(200).json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// --- ACCOUNTS ---

exports.getClientAccount = async (req, res, next) => {
    try {
        const { id } = req.params; // org_id

        const [ledger] = await db.query(`
            SELECT * FROM org_account
            WHERE org_id = ?
            ORDER BY datetime DESC
            LIMIT 50
        `, [id]);

        res.status(200).json({
            success: true,
            ledger
        });

    } catch (error) {
        next(error);
    }
};

exports.getClientBalance = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query(`
            SELECT balance FROM org_account
            WHERE org_id = ?
            ORDER BY datetime DESC
            LIMIT 1
        `, [id]);

        const balance = rows.length > 0 ? rows[0].balance : 0;

        res.status(200).json({
            success: true,
            balance
        });

    } catch (error) {
        next(error);
    }
};
