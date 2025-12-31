const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const setupSocket = require('./socket');

// Rotas
const authRoutes = require('./routes/auth');
const cartRoutes = require('./routes/carts');
const orderRoutes = require('./routes/orders');

const chatRoutes = require('./routes/chat');
const messagesRoutes = require('./routes/messages');
const notificationRoutes = require('./routes/notifications');

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// Conexão Mongo
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado ao MongoDB!'))
  .catch((err) => console.error('❌ Erro ao conectar:', err));

// Usar as rotas
app.use('/api/auth', authRoutes);
app.use('/api/carts', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/uploads', express.static('uploads'));
// Rota raiz

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const io = setupSocket(server);
// Disponibiliza o io para uso nas rotas
app.set('io', io);
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
