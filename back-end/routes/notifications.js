
const express = require('express');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const authMiddleware = require('../middlewares/authMiddleware');
const { sendNotification } = require('../services/notificationService');

const router = express.Router();

// Listar notificações do usuário autenticado
router.get('/', authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Criar nova notificação
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { userId, type, title, message, data } = req.body;
    
    console.log('[NOTIFICATION] Criando notificação:', { userId, type, title, message, data });
    
    const notification = new Notification({
      user: userId,
      type,
      title,
      message,
      data,
      isRead: false
    });

    await notification.save();
    console.log('[NOTIFICATION] Notificação criada com sucesso:', notification);
    
    res.status(201).json(notification);
  } catch (err) {
    console.log('[NOTIFICATION] Erro ao criar notificação:', err);
    res.status(500).json({ error: err.message });
  }
});

// Marcar notificação como lida
router.patch('/mark-read/:id', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $set: { isRead: true } },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: 'Notificação não encontrada' });
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Marcar todas as notificações como lidas
router.patch('/mark-all-read', authMiddleware, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user: req.userId, isRead: false },
      { $set: { isRead: true } }
    );
    console.log(`[NOTIFICATION] Marcadas ${result.modifiedCount} notificações como lidas para usuário ${req.userId}`);
    res.json({ 
      message: 'Todas as notificações foram marcadas como lidas',
      modifiedCount: result.modifiedCount 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deletar notificação
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!notification) return res.status(404).json({ error: 'Notificação não encontrada' });
    res.json({ message: 'Notificação deletada com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Simular registro de tokens para todos os compradores (apenas para desenvolvimento)
router.post('/simulate-token-registration', authMiddleware, async (req, res) => {
  try {
    const vendorId = req.userId;
    console.log(`[SIMULATE-TOKENS] 🎮 Simulando registro de tokens para compradores do vendedor: ${vendorId}`);

    // Buscar compradores do vendedor
    const vendorCarts = await Cart.find({ seller: vendorId });
    if (vendorCarts.length === 0) {
      return res.status(404).json({ error: 'Nenhum carrinho encontrado' });
    }

    const cartIds = vendorCarts.map(cart => cart._id);
    const orders = await Order.find({ cart: { $in: cartIds } }).populate('buyer');
    const uniqueBuyers = [...new Map(orders.map(order => [order.buyer._id.toString(), order.buyer])).values()];

    console.log(`[SIMULATE-TOKENS] 👥 Encontrados ${uniqueBuyers.length} compradores únicos`);

    const results = [];
    
    // Gerar tokens simulados para cada comprador
    for (const buyer of uniqueBuyers) {
      try {
        // Gerar token simulado realista
        const simulatedToken = `ExponentPushToken[${buyer._id.toString().substring(0, 22)}]`;
        
        console.log(`[SIMULATE-TOKENS] 📱 Registrando token simulado para: ${buyer.name}`);
        
        // Atualizar usuário com token simulado
        const updatedUser = await User.findByIdAndUpdate(buyer._id, {
          pushToken: simulatedToken,
          platform: buyer.platform || 'android',
          pushTokenUpdatedAt: new Date(),
          $unset: { pushTokenInvalidatedAt: 1 }
        }, { new: true });

        if (updatedUser) {
          results.push({
            buyerId: buyer._id,
            buyerName: buyer.name,
            simulatedToken: simulatedToken.substring(0, 30) + '...',
            platform: updatedUser.platform,
            status: 'registrado'
          });
          
          console.log(`[SIMULATE-TOKENS] ✅ Token simulado registrado para: ${buyer.name} | Token: ${simulatedToken.substring(0, 30)}...`);
        } else {
          results.push({
            buyerId: buyer._id,
            buyerName: buyer.name,
            status: 'erro',
            error: 'Usuário não encontrado'
          });
        }
        
      } catch (error) {
        console.error(`[SIMULATE-TOKENS] ❌ Erro ao registrar token para ${buyer.name}:`, error);
        results.push({
          buyerId: buyer._id,
          buyerName: buyer.name,
          status: 'erro',
          error: error.message
        });
      }
    }

    const totalRegistered = results.filter(r => r.status === 'registrado').length;

    console.log(`[SIMULATE-TOKENS] ✅ Simulação concluída: ${totalRegistered}/${uniqueBuyers.length} tokens registrados`);

    res.json({
      message: 'Tokens simulados registrados com sucesso!',
      totalBuyers: uniqueBuyers.length,
      totalRegistered,
      note: 'Tokens simulados para desenvolvimento. Agora você pode testar notificações push!',
      results
    });

  } catch (err) {
    console.error('[SIMULATE-TOKENS] ❌ Erro geral:', err);
    res.status(500).json({ error: 'Erro ao simular registro de tokens: ' + err.message });
  }
});

// Notificar compradores sem tokens válidos para reabrirem o app
router.post('/request-token-refresh', authMiddleware, async (req, res) => {
  try {
    const vendorId = req.userId;
    console.log(`[TOKEN-REFRESH] 🔄 Solicitando refresh de tokens para vendedor: ${vendorId}`);

    // Buscar compradores do vendedor sem tokens válidos
    const vendorCarts = await Cart.find({ seller: vendorId });
    if (vendorCarts.length === 0) {
      return res.status(404).json({ error: 'Nenhum carrinho encontrado' });
    }

    const cartIds = vendorCarts.map(cart => cart._id);
    const orders = await Order.find({ cart: { $in: cartIds } }).populate('buyer');
    const uniqueBuyers = [...new Map(orders.map(order => [order.buyer._id.toString(), order.buyer])).values()];

    // Filtrar compradores sem tokens válidos
    const buyersWithoutTokens = uniqueBuyers.filter(buyer => 
      !buyer.pushToken || 
      !buyer.pushToken.startsWith('ExponentPushToken[') || 
      buyer.pushTokenInvalidatedAt
    );

    console.log(`[TOKEN-REFRESH] 📱 Compradores sem tokens válidos: ${buyersWithoutTokens.length}/${uniqueBuyers.length}`);

    if (buyersWithoutTokens.length === 0) {
      return res.json({
        message: 'Todos os compradores já têm tokens válidos!',
        totalBuyers: uniqueBuyers.length,
        totalWithValidTokens: uniqueBuyers.length
      });
    }

    // Buscar vendedor para personalizar mensagem
    const vendor = await User.findById(vendorId);
    const vendorName = vendor ? vendor.name : 'Vendedor';

    const io = req.app.get('io');
    const notifications = [];

    // Enviar notificação in-app para compradores sem tokens
    for (const buyer of buyersWithoutTokens) {
      try {
        console.log(`[TOKEN-REFRESH] 📞 Enviando solicitação para: ${buyer.name}`);
        
        const notification = await sendNotification({
          userId: buyer._id,
          sender: vendorId,
          type: 'token_refresh',
          title: '🔄 Atualize suas Notificações',
          message: `Olá ${buyer.name}! Para receber notificações do vendedor ${vendorName}, feche e reabra o app GoandBuy. Isso ajudará a manter você informado sobre seus pedidos! 📱`,
          data: { 
            vendorId,
            vendorName,
            actionRequired: 'restart_app',
            priority: 'high'
          },
          io
        });
        
        notifications.push({
          buyerId: buyer._id,
          buyerName: buyer.name,
          notificationId: notification._id,
          status: 'notificado',
          reason: buyer.pushTokenInvalidatedAt ? 'token_invalidated' : 'token_missing'
        });

      } catch (error) {
        console.error(`[TOKEN-REFRESH] ❌ Erro ao notificar ${buyer.name}:`, error);
        notifications.push({
          buyerId: buyer._id,
          buyerName: buyer.name,
          status: 'erro',
          error: error.message
        });
      }
    }

    const totalNotified = notifications.filter(n => n.status === 'notificado').length;

    res.json({
      message: 'Solicitações de atualização enviadas!',
      vendorName,
      totalBuyers: uniqueBuyers.length,
      totalWithoutTokens: buyersWithoutTokens.length,
      totalNotified,
      instructions: 'Os compradores foram notificados para reabrir o app e atualizar seus tokens de notificação.',
      results: notifications
    });

  } catch (err) {
    console.error('[TOKEN-REFRESH] ❌ Erro geral:', err);
    res.status(500).json({ error: 'Erro ao solicitar atualização de tokens: ' + err.message });
  }
});

// Enviar notificação de teste para todos os compradores do vendedor
router.post('/test-broadcast', authMiddleware, async (req, res) => {
  try {
    const vendorId = req.userId;
    console.log(`[TEST-BROADCAST] 🚀 Iniciando envio para vendedor: ${vendorId}`);

    // Buscar todos os carrinhos do vendedor
    const vendorCarts = await Cart.find({ seller: vendorId });
    console.log(`[TEST-BROADCAST] 📦 Encontrados ${vendorCarts.length} carrinhos do vendedor`);

    if (vendorCarts.length === 0) {
      return res.status(404).json({ error: 'Nenhum carrinho encontrado para este vendedor' });
    }

    // Buscar todos os pedidos nos carrinhos do vendedor
    const cartIds = vendorCarts.map(cart => cart._id);
    const orders = await Order.find({ cart: { $in: cartIds } }).populate('buyer');
    console.log(`[TEST-BROADCAST] 🛍️ Encontrados ${orders.length} pedidos`);

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Nenhum comprador encontrado para este vendedor' });
    }

    // Obter lista única de compradores
    const uniqueBuyers = [...new Map(orders.map(order => [order.buyer._id.toString(), order.buyer])).values()];
    console.log(`[TEST-BROADCAST] 👥 Compradores únicos: ${uniqueBuyers.length}`);

    // Verificar tokens de push válidos
    const buyersWithTokens = uniqueBuyers.filter(buyer => buyer.pushToken && buyer.pushToken.startsWith('ExponentPushToken'));
    const buyersWithoutTokens = uniqueBuyers.filter(buyer => !buyer.pushToken || !buyer.pushToken.startsWith('ExponentPushToken'));
    
    console.log(`[TEST-BROADCAST] 📱 Compradores com tokens válidos: ${buyersWithTokens.length}`);
    console.log(`[TEST-BROADCAST] ❌ Compradores sem tokens: ${buyersWithoutTokens.length}`);
    
    if (buyersWithoutTokens.length > 0) {
      console.log(`[TEST-BROADCAST] ⚠️ Compradores sem tokens:`, buyersWithoutTokens.map(b => ({
        name: b.name,
        id: b._id.toString(),
        pushToken: b.pushToken || 'NENHUM'
      })));
    }

    // Buscar dados do vendedor
    const vendor = await User.findById(vendorId);
    const vendorName = vendor ? vendor.name : 'Vendedor';

    const io = req.app.get('io');
    const notifications = [];

    // Enviar para compradores com tokens válidos
    for (const buyer of buyersWithTokens) {
      try {
        console.log(`[TEST-BROADCAST] 📤 Enviando para: ${buyer.name} (Token: ${buyer.pushToken.substring(0, 30)}...)`);
        
        const notification = await sendNotification({
          userId: buyer._id,
          sender: vendorId,
          type: 'teste',
          title: '🔔 Mensagem de Teste',
          message: `Olá ${buyer.name}! Esta é uma mensagem de teste do vendedor ${vendorName}. Se você está vendo isso, as notificações estão funcionando! 📱✨`,
          data: { 
            vendorId,
            vendorName,
            testMessage: true,
            timestamp: new Date().toISOString()
          },
          io
        });
        
        notifications.push({
          buyerId: buyer._id,
          buyerName: buyer.name,
          notificationId: notification._id,
          status: 'enviado',
          hasValidToken: true
        });

      } catch (error) {
        console.error(`[TEST-BROADCAST] ❌ Erro ao enviar para ${buyer.name}:`, error);
        notifications.push({
          buyerId: buyer._id,
          buyerName: buyer.name,
          status: 'erro',
          error: error.message,
          hasValidToken: true
        });
      }
    }

    // Adicionar compradores sem tokens aos resultados
    buyersWithoutTokens.forEach(buyer => {
      notifications.push({
        buyerId: buyer._id,
        buyerName: buyer.name,
        status: 'token_invalido',
        error: 'Push token não encontrado ou inválido',
        hasValidToken: false,
        pushToken: buyer.pushToken || 'NENHUM'
      });
    });

    const totalSent = notifications.filter(n => n.status === 'enviado').length;
    const totalTokenIssues = notifications.filter(n => !n.hasValidToken).length;

    console.log(`[TEST-BROADCAST] ✅ Resumo: ${totalSent} enviadas, ${totalTokenIssues} com problemas de token`);

    res.json({
      message: 'Teste de notificações concluído!',
      vendorName,
      totalBuyers: uniqueBuyers.length,
      totalSent,
      totalWithValidTokens: buyersWithTokens.length,
      totalWithoutTokens: buyersWithoutTokens.length,
      results: notifications
    });

  } catch (err) {
    console.error('[TEST-BROADCAST] ❌ Erro geral:', err);
    res.status(500).json({ error: 'Erro ao enviar notificações de teste: ' + err.message });
  }
});

module.exports = router;
