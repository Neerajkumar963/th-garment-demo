const db = require('../config/database');

exports.getAllArticles = async (req, res, next) => {
    try {
        const [articles] = await db.query(`
            SELECT 
                a.*,
                i.name as item_name,
                c.color_name,
                ct.type as cloth_type,
                d.design_name,
                q.quality_name
            FROM articles a
            JOIN items i ON a.item_id = i.id
            JOIN cloth_detail cd ON a.cloth_detail_id = cd.id
            JOIN colors c ON cd.color_id = c.id
            JOIN cloth_type ct ON cd.cloth_type_id = ct.id
            JOIN design d ON cd.design_id = d.id
            JOIN quality q ON cd.quality_id = q.id
            ORDER BY a.id ASC
        `);

        // Attach extensions for each article
        const articlesWithDetails = await Promise.all(articles.map(async (art) => {
            const [extensions] = await db.query(`
                SELECT ae.*, et.extension_type 
                FROM article_extension ae
                JOIN extension_type et ON ae.extension_type_id = et.id
                WHERE ae.article_id = ?
            `, [art.id]);
            return { ...art, extensions };
        }));

        res.status(200).json({
            success: true,
            articles: articlesWithDetails
        });
    } catch (error) {
        next(error);
    }
};

exports.getArticleById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [articles] = await db.query(`
            SELECT 
                a.*,
                i.name as item_name,
                c.color_name,
                ct.type as cloth_type,
                d.design_name,
                q.quality_name
            FROM articles a
            JOIN items i ON a.item_id = i.id
            JOIN cloth_detail cd ON a.cloth_detail_id = cd.id
            JOIN colors c ON cd.color_id = c.id
            JOIN cloth_type ct ON cd.cloth_type_id = ct.id
            JOIN design d ON cd.design_id = d.id
            JOIN quality q ON cd.quality_id = q.id
            WHERE a.id = ?
        `, [id]);

        if (articles.length === 0) {
            return res.status(404).json({ success: false, message: 'Article not found' });
        }

        res.status(200).json({
            success: true,
            article: articles[0]
        });
    } catch (error) {
        next(error);
    }
}

exports.createArticle = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { 
            item_id, 
            cloth_detail_id, 
            material_req, 
            remarks,
            extensions
        } = req.body;
        
        // 1. Insert Article (Master Template)
        const [result] = await connection.query(
            `INSERT INTO articles (item_id, cloth_detail_id, material_req, remarks) 
             VALUES (?, ?, ?, ?)`,
            [item_id, cloth_detail_id, material_req, remarks]
        );
        const articleId = result.insertId;

        // 2. Insert Extensions
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
            message: "Article created successfully",
            articleId
        });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

exports.updateArticle = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { 
            item_id, 
            cloth_detail_id, 
            material_req, 
            remarks,
            extensions
        } = req.body;

        // 1. Update Article (Master Template)
        await connection.query(
            `UPDATE articles 
             SET item_id = ?, cloth_detail_id = ?, material_req = ?, remarks = ?
             WHERE id = ?`,
            [item_id, cloth_detail_id, material_req, remarks, id]
        );

        // 2. Update Extensions
        if (extensions && Array.isArray(extensions)) {
            await connection.query('DELETE FROM article_extension WHERE article_id = ?', [id]);
            if (extensions.length > 0) {
                const extValues = extensions.map(e => [id, e.cloth_detail_id, e.extension_type_id]);
                await connection.query(`
                    INSERT INTO article_extension (article_id, cloth_detail_id, extension_type_id)
                    VALUES ?
                `, [extValues]);
            }
        }

        await connection.commit();
        res.status(200).json({
            success: true,
            message: "Article updated successfully"
        });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

exports.deleteArticle = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        await db.query('DELETE FROM articles WHERE id = ?', [id]);

        res.status(200).json({
            success: true,
            message: "Article deleted successfully"
        });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({
                success: false,
                message: "Cannot delete article as it is referenced by existing orders or stock."
            });
        }
        next(error);
    }
};
