// ChatsScreen.js - Lista de conversas do comprador
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  Platform,
  RefreshControl,
  Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Chat, ArrowLeft, User } from 'phosphor-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import { BASE_URL } from '../../../config';
import Header from '../../components/Header';

const CompradorChatsScreen = ({ navigation }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);
  const socketRef = useRef(null);

  // Buscar conversas do comprador
  const fetchConversations = async (isFocusUpdate = false) => {
    try {
      if (!isFocusUpdate) {
        setLoading(true);
      }

      const token = await AsyncStorage.getItem('token');
      const userIdStorage = await AsyncStorage.getItem('userId');
      
      if (!token || !userIdStorage) {
        console.log('[COMPRADOR-CHATS-SCREEN] Token ou userId não encontrado');
        return;
      }

      setUserId(userIdStorage);
      console.log('[COMPRADOR-CHATS-SCREEN] Buscando conversas para comprador:', userIdStorage);

      const response = await fetch(`${BASE_URL}/api/chat/conversations/${userIdStorage}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const conversationsData = await response.json();
        console.log('[COMPRADOR-CHATS-SCREEN] Conversas encontradas:', conversationsData.length);
        
        // Para cada conversa, buscar a última mensagem e informações do outro usuário
        const conversationsWithDetails = await Promise.all(
          conversationsData.map(async (conversation) => {
            try {
              // Buscar última mensagem
              const messagesResponse = await fetch(`${BASE_URL}/api/messages/last/${conversation._id}`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });

              let lastMessage = null;
              let unreadCount = 0;
              
              if (messagesResponse.ok) {
                const messageData = await messagesResponse.json();
                lastMessage = messageData.lastMessage;
                unreadCount = messageData.unreadCount || 0;
              }

              // Se não há última mensagem, esta conversa não tem mensagens - filtrar fora
              if (!lastMessage) {
                console.log('[COMPRADOR-CHATS-SCREEN] Conversa sem mensagens filtrada:', conversation._id);
                return null;
              }

              // Encontrar o outro membro da conversa (vendedor)
              const otherUserId = conversation.members.find(id => id !== userIdStorage);
              
              // Buscar dados do vendedor
              const userResponse = await fetch(`${BASE_URL}/api/auth/${otherUserId}`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });

              let otherUser = {
                _id: otherUserId,
                name: 'Vendedor',
                avatar: null
              };

              if (userResponse.ok) {
                const userData = await userResponse.json();
                otherUser = {
                  _id: userData._id,
                  name: userData.name || 'Vendedor',
                  avatar: userData.profileImage || null
                };
              }

              return {
                ...conversation,
                lastMessage,
                unreadCount,
                otherUser,
                updatedAt: lastMessage.createdAt
              };
            } catch (error) {
              console.error('[COMPRADOR-CHATS-SCREEN] Erro ao processar conversa:', error);
              return null;
            }
          })
        );

        // Filtrar conversas nulas (sem mensagens) e ordenar por última atividade
        const validConversations = conversationsWithDetails
          .filter(conv => conv !== null && conv.lastMessage !== null)
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        setConversations(validConversations);
        console.log('[COMPRADOR-CHATS-SCREEN] Conversas processadas:', validConversations.length);
        console.log('[COMPRADOR-CHATS-SCREEN] Conversas filtradas (apenas com mensagens):', 
          validConversations.map(conv => ({
            id: conv._id,
            otherUser: conv.otherUser.name,
            hasMessage: !!conv.lastMessage,
            messageText: conv.lastMessage?.text?.substring(0, 30) + '...'
          }))
        );
      } else {
        console.log('[COMPRADOR-CHATS-SCREEN] Erro ao buscar conversas:', response.status);
        Alert.alert('Erro', 'Não foi possível carregar as conversas');
      }
    } catch (error) {
      console.error('[COMPRADOR-CHATS-SCREEN] Erro geral:', error);
      Alert.alert('Erro', 'Erro de conexão ao carregar conversas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Hook para atualizar conversas quando a tela entrar em foco
  useFocusEffect(
    React.useCallback(() => {
      console.log('[COMPRADOR-CHATS-SCREEN-FOCUS] Tela de chats entrou em foco - forçando atualização completa');
      
      // Sempre buscar dados atualizados quando voltar para esta tela
      fetchConversations(true);
      
      // Também configurar um timeout para garantir que os dados são atualizados
      const timeoutId = setTimeout(() => {
        console.log('[COMPRADOR-CHATS-SCREEN-FOCUS] Timeout - fazendo segunda atualização');
        fetchConversations(true);
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }, [])
  );

  // Função para refresh
  const onRefresh = async () => {
    console.log('[COMPRADOR-CHATS-SCREEN] Pull-to-refresh');
    setRefreshing(true);
    await fetchConversations();
  };

  // Setup do Socket para mensagens em tempo real
  useEffect(() => {
    const setupSocket = async () => {
      try {
        const userIdStorage = await AsyncStorage.getItem('userId');
        
        if (!userIdStorage) {
          console.log('[COMPRADOR-CHATS-SCREEN-SOCKET] UserId não encontrado');
          return;
        }

        console.log('[COMPRADOR-CHATS-SCREEN-SOCKET] Configurando socket para chats');
        
        socketRef.current = io(BASE_URL.replace('/api', ''), {
          transports: ['websocket'],
          query: { userId: userIdStorage },
        });

        socketRef.current.on('connect', () => {
          console.log('[COMPRADOR-CHATS-SCREEN-SOCKET] Socket conectado');
        });

        // Entrar na sala do usuário
        socketRef.current.emit('join', userIdStorage);

        // Ouvir novas mensagens para atualizar conversas
        socketRef.current.on('receiveMessage', (message) => {
          console.log('[COMPRADOR-CHATS-SCREEN-SOCKET] Nova mensagem recebida:', message);
          
          // Atualizar a lista de conversas
          fetchConversations(true);
        });

        // Ouvir quando mensagens são marcadas como lidas
        socketRef.current.on('messagesMarkedAsRead', (data) => {
          console.log('[COMPRADOR-CHATS-SCREEN-SOCKET] Mensagens marcadas como lidas:', data);
          
          // Atualizar contadores na lista
          setConversations(prev => 
            prev.map(conv => 
              conv._id === data.conversationId 
                ? { ...conv, unreadCount: 0 }
                : conv
            )
          );
        });

        // Ouvir evento message-read (da Home)
        socketRef.current.on('message-read', (data) => {
          console.log('[COMPRADOR-CHATS-SCREEN-SOCKET] Evento message-read recebido:', data);
          
          // Atualizar contadores na lista
          setConversations(prev => 
            prev.map(conv => 
              conv._id === data.conversationId 
                ? { ...conv, unreadCount: 0 }
                : conv
            )
          );
        });

        socketRef.current.on('disconnect', () => {
          console.log('[COMPRADOR-CHATS-SCREEN-SOCKET] Socket desconectado');
        });

      } catch (error) {
        console.error('[COMPRADOR-CHATS-SCREEN-SOCKET] Erro ao configurar socket:', error);
      }
    };

    setupSocket();

    return () => {
      if (socketRef.current) {
        console.log('[COMPRADOR-CHATS-SCREEN-SOCKET] Desconectando socket...');
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    fetchConversations();
  }, []);

  // Formatar texto da última mensagem
  const formatLastMessage = (message) => {
    // Como só mostramos conversas com mensagens, sempre haverá uma última mensagem
    if (!message || !message.text) return 'Mensagem sem texto';
    
    const text = message.text;
    return text.length > 50 ? `${text.substring(0, 50)}...` : text;
  };

  // Formatar tempo da última mensagem
  const formatMessageTime = (createdAt) => {
    if (!createdAt) return '';
    
    const messageDate = new Date(createdAt);
    const now = new Date();
    const diffMs = now - messageDate;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes < 1 ? 'Agora' : `${diffMinutes}min`;
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h`;
    } else if (diffDays < 7) {
      return `${Math.floor(diffDays)}d`;
    } else {
      return messageDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  // Navegar para a conversa individual
  const openChat = (conversation) => {
    console.log('[COMPRADOR-CHATS-SCREEN] Abrindo conversa:', conversation._id);
    
    navigation.navigate('CompradorChatScreen', {
      conversationId: conversation._id,
      sellerId: conversation.otherUser._id,
      buyerId: userId,
      sellerName: conversation.otherUser.name
    });
  };

  // Renderizar item da lista
  const renderConversationItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.conversationItem} 
      onPress={() => openChat(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {item.otherUser.avatar ? (
          <Image source={{ uri: item.otherUser.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.defaultAvatar}>
            <User size={24} color="#704F38" weight="bold" />
          </View>
        )}
        {item.unreadCount > 0 && <View style={styles.onlineIndicator} />}
      </View>
      
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.userName} numberOfLines={1}>
            {item.otherUser.name}
          </Text>
          <Text style={styles.messageTime}>
            {formatMessageTime(item.lastMessage?.createdAt)}
          </Text>
        </View>
        
        <View style={styles.messageRow}>
          <Text 
            style={[
              styles.lastMessage,
              item.unreadCount > 0 && styles.unreadMessage
            ]} 
            numberOfLines={1}
          >
            {formatLastMessage(item.lastMessage)}
          </Text>
          
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="#F8F9FA" 
        translucent={false}
      />
      
      <Header page={'Chats'} />
      
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Carregando conversas...</Text>
          </View>
        ) : conversations.length > 0 ? (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item._id}
            renderItem={renderConversationItem}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                colors={['#704F38']}
                tintColor="#704F38"
              />
            }
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Chat size={64} color="#E0E0E0" weight="regular" />
            <Text style={styles.emptyTitle}>Nenhuma conversa ativa</Text>
            <Text style={styles.emptySubtitle}>
              Suas conversas com vendedores aparecerão aqui
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight - 20 : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    fontFamily: 'Poppins_400Regular',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  defaultAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F1ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1A1A1A',
    flex: 1,
  },
  messageTime: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#9E9E9E',
    marginLeft: 8,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#666666',
    flex: 1,
  },
  unreadMessage: {
    fontFamily: 'Poppins_500Medium',
    color: '#1A1A1A',
  },
  unreadBadge: {
    backgroundColor: '#704F38',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadBadgeText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default CompradorChatsScreen;