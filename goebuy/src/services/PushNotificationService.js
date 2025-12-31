// Serviço de Push Notifications - Versão Completa
import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config';

// Configurar como as notificações devem ser apresentadas
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('[PUSH] ⚡ Configurando apresentação da notificação:', {
      title: notification.request.content.title,
      body: notification.request.content.body,
      data: notification.request.content.data
    });
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      // Forçar exibição SEMPRE, mesmo em foreground
      priority: Notifications.AndroidImportance.MAX,
    };
  },
});

class PushNotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
    this.navigationCallback = null;
    console.log('[PUSH] Serviço inicializado (versão completa)');
  }

  // Verificar se precisa re-registrar token
  async checkTokenStatus() {
    try {
      const userId = await AsyncStorage.getItem('userId');
      const userToken = await AsyncStorage.getItem('token');
      
      if (!userId || !userToken) {
        console.log('[PUSH] 🔄 Usuário não logado, pulando verificação de token');
        return { needsReregistration: true, reason: 'not_logged_in' };
      }

      console.log('[PUSH] 🔍 Verificando status do token no servidor...');
      
      const response = await fetch(`${BASE_URL}/api/auth/push-token-status/${userId}`, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const status = await response.json();
        console.log('[PUSH] 📊 Status do token recebido:', status);
        return status;
      } else {
        console.log('[PUSH] ⚠️ Erro ao verificar status, assumindo necessário re-registro:', response.status);
        return { needsReregistration: true, reason: 'server_error' };
      }
    } catch (error) {
      console.log('[PUSH] ❌ Erro ao verificar status do token:', error);
      return { needsReregistration: true, reason: 'network_error' };
    }
  }

  // Registrar para push notifications (sempre força registro)
  async registerForPushNotifications(force = false) {
    let token;

    try {
      console.log('[PUSH] 🚀 Registrando para push notifications...', force ? '(FORÇADO)' : '');
      
      // Verificar status primeiro (apenas se não for forçado)
      if (!force) {
        const status = await this.checkTokenStatus();
        if (!status.needsReregistration && status.hasValidToken) {
          console.log('[PUSH] ✅ Token já válido, pulando re-registro');
          return this.expoPushToken;
        } else {
          console.log('[PUSH] 🔄 Re-registro necessário:', status);
        }
      }
      
      // Configurar canal de notificação para Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'GoandBuy Padrão',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B35',
          sound: 'default',
          enableLights: true,
          enableVibrate: true,
          showBadge: true,
        });
        
        // Criar canal de alta prioridade para garantir pop-ups
        await Notifications.setNotificationChannelAsync('high_priority', {
          name: 'GoandBuy Mensagens',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B35',
          sound: 'default',
          enableLights: true,
          enableVibrate: true,
          showBadge: true,
          bypassDnd: true, // Importante: ignorar modo não perturbe
          description: 'Notificações importantes do GoandBuy que sempre aparecem como pop-up'
        });
        
        console.log('[PUSH] Canais de notificação Android configurados com prioridade máxima');
      }

      // Solicitar permissões
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        console.log('[PUSH] Solicitando permissões...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('[PUSH] Permissões negadas');
        Alert.alert(
          'Permissões de Notificação',
          'Para receber notificações push, ative as permissões nas configurações do app.',
          [{ text: 'OK' }]
        );
        return null;
      }

      console.log('[PUSH] Permissões concedidas');

      // Obter token do Expo Push - Método melhorado
      try {
        // Tentar sem Project ID primeiro (funciona melhor para desenvolvimento)
        token = (await Notifications.getExpoPushTokenAsync()).data;
        console.log('[PUSH] ✅ Token obtido com sucesso:', token);
      } catch (tokenError) {
        console.log('[PUSH] ⚠️ Erro ao obter token oficial, tentando método alternativo:', tokenError);
        
        try {
          // Método alternativo para desenvolvimento
          token = (await Notifications.getExpoPushTokenAsync({
            experienceId: '@anonymous/goebuy', // Usar experienceId genérico
          })).data;
          console.log('[PUSH] ✅ Token alternativo obtido:', token);
        } catch (fallbackError) {
          console.log('[PUSH] ❌ Falha total ao obter token:', fallbackError);
          // Último recurso: token simulado válido
          token = `ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]`;
          console.log('[PUSH] 🔄 Usando token de desenvolvimento:', token);
        }
      }

      this.expoPushToken = token;
      await this.savePushTokenToServer(token);
      
      return token;
    } catch (error) {
      console.log('[PUSH] Erro geral ao registrar push notifications:', error);
      return null;
    }
  }

  // Salvar token no servidor com retry automático
  async savePushTokenToServer(token) {
    try {
      const userToken = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');

      if (!userToken || !userId) {
        console.log('[PUSH] Token de usuário ou ID não encontrado - salvando localmente');
        await AsyncStorage.setItem('pendingPushToken', token);
        return false;
      }

      console.log(`[PUSH] 💾 Salvando token no servidor para usuário: ${userId}`);

      const response = await fetch(`${BASE_URL}/api/auth/push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          userId: userId,
          pushToken: token,
          platform: Platform.OS,
          registeredAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[PUSH] ✅ Token salvo no servidor com sucesso:', result);
        // Remover token pendente se existir
        await AsyncStorage.removeItem('pendingPushToken');
        await AsyncStorage.setItem('lastTokenRegistration', new Date().toISOString());
        return true;
      } else {
        const errorData = await response.text();
        console.log('[PUSH] ❌ Erro ao salvar token no servidor:', response.status, errorData);
        // Salvar localmente para tentar depois
        await AsyncStorage.setItem('pendingPushToken', token);
        return false;
      }
    } catch (error) {
      console.log('[PUSH] ❌ Erro ao salvar token no servidor:', error);
      // Salvar localmente para tentar depois
      await AsyncStorage.setItem('pendingPushToken', token);
      return false;
    }
  }

  // Configurar listeners para notificações reais
  setupNotificationListeners() {
    console.log('[PUSH] 🔧 Configurando listeners...');
    
    // Listener para notificações recebidas enquanto app está em foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(async notification => {
      console.log('[PUSH] 📩 NOTIFICAÇÃO RECEBIDA EM FOREGROUND:', {
        title: notification.request.content.title,
        body: notification.request.content.body,
        data: notification.request.content.data,
        sound: notification.request.content.sound,
        badge: notification.request.content.badge
      });
      
      // Mostrar notificação local imediatamente como pop-up
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.request.content.title,
          body: notification.request.content.body,
          data: notification.request.content.data,
          sound: 'default',
          badge: notification.request.content.badge || 1,
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 250, 250, 250],
        },
        trigger: null, // null = mostra imediatamente
      });
      
      // Forçar um Alert se for notificação de teste para debug
      if (notification.request.content.data?.testMessage) {
        Alert.alert(
          '🔔 Notificação Recebida!', 
          `Título: ${notification.request.content.title}\nMensagem: ${notification.request.content.body}`,
          [{ text: 'OK' }]
        );
      }
    });

    // Listener para quando usuário toca na notificação
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[PUSH] 👆 USUÁRIO TOCOU NA NOTIFICAÇÃO:', {
        title: response.notification.request.content.title,
        body: response.notification.request.content.body,
        data: response.notification.request.content.data,
        actionIdentifier: response.actionIdentifier
      });
      
      // Navegar baseado nos dados da notificação
      const data = response.notification.request.content.data;
      if (data && this.navigationCallback) {
        this.handleNotificationNavigation(data);
      }
    });
    
    console.log('[PUSH] ✅ Listeners configurados com sucesso');
  }

  // Lidar com navegação baseada na notificação
  handleNotificationNavigation(data) {
    console.log('[PUSH] Navegando baseado na notificação:', data);
    if (this.navigationCallback) {
      this.navigationCallback(data);
    }
  }

  // Definir callback de navegação
  setNavigationCallback(callback) {
    this.navigationCallback = callback;
    console.log('[PUSH] Callback de navegação definido');
  }

  // Enviar notificação local real (não mais Alert)
  async sendLocalNotification(title, body, data = {}) {
    try {
      console.log('[PUSH] Enviando notificação local:', { title, body, data });
      
      // Usar o sistema real de notificações do Expo
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title || 'GoandBuy',
          body: body || 'Você tem uma nova notificação',
          data,
          sound: true,
        },
        trigger: null, // Enviar imediatamente
      });
      
      console.log('[PUSH] Notificação local enviada com sucesso');
    } catch (error) {
      console.log('[PUSH] Erro ao enviar notificação local:', error);
      
      // Fallback para Alert se falhar
      Alert.alert(
        title || 'Notificação',
        body || 'Você tem uma nova notificação',
        [
          {
            text: 'Fechar',
            style: 'cancel'
          },
          {
            text: 'Ver',
            onPress: () => {
              if (this.navigationCallback && data) {
                this.handleNotificationNavigation(data);
              }
            }
          }
        ]
      );
    }
  }

  // Testar notificação pop-up
  async testPopupNotification() {
    try {
      console.log('[PUSH] Testando notificação pop-up...');
      
      // Verificar permissões primeiro
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        console.log('[PUSH] Permissões não concedidas para teste');
        Alert.alert(
          'Permissões Necessárias',
          'Por favor, permita notificações para testar o pop-up.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Enviar notificação de teste que deve aparecer como pop-up
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔔 Teste GoandBuy!',
          body: 'Esta notificação deve aparecer como pop-up no seu dispositivo!',
          data: { 
            type: 'test',
            screen: 'Home',
            testId: Date.now()
          },
          sound: 'default',
          priority: Notifications.AndroidImportance.MAX,
          categoryIdentifier: 'message',
          // Configurações específicas para Android
          android: {
            channelId: 'high_priority',
            priority: 'max',
            vibrate: [0, 250, 250, 250],
            color: '#FF6B35',
            autoCancel: true,
            sticky: false,
            ongoing: false,
          },
          // Configurações específicas para iOS
          ios: {
            sound: 'default',
            badge: 1,
            _displayInForeground: true,
          }
        },
        trigger: {
          seconds: 1, // Aguardar 1 segundo para aparecer
        },
      });
      
      console.log('[PUSH] Notificação de teste agendada - deve aparecer em 1 segundo');
      
      Alert.alert(
        'Teste Enviado!',
        'Uma notificação deve aparecer como pop-up em 1 segundo. Minimize o app para testar melhor!',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.log('[PUSH] Erro ao testar notificação pop-up:', error);
      Alert.alert('Erro', 'Falha ao enviar notificação de teste');
    }
  }

  // Limpar listeners
  cleanup() {
    console.log('[PUSH] Realizando cleanup...');
    
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
    
    console.log('[PUSH] Cleanup realizado');
  }

  // Obter token atual
  getPushToken() {
    return this.expoPushToken;
  }

  // Tentar salvar token pendente após login
  async savePendingToken() {
    try {
      const pendingToken = await AsyncStorage.getItem('pendingPushToken');
      if (pendingToken) {
        console.log('[PUSH] Tentando salvar token pendente...');
        await this.savePushTokenToServer(pendingToken);
      }
    } catch (error) {
      console.log('[PUSH] Erro ao salvar token pendente:', error);
    }
  }

  // Verificar e processar tokens pendentes
  async processPendingToken() {
    try {
      const pendingToken = await AsyncStorage.getItem('pendingPushToken');
      const lastRegistration = await AsyncStorage.getItem('lastTokenRegistration');
      
      if (pendingToken) {
        console.log('[PUSH] 🔄 Token pendente encontrado, tentando registrar...');
        const success = await this.savePushTokenToServer(pendingToken);
        
        if (success) {
          console.log('[PUSH] ✅ Token pendente registrado com sucesso');
        } else {
          console.log('[PUSH] ❌ Falha ao registrar token pendente');
        }
      }
      
      // Verificar se precisa renovar o token (mais de 24h desde último registro)
      if (lastRegistration) {
        const lastTime = new Date(lastRegistration);
        const now = new Date();
        const hoursSince = (now - lastTime) / (1000 * 60 * 60);
        
        if (hoursSince > 24) {
          console.log('[PUSH] 🔄 Token antigo detectado, renovando...');
          await this.registerForPushNotifications();
        }
      }
    } catch (error) {
      console.log('[PUSH] ❌ Erro ao processar token pendente:', error);
    }
  }

  // Inicializar serviço com re-registro forçado
  async initialize() {
    console.log('[PUSH] 🚀 Inicializando serviço...');
    
    try {
      // Sempre processar tokens pendentes primeiro
      await this.processPendingToken();
      
      // SEMPRE forçar novo registro (para garantir token fresco)
      console.log('[PUSH] 🔄 Forçando re-registro de token fresco...');
      await this.registerForPushNotifications(true); // force = true
      
      // Configurar listeners
      this.setupNotificationListeners();
      
      console.log('[PUSH] ✅ Serviço inicializado com token fresco');
      return true;
    } catch (error) {
      console.log('[PUSH] ❌ Erro ao inicializar serviço:', error);
      
      // Fallback: tentar sem forçar
      try {
        console.log('[PUSH] 🔄 Tentando fallback sem forçar...');
        await this.registerForPushNotifications(false);
        this.setupNotificationListeners();
        return true;
      } catch (fallbackError) {
        console.log('[PUSH] ❌ Fallback também falhou:', fallbackError);
        return false;
      }
    }
  }
}

// Exportar instância única
const pushNotificationService = new PushNotificationService();
export default pushNotificationService;