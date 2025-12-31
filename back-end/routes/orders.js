const express = require("express");
const Order = require("../models/Order");
const authMiddleware = require("../middlewares/authMiddleware");
const Cart = require('../models/Cart'); // seu modelo mongoose
const multer = require("multer");
const path = require('path');
const Notification = require('../models/Notification');

const router = express.Router();

//configuração do multer para upload de imagens
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Garante que a pasta "uploads" exista
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({ storage: storage });
// Fazer pedido
router.post("/", authMiddleware, upload.array("images"), async (req, res) => {
  try {
    const { cart, productLink, priceUSD, description, deliveryRequested, deliveryFee } = req.body;

    // Extrair caminhos das imagens salvas
    const imagens = req.files.map(file => file.path); // Use file.filename if needed

    const orderData = {
      cart,
      buyer: req.userId,
      productLink,
      priceUSD,
      description,
      images: imagens, // ✅ use files from multer
      deliveryRequested: deliveryRequested === 'true', // Convert string to boolean
    };

    // Só adicionar deliveryFee se a entrega foi solicitada
    if (orderData.deliveryRequested && deliveryFee) {
      orderData.deliveryFee = parseFloat(deliveryFee);
    }

    const newOrder = new Order(orderData);

    await newOrder.save();

    // Adiciona o comprador ao buyerCartProgress do carrinho, se ainda não estiver
    const cartDoc = await Cart.findById(cart);
    if (cartDoc) {
      const alreadyExists = cartDoc.buyerCartProgress.some(
        (item) => item.buyer.toString() === req.userId.toString()
      );
      if (!alreadyExists) {
        cartDoc.buyerCartProgress.push({
          buyer: req.userId,
          status: 'Pedido Feito', // Corrigido: deve começar como 'Pedido Feito'
        });
      }

      // Atualiza o totalAOA desse comprador no buyerCartProgress
      // Busca todas as orders desse comprador nesse carrinho
      const buyerOrders = await Order.find({ cart, buyer: req.userId });
      const totalAOA = buyerOrders.reduce((acc, order) => acc + (order.priceUSD * (cartDoc.exchangeRate || 1)), 0);
      // Atualiza o campo totalAOA
      const progress = cartDoc.buyerCartProgress.find(
        (item) => item.buyer.toString() === req.userId.toString()
      );
      if (progress) {
        progress.totalAOA = totalAOA;
      }
      await cartDoc.save();

      // Notifica o vendedor sobre novo pedido
      try {
        const { sendNotification } = require('../services/notificationService');
        const io = req.app.get('io');
        if (cartDoc.seller) {
          await sendNotification({
            userId: cartDoc.seller,
            sender: req.userId, // comprador
            type: 'pedido',
            title: 'Novo pedido recebido',
            message: `Você recebeu um novo pedido no carrinho: ${cartDoc.cartName}.`,
            data: { orderId: newOrder._id, cartId: cartDoc._id },
            io
          });
        }
      } catch (notifErr) {
        console.error('[NOTIF] Erro ao notificar vendedor sobre novo pedido:', notifErr);
      }
    }

    res.status(201).json(newOrder);
  } catch (err) {
    console.error("Erro ao salvar pedido:", err);
    res.status(500).json({ error: err.message });
  }
});

