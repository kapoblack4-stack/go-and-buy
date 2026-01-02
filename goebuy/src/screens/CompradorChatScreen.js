import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  AppState,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from 'expo-notifications';
import { BASE_URL } from "../../config";
import james from "../../assets/imagens/avatar.webp";
import { CaretLeft, PaperPlaneRight } from "phosphor-react-native";

// Captura o StatusBar height uma única vez para evitar mudanças ao voltar do background
const STATUSBAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;

export default function CompradorChatScreen({ route, navigation }) {
  const { conversationId, sellerId, buyerId, sellerName } = route.params || {};
  const [userId, setUserId] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sellerInfo, setSellerInfo] = useState({ name: "", photo: null });
  const [buyerName, setBuyerName] = useState("");
  const flatListRef = useRef();
  const socketRef = useRef(null);
  const appState = useRef(AppState.currentState);
  const isScreenActive = useRef(true);

  function getProfileImage(user) {
    if (user?.profileImage) {
      const url = user.profileImage.replace(/\\/g, '/');
      return { uri: `${BASE_URL}/${url}` };
    }
    return james;
  }

  // Função para marcar mensagens como lidas via API
  const markMessagesAsRead = async () => {
    try {
      if (!conversationId || !userId) {
        console.log('📖 [COMPRADOR-CHAT-API] Dados insuficientes:', { conversationId, userId });
        return;
      }

      console.log('📖 [COMPRADOR-CHAT-API] Iniciando marcação via API...');

      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.log('📖 [COMPRADOR-CHAT-API] Token não encontrado');
        return;
      }

      console.log('📖 [COMPRADOR-CHAT-API] Fazendo requisição para:', `${BASE_URL}/api/messages/mark-read/${conversationId}/${userId}`);

      const response = await fetch(`${BASE_URL}/api/messages/mark-read/${conversationId}/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📖 [COMPRADOR-CHAT-API] Status da resposta:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('📖 [COMPRADOR-CHAT-API] Sucesso - mensagens marcadas:', result);
      } else {
        console.log('📖 [COMPRADOR-CHAT-API] Erro HTTP:', response.status);
        const errorText = await response.text();
        console.log('📖 [COMPRADOR-CHAT-API] Texto do erro:', errorText);
      }
    } catch (error) {
      console.error('📖 [COMPRADOR-CHAT-API] Erro na requisição:', error);
    }
  };
  // Conexão socket.io para atualização automática
  useEffect(() => {
    if (!userId) return;

    socketRef.current = io(BASE_URL.replace("/api", ""), {
      transports: ["websocket"],
    });

    socketRef.current.on("connect", () => {
      console.log("✅ [COMPRADOR-CHAT] Conectado ao socket:", socketRef.current.id);
      if (conversationId) {
        console.log("📡 [COMPRADOR-CHAT] Entrando na sala:", conversationId);
        socketRef.current.emit("joinConversation", conversationId);
      }
    });

    socketRef.current.on("receiveMessage", async (message) => {
      console.log("📩 [COMPRADOR-CHAT] Mensagem recebida:", message);
      
      // Se a mensagem não é do usuário atual e app está em background ou outra tela
      if (message.sender !== userId && (!isScreenActive.current || appState.current !== 'active')) {
        console.log("🔔 [COMPRADOR-CHAT] Mostrando notificação local para nova mensagem");
        
        // Mostrar notificação local
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `💬 ${sellerInfo.name || sellerName || 'Nova mensagem'}`,
            body: message.text.length > 100 ? message.text.substring(0, 100) + '...' : message.text,
            data: { 
              type: 'message',
              conversationId: conversationId,
              senderId: message.sender
            },
            sound: 'default',
            badge: 1,
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrate: [0, 250, 250, 250],
          },
          trigger: null,
        });
      }
      
      setMessages((prev) => {
        const exists = prev.some((m) => m._id === message._id);
        if (exists) return prev;
        return [...prev, message];
      });
      flatListRef.current?.scrollToEnd({ animated: true });
    });

    // Escutar quando mensagens são marcadas como lidas
    socketRef.current.on('messagesMarkedAsRead', (data) => {
      console.log('📖 [COMPRADOR-CHAT] Mensagens marcadas como lidas:', data);
    });

    socketRef.current.on('message-read', (data) => {
      console.log('📖 [COMPRADOR-CHAT] Evento message-read recebido:', data);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [conversationId, userId]);

  // Marcar mensagens como lidas quando entrar na conversa
  useEffect(() => {
    if (socketRef.current && conversationId && userId) {
      console.log("📡 [COMPRADOR-CHAT] Entrando na conversa:", conversationId);
      
      // Marcar mensagens como lidas quando entrar na conversa
      console.log("📖 [COMPRADOR-CHAT] Marcando mensagens como lidas...");
      socketRef.current.emit("markMessagesAsRead", { 
        conversationId, 
        userId 
      });

      // Também chamar a API para marcar como lidas
      markMessagesAsRead();
    }
  }, [conversationId, userId, socketRef.current]);

  useEffect(() => {
    // Recupera o id do comprador logado
    const fetchUserId = async () => {
      const id = await AsyncStorage.getItem("userId");
      setUserId(id);
    };
    fetchUserId();
  }, []);

  // Detectar quando a tela entra/sai de foco
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      appState.current = nextAppState;
      console.log('[COMPRADOR-CHAT] AppState:', nextAppState);
    });

    const unsubscribeFocus = navigation.addListener('focus', () => {
      isScreenActive.current = true;
      console.log('[COMPRADOR-CHAT] Tela entrou em foco');
    });

    const unsubscribeBlur = navigation.addListener('blur', () => {
      isScreenActive.current = false;
      console.log('[COMPRADOR-CHAT] Tela saiu de foco');
    });

    return () => {
      subscription?.remove();
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      let convId = conversationId;
      if (!convId && sellerId && buyerId) {
        const res = await fetch(
          `${BASE_URL}/api/chat/conversation/between/${sellerId}/${buyerId}`,
          {
            headers: { Authorization: token },
          }
        );
        const data = await res.json();
        convId = data._id;
      }
      if (convId) {
        const res = await fetch(`${BASE_URL}/api/messages/${convId}`, {
          headers: { Authorization: token },
        });
        const data = await res.json();
        setMessages(data);
      }
      setLoading(false);
    };
    fetchMessages();
  }, [conversationId, sellerId, buyerId]);

  useEffect(() => {
    const fetchNames = async () => {
      if (sellerId) {
        const res = await fetch(`${BASE_URL}/api/auth/${sellerId}`);
        const data = await res.json();
        setSellerInfo({
          name: data.name || sellerName || "Vendedor",
          photo: getProfileImage(data)
        });
      }
      if (buyerId) {
        const res = await fetch(`${BASE_URL}/api/auth/${buyerId}`);
        const data = await res.json();
        setBuyerName(data.name);
      }
    };
    fetchNames();
  }, [sellerId, buyerId, sellerName]);

  // Marcar mensagens como lidas quando sair da tela
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      console.log('📖 [COMPRADOR-CHAT] Saindo da tela - garantindo que mensagens estão marcadas como lidas');
      
      if (socketRef.current && conversationId && userId) {
        // Garantir que as mensagens estão marcadas como lidas ao sair
        socketRef.current.emit("markMessagesAsRead", { 
          conversationId, 
          userId 
        });
        
        // Também chamar a API novamente
        markMessagesAsRead();
      }
    });

    return unsubscribe;
  }, [navigation, conversationId, userId]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const token = await AsyncStorage.getItem("token");
    let convId = conversationId;
    if (!convId && sellerId && buyerId) {
      const res = await fetch(
        `${BASE_URL}/api/chat/conversation/between/${sellerId}/${buyerId}`,
        {
          headers: { Authorization: token },
        }
      );
      const data = await res.json();
      convId = data._id;
    }
    if (!convId) {
      alert("Não foi possível obter ou criar a conversa. Tente novamente ou verifique os dados do vendedor/comprador.");
      return;
    }
    const res = await fetch(`${BASE_URL}/api/messages`, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ conversationId: convId, text: input }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessages([...messages, data]);
      setInput("");
      flatListRef.current?.scrollToEnd({ animated: true });
      // Emitir mensagem pelo socket para atualização em tempo real
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("sendMessage", {
          conversationId: convId,
          message: data,
          senderId: userId, // Incluir ID do remetente para notificações
        });
      }
    } else {
      alert("Erro ao enviar mensagem: " + (data?.error || JSON.stringify(data)));
    }
  };

  const renderMessage = ({ item }) => {
    const isFromCurrentUser = item.sender === userId;
    return (
      <View
        style={[
          styles.messageContainer,
          isFromCurrentUser ? styles.myMessage : styles.otherMessage,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isFromCurrentUser ? styles.myBubble : styles.otherBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isFromCurrentUser ? styles.myMessageText : styles.otherMessageText,
            ]}
          >
            {item.text}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isFromCurrentUser ? styles.myMessageTime : styles.otherMessageTime,
            ]}
          >
            {new Date(item.createdAt).toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <CaretLeft size={24} color="white" />
          </TouchableOpacity>
          <Image source={sellerInfo.photo || james} style={styles.pfp} resizeMode="cover" />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.name}>{sellerInfo.name}</Text>
            <Text style={styles.status}>Online</Text>
          </View>
        </View>

        <KeyboardAvoidingView 
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.messagesContainer}>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item._id || item.createdAt}
              renderItem={renderMessage}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              style={styles.messagesList}
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={input}
              onChangeText={setInput}
              placeholder="Digite sua mensagem..."
              placeholderTextColor="#999"
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!input.trim()}
            >
              <PaperPlaneRight size={20} color="#FFFFFF" weight="bold" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: "#704F38" 
  },
  header: {
    backgroundColor: "#704F38",
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingTop: STATUSBAR_HEIGHT + 20,
  },
  pfp: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    marginLeft: 20 
  },
  status: { 
    color: "white", 
    fontSize: 14 
  },
  name: { 
    color: "white", 
    fontSize: 16, 
    fontWeight: "600" 
  },
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesList: {
    flex: 1,
    paddingVertical: 16,
  },
  messageContainer: {
    marginVertical: 4,
    paddingHorizontal: 8,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  myBubble: {
    backgroundColor: '#704F38',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#333333',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: '#999999',
    textAlign: 'left',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
    backgroundColor: '#F9F9F9',
  },
  sendButton: {
    backgroundColor: '#704F38',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
});
