const express = require('express');
const router = express.Router();
const articlesController = require('../controllers/articles.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/', protect, articlesController.getAllArticles);
router.get('/:id', protect, articlesController.getArticleById);
router.post('/', protect, articlesController.createArticle);
router.put('/:id', protect, articlesController.updateArticle);
router.delete('/:id', protect, articlesController.deleteArticle);

module.exports = router;
