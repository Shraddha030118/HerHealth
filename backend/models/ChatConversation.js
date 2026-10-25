const mongoose = require('mongoose');

const messageItemSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ['user', 'assistant'],
      required: true
    },
    text: {
      type: String,
      required: true
    },
    isDemoFallback: {
      type: Boolean,
      default: false
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const chatConversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    messages: [messageItemSchema],
    consentStatus: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

chatConversationSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('ChatConversation', chatConversationSchema);
