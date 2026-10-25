const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/profile', userController.getProfile);
router.patch('/profile', userController.updateProfile);
router.delete('/account', userController.deleteAccount);

module.exports = router;
