const express = require('express');
const router = express.Router();
const healthAlertController = require('../controllers/healthAlertController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', healthAlertController.getAlerts);
router.post('/evaluate', healthAlertController.evaluateAll);
router.patch('/read-all', healthAlertController.markAllRead);
router.patch('/:id/read', healthAlertController.markAsRead);

module.exports = router;
