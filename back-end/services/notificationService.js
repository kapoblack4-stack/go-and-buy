// services/notificationService.js
const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Envia push notification via Expo
 */
async function sendPushNotification(pushToken, title, message, data = {}) {
  const expoPushMessage = {
    to: pushToken,
    sound: 'default',
    title,
    body: message,
    data,
    priority: 'high',
    channelId: 'high_priority',
    // Configurações para forçar pop-up
    badge: 1,
    _displayInForeground: true,
    categoryId: 'GOANDBUYMESSAGE',
    mutableContent: true,
    ttl: 2419200,
    // Configurações específicas para Android - MAXIMIZADAS
    android: {
      channelId: 'high_priority',
      priority: 'max',
      importance: 'max',
      visibility: 'public',
      autoCancel: true,
      sticky: false,
      ongoing: false,
      vibrate: [0, 250, 250, 250],
      lights: true,
      color: '#FF6B35',
      icon: './assets/icon.png',
      sound: 'default',
      // Forçar aparição mesmo com app em foreground
      notification: {
        title,
        body: message,
        icon: './assets/icon.png',
        color: '#FF6B35',
        tag: 'goandbuymessage',
        requireInteraction: true,
        silent: false
      }
    },
    // Configurações específicas para iOS - OTIMIZADAS
    ios: {
      sound: 'default',
      badge: 1,
      _displayInForeground: true,
      criticalAlert: false,
      interruptionLevel: 'timeSensitive',
      relevanceScore: 1.0,
      targetContentId: 'goandbuymessage'
    }
  };

  console.log('[PUSH] Enviando push notification:', {
    to: pushToken.substring(0, 20) + '...',
    title,
    body: message,
    priority: 'high',
    channel: 'high_priority'
  });

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(expoPushMessage),
    });

    const result = await response.json();
    console.log('[PUSH] ✅ Resposta completa da Expo:', JSON.stringify(result, null, 2));
    
    // Verificar se há erros específicos na resposta
    if (result.data && Array.isArray(result.data)) {
      result.data.forEach((item, index) => {
        if (item.status === 'error') {
          console.error(`[PUSH] ❌ Erro na notificação ${index}:`, {
            error: item.message,
            details: item.details,
            token: pushToken.substring(0, 20) + '...'
          });
          
          // Se o token está inválido, marcar para limpeza
          if (item.details && item.details.error === 'DeviceNotRegistered') {
            console.log(`[PUSH] 🗑️ Token inválido detectado, será removido: ${pushToken.substring(0, 30)}...`);
            // Retornar informação para limpeza
            return { ...result, shouldCleanToken: true, invalidToken: pushToken };
          }
        } else if (item.status === 'ok') {
          console.log(`[PUSH] ✅ Notificação ${index} enviada com sucesso:`, {
            id: item.id,
            token: pushToken.substring(0, 20) + '...'
          });
        }
      });
    } else if (result.data && result.data.status === 'error') {
      // Formato único da resposta
      console.error('[PUSH] ❌ Erro único na notificação:', {
        error: result.data.message,
        details: result.data.details,
        token: pushToken.substring(0, 20) + '...'
      });
      
      // Se o token está inválido, marcar para limpeza
      if (result.data.details && result.data.details.error === 'DeviceNotRegistered') {
        console.log(`[PUSH] 🗑️ Token inválido detectado, será removido: ${pushToken.substring(0, 30)}...`);
        return { ...result, shouldCleanToken: true, invalidToken: pushToken };
      }
    } else if (result.errors) {
      console.error('[PUSH] ❌ Erros gerais da Expo:', result.errors);
    }
    
    return result;
  } catch (error) {
    console.error('[PUSH] ❌ Erro na requisição para Expo:', {
      error: error.message,
      stack: error.stack,
      token: pushToken.substring(0, 20) + '...'
    });
    return null;
  }
}

/**
 * Cria e envia uma notificação para um usuário
 * @param {Object} params
 * @param {ObjectId} params.userId - ID do usuário destinatário
 * @param {String} params.type - Tipo da notificação (ex: 'pedido', 'status', 'comprovativo')
 * @param {String} params.title - Título da notificação
 * @param {String} params.message - Mensagem da notificação
 * @param {Object} [params.data] - Dados extras (ex: id do pedido, carrinho, etc)
 * @param {Object} [params.io] - Instância do socket.io (opcional)
 */
async function sendNotification({ userId, sender = null, type, title, message, data = {}, io = null }) {
  console.log(`[NOTIFICATION] 📩 Iniciando envio para usuário: ${userId}`);
  
  const notification = new Notification({
    user: userId,
    sender: sender || undefined,
    type,
    title,
    message,
    data,
    isRead: false
  });
  await notification.save();
  console.log(`[NOTIFICATION] ✅ Notificação salva no banco: ${notification._id}`);
  
  // Envio em tempo real via socket.io (se fornecido)
  if (io) {
    console.log(`[SOCKET] 📡 Emitindo notification para sala/userId: ${userId}`);
    io.to(userId.toString()).emit('notification', notification);
    console.log(`[SOCKET] ✅ Notificação emitida via socket`);
  } else {
    console.log('[SOCKET] ⚠️ io não fornecido, notificação não emitida via socket.');
  }

  // Buscar push token do usuário e enviar push notification
  try {
    console.log(`[PUSH] 🔍 Buscando dados do usuário: ${userId}`);
    const user = await User.findById(userId);
    
    if (!user) {
      console.log(`[PUSH] ❌ Usuário não encontrado: ${userId}`);
      return notification;
    }

    console.log(`[PUSH] 👤 Usuário encontrado: ${user.name} | Platform: ${user.platform || 'não informado'}`);
    
    if (user.pushToken) {
      console.log(`[PUSH] 📱 Push token encontrado: ${user.pushToken.substring(0, 30)}...`);
      console.log(`[PUSH] 🚀 Enviando push notification para ${user.name}`);
      
      const pushResult = await sendPushNotification(user.pushToken, title, message, {
        ...data,
        notificationId: notification._id.toString(),
        userId: userId.toString(),
        timestamp: new Date().toISOString()
      });
      
      if (pushResult) {
        // Verificar se o token deve ser limpo devido a erro
        if (pushResult.shouldCleanToken && pushResult.invalidToken) {
          console.log(`[PUSH] 🧹 Limpando token inválido do usuário ${user.name}: ${pushResult.invalidToken.substring(0, 30)}...`);
          
          try {
            await User.findByIdAndUpdate(userId, {
              $unset: { pushToken: 1 }, // Remove o campo pushToken
              $set: { 
                pushTokenInvalidatedAt: new Date(),
                platform: user.platform // Manter platform para re-registro
              }
            });
            console.log(`[PUSH] ✅ Token inválido removido do banco para usuário ${user.name}`);
          } catch (cleanError) {
            console.error(`[PUSH] ❌ Erro ao limpar token inválido:`, cleanError);
          }
        }
        
        console.log(`[PUSH] ✅ Push notification enviado com sucesso para ${user.name}`);
      } else {
        console.log(`[PUSH] ❌ Falha ao enviar push notification para ${user.name}`);
      }
    } else {
      console.log(`[PUSH] ⚠️ Usuário ${user.name} (${userId}) não tem push token registrado`);
      console.log(`[PUSH] 💡 Dica: O usuário precisa abrir o app para registrar o push token`);
    }
  } catch (error) {
    console.error('[PUSH] ❌ Erro ao enviar push notification:', error);
  }
  
  return notification;
}

module.exports = { sendNotification, sendPushNotification };
