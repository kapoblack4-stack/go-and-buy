
const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const authMiddleware = require('../middlewares/authMiddleware');

// Enviar mensagem
router.post('/', authMiddleware, async (req, res) => {
  const { conversationId, text } = req.body;
  try {
    const message = new Message({
      conversationId,
      sender: req.userId,
      text
    });
    const saved = await message.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rota dedicada para buscar apenas as mensagens de uma conversa
router.get('/:conversationId', authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({ conversationId: req.params.conversationId });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar última mensagem e contagem de mensagens não lidas de uma conversa
router.get('/last/:conversationId', authMiddleware, async (req, res) => {
  const { conversationId } = req.params;
  
  try {
    // Buscar última mensagem
    const lastMessage = await Message.findOne({ 
      conversationId 
    }).sort({ createdAt: -1 });

    // Contar mensagens não lidas (mensagens que não são do usuário especificado)
    const unreadCount = await Message.countDocuments({
      conversationId,
      sender: { $ne: req.userId }, // Não incluir mensagens do próprio usuário
      read: { $ne: true } // Mensagens que não foram lidas
    });

    console.log(`[MESSAGES-ROUTES] Conversa ${conversationId}: última mensagem e ${unreadCount} não lidas`);
    
    res.json({
      lastMessage,
      unreadCount
    });
  } catch (err) {
    console.error('[MESSAGES-ROUTES] Erro ao buscar última mensagem:', err);
    res.status(500).json({ error: err.message });
  }
});

// Contar mensagens não lidas de uma conversa para um usuário específico
router.get('/unread/:conversationId/:userId', authMiddleware, async (req, res) => {
  const { conversationId, userId } = req.params;
  
  try {
    // Contar mensagens não lidas (mensagens que não são do usuário especificado)
    const count = await Message.countDocuments({
      conversationId,
      sender: { $ne: userId }, // Não incluir mensagens do próprio usuário
      read: { $ne: true } // Mensagens que não foram lidas
    });

    console.log(`[MESSAGES-ROUTES] Conversa ${conversationId}: ${count} mensagens não lidas para usuário ${userId}`);
    
    res.json({ count });
  } catch (err) {
    console.error('[MESSAGES-ROUTES] Erro ao contar mensagens não lidas:', err);
    res.status(500).json({ error: err.message });
  }
});

// Marcar mensagens como lidas
router.put('/mark-read/:conversationId/:userId', authMiddleware, async (req, res) => {
  const { conversationId, userId } = req.params;
  
  try {
    console.log(`📖 [MESSAGES-API] ===== INICIANDO MARCAÇÃO COMO LIDA =====`);
    console.log(`📖 [MESSAGES-API] Conversa: ${conversationId}`);
    console.log(`📖 [MESSAGES-API] Usuário: ${userId}`);
    console.log(`📖 [MESSAGES-API] Auth userId: ${req.userId}`);
    
    // Primeiro, verificar quantas mensagens não lidas existem
    const unreadBeforeCount = await Message.countDocuments({
      conversationId,
      sender: { $ne: userId },
      read: { $ne: true }
    });
    
    console.log(`📖 [MESSAGES-API] Mensagens não lidas antes: ${unreadBeforeCount}`);
    
    // Marcar como lidas todas as mensagens da conversa que não são do usuário atual
    const result = await Message.updateMany(
      {
        conversationId,
        sender: { $ne: userId }, // Não marcar próprias mensagens como lidas
        read: { $ne: true } // Apenas mensagens que ainda não foram lidas
      },
      {
        $set: { read: true }
      }
    );

    console.log(`📖 [MESSAGES-API] Resultado da operação:`, {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      acknowledged: result.acknowledged
    });
    
    // Verificar quantas mensagens não lidas restam
    const unreadAfterCount = await Message.countDocuments({
      conversationId,
      sender: { $ne: userId },
      read: { $ne: true }
    });
    
    console.log(`📖 [MESSAGES-API] Mensagens não lidas depois: ${unreadAfterCount}`);
    console.log(`📖 [MESSAGES-API] ===== MARCAÇÃO CONCLUÍDA =====`);
    
    res.json({ 
      success: true, 
      markedAsRead: result.modifiedCount,
      conversationId,
      userId,
      unreadBefore: unreadBeforeCount,
      unreadAfter: unreadAfterCount
    });
  } catch (err) {
    console.error('📖 [MESSAGES-API] ❌ Erro ao marcar mensagens como lidas:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
