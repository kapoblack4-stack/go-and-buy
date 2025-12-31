const mongoose = require('mongoose');

const passwordResetSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  code: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
    // TTL gerenciado pelo índice abaixo
  },
  used: {
    type: Boolean,
    default: false
  }
});

// Índices para performance
passwordResetSchema.index({ email: 1 });
passwordResetSchema.index({ code: 1 });
passwordResetSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 });

module.exports = mongoose.model('PasswordReset', passwordResetSchema);