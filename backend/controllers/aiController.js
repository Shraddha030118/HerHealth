/**
 * HerHealth AI — AI Chat Controller (Firebase Firestore)
 */
const { getFirestore } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');
const { generateChatResponse } = require('../services/aiService');

exports.chat = async (req, res, next) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    const { message, consentToStoreHistory = true } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Please enter a question or message.'
      });
    }

    const db = getFirestore();
    const chatDocRef = db.collection('chatConversations').doc(userId);
    const chatDoc = await chatDocRef.get();

    let conversation = chatDoc.exists
      ? chatDoc.data()
      : { userId, messages: [], consentStatus: Boolean(consentToStoreHistory) };

    const previousMessages = conversation.consentStatus ? (conversation.messages || []) : [];

    // Generate educational AI response or demo fallback
    const result = await generateChatResponse({
      message,
      conversationHistory: previousMessages
    });

    if (conversation.consentStatus) {
      const messages = conversation.messages || [];
      messages.push({
        sender: 'user',
        text: message.trim(),
        timestamp: new Date().toISOString()
      });
      messages.push({
        sender: 'assistant',
        text: result.text,
        isDemoFallback: result.isDemoFallback,
        timestamp: new Date().toISOString()
      });

      const trimmedMessages = messages.length > 50 ? messages.slice(-50) : messages;

      await chatDocRef.set({
        userId,
        messages: trimmedMessages,
        consentStatus: conversation.consentStatus,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }

    return res.status(200).json({
      success: true,
      reply: result.text,
      isDemoFallback: result.isDemoFallback,
      provider: result.provider,
      disclaimer: result.disclaimer,
      conversationId: userId
    });
  } catch (err) {
    next(err);
  }
};

exports.getConversations = async (req, res, next) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const db = getFirestore();
    const chatDoc = await db.collection('chatConversations').doc(userId).get();
    const conversation = chatDoc.exists ? chatDoc.data() : null;

    return res.status(200).json({
      success: true,
      messages: conversation ? (conversation.messages || []) : [],
      consentStatus: conversation ? conversation.consentStatus : true
    });
  } catch (err) {
    next(err);
  }
};

exports.clearConversation = async (req, res, next) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const db = getFirestore();
    await db.collection('chatConversations').doc(userId).delete();
    return res.status(200).json({
      success: true,
      message: 'Chat history cleared successfully.'
    });
  } catch (err) {
    next(err);
  }
};
