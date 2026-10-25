const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.post('/generate', reportController.previewReport);
router.get('/download', reportController.downloadPDF);
router.get('/:id/download', reportController.downloadPDF);

module.exports = router;
