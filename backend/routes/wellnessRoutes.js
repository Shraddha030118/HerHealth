const express = require('express');
const router = express.Router();
const wellnessController = require('../controllers/wellnessController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/activities', wellnessController.getActivitiesCatalog);
router.post('/activities', wellnessController.logCompletedActivity);
router.get('/history', wellnessController.getHistory);

router.get('/hydration', wellnessController.getHydration);
router.post('/hydration', wellnessController.updateHydration);

module.exports = router;
