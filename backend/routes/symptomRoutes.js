const express = require('express');
const router = express.Router();
const symptomController = require('../controllers/symptomController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', symptomController.getAllSymptoms);
router.post('/', symptomController.createSymptom);
router.get('/:id', symptomController.getSymptomById);
router.patch('/:id', symptomController.updateSymptom);
router.delete('/:id', symptomController.deleteSymptom);

module.exports = router;
