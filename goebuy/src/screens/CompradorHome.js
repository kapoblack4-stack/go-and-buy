import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  FlatList,
  ImageBackground,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import io from 'socket.io-client';
import {
  House,
  ShoppingCartSimple,
  ShoppingBagOpen,
  Bell,
  User,
  Fire,
  Calendar,
  Sparkle,
  Chat,
} from "phosphor-react-native";
import shein from "../../assets/imagens/shein.jpg";
import zara from "../../assets/imagens/zara.jpg";
import ali from "../../assets/imagens/ali.png";
import { BASE_URL } from "../../config";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Captura o StatusBar height uma única vez para evitar mudanças ao voltar do background
const STATUSBAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;

const Home = () => {
  const navigation = useNavigation();
  const [carrinhos, setCarrinhos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState("Usuário");
  const [notifications, setNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const socketRef = useRef(null);

  // Função para buscar dados do usuário
  const fetchUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');
      
      if (token && userId) {
        const response = await fetch(`${BASE_URL}/api/auth/${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUserName(userData.name || 'Usuário');
        }
      }
    } catch (error) {
      console.log('Erro ao buscar dados do usuário:', error);
    }
  };

  // Função para buscar mensagens não lidas
  const fetchUnreadMessages = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userIdStorage = await AsyncStorage.getItem('userId');
      
      if (!token || !userIdStorage) {
        console.log('[COMPRADOR-HOME-MESSAGES] Token ou userId não encontrado');
        return;
      }

      // Buscar conversas do usuário
      const conversationsResponse = await fetch(`${BASE_URL}/api/chat/conversations/${userIdStorage}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (conversationsResponse.ok) {
        const conversations = await conversationsResponse.json();
        console.log('[COMPRADOR-HOME-MESSAGES] Conversas encontradas:', conversations.length);
        
        // Para cada conversa, verificar mensagens não lidas
        let totalUnread = 0;
        for (const conversation of conversations) {
          const messagesResponse = await fetch(`${BASE_URL}/api/messages/unread/${conversation._id}/${userIdStorage}`, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (messagesResponse.ok) {
            const unreadCount = await messagesResponse.json();
            totalUnread += unreadCount.count || 0;
          }
        }
        
        console.log('[COMPRADOR-HOME-MESSAGES] Total de mensagens não lidas:', totalUnread);
        setUnreadMessages(totalUnread);
      } else {
        console.log('[COMPRADOR-HOME-MESSAGES] Erro ao buscar conversas:', conversationsResponse.status);
      }
    } catch (error) {
      console.error('[COMPRADOR-HOME-MESSAGES] Erro ao buscar mensagens não lidas:', error);
    }
  };

  // Função para buscar notificações não lidas
  const fetchUnreadNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.log('[HOME-NOTIFICATIONS] Token não encontrado');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/notifications`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const notificationsData = await response.json();
        console.log('[HOME-NOTIFICATIONS] Notificações carregadas:', notificationsData.length);
        
        // Contar notificações não lidas
        const unreadCount = notificationsData.filter(notif => !notif.read && !notif.isRead).length;
        console.log('[HOME-NOTIFICATIONS] Notificações não lidas:', unreadCount);
        
        setNotifications(unreadCount);
      } else {
        console.log('[HOME-NOTIFICATIONS] Erro ao buscar notificações:', response.status);
      }
    } catch (error) {
      console.error('[HOME-NOTIFICATIONS] Erro ao buscar notificações:', error);
    }
  };

  // Função para buscar carrinhos
  const fetchCarrinhos = async (isRefresh = false, isFocusUpdate = false) => {
    try {
      if (isRefresh) {
        console.log("[HOME REFRESH] Iniciando atualização de carrinhos...");
      } else if (isFocusUpdate) {
        console.log("[HOME FOCUS UPDATE] Atualizando carrinhos por foco da tela...");
      } else {
        setLoading(true);
      }
      
      const res = await fetch(`${BASE_URL}/api/carts`);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      const updateType = isRefresh ? 'REFRESH' : isFocusUpdate ? 'FOCUS' : 'LOADING';
      console.log(`[HOME ${updateType}] Carrinhos recebidos:`, data.length, 'itens');
      
      setCarrinhos(data);
    } catch (err) {
      console.error("Erro ao buscar carrinhos:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Função para refresh
  const onRefresh = async () => {
    console.log('[HOME PULL-TO-REFRESH] Usuário puxou para atualizar home');
    setRefreshing(true);
    
    try {
      await Promise.all([
        fetchCarrinhos(true),
        fetchUserData(),
        fetchUnreadNotifications(),
        fetchUnreadMessages()
      ]);
      
      console.log('[HOME PULL-TO-REFRESH] Atualização concluída com sucesso');
    } catch (error) {
      console.error('[HOME PULL-TO-REFRESH] Erro durante refresh:', error);
    }
  };

  useEffect(() => {
    fetchCarrinhos();
    fetchUserData();
    fetchUnreadNotifications();
    fetchUnreadMessages();
  }, []);

  // useEffect para configurar Socket.io e receber notificações em tempo real
  useEffect(() => {
    const setupSocket = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        
        if (!userId) {
          console.log('[HOME-SOCKET] UserId não encontrado');
          return;
        }

        console.log('[HOME-SOCKET] Configurando socket para userId:', userId);
        
        socketRef.current = io(BASE_URL.replace('/api', ''), {
          transports: ['websocket'],
          query: { userId: userId },
        });

        socketRef.current.on('connect', () => {
          console.log('[HOME-SOCKET] Conectado! Socket ID:', socketRef.current.id);
        });

        socketRef.current.emit('join', userId);
        console.log('[HOME-SOCKET] Emitindo join para sala/userId:', userId);

        // Ouvir evento de notificação em tempo real
        socketRef.current.on('notification', (notif) => {
          console.log('[HOME-SOCKET] 🔔 Nova notificação recebida:', notif);
          
          setNotifications(prev => {
            const newCount = prev + 1;
            console.log('[HOME-SOCKET] Atualizando contador:', prev, '->', newCount);
            return newCount;
          });
        });

        // Ouvir evento de nova mensagem em tempo real
        socketRef.current.on('receiveMessage', (message) => {
          console.log('[HOME-SOCKET] 💬 Nova mensagem recebida:', message);
          
          if (message.sender !== userId) {
            setUnreadMessages(prev => {
              const newCount = prev + 1;
              console.log('[HOME-SOCKET] Atualizando contador de mensagens:', prev, '->', newCount);
              return newCount;
            });
          }
        });

        // Ouvir quando notificações são marcadas como lidas
        socketRef.current.on('notification-read', (data) => {
          console.log('[HOME-SOCKET] 📖 Notificação marcada como lida:', data);
          
          if (data.count !== undefined) {
            setNotifications(data.count);
            console.log('[HOME-SOCKET] Contador atualizado pelo servidor:', data.count);
          } else {
            setNotifications(prev => {
              const newCount = Math.max(0, prev - 1);
              console.log('[HOME-SOCKET] Diminuindo contador:', prev, '->', newCount);
              return newCount;
            });
          }
        });

        // Ouvir quando mensagens são marcadas como lidas
        socketRef.current.on('message-read', (data) => {
          console.log('[HOME-SOCKET] 📖 Mensagem marcada como lida:', data);
          fetchUnreadMessages();
        });

        socketRef.current.on('messagesMarkedAsRead', (data) => {
          console.log('[HOME-SOCKET] 📖 Conversa marcada como lida:', data);
          fetchUnreadMessages();
        });

        socketRef.current.on('disconnect', () => {
          console.log('[HOME-SOCKET] Socket desconectado');
        });

        socketRef.current.on('error', (error) => {
          console.log('[HOME-SOCKET] Erro no socket:', error);
        });

      } catch (error) {
        console.error('[HOME-SOCKET] Erro ao configurar socket:', error);
      }
    };

    setupSocket();

    return () => {
      if (socketRef.current) {
        console.log('[HOME-SOCKET] Desconectando socket...');
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Hook para configurar StatusBar e atualizar dados sempre que a tela entrar em foco
  useFocusEffect(
    React.useCallback(() => {
      console.log('[HOME FOCUS] Tela Home entrou em foco - atualizando dados...');
      
      if (Platform.OS === 'android') {
        StatusBar.setBarStyle('dark-content', true);
        StatusBar.setBackgroundColor('#F8F9FA', true);
        StatusBar.setTranslucent(false);
      }
      
      const updateHomeData = async () => {
        try {
          await Promise.all([
            fetchCarrinhos(false, true),
            fetchUserData(),
            fetchUnreadNotifications(),
            fetchUnreadMessages()
          ]);
          
          console.log('[HOME FOCUS] Dados atualizados com sucesso');
        } catch (error) {
          console.error('[HOME FOCUS] Erro ao atualizar dados:', error);
        }
      };
      
      updateHomeData();
    }, [])
  );

  const hoje = new Date();
  
  const carrinhosPrestesFechar = carrinhos.filter((c) => {
    if (!c.closeDate) return false;
    
    if (c.isClosed === true || c.isFinished === true || c.isCancelled === true || c.isOpen === false) {
      return false;
    }
    
    const fechamento = new Date(c.closeDate);
    const diasRestantes = (fechamento - hoje) / (1000 * 60 * 60 * 24);
    
    return fechamento > hoje && diasRestantes <= 3;
  });
  
  const carrinhosRecentes = carrinhos.filter((c) => {
    if (!c.openDate) return false;
    
    if (c.isClosed === true || c.isFinished === true || c.isCancelled === true || c.isOpen === false) {
      return false;
    }
    
    if (c.closeDate) {
      const fechamento = new Date(c.closeDate);
      if (fechamento <= hoje) {
        return false;
      }
    }
    
    const abertura = new Date(c.openDate);
    const isRecent = (hoje - abertura) / (1000 * 60 * 60 * 24) <= 3;
    
    return isRecent;
  });

  const handleItemPress = (item) => {
    console.log('Carrinho selecionado:', item);
    navigation.navigate("DetailsCarrinhos1", { item: item ?? {} });
  };

  function nextPage(namePage) {
    navigation.navigate("CarrinhosScreen", { namePage });
  }

  function navegar(pagina) {
    navigation.navigate(pagina);
  }

  const formatNumber = (num) => {
    if (!num) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const renderCarrinhoCard = ({ item }) => {
    const daysRemaining = item.closeDate ? 
      Math.ceil((new Date(item.closeDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;
    
    const dateToShow = item.closeDate ? item.closeDate : item.openDate;
    const dateLabel = item.closeDate ? "Fecha" : "Aberto";
    
    return (
      <TouchableOpacity onPress={() => handleItemPress(item)} style={styles.modernCardContainer}>
        <View style={styles.modernCard}>
          {/* Badge da plataforma */}
          <View style={[styles.platformBadge, styles[`badge${item.platform}`]]}>
            <Text style={styles.platformBadgeText}>{item.platform}</Text>
          </View>
          
          {/* Badge de urgência se restam poucos dias */}
          {daysRemaining !== null && daysRemaining <= 2 && daysRemaining > 0 && (
            <View style={styles.urgentBadge}>
              <Fire size={12} color="#FFF" weight="fill" />
              <Text style={styles.urgentBadgeText}>{daysRemaining}d</Text>
            </View>
          )}
          
          {/* Imagem do carrinho */}
          <View style={styles.modernImageContainer}>
            <Image
              style={styles.modernCardImage}
              source={item.imageUrls && item.imageUrls.length > 0 ? 
                { uri: `${BASE_URL}/${item.imageUrls[0].replace(/\\/g, "/")}` } : 
                require('../../assets/imagens/carrinho1.png')
              }
              resizeMode="cover"
            />
            <View style={styles.gradientOverlay}>
              <View style={styles.itemCountBadge}>
                <ShoppingCartSimple size={14} color="#FFF" weight="bold" />
                <Text style={styles.itemCountText}>{item.itemCount ?? 0}</Text>
              </View>
            </View>
          </View>
          
          {/* Informações do carrinho */}
          <View style={styles.modernCardContent}>
            <Text style={styles.modernCardTitle} numberOfLines={1}>
              {item.cartName}
            </Text>
            
            <View style={styles.modernCardInfoRow}>
              <Calendar size={12} color="#666" />
              <Text style={styles.modernCardDateLabel}>{dateLabel}:</Text>
              <Text style={styles.modernCardInfoText}>
                {dateToShow ? new Date(dateToShow).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit'
                }) : 'Sem data'}
              </Text>
            </View>
            
            <Text style={styles.modernCardPrice}>
              {formatNumber(item.exchangeRate ? `Câmbio: ${item.exchangeRate} Kz` : 'Preço a definir')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="#F8F9FA" 
        translucent={false}
        animated={true}
      />
      
      <View style={styles.mainContainer}>
        {/* Header Moderno - Fixo no topo */}
        <View style={styles.modernHeader}>
          <View style={styles.greetingSection}>
            <Text style={styles.greetingText}>Olá, {userName}! 👋</Text>
            <Text style={styles.subGreetingText}>Descubra carrinhos incríveis</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.notificationButton} onPress={() => navegar("CompradorChatsScreen")}>
              <Chat size={20} color="#704F38" weight="bold" />
              {unreadMessages > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{unreadMessages > 99 ? '99+' : unreadMessages}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.notificationButton} onPress={() => navegar("CompradorNotificationsScreen")}>
              <Bell size={20} color="#704F38" weight="bold" />
              {notifications > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{notifications > 99 ? '99+' : notifications}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={styles.modernContainer} 
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#704F38']}
              tintColor="#704F38"
              progressBackgroundColor="#FFFFFF"
              title="Atualizando carrinhos..."
              titleColor="#704F38"
            />
          }
        >
          {/* Indicador de atualização */}
          {refreshing && (
            <View style={styles.refreshIndicator}>
              <ActivityIndicator size="small" color="#704F38" />
              <Text style={styles.refreshText}>Atualizando carrinhos...</Text>
            </View>
          )}

          {/* Seções de Plataformas Modernizadas */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Escolha sua Plataforma</Text>
            <Text style={styles.sectionSubtitle}>As melhores ofertas te esperam</Text>
          </View>

          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            style={styles.modernPlatformsContainer}
            contentContainerStyle={styles.platformsContent}
          >
            <TouchableOpacity onPress={() => nextPage("Carrinhos da SHEIN")} style={styles.modernPlatformCard}>
              <ImageBackground source={shein} style={styles.modernPlatformImage} imageStyle={styles.platformImageStyle}>
                <View style={styles.modernPlatformOverlay}>
                  <View style={styles.platformIcon}>
                    <Sparkle size={20} color="#FFF" weight="fill" />
                  </View>
                  <Text style={styles.modernPlatformTitle}>Shein</Text>
                  <Text style={styles.modernPlatformSubtitle}>Moda & Estilo</Text>
                  <Text style={styles.modernPlatformDescription}>Preços imperdíveis!</Text>
                </View>
              </ImageBackground>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => nextPage("Carrinhos da Zara")} style={styles.modernPlatformCard}>
              <ImageBackground source={zara} style={styles.modernPlatformImage} imageStyle={styles.platformImageStyle}>
                <View style={styles.modernPlatformOverlay}>
                  <View style={styles.platformIcon}>
                    <Sparkle size={20} color="#FFF" weight="fill" />
                  </View>
                  <Text style={styles.modernPlatformTitle}>Zara</Text>
                  <Text style={styles.modernPlatformSubtitle}>Fashion Premium</Text>
                  <Text style={styles.modernPlatformDescription}>Qualidade europeia</Text>
                </View>
              </ImageBackground>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => nextPage("Carrinhos da Aliexpress")} style={styles.modernPlatformCard}>
              <ImageBackground source={ali} style={styles.modernPlatformImage} imageStyle={styles.platformImageStyle}>
                <View style={styles.modernPlatformOverlay}>
                  <View style={styles.platformIcon}>
                    <Sparkle size={20} color="#FFF" weight="fill" />
                  </View>
                  <Text style={styles.modernPlatformTitle}>AliExpress</Text>
                  <Text style={styles.modernPlatformSubtitle}>Variedade Global</Text>
                  <Text style={styles.modernPlatformDescription}>Mundo de opções</Text>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          </ScrollView>

          {/* Carrinhos Prestes a Fechar */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Fire size={20} color="#FF6B35" weight="fill" />
              <Text style={styles.sectionTitle}>Últimas Horas!</Text>
            </View>
            <Text style={styles.sectionSubtitle}>Carrinhos fechando em breve</Text>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#704F38" />
              <Text style={styles.loadingText}>Carregando carrinhos...</Text>
            </View>
          ) : carrinhosPrestesFechar.length > 0 ? (
            <FlatList
              data={carrinhosPrestesFechar}
              renderItem={renderCarrinhoCard}
              keyExtractor={(item) => item._id}
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardsContainer}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nenhum carrinho fechando em breve</Text>
            </View>
          )}

          {/* Carrinhos Recentes */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Calendar size={20} color="#2E7D32" weight="fill" />
              <Text style={styles.sectionTitle}>Recém Chegados</Text>
            </View>
            <Text style={styles.sectionSubtitle}>Carrinhos criados recentemente</Text>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#704F38" />
              <Text style={styles.loadingText}>Carregando carrinhos...</Text>
            </View>
          ) : carrinhosRecentes.length > 0 ? (
            <FlatList
              data={carrinhosRecentes}
              renderItem={renderCarrinhoCard}
              keyExtractor={(item) => item._id}
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardsContainer}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nenhum carrinho recente encontrado</Text>
            </View>
          )}

          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Bottom Navigation Modernizada */}
        <View style={styles.modernBottomBar}>
          <TouchableOpacity style={[styles.navButton, styles.activeNavButton]}>
            <House weight="fill" size={28} color="#704F38" />
            <Text style={[styles.navText, styles.activeNavText]}>Home</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navButton} onPress={() => navegar("Carrinhos")}>
            <ShoppingCartSimple size={28} color="#9E9E9E" />
            <Text style={styles.navText}>Carrinhos</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navButton} onPress={() => navegar("OrderScreen")}>
            <ShoppingBagOpen size={28} color="#9E9E9E" />
            <Text style={styles.navText}>Pedidos</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navButton} onPress={() => navegar("CompradorNotificationsScreen")}>
            <View style={styles.navIconContainer}>
              <Bell size={28} color="#9E9E9E" />
              {notifications > 0 && <View style={styles.navBadge} />}
            </View>
            <Text style={styles.navText}>Alertas</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navButton} onPress={() => navegar("ProfileScreen")}>
            <User size={28} color="#9E9E9E" />
            <Text style={styles.navText}>Perfil</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  mainContainer: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  modernContainer: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  
  // Header Moderno
  modernHeader: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: STATUSBAR_HEIGHT + 16,
    marginBottom: 16,
    elevation: Platform.OS === 'android' ? 4 : 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    zIndex: 1000,
  },
  greetingSection: {
    flex: 1,
  },
  greetingText: {
    fontSize: 23,
    fontFamily: "Poppins_600SemiBold",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  subGreetingText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#666666",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  notificationButton: {
    position: "relative",
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
  },
  notificationBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },

  // Seções
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Poppins_600SemiBold",
    color: "#1A1A1A",
    marginLeft: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#666666",
  },

  // Plataformas Modernizadas
  modernPlatformsContainer: {
    marginBottom: 32,
  },
  platformsContent: {
    paddingHorizontal: 16,
  },
  modernPlatformCard: {
    marginHorizontal: 4,
  },
  modernPlatformImage: {
    width: 200,
    height: 280,
    justifyContent: "flex-end",
  },
  platformImageStyle: {
    borderRadius: 20,
  },
  modernPlatformOverlay: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    padding: 20,
    alignItems: "center",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  platformIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  modernPlatformTitle: {
    fontSize: 22,
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  modernPlatformSubtitle: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#FFFFFF",
    opacity: 0.9,
    marginBottom: 4,
  },
  modernPlatformDescription: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#FFFFFF",
    opacity: 0.8,
  },

  // Cards de Carrinhos Modernos
  cardsContainer: {
    paddingHorizontal: 16,
  },
  modernCardContainer: {
    marginHorizontal: 6,
    marginBottom: 16,
  },
  modernCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: 180,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: "hidden",
  },
  platformBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 2,
    elevation: 3,
  },
  badgeShein: { backgroundColor: "#E6E6FA" },
  badgeZara: { backgroundColor: "#F0F0F0" },
  badgeAliExpress: { backgroundColor: "#FFE4E1" },
  platformBadgeText: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    color: "#704F38",
  },
  urgentBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FF6B35",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 2,
    elevation: 3,
  },
  urgentBadgeText: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    color: "#FFFFFF",
    marginLeft: 4,
  },
  modernImageContainer: {
    width: "100%",
    height: 120,
    position: "relative",
  },
  modernCardImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F7F7F7",
  },
  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    padding: 8,
  },
  itemCountBadge: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  itemCountText: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    color: "#FFFFFF",
    marginLeft: 4,
  },
  modernCardContent: {
    padding: 16,
  },
  modernCardTitle: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  modernCardInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  modernCardDateLabel: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: "#666666",
    marginLeft: 6,
    marginRight: 4,
  },
  modernCardInfoText: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#666666",
  },
  modernCardPrice: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    color: "#704F38",
  },

  // Loading e Empty States
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#666666",
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#999999",
    textAlign: "center",
  },

  // Bottom Navigation Moderna
  modernBottomBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 8,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  navButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  activeNavButton: {
    backgroundColor: "#F5F1ED",
    borderRadius: 12,
    marginHorizontal: 4,
  },
  navIconContainer: {
    position: "relative",
  },
  navBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    backgroundColor: "#FF3B30",
    borderRadius: 4,
  },
  navText: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: "#9E9E9E",
    marginTop: 4,
  },
  activeNavText: {
    color: "#704F38",
    fontFamily: "Poppins_500Medium",
  },

  // Espaçamento final
  bottomSpacing: {
    height: 20,
  },

  // Indicadores de atualização
  refreshIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF',
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 10,
  },
  refreshText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#704F38',
    fontWeight: '500',
    fontFamily: 'Poppins_400Regular',
  },
});

export default Home;