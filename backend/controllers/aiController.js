const ChatConversation = require('../models/ChatConversation');
const { generateChatResponse } = require('../services/aiService');

exports.chat = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { message, consentToStoreHistory = true } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Please enter a question or message.'
      });
    }

    // Find conversation history if consent given
    let conversation = await ChatConversation.findOne({ userId });
    if (!conversation) {
      conversation = new ChatConversation({
        userId,
        messages: [],
        consentStatus: Boolean(consentToStoreHistory)
      });
    }

    const previousMessages = conversation.consentStatus ? conversation.messages : [];

    // Generate educational AI response or demo fallback
    const result = await generateChatResponse({
      message,
      conversationHistory: previousMessages
    });

    if (conversation.consentStatus) {
      conversation.messages.push({
        sender: 'user',
        text: message.trim(),
        timestamp: new Date()
      });
      conversation.messages.push({
        sender: 'assistant',
        text: result.text,
        isDemoFallback: result.isDemoFallback,
        timestamp: new Date()
      });
      // Keep within reasonable history size
      if (conversation.messages.length > 50) {
        conversation.messages = conversation.messages.slice(-50);
      }
      await conversation.save();
    }

    return res.status(200).json({
      success: true,
      reply: result.text,
      isDemoFallback: result.isDemoFallback,
      provider: result.provider,
      disclaimer: result.disclaimer,
      conversationId: conversation._id
    });
  } catch (err) {
    next(err);
  }
};

exports.getConversations = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const conversation = await ChatConversation.findOne({ userId });
    return res.status(200).json({
      success: true,
      messages: conversation ? conversation.messages : [],
      consentStatus: conversation ? conversation.consentStatus : true
    });
  } catch (err) {
    next(err);
  }
};

exports.clearConversation = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    await ChatConversation.findOneAndDelete({ userId });
    return res.status(200).json({
      success: true,
      message: 'Chat history cleared successfully.'
    });
  } catch (err) {
    next(err);
  }
};
