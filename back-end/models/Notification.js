const mongoose = require('mongoose');


const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // destinatário
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // remetente (opcional)
  type: { type: String, required: true }, // ex: 'pedido', 'comprovativo', 'status', 'chat', 'feedback', 'carrinho', 'sistema'
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: Object }, // dados extras (ex: id do pedido, carrinho, etc)
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', NotificationSchema);