// Atualizar comprovativo
// só para o comprovativo
router.post(
  "/:id/payment-proof",
  authMiddleware,
  upload.single("comprovativo"), // um arquivo
  async (req, res) => {
    try {
      console.log('[COMPROV] Recebida requisição de upload de comprovativo:', {
        params: req.params,
        body: req.body,
        file: req.file,
        userId: req.userId
      });
      const order = await Order.findById(req.params.id);

      if (!order) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "Arquivo não enviado." });
      }

      // salva o caminho no pedido
      order.paymentProofUrl = req.file.path;
      await order.save();

      // LOGS para debug do fluxo de notificação do comprovativo
      console.log('[COMPROV] Comprovativo enviado para orderId:', order._id, '| cartId:', order.cart);
      try {
        const { sendNotification } = require('../services/notificationService');
        const io = req.app.get('io');
        console.log('[COMPROV] io disponível?', !!io);
        // Buscar o carrinho para pegar o vendedor
        const cart = await Cart.findById(order.cart);
        console.log('[COMPROV] Cart encontrado:', cart ? cart._id : null, '| Seller:', cart ? cart.seller : null);
        if (cart && cart.seller) {
          const notif = await sendNotification({
            userId: cart.seller,
            sender: req.userId, // comprador que enviou o comprovativo
            type: 'comprovativo',
            title: 'Comprovativo enviado',
            message: 'Um novo comprovativo de pagamento foi enviado para este pedido.',
            data: { orderId: order._id, cartId: cart._id },
            io
          });
          console.log('[COMPROV] Notificação enviada para vendedor:', cart.seller, '| NotifId:', notif._id);
        } else {
          console.warn('[COMPROV] Carrinho ou vendedor não encontrado, notificação não enviada.');
        }
      } catch (notifErr) {
        console.error('[NOTIF] Erro ao notificar vendedor sobre comprovativo:', notifErr);
      }

      res.json({
        message: "Comprovativo enviado com sucesso.",
        order,
      });
    } catch (err) {
      console.error("Erro ao enviar comprovativo:", err);
      res.status(500).json({ error: err.message });
    }
  }
);


// GET /api/orders/myOrders
router.get('/myOrders', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.userId }).populate('cart');
    res.status(200).json(orders);
  } catch (error) {
    console.error("Erro ao buscar pedidos:", error);
    res.status(500).json({ error: "Erro ao buscar pedidos" });
  }
});


// GET /api/orders/cart/:cartId/buyer/:buyerId
router.get('/cart/:cartId/buyer/:buyerId', async (req, res) => {
  const { cartId, buyerId } = req.params;

  try {
    const orders = await Order.find({
      cart: cartId,
      buyer: buyerId
    })
    .populate('cart')   // se quiser trazer info do carrinho
    .populate('buyer'); // se quiser trazer info do comprador

    res.json(orders);
  } catch (err) {
    console.error('Erro ao buscar ordens:', err);
    res.status(500).json({ message: 'Erro ao buscar ordens', error: err.message });
  }
});

// GET /api/orders/cart/:cartId - Buscar todos os pedidos de um carrinho
router.get('/cart/:cartId', authMiddleware, async (req, res) => {
  const { cartId } = req.params;

  try {
    const orders = await Order.find({ cart: cartId })
      .populate('buyer', 'name email') // trazer info básica do comprador
      .populate('cart', 'cartName platform seller') // trazer info básica do carrinho
      .sort({ createdAt: -1 }); // ordenar do mais recente para o mais antigo

    res.json(orders);
  } catch (err) {
    console.error('Erro ao buscar pedidos do carrinho:', err);
    res.status(500).json({ message: 'Erro ao buscar pedidos do carrinho', error: err.message });
  }
});

// PATCH /api/orders/cart/:cartId/buyer/:buyerId/status
router.patch('/cart/:cartId/buyer/:buyerId/status', authMiddleware, async (req, res) => {
  const { cartId, buyerId } = req.params;
  const { status } = req.body;
  console.log("Atualizando status para:", status);
  console.log("Cart ID:", cartId);
  console.log("Buyer ID:", buyerId);

  try {
    // Validar status contra o enum
    const allowedStatus = ['Pedido Feito', 'Aceite', 'Em Progresso', 'Enviado', 'Entregue', 'Negado', 'Cancelado'];
    if (!allowedStatus.includes(status)) {
      console.log("[NOTIF] Status inválido recebido:", status);
      return res.status(400).json({ message: `Status inválido. Use um dos seguintes: ${allowedStatus.join(', ')}` });
    }

    // Atualizar todas as ordens do comprador nesse carrinho
    const result = await Order.updateMany(
      { cart: cartId, buyer: buyerId },
      { $set: { status } }
    );
    console.log(`[NOTIF] updateMany result:`, result);
    if (result.matchedCount === 0) {
      console.log(`[NOTIF] Nenhum pedido encontrado para atualizar. cartId:`, cartId, 'buyerId:', buyerId);
      return res.status(404).json({ message: "Nenhum pedido encontrado para atualizar." });
    }
    if (result.modifiedCount === 0) {
      console.log(`[NOTIF] Nenhum pedido foi alterado. cartId:`, cartId, 'buyerId:', buyerId);
      return res.status(200).json({ message: "Nenhum pedido foi alterado." });
    }
    console.log(`[NOTIF] Pedidos atualizados:`, result.modifiedCount);

    // Enviar notificação ao comprador
    try {
      const { sendNotification } = require('../services/notificationService');
      const io = req.app.get('io');
      const notif = await sendNotification({
        userId: buyerId,
        sender: req.userId, // quem está logado (vendedor/admin)
        type: 'status',
        title: 'Status do pedido atualizado',
        message: `O status do seu pedido foi alterado para: ${status}`,
        data: { cartId, status },
        io
      });
      console.log('[NOTIF] Notificação criada:', notif);
    } catch (notifErr) {
      console.error('[NOTIF] Erro ao criar/enviar notificação:', notifErr);
    }

    res.json({ message: "Status atualizado com sucesso!", updatedCount: result.modifiedCount });
  } catch (err) {
    console.error("Erro ao atualizar status:", err);
    res.status(500).json({ message: "Erro ao atualizar status", error: err.message });
  }
});

