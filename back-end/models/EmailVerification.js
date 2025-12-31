const mongoose = require('mongoose');

const emailVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    length: 6
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null para novos registros, preenchido para re-verificação
  },
  attempts: {
    type: Number,
    default: 0,
    max: 3 // Máximo 3 tentativas
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    enum: ['registration', 'resend', 'password-reset'],
    default: 'registration'
  },
  createdAt: {
    type: Date,
    default: Date.now
    // Removido expires daqui para evitar duplicação com índice manual
  }
});

// Índice composto para performance
emailVerificationSchema.index({ email: 1, code: 1 });
emailVerificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 });

module.exports = mongoose.model('EmailVerification', emailVerificationSchema);