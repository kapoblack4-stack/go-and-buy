const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  platform: { type: String, enum: ['Shein', 'AliExpress', 'Zara'], required: true },
  cartName: { type: String, required: true },
  description: { type: String },
  deliveryDate: { type: Date, },
  deliveryDays: { type: Number, default: 0 }, // <--- alterado para Number
  imageUrls: { type: [String], required: true }, // <--- alterado para array
  avaluation: { type: Number, default: 0 },
  avaluationCount: { type: Number, default: 0 },
  isOpen: { type: Boolean, default: true },
  isClosed: { type: Boolean, default: false },
  isCancelled: { type: Boolean, default: false },
  isFinished: { type: Boolean, default: false },
  isPaid: { type: Boolean, default: false },
  isDelivered: { type: Boolean, default: false },
  isRefunded: { type: Boolean, default: false },
  isDisputed: { type: Boolean, default: false },
  isInProgress: { type: Boolean, default: false },
  isWaitingForPayment: { type: Boolean, default: false },
  isWaitingForDelivery: { type: Boolean, default: false },
  isWaitingForRefund: { type: Boolean, default: false },
  isWaitingForDispute: { type: Boolean, default: false },
paymentProofs: [
  {
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    proofUrl: String,
    paidAt: Date
  }
]
,

buyerCartProgress: [{
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['Em Progresso', 'Pedido Feito', 'Aceite', 'Enviado', 'Entregue', 'Negado', 'Cancelado', 'Fechado'],
    default: 'Pedido Feito'
  },
  comprovativoConfirmado: { type: Boolean, default: false }, // campo novo
  comprovativoRejeitado: { type: Boolean, default: false },
  todosPedidosAceitos: { type: Boolean, default: false }, // campo novo para controle global
  finalizadoCliente: { type: Boolean, default: false },
  finalizadoVendedor: { type: Boolean, default: false },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  feedback: { type: String, maxlength: 500 },
  imagens: [{ type: String }],
}]


,
  exchangeRate: { type: Number, required: true },
  openDate: { type: Date, required: true },
  closeDate: { type: Date, required: true },
  province: { type: String }, // Nova campo para província
  pickupLocation: { type: String }, // Novo campo para local de retirada
  deliveryFee: { type: Number }, // Novo campo para taxa de entrega
});

module.exports = mongoose.model('Cart', cartSchema);
