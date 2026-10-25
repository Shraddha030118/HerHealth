const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { requireAuth } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');

router.use(requireAuth);

router.post('/chat', aiLimiter, aiController.chat);
router.get('/conversations', aiController.getConversations);
router.delete('/conversations', aiController.clearConversation);

module.exports = router;
