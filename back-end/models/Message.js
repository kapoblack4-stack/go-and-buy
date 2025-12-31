const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: { type: String },
  imageUrl: { type: String }, // Para imagens
  audioUrl: { type: String }, // Para áudios
  read: { type: Boolean, default: false }, // Para controlar mensagens lidas
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);