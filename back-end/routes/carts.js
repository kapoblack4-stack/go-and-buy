
const express = require('express');
const multer = require('multer');
const Order = require("../models/Order");
const Cart = require('../models/Cart'); // seu modelo mongoose
const User = require('../models/User');
const authMiddleware = require('../middlewares/authMiddleware'); // middleware de autenticação
const path = require('path');
const router = express.Router();

// Função para calcular e atualizar ganhos do vendedor
async function updateVendorEarnings(sellerId) {
  try {
    console.log('[EARNINGS] Calculando ganhos para vendedor:', sellerId);
    
    // Buscar todos os carrinhos do vendedor
    const carts = await Cart.find({ seller: sellerId });
    console.log('[EARNINGS] Carrinhos encontrados:', carts.length);
    
    let totalEarnings = 0;
    
    for (const cart of carts) {
      // Para cada carrinho, buscar pedidos finalizados
      const orders = await Order.find({ cart: cart._id });
      console.log(`[EARNINGS] Carrinho ${cart.cartName}: ${orders.length} pedidos`);
      
      for (const order of orders) {
        // Verificar se o pedido está finalizado (status "Fechado" no buyerCartProgress)
        const buyerProgress = cart.buyerCartProgress.find(
          progress => progress.buyer.toString() === order.buyer.toString()
        );
        
        if (buyerProgress && buyerProgress.status === 'Fechado') {
          const orderValueInEUR = order.priceUSD * cart.exchangeRate;
          totalEarnings += orderValueInEUR;
          console.log(`[EARNINGS] Pedido finalizado - USD: ${order.priceUSD}, Taxa: ${cart.exchangeRate}, EUR: ${orderValueInEUR}`);
        }
      }
    }
    
    console.log('[EARNINGS] Total calculado:', totalEarnings);
    
    // Atualizar ganhos do vendedor
    await User.findByIdAndUpdate(sellerId, { totalEarnings });
    console.log('[EARNINGS] Ganhos atualizados no banco para vendedor:', sellerId);
    
    return totalEarnings;
  } catch (error) {
    console.error('[EARNINGS] Erro ao calcular ganhos:', error);
    return 0;
  }
}

// Configuração do multer para upload de imagens
const storage = multer.diskStorage({
  destination: function (req, file, cb){
    cb(null, 'uploads/'); // corrigido aqui
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});


const upload = multer({ storage: storage });
router.post('/', authMiddleware, upload.array('images'), async (req, res) => {
  try {
    const { 
      platform, 
      cartName, 
      description, 
      exchangeRate, 
      openDate, 
      closeDate, 
      deliveryDate,
      province,
      pickupLocation,
      deliveryFee
    } = req.body;

    console.log('Dados recebidos:', req.body);

    // Validação das datas
    const open = new Date(openDate);
    const close = new Date(closeDate);
    const delivery = new Date(deliveryDate);

    if (isNaN(open.getTime()) || isNaN(close.getTime()) || isNaN(delivery.getTime())) {
      return res.status(400).json({ error: 'Uma ou mais datas são inválidas.' });
    }
    if (open >= close) {
      return res.status(400).json({ error: 'A data de abertura deve ser menor que a data de fecho.' });
    }
    if (close >= delivery) {
      return res.status(400).json({ error: 'A data de fecho deve ser menor que a data de entrega.' });
    }

    // Extrair caminhos das imagens salvas
    const imageUrls = req.files.map(file => file.path);

    const newCart = new Cart({
      seller: req.userId,
      platform,
      cartName,
      description,
      exchangeRate,
      openDate,
      closeDate,
      imageUrls,
      province,
      pickupLocation,
      deliveryFee: deliveryFee ? parseFloat(deliveryFee) : null,
      avaluation: 0,
      avaluationCount: 0,
      // Status do carrinho
      isOpen: true,
      isClosed: false,
      isCancelled: false,
      isFinished: false,
      isPaid: false,
      isDelivered: false,
      isRefunded: false,
      isDisputed: false,
      isInProgress: false,
      isWaitingForPayment: false,
      isWaitingForDelivery: false,
      isWaitingForRefund: false,
      isWaitingForDispute: false,
      deliveryDays: parseInt(req.body.deliveryDays) || 0,
      deliveryDate: deliveryDate
    });

    await newCart.save();
    console.log('Carrinho criado com sucesso:', newCart);
    res.status(201).json(newCart);
  } catch (err) {
    console.error('Erro ao criar carrinho:', err);
    res.status(500).json({ error: err.message });
  }
});



// Ver todos carrinhos abertos
router.get('/', async (req, res) => {
  try {
    let carts = await Cart.find()
      .populate('seller', 'name email rating profileImage')
      .where('isOpen', true)
      .lean();

    // Adicionar quantidade de itens e total
    carts = await Promise.all(
      carts.map(async cart => {
        const orders = await Order.find({ cart: cart._id });

        const itemCount = orders.length;
        const totalPrice = orders.reduce((sum, order) => {
          return sum + (order.priceUSD * cart.exchangeRate);
        }, 0);

        return {
          ...cart,
          itemCount,
          totalPrice
        };
      })
    );

    res.json(carts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Ver detalhes de um carrinho
router.get('/:id', async (req, res) => {
  try {
    const cart = await Cart.findById(req.params.id)
      .populate('seller', 'name email rating profileImage')
      .populate({
        path: 'buyerCartProgress.buyer',
        select: 'name email phone profileImage',
        model: 'User'
      })
      .lean();
    if (!cart) return res.status(404).json({ error: 'Carrinho não encontrado' });

    // Buscar pedidos relacionados ao carrinho para calcular itemCount e totalPrice
    const orders = await Order.find({ cart: cart._id });

    const itemCount = orders.length;
    const totalPrice = orders.reduce((sum, order) => {
      return sum + (order.priceUSD * cart.exchangeRate);
    }, 0);

    // Adicionar campos calculados ao carrinho
    const cartWithCalculatedFields = {
      ...cart,
      itemCount,
      totalPrice: Math.round(totalPrice * 100) / 100 // Arredondar para 2 casas decimais
    };

    console.log('[CART-API] Carrinho buscado:', {
      id: cart._id,
      name: cart.cartName,
      buyersCount: cart.buyerCartProgress?.length || 0,
      buyersPopulated: cart.buyerCartProgress?.map(bp => ({
        buyerId: bp.buyer?._id || bp.buyer,
        buyerName: bp.buyer?.name || 'N/A'
      })) || []
    });

    res.json(cartWithCalculatedFields);
  } catch (err) {
    console.error('[CART-API] Erro ao buscar carrinho:', err);
    res.status(500).json({ error: err.message });
  }
});

// ver carrinhos de um vendedor específico
router.get('/seller/:sellerId', async (req, res) => {
  try {
    let carts = await Cart.find({
      seller: req.params.sellerId
    })
      .populate('seller', 'name email rating profileImage')
      .lean();

    // Adicionar quantidade de itens e preço total
    carts = await Promise.all(
      carts.map(async cart => {
        const orders = await Order.find({ cart: cart._id });

        const itemCount = orders.length;
        const totalPrice = orders.reduce((sum, order) => {
          return sum + (order.priceUSD * cart.exchangeRate);
        }, 0);

        return {
          ...cart,
          itemCount,
          totalPrice
        };
      })
    );

    res.json(carts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/platform/:platform', async (req, res) => {
  try {
    const platform = req.params.platform;
    const carts = await Cart.find({ platform }).populate('seller', 'name email rating profileImage');
    res.json(carts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/buyer/my-carts', authMiddleware, async (req, res) => {
  try {
    const buyerId = req.userId;
    console.log("[MY-CARTS] 🔍 Buscando carrinhos para buyer:", buyerId);

    // Buscar todos os pedidos do comprador
    const orders = await Order.find({ buyer: buyerId });
    console.log("[MY-CARTS] 📦 Pedidos encontrados:", orders.length);

    // Extrair IDs únicos dos carrinhos
    const cartIds = [...new Set(orders.map(order => order.cart.toString()))];
    console.log("[MY-CARTS] 🛒 IDs dos carrinhos:", cartIds);

    // Buscar os carrinhos
    const carts = await Cart.find({ _id: { $in: cartIds } })
      .populate('seller', 'name email phone rating profileImage contasBancarias')
      .lean();
    
    console.log("[MY-CARTS] ✅ Carrinhos encontrados:", carts.length);

    // Adicionar quantidade de itens e preço total
    const cartsWithCountAndTotal = await Promise.all(
      carts.map(async cart => {
        // Buscar todos os pedidos desse carrinho feitos pelo comprador atual
        const cartOrders = await Order.find({ cart: cart._id, buyer: buyerId });

        const itemCount = cartOrders.length;

        // Calcular total em KZ (priceUSD * exchangeRate)
        const totalPrice = cartOrders.reduce((sum, order) => {
          return sum + (order.priceUSD * cart.exchangeRate);
        }, 0);

        return {
          ...cart,
          itemCount,
          totalPrice // total já multiplicado pelo câmbio
        };
      })
    );

    // Debug: Log do buyerCartProgress de cada carrinho
    cartsWithCountAndTotal.forEach((cart, index) => {
      console.log(`[MY-CARTS] Carrinho ${index + 1} - buyerCartProgress:`, 
        cart.buyerCartProgress?.map(p => ({
          buyer: p.buyer,
          status: p.status,
          comprovativoConfirmado: p.comprovativoConfirmado
        }))
      );
    });

    console.log("[MY-CARTS] 📤 Retornando", cartsWithCountAndTotal.length, "carrinhos");
    res.status(200).json(cartsWithCountAndTotal);
  } catch (err) {
    console.error('Erro ao buscar carrinhos do comprador:', err);
    res.status(500).json({ error: 'Erro ao buscar carrinhos' });
  }
});


router.post("/:cartId/payment-proof", authMiddleware, upload.single("paymentProof"), async (req, res) => {
  try {
    const { cartId } = req.params;

    const cart = await Cart.findById(cartId);
    if (!cart) return res.status(404).json({ error: "Carrinho não encontrado" });

    // Remove comprovativo antigo desse comprador
    cart.paymentProofs = cart.paymentProofs.filter(
      proof => proof.buyer.toString() !== req.userId
    );

    // Adiciona novo comprovativo
    cart.paymentProofs.push({
      buyer: req.userId,
      proofUrl: req.file.path,
      paidAt: new Date()
    });

    // Inicializa buyerCartProgress se não existir
    if (!Array.isArray(cart.buyerCartProgress)) {
      cart.buyerCartProgress = [];
    }

    // Remove progresso antigo desse comprador
    cart.buyerCartProgress = cart.buyerCartProgress.filter(
      progress => progress.buyer.toString() !== req.userId
    );

    // Adiciona progresso inicial já como "Em Progresso"
    cart.buyerCartProgress.push({
      buyer: req.userId,
      status: "Em Progresso",
      updatedAt: new Date()
    });

    await cart.save();

    // 📌 Atualiza TODAS as orders desse carrinho para esse comprador
    await Order.updateMany(
      { cart: cartId, buyer: req.userId },
      { $set: { status: "Em Progresso" } }
    );

    // Notificações para comprador e vendedor
    try {
      const { sendNotification } = require('../services/notificationService');
      const io = req.app.get('io');
      // Notifica o comprador
      const buyerId = req.userId;
      await sendNotification({
        userId: buyerId,
        sender: buyerId,
        type: 'comprovativo',
        title: 'Comprovativo recebido',
        message: 'Seu comprovativo foi recebido e está em análise.',
        data: { cartId, proofUrl: req.file.path },
        io
      });
      // Notifica o vendedor
      if (cart.seller) {
        // Buscar nome do comprador
        let buyerName = 'Um comprador';
        try {
          const User = require('../models/User');
          const buyer = await User.findById(buyerId);
          if (buyer && buyer.name) buyerName = buyer.name;
        } catch (e) {}
        await sendNotification({
          userId: cart.seller,
          sender: buyerId,
          type: 'comprovativo',
          title: 'Novo comprovativo enviado',
          message: `${buyerName} enviou um comprovativo no carrinho ${cart.cartName}.`,
          data: { cartId, buyerId, proofUrl: req.file.path },
          io
        });
        console.log(`[NOTIF] Notificação enviada para vendedor (${cart.seller}) sobre comprovativo de ${buyerName}`);
      }
    } catch (notifErr) {
      console.error('[NOTIF] Erro ao enviar notificação de comprovativo:', notifErr);
    }

    // Emitir evento via socket.io para atualização em tempo real
    if (req.app.get('io')) {
      req.app.get('io').emit('cartUpdated', cartId);
    }

    res.json({ message: "Comprovativo adicionado, progresso e orders atualizados", cart });
  } catch (err) {
    console.error("Erro ao enviar comprovativo:", err);
    res.status(500).json({ error: err.message });
  }
});


router.get("/cart/:cartId/buyer/:buyerId", async (req, res) => {
  try {
    const orders = await Order.find({
      cart: req.params.cartId,
      buyer: req.params.buyerId
    })
    .populate("product")
    .populate("buyer");

    res.json(orders); // ✅ Sempre JSON
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar ordens" }); // ✅ JSON no erro
  }
});

// Ver carrinhos abertos de um vendedor específico
router.get('/seller/:sellerId/open', async (req, res) => {
  try {
    let carts = await Cart.find({
      seller: req.params.sellerId,
      status: { $ne: 'Fechado' }, // $ne = not equal
      isOpen: true // só carrinhos abertos

      
    })
      .populate('seller', 'name email rating profileImage')
      .lean();

    // Adicionar quantidade de itens e preço total
    carts = await Promise.all(
      carts.map(async cart => {
        const orders = await Order.find({ cart: cart._id });

        const itemCount = orders.length;
        const totalPrice = orders.reduce((sum, order) => {
          return sum + (order.priceUSD * cart.exchangeRate);
        }, 0);

        return {
          ...cart,
          itemCount,
          totalPrice
        };
      })
    );

    res.json(carts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/cart/:cartId/status
router.put('/cart/:cartId/status', async (req, res) => {
  const { status, buyerId } = req.body;

  try {
    // Atualiza todas as orders do carrinho
    await Order.updateMany(
      { cart: req.params.cartId },
      { $set: { status } }
    );

    // Atualiza o buyerCartProgress do comprador
    await BuyerCartProgress.updateOne(
      { buyer: buyerId, cart: req.params.cartId },
      { $set: { status } }
    );

    res.json({ message: `Carrinho e pedidos atualizados para ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// PATCH /api/orders/:cartId/buyer-progress
// Atualiza o status do comprador no carrinho
router.patch('/:cartId/buyer-progress', async (req, res) => {
  const { cartId } = req.params;
  const { buyerId, status } = req.body;
  console.log("\n\n\n[UPDATE-STATUS] Atualizando status do comprador:", { cartId, buyerId, status });
  try {
    // Busca o carrinho
    const cart = await Cart.findById(cartId);
    if (!cart) {
      console.log("[UPDATE-STATUS] ❌ Carrinho não encontrado");
      return res.status(404).json({ message: 'Carrinho não encontrado.' });
    }
    console.log("[UPDATE-STATUS] ✅ Carrinho encontrado:", cart._id);
    console.log("[UPDATE-STATUS] Estado atual do buyerCartProgress:", cart.buyerCartProgress);
    
    // Atualiza o status do comprador específico
    let updated = false;
    cart.buyerCartProgress = cart.buyerCartProgress.map(item => {
      console.log("[UPDATE-STATUS] Verificando item:", item.buyer.toString(), "vs", buyerId);
      if (item.buyer.toString() === buyerId) {
        updated = true;
        console.log(`[UPDATE-STATUS] ✅ Atualizando de ${item.status} para ${status}`);
        
        let updatedItem = { ...item, status };
        
        // Se status for "Aceite", marca comprovativoConfirmado como true
        if (status === "Aceite") {
          updatedItem.comprovativoConfirmado = true;
        }
        
        // Se status for "Fechado", marca como finalizado
        if (status === "Fechado") {
          updatedItem.finalizadoCliente = true;
          updatedItem.finalizadoVendedor = true;
        }
        
        return updatedItem;
      }
      return item;
    });

    // Se não encontrou o comprador, criar um novo registro
    if (!updated) {
      console.log("[UPDATE-STATUS] ⚠️ Comprador não encontrado, criando novo registro...");
      const newProgress = {
        buyer: buyerId,
        status: status,
        comprovativoConfirmado: status === "Aceite",
        comprovativoRejeitado: false,
        finalizadoCliente: status === "Fechado",
        finalizadoVendedor: status === "Fechado",
        rating: 0,
        feedback: "",
        imagens: []
      };
      cart.buyerCartProgress.push(newProgress);
      updated = true;
      console.log("[UPDATE-STATUS] ✅ Novo registro criado para o comprador");
    }

    // Atualizar campos do carrinho baseado nos status dos compradores
    const allClosed = cart.buyerCartProgress.every(progress => 
      progress.status === 'Fechado' || progress.status === 'Cancelado' || progress.status === 'Negado'
    );
    
    if (allClosed && cart.buyerCartProgress.length > 0) {
      cart.isFinished = true;
      cart.isClosed = true;
      cart.isOpen = false;
      console.log("[UPDATE-STATUS] 🏁 Carrinho marcado como finalizado - todos compradores finalizaram");
    }

    await cart.save();
    console.log("[UPDATE-STATUS] ✅ Status atualizado! Novo estado:", cart.buyerCartProgress);

    // Emitir evento via socket.io
    if (req.app.get('io')) {
      console.log("[UPDATE-STATUS] 📡 Emitindo evento cartUpdated via socket.io");
      req.app.get('io').emit('cartUpdated', cartId);
    } else {
      console.log("[UPDATE-STATUS] ⚠️ Socket.io não disponível");
    }

    res.json({ message: 'Status do comprador atualizado com sucesso!', cart });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar buyerCartProgress.', error: err });
  }
});


// Atualiza o cartProgress do comprador, incluindo status, rating, feedback e imagens
router.patch('/:cartId/buyer-progress-feed', async (req, res) => {
  const { cartId } = req.params;
  const { buyerId, status, rating, feedback, imagens, comFeedback } = req.body;

  console.log('[FEEDBACK] Recebendo dados:', { buyerId, status, rating, feedback: feedback ? 'tem feedback' : 'sem feedback', comFeedback });

  try {
    const cart = await Cart.findById(cartId);
    if (!cart) return res.status(404).json({ message: 'Carrinho não encontrado.' });

    let updated = false;
    cart.buyerCartProgress = cart.buyerCartProgress.map(item => {
      // Garante que funciona se buyer for ObjectId ou objeto
      const itemBuyerId = item.buyer?._id ? item.buyer._id.toString() : item.buyer.toString();
      if (itemBuyerId === buyerId) {
        updated = true;
        return {
          ...item,
          status: status || item.status,
          rating: rating !== undefined ? rating : item.rating,
          feedback: feedback !== undefined ? feedback : item.feedback,
          imagens: imagens !== undefined ? imagens : item.imagens,
        };
      }
      return item;
    });

    if (!updated) return res.status(404).json({ message: 'Comprador não encontrado no carrinho.' });

    await cart.save();
    
    // Se status for 'Fechado' e NÃO há feedback (comFeedback = false), enviar notificação para o vendedor
    if (status === 'Fechado' && comFeedback === false) {
      console.log('[FEEDBACK] Enviando notificação de finalização sem feedback');
      try {
        const { sendNotification } = require('../services/notificationService');
        const sellerId = cart.seller;
        const buyerUser = await require('../models/User').findById(buyerId);
        const buyerName = buyerUser ? buyerUser.name : 'Comprador';
        const io = req.app.get('io');
        await sendNotification({
          userId: sellerId,
          sender: buyerId,
          type: 'feedback',
          title: 'Pedido finalizado sem feedback',
          message: `${buyerName} finalizou o pedido sem enviar feedback no carrinho ${cart.cartName}.`,
          data: { cartId, buyerId },
          io
        });
        console.log(`[NOTIF] Notificação enviada para vendedor (${sellerId}) sobre finalização sem feedback.`);
      } catch (err) {
        console.error('[NOTIF] Erro ao enviar notificação para vendedor:', err);
      }
    } else if (status === 'Fechado' && comFeedback === true) {
      console.log('[FEEDBACK] Pedido finalizado COM feedback - não enviando notificação duplicada');
    }
    
    // Se o status foi alterado para 'Fechado', atualizar ganhos do vendedor
    if (status === 'Fechado') {
      console.log('[EARNINGS] Pedido marcado como fechado, atualizando ganhos do vendedor...');
      try {
        const updatedEarnings = await updateVendorEarnings(cart.seller);
        console.log('[EARNINGS] Ganhos atualizados:', updatedEarnings);
      } catch (error) {
        console.error('[EARNINGS] Erro ao atualizar ganhos:', error);
      }
    }
    
    res.json({ message: 'Feedback salvo com sucesso!', cart });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao salvar feedback.', error: err });
  }
});


// PATCH /:cartId/buyer-finalize
// Atualiza finalizadoCliente ou finalizadoVendedor para true
router.patch('/:cartId/buyer-finalize', async (req, res) => {
  const { cartId } = req.params;
  const { buyerId, tipo } = req.body; // tipo: 'cliente' ou 'vendedor'
  if (!['cliente', 'vendedor'].includes(tipo)) {
    return res.status(400).json({ message: 'Tipo deve ser "cliente" ou "vendedor".' });
  }
  try {
    const cart = await Cart.findById(cartId);
    if (!cart) return res.status(404).json({ message: 'Carrinho não encontrado.' });
    let updated = false;
    cart.buyerCartProgress = cart.buyerCartProgress.map(item => {
      if (item.buyer.toString() === buyerId) {
        updated = true;
        if (tipo === 'cliente') {
          return { ...item, finalizadoCliente: true };
        } else {
          return { ...item, finalizadoVendedor: true };
        }
      }
      return item;
    });
    if (!updated) return res.status(404).json({ message: 'Comprador não encontrado no carrinho.' });
    await cart.save();
    // Emitir evento via socket.io
    if (req.app.get('io')) {
      req.app.get('io').emit('cartUpdated', cartId);
    }
    res.json({ message: `Finalização marcada para ${tipo}.`, cart });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao finalizar pedido.', error: err });
  }
});

// Endpoint para rejeitar comprovativo sem rejeitar o pedido
router.post('/:cartId/rejeitar-comprovativo', authMiddleware, async (req, res) => {
  try {
    const { cartId } = req.params;
    const { buyerId } = req.body;
    console.log('--- [REJEITAR COMPROVATIVO] ---');
    console.log('CartId:', cartId);
    console.log('BuyerId (from body):', buyerId);
    const cart = await Cart.findById(cartId);
    if (!cart) {
      console.log('[REJEITAR] Carrinho não encontrado:', cartId);
      return res.status(404).json({ error: 'Carrinho não encontrado' });
    }
    let found = false;
    cart.buyerCartProgress.forEach(progress => {
      console.log('[REJEITAR] Progress buyer:', progress.buyer.toString(), 'Status:', progress.status, 'comprovativoRejeitado:', progress.comprovativoRejeitado);
      if (progress.buyer.toString() === buyerId) {
        progress.comprovativoRejeitado = true;
        found = true;
        console.log('[REJEITAR] -> Marcando comprovativoRejeitado = true para este comprador');
      }
    });
    if (!found) {
      console.log('[REJEITAR] Nenhum buyerCartProgress encontrado para este buyerId!');
    }
    await cart.save();
    // Buscar novamente do banco para garantir
    const cartAfter = await Cart.findById(cartId);
    console.log('[REJEITAR] buyerCartProgress após save:', cartAfter.buyerCartProgress.map(p => ({ buyer: p.buyer, comprovativoRejeitado: p.comprovativoRejeitado })));
    // Notificação para o comprador
    try {
      const { sendNotification } = require('../services/notificationService');
      const io = req.app.get('io');
      if (buyerId) {
        await sendNotification({
          userId: buyerId,
          sender: req.userId,
          type: 'comprovativo',
          title: 'Comprovativo rejeitado',
          message: 'Seu comprovativo foi rejeitado pelo vendedor.',
          data: { cartId },
          io
        });
        console.log(`[NOTIF] Notificação enviada para comprador (${buyerId}) sobre rejeição de comprovativo.`);
      }
    } catch (notifErr) {
      console.error('[NOTIF] Erro ao enviar notificação de rejeição de comprovativo:', notifErr);
    }
    if (req.app.get('io')) {
      req.app.get('io').emit('cartUpdated', cartId);
    }
    res.json({ message: 'Comprovativo rejeitado, pedido permanece em progresso', cart: cartAfter });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar todos os carrinhos do vendedor (ativos e completos)
router.get('/seller/:sellerId/all', authMiddleware, async (req, res) => {
  // Executa fechamento automático antes de buscar os carrinhos
  await fecharCarrinhosAutomaticamente();
  try {
    console.log('--- [GET] /seller/:sellerId/all ---');
    console.log('Headers:', req.headers);
    console.log('User autenticado:', req.userId);
    const { sellerId } = req.params;
    const mongoose = require('mongoose');
    let sellerObjectId;
    try {
      sellerObjectId = new mongoose.Types.ObjectId(sellerId);
    } catch (e) {
      console.warn('sellerId não é um ObjectId válido:', sellerId);
      sellerObjectId = sellerId;
    }
    console.log('sellerId param:', sellerId, '| sellerObjectId:', sellerObjectId);
    let carts = await Cart.find({ $or: [ { seller: sellerId }, { seller: sellerObjectId } ] })
      .populate({
        path: 'buyerCartProgress.buyer',
        select: 'name email phone profileImage',
        model: 'User'
      })
      .lean();
    console.log('Carrinhos encontrados (após filtro por seller):', carts.length, carts.map(c => c._id));
    // Adicionar quantidade de itens e total
    carts = await Promise.all(
      carts.map(async cart => {
        const orders = await Order.find({ cart: cart._id });
        cart.itemCount = orders.length;
        cart.totalPrice = orders.reduce((sum, order) => sum + (order.priceUSD * cart.exchangeRate), 0);
        return cart;
      })
    );
    console.log('Carrinhos finais enviados:', carts.length);
    res.status(200).json(carts);
  } catch (err) {
    console.error('Erro ao buscar carrinhos do vendedor:', err);
    res.status(500).json({ error: 'Erro ao buscar carrinhos do vendedor', details: err.message });
  }
});

// Função utilitária para fechamento automático de carrinhos
async function fecharCarrinhosAutomaticamente() {
  const now = new Date();
  // Busca carrinhos que já passaram da data de fecho, não estão fechados nem cancelados
  const carrinhosParaFechar = await Cart.find({
    isClosed: false,
    isCancelled: false,
    closeDate: { $lt: now }
  });
  for (const cart of carrinhosParaFechar) {
    // Só fecha se TODOS os compradores estiverem com status final
    const todosFinalizados = cart.buyerCartProgress.every(progress =>
      ['Entregue', 'Fechado', 'Cancelado'].includes(progress.status)
    );
    if (todosFinalizados) {
      cart.isClosed = true;
      await cart.save();
      console.log(`[Fechamento Automático] Carrinho ${cart._id} fechado automaticamente.`);
    }
  }
}

// Endpoint para fechar carrinho manualmente
router.post('/:id/close', authMiddleware, async (req, res) => {
  try {
    const cartId = req.params.id;
    const cart = await Cart.findById(cartId);
    if (!cart) {
      return res.status(404).json({ error: 'Carrinho não encontrado.' });
    }
    if (cart.isClosed) {
      return res.status(400).json({ error: 'Carrinho já está fechado.' });
    }
    // Só fecha se todos os compradores estiverem com status final
    const todosFinalizados = cart.buyerCartProgress.every(progress =>
      ['Entregue', 'Fechado', 'Cancelado'].includes(progress.status)
    );
    if (!todosFinalizados) {
      return res.status(400).json({ error: 'Nem todos os compradores finalizaram. Não é possível fechar o carrinho.' });
    }
    cart.isClosed = true;
    await cart.save();
    // Notifica o vendedor
    try {
      const { sendNotification } = require('../services/notificationService');
      const io = req.app.get('io');
      await sendNotification({
        userId: cart.seller,
        sender: req.userId,
        type: 'carrinho',
        title: 'Carrinho fechado',
        message: 'Seu carrinho foi fechado com sucesso.',
        data: { cartId: cart._id },
        io
      });
    } catch (notifErr) {
      console.error('[NOTIF] Erro ao notificar vendedor sobre fechamento:', notifErr);
    }
    res.json({ message: 'Carrinho fechado com sucesso!', cart });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para recalcular ganhos de um vendedor específico
router.post('/:sellerId/recalculate-earnings', async (req, res) => {
  try {
    const { sellerId } = req.params;
    console.log('[RECALC] Recalculando ganhos para vendedor:', sellerId);
    
    const updatedEarnings = await updateVendorEarnings(sellerId);
    
    res.json({ 
      message: 'Ganhos recalculados com sucesso!', 
      sellerId,
      totalEarnings: updatedEarnings 
    });
  } catch (error) {
    console.error('[RECALC] Erro ao recalcular ganhos:', error);
    res.status(500).json({ error: 'Erro ao recalcular ganhos' });
  }
});

// PUT /api/carts/:id/cancel - Cancelar carrinho
router.put('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const cartId = req.params.id;
    console.log('[CANCEL] Tentando cancelar carrinho:', cartId);

    // Verificar se o carrinho existe e pertence ao vendedor autenticado
    const cart = await Cart.findById(cartId);
    if (!cart) {
      return res.status(404).json({ error: 'Carrinho não encontrado' });
    }

    // Verificar se o usuário é o dono do carrinho
    if (cart.seller.toString() !== req.userId) {
      return res.status(403).json({ error: 'Não autorizado a cancelar este carrinho' });
    }

    // Verificar se o carrinho já está cancelado
    if (cart.isCancelled) {
      return res.status(400).json({ error: 'Carrinho já está cancelado' });
    }

    // Verificar se há pedidos em andamento
    if (cart.buyerCartProgress && cart.buyerCartProgress.length > 0) {
      const pedidosAtivos = cart.buyerCartProgress.filter(
        progress => !['Cancelado', 'Fechado'].includes(progress.status)
      );
      
      if (pedidosAtivos.length > 0) {
        return res.status(400).json({ 
          error: 'Não é possível cancelar carrinho com pedidos em andamento' 
        });
      }
    }

    // Cancelar o carrinho
    cart.isCancelled = true;
    cart.isOpen = false;
    await cart.save();

    console.log('[CANCEL] Carrinho cancelado com sucesso:', cartId);
    res.json({ 
      message: 'Carrinho cancelado com sucesso',
      cart: cart
    });

  } catch (error) {
    console.error('[CANCEL] Erro ao cancelar carrinho:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