// PUT /api/orders/cancel/:cartId/:buyerId - Cancelar pedido do comprador
router.put('/cancel/:cartId/:buyerId', authMiddleware, async (req, res) => {
  try {
    const { cartId, buyerId } = req.params;

    console.log('[CANCEL-ORDER] Cancelando pedido:', { cartId, buyerId, requestUserId: req.userId });

    // Verificar se o usuário tem permissão para cancelar (deve ser o próprio comprador)
    if (req.userId !== buyerId) {
      return res.status(403).json({ message: 'Você só pode cancelar seus próprios pedidos' });
    }

    // Buscar o carrinho
    const cart = await Cart.findById(cartId);
    if (!cart) {
      return res.status(404).json({ message: 'Carrinho não encontrado' });
    }

    // Encontrar o progresso do comprador
    const buyerProgress = cart.buyerCartProgress.find(
      progress => progress.buyer.toString() === buyerId
    );

    if (!buyerProgress) {
      return res.status(404).json({ message: 'Pedido não encontrado para este comprador' });
    }

    // Verificar se o pedido pode ser cancelado (não pode estar aceito, enviado, cancelado, etc.)
    const allowedStatusForCancel = ['Pedido Feito', 'Aguardando', 'Em Progresso'];
    if (!allowedStatusForCancel.includes(buyerProgress.status)) {
      return res.status(400).json({ 
        message: `Não é possível cancelar o pedido. Status atual: ${buyerProgress.status}` 
      });
    }

    // Atualizar o status para 'Cancelado'
    buyerProgress.status = 'Cancelado';
    buyerProgress.updatedAt = new Date();

    await cart.save();

    // Também cancelar o pedido na coleção Order se existir
    await Order.updateOne(
      { cart: cartId, buyer: buyerId },
      { status: 'Cancelado' }
    );

    console.log('[CANCEL-ORDER] Pedido cancelado com sucesso');

    res.json({ 
      message: 'Pedido cancelado com sucesso!',
      status: 'Cancelado'
    });

  } catch (error) {
    console.error('[CANCEL-ORDER] Erro ao cancelar pedido:', error);
    res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  }
});

