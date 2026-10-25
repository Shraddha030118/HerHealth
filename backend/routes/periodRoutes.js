const express = require('express');
const router = express.Router();
const periodController = require('../controllers/periodController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', periodController.getAllPeriods);
router.post('/', periodController.createPeriod);
router.get('/:id', periodController.getPeriodById);
router.patch('/:id', periodController.updatePeriod);
router.delete('/:id', periodController.deletePeriod);

module.exports = router;
