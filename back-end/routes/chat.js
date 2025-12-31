const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const authMiddleware = require('../middlewares/authMiddleware');

// Criar conversa (comprador e vendedor)
router.post('/conversation', authMiddleware, async (req, res) => {
  const { receiverId } = req.body;

  try {
    const existing = await Conversation.findOne({
      members: { $all: [req.userId, receiverId] }
    });

    if (existing) return res.json(existing);

    const conversation = new Conversation({
      members: [req.userId, receiverId]
    });

    const saved = await conversation.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar conversas de um usuário específico
router.get('/conversations/:userId', authMiddleware, async (req, res) => {
  const { userId } = req.params;
  
  try {
    const conversations = await Conversation.find({
      members: { $in: [userId] }
    }).sort({ createdAt: -1 });

    console.log(`[CHAT-ROUTES] Encontradas ${conversations.length} conversas para usuário ${userId}`);
    res.json(conversations);
  } catch (err) {
    console.error('[CHAT-ROUTES] Erro ao buscar conversas:', err);
    res.status(500).json({ error: err.message });
  }
});

// Buscar ou criar conversa entre vendedor e comprador
router.get('/conversation/between/:sellerId/:buyerId', authMiddleware, async (req, res) => {
  const { sellerId, buyerId } = req.params;
  try {
    // Busca conversa existente
    let conversation = await Conversation.findOne({
      members: { $all: [sellerId, buyerId] }
    });
    // Se não existir, cria
    if (!conversation) {
      conversation = new Conversation({ members: [sellerId, buyerId] });
      await conversation.save();
    }
    res.json(conversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;