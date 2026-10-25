const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/assessmentController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.post('/', assessmentController.submitQuestionnaire);
router.post('/draft', assessmentController.saveDraft);
router.post('/preview', assessmentController.previewAssessment);
router.get('/', assessmentController.getLatest);
router.get('/latest', assessmentController.getLatest);
router.get('/history', assessmentController.getHistory);
router.get('/:id', assessmentController.getById);
router.get('/:id/assessment', assessmentController.getAssessmentById);
router.delete('/:id', assessmentController.deleteById);

module.exports = router;
