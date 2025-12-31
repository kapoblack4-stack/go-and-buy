const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  telefone: { type: String }, // Campo adicional para compatibilidade
  password: { type: String, required: true },
  isSeller: { type: Boolean, default: false },
  rating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 }, // Campo para armazenar ganhos totais
  pushToken: { type: String }, // Token para push notifications
  platform: { type: String, enum: ['ios', 'android'] }, // Plataforma do dispositivo
  profileImage: { type: String, default: '' }, // Caminho da imagem de perfil
  isAdmin: { type: Boolean, default: false },

  // Campos de verificação de email
  isEmailVerified: { type: Boolean, default: false },
  emailVerifiedAt: { type: Date, default: null },
  isActive: { type: Boolean, default: false }, // Conta ativa após verificação

  // Campos para Soft Delete
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deletionReason: { type: String, default: null }, // 'user_request', 'admin_action', etc.

  // Lista de contas bancárias
  contasBancarias: [
    {
      iban: { type: String, required: true },
      banco: { type: String, required: true }
    }
  ]
}, {
  timestamps: true // Adiciona createdAt e updatedAt automaticamente
});

module.exports = mongoose.model('User', userSchema);
