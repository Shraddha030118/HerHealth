const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/assessmentController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.post('/', assessmentController.saveAssessment);
router.get('/', assessmentController.getAssessment);
router.patch('/:id', assessmentController.updateAssessmentById);

module.exports = router;