// PUT /api/orders/update/:cartId/:buyerId - Atualizar pedido do comprador
router.put('/update/:cartId/:buyerId', authMiddleware, upload.array("images"), async (req, res) => {
  try {
    const { cartId, buyerId } = req.params;
    const { productLink, priceUSD, description, deliveryRequested, deliveryFee } = req.body;

    console.log('[UPDATE-ORDER] Atualizando pedido:', { cartId, buyerId, requestUserId: req.userId });

    // Verificar se o usuário tem permissão para atualizar (deve ser o próprio comprador)
    if (req.userId !== buyerId) {
      return res.status(403).json({ message: 'Você só pode atualizar seus próprios pedidos' });
    }

    // Buscar o carrinho
    const cart = await Cart.findById(cartId);
    if (!cart) {
      return res.status(404).json({ message: 'Carrinho não encontrado' });
    }

    // Encontrar o progresso do comprador
    const buyerProgress = cart.buyerCartProgress.find(
      progress => progress.buyer.toString() === buyerId
    );

    if (!buyerProgress) {
      return res.status(404).json({ message: 'Pedido não encontrado para este comprador' });
    }

    // Verificar se o pedido pode ser atualizado (não pode estar aceito, enviado, cancelado, etc.)
    const allowedStatusForUpdate = ['Pedido Feito', 'Aguardando', 'Em Progresso'];
    if (!allowedStatusForUpdate.includes(buyerProgress.status)) {
      return res.status(400).json({ 
        message: `Não é possível atualizar o pedido. Status atual: ${buyerProgress.status}` 
      });
    }

    // Extrair caminhos das novas imagens, se houver
    const novasImagens = req.files ? req.files.map(file => file.path) : [];

    // Preparar dados atualizados
    const dadosAtualizados = {
      productLink,
      priceUSD: parseFloat(priceUSD),
      description,
      deliveryRequested: deliveryRequested === 'true',
    };

    // Adicionar novas imagens se foram enviadas
    if (novasImagens.length > 0) {
      dadosAtualizados.images = novasImagens;
    }

    // Só adicionar deliveryFee se a entrega foi solicitada
    if (dadosAtualizados.deliveryRequested && deliveryFee) {
      dadosAtualizados.deliveryFee = parseFloat(deliveryFee);
    }

    // Atualizar a data de modificação
    dadosAtualizados.updatedAt = new Date();

    // Atualizar o pedido na coleção Order
    const updateResult = await Order.updateOne(
      { cart: cartId, buyer: buyerId },
      dadosAtualizados
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }

    // Atualizar data no buyerCartProgress também
    buyerProgress.updatedAt = new Date();
    await cart.save();

    console.log('[UPDATE-ORDER] Pedido atualizado com sucesso');

    res.json({ 
      message: 'Pedido atualizado com sucesso!',
      updatedCount: updateResult.modifiedCount
    });

  } catch (error) {
    console.error('[UPDATE-ORDER] Erro ao atualizar pedido:', error);
    res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  }
});

// DELETE /api/orders/:orderId - Excluir pedido específico
router.delete('/:orderId', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;

    console.log('[DELETE-ORDER] Excluindo pedido:', { orderId, requestUserId: req.userId });

    // Buscar o pedido para verificar se o usuário tem permissão
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }

    // Verificar se o usuário tem permissão para excluir (deve ser o próprio comprador)
    if (req.userId !== order.buyer.toString()) {
      return res.status(403).json({ message: 'Você só pode excluir seus próprios pedidos' });
    }

    // Verificar se o pedido pode ser excluído (não pode estar aceito, enviado, etc.)
    const allowedStatusForDelete = ['Pedido Feito', 'Aguardando', 'Em Progresso'];
    if (order.status && !allowedStatusForDelete.includes(order.status)) {
      return res.status(400).json({ 
        message: `Não é possível excluir o pedido. Status atual: ${order.status}` 
      });
    }

    // Excluir o pedido
    await Order.findByIdAndDelete(orderId);

    // Atualizar o carrinho - remover o comprador se não tiver mais pedidos
    const remainingOrders = await Order.find({ cart: order.cart, buyer: order.buyer });
    if (remainingOrders.length === 0) {
      // Se não há mais pedidos deste comprador, remover do buyerCartProgress
      const cart = await Cart.findById(order.cart);
      if (cart) {
        cart.buyerCartProgress = cart.buyerCartProgress.filter(
          progress => progress.buyer.toString() !== order.buyer.toString()
        );
        await cart.save();
      }
    }

    console.log('[DELETE-ORDER] Pedido excluído com sucesso');

    res.json({ 
      message: 'Pedido excluído com sucesso!'
    });

  } catch (error) {
    console.error('[DELETE-ORDER] Erro ao excluir pedido:', error);
    res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  }
});

module.exports = router;
// GET /api/orders/notifications/:userId
router.get('/notifications/:userId', authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.params.userId }).sort({ date: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar notificações', error: err.message });
  }
});
