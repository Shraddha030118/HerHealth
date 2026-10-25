const express = require('express');
const router = express.Router();
const nutritionController = require('../controllers/nutritionController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', nutritionController.getNutritionData);

module.exports = router;
