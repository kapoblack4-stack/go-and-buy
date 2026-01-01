import React, { useState, useRef, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
const socketRef = { current: null };
import { useFocusEffect } from "@react-navigation/native";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Animated, 
  StyleSheet, 
  Dimensions, 
  FlatList, 
  Image, 
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Platform,
  Alert
} from 'react-native';
import { BASE_URL } from '../../config';
import { Upload, ArrowRight, ChatCircleDots, CaretLeft, Clock, CheckCircle, XCircle, ArrowClockwise, Trash, PencilSimple, X } from 'phosphor-react-native';
import { getSafeAreaStyle, configureStatusBar } from "../utils/statusBar";
import Header from '../components/Header';
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';


const OrderScreen = ({ route }) => {
  const navigation = useNavigation();
  const [selectedTab, setSelectedTab] = useState('Ativos');
  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);

  // Configurar StatusBar ao entrar na tela
  useFocusEffect(
    React.useCallback(() => {
      configureStatusBar('#F8F9FA', 'dark-content');
    }, [])
  );

  useEffect(() => {
    // Recupera o ID do comprador do AsyncStorage
    const fetchUserId = async () => {
      // Tenta diferentes chaves possíveis
      let id = await AsyncStorage.getItem('userId');
      if (!id) {
        id = await AsyncStorage.getItem('userToken'); // Backup case
      }
      if (!id) {
        id = await AsyncStorage.getItem('user'); // Outro backup
      }
      
      console.log("[ORDER-USER] 🔍 Tentando recuperar userId do AsyncStorage:");
      console.log("[ORDER-USER] - userId:", await AsyncStorage.getItem('userId'));
      console.log("[ORDER-USER] - userToken:", await AsyncStorage.getItem('userToken'));
      console.log("[ORDER-USER] - user:", await AsyncStorage.getItem('user'));
      console.log("[ORDER-USER] ✅ ID final usado:", id);
      
      setUserId(id);
    };
    fetchUserId();
  }, []);

  // Force refresh quando vem de notificações
  useEffect(() => {
    if (route?.params?.cartId || route?.params?.orderId || route?.params?.forceRefresh) {
      console.log('[ORDER-PARAMS] Parâmetros recebidos, forçando refresh:', route.params);
      fetchCarts(true); // Force refresh
    }
  }, [route?.params]);

  const isCartFechado = (cart) => {
  const normalizedUserId = String(userId || "").trim();
  const progress = cart.buyerCartProgress?.find(p => {
    // Extrair o ID do buyer, que pode ser string ou objeto populado
    let buyerId;
    if (p?.buyer) {
      if (typeof p.buyer === "object" && p.buyer._id) {
        buyerId = String(p.buyer._id).trim();
      } else {
        buyerId = String(p.buyer).trim();
      }
    } else {
      buyerId = "";
    }
    return buyerId === normalizedUserId;
  });
  
  // Considera fechado se o status é "Fechado" OU se finalizadoCliente e finalizadoVendedor são true
  return progress?.status === "Fechado" || 
         (progress?.finalizadoCliente && progress?.finalizadoVendedor);
};
const handleItemPress = () => {
    navigation.navigate("Home");
  };

  const fetchCarts = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        console.log('[REFRESH] Iniciando atualização por pull-to-refresh...');
      } else {
        setLoading(true);
        console.log('[LOADING] Carregando carrinhos...');
      }
      
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.warn("[FETCH-CARTS] ❌ Token não encontrado no AsyncStorage");
        return;
      }
      
      console.log("[FETCH-CARTS] 🔑 Token encontrado:", token ? `${token.substring(0, 10)}...` : 'null');
      console.log("[FETCH-CARTS] 📡 Fazendo requisição para:", `${BASE_URL}/api/carts/buyer/my-carts`);

      const response = await fetch(`${BASE_URL}/api/carts/buyer/my-carts`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setCarts(data);
      console.log(`[${isRefresh ? 'REFRESH' : 'LOADING'}] Carrinhos atualizados:`, data.length, 'itens');
      
      // Debug: Log dos status dos carrinhos
      data.forEach((cart, index) => {
        const progressStatuses = cart.buyerCartProgress?.map(p => ({
          buyer: p.buyer?._id || p.buyer,
          status: p.status
        })) || [];
        console.log(`[ORDER-DEBUG] Carrinho ${index + 1} - Progress:`, progressStatuses);
      });
    } catch (error) {
      console.error("Erro ao buscar carrinhos:", error);
      // Opcional: mostrar toast ou alert para o usuário
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log('[FETCH] Finalizando carregamento...');
    }
  };

  const onRefresh = useCallback(() => {
    console.log('[PULL-TO-REFRESH] Usuário puxou para atualizar');
    fetchCarts(true);
  }, []);

useFocusEffect(
  useCallback(() => {
    console.log('[ORDER-FOCUS] Tela ganhou foco, atualizando dados...');
    fetchCarts();
    
    // Socket.io para atualização em tempo real
    if (!socketRef.current) {
      socketRef.current = io(BASE_URL.replace('/api', ''), {
        transports: ['websocket'],
        autoConnect: true,
      });
    }
    const socket = socketRef.current;
    socket.on('cartUpdated', () => {
      fetchCarts();
    });
    return () => {
      socket.off('cartUpdated');
    };
  }, [])
);


 // Filtra os carrinhos conforme o estado do cartprogress do usuário
const filteredCarts = carts.filter(cart => {
  const normalizedUserId = String(userId || "").trim();
  const myProgress = cart.buyerCartProgress?.find(progress => {
    // Extrair o ID do buyer, que pode ser string ou objeto populado
    let buyerId;
    if (progress?.buyer) {
      if (typeof progress.buyer === "object" && progress.buyer._id) {
        buyerId = String(progress.buyer._id).trim();
      } else {
        buyerId = String(progress.buyer).trim();
      }
    } else {
      buyerId = "";
    }
    return buyerId === normalizedUserId;
  });
  const status = myProgress?.status;
  const fechado = isCartFechado(cart);
  const finalizadoCliente = myProgress?.finalizadoCliente || false;
  
  // Debug: Log do status e condições
  console.log('[FILTER-DEBUG] 🔍 Carrinho:', cart.cartName, {
    status: status,
    isFinished: cart.isFinished,
    fechado: fechado,
    finalizadoCliente: finalizadoCliente,
    selectedTab: selectedTab,
    shouldShowInAtivos: !cart.isFinished && !fechado && !finalizadoCliente && status !== 'Negado' && status !== 'Cancelado',
    shouldShowInFinalizados: cart.isFinished || fechado || finalizadoCliente || status === 'Negado' || status === 'Cancelado' || status === 'Fechado'
  });
  
  if (selectedTab === 'Ativos') {
    // Não mostrar Fechado, finalizadoCliente, Negado ou Cancelado nos ativos
    // Entregue ainda fica em Ativos até o cliente confirmar com feedback
    return !cart.isFinished && !fechado && !finalizadoCliente &&
           status !== 'Negado' && status !== 'Cancelado' && 
           status !== 'Fechado';
  } else {
    // Mostrar Fechado, finalizadoCliente, Negado ou Cancelado nos completos
    // Entregue só vai para Completos quando finalizadoCliente for true
    return cart.isFinished || fechado || finalizadoCliente ||
           status === 'Negado' || status === 'Cancelado' || 
           status === 'Fechado';
  }
});

  // Função para cancelar pedido
  const cancelOrder = async (cartId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        alert('Token não encontrado');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/orders/cancel/${cartId}/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        alert('Pedido cancelado com sucesso!');
        fetchCarts(true); // Refresh da lista
      } else {
        const errorData = await response.text();
        alert(`Erro ao cancelar pedido: ${errorData}`);
      }
    } catch (error) {
      console.error('Erro ao cancelar pedido:', error);
      alert('Erro ao cancelar pedido');
    }
  };

  // Função para editar pedido
  const editOrder = (cart) => {
    // Navega para tela de edição dedicada
    navigation.navigate('EditOrderScreen', { 
      cartId: cart._id,
      cartData: cart
    });
  };

  // Função para confirmar cancelamento
  const confirmCancelOrder = (cartId, cartName) => {
    Alert.alert(
      'Cancelar Pedido',
      `Tem certeza que deseja cancelar o pedido do carrinho "${cartName}"?\n\nEsta ação não pode ser desfeita.`,
      [
        { text: 'Não', style: 'cancel' },
        { 
          text: 'Sim, Cancelar', 
          style: 'destructive',
          onPress: () => cancelOrder(cartId)
        }
      ]
    );
  };

  const renderOrderItem = ({ item }) => {
  const imageUrl = item.imageUrls?.[0]
    ? { uri: `${BASE_URL}/${item.imageUrls[0].replace(/\\/g, '/')}` }
    : require('../../assets/imagens/logo.png');

  const normalizedUserId = String(userId || "").trim();
  
  // Debug: Log do item completo
  console.log('[ORDER-DEBUG] 🔍 Renderizando item:', {
    cartId: item._id,
    buyerCartProgress: item.buyerCartProgress,
    paymentProofs: item.paymentProofs,
    currentUserId: normalizedUserId
  });

  // Verifica se já enviou comprovativo
  const hasProof = item.paymentProofs?.some(proof => {
    // Extrair o ID do buyer, que pode ser string ou objeto populado
    let buyerId;
    if (proof?.buyer) {
      if (typeof proof.buyer === "object" && proof.buyer._id) {
        // Caso o buyer esteja populado (objeto completo)
        buyerId = String(proof.buyer._id).trim();
      } else if (typeof proof.buyer === "string") {
        // Caso o buyer seja apenas o ID (string)
        buyerId = String(proof.buyer).trim();
      } else {
        buyerId = String(proof.buyer).trim();
      }
    } else {
      buyerId = "";
    }
    
    console.log('[ORDER-DEBUG] 🧾 Verificando proof - buyerId:', buyerId, 'vs userId:', normalizedUserId);
    return buyerId === normalizedUserId;
  });

  // Pega o status do progresso do comprador
  const myProgress = item.buyerCartProgress?.find(progress => {
    // Extrair o ID do buyer, que pode ser string ou objeto populado
    let buyerId;
    if (progress?.buyer) {
      if (typeof progress.buyer === "object" && progress.buyer._id) {
        // Caso o buyer esteja populado (objeto completo)
        buyerId = String(progress.buyer._id).trim();
      } else if (typeof progress.buyer === "string") {
        // Caso o buyer seja apenas o ID (string)
        buyerId = String(progress.buyer).trim();
      } else {
        buyerId = String(progress.buyer).trim();
      }
    } else {
      buyerId = "";
    }
    
    // Debug logs para identificar problemas
    console.log('[ORDER-DEBUG] 📊 Verificando progress:', {
      progressBuyerId: buyerId,
      progressBuyerObject: progress?.buyer,
      currentUserId: normalizedUserId,
      status: progress?.status,
      isMatch: buyerId === normalizedUserId
    });
    
    return buyerId === normalizedUserId;
  });

  // Backup: Se não encontrou, tenta busca menos restritiva
  const backupProgress = !myProgress ? item.buyerCartProgress?.find(progress => {
    // Extrair o ID do buyer, que pode ser string ou objeto populado
    let buyerId;
    if (progress?.buyer) {
      if (typeof progress.buyer === "object" && progress.buyer._id) {
        buyerId = String(progress.buyer._id).trim();
      } else {
        buyerId = String(progress.buyer).trim();
      }
    } else {
      buyerId = "";
    }
    
    // Tenta diferentes comparações
    return buyerId.includes(normalizedUserId) || normalizedUserId.includes(buyerId);
  }) : null;

  const finalProgress = myProgress || backupProgress;
  
  if (backupProgress && !myProgress) {
    console.log('[ORDER-DEBUG] ⚠️ Usando backup progress:', backupProgress);
  }

  console.log('[ORDER-DEBUG] 📋 Resultado final:', {
    myProgress: finalProgress,
    hasProof: hasProof,
    userId: normalizedUserId,
    allProgressEntries: item.buyerCartProgress?.map(p => ({
      buyer: p.buyer,
      status: p.status
    }))
  });

  console.log('[ORDER-DEBUG] 📋 Progresso final encontrado:', finalProgress);

  const isPending = finalProgress?.status === "Em Progresso";
  const isAceite = finalProgress?.status === "Aceite";
  const isNegadoOuCancelado = finalProgress?.status === "Negado" || finalProgress?.status === "Cancelado";
  const isFechado = finalProgress?.status === "Fechado";
  const isEntregue = finalProgress?.status === "Entregue";
  const comprovativoRejeitado = finalProgress?.comprovativoRejeitado;
  const isCancelado = finalProgress?.status === "Cancelado";
  
  // Status que permitem cancelamento e edição (antes do vendedor aceitar e não cancelado)
  const podeCancelarOuEditar = !isCancelado && (
                               finalProgress?.status === "Pedido Feito" || 
                               finalProgress?.status === "Aguardando" || 
                               finalProgress?.status === "Em Progresso"
                               );

  // Função para obter ícone e cor do status
  const getStatusInfo = () => {
    // Prioridade: Status finais primeiro
    if (isFechado) {
      return { icon: CheckCircle, color: '#4CAF50', text: 'Finalizado' };
    }
    if (isEntregue) {
      return { icon: CheckCircle, color: '#2E7D32', text: 'Entregue' };
    }
    if (isNegadoOuCancelado) {
      return { icon: XCircle, color: '#D32F2F', text: 'Negado' };
    }
    if (comprovativoRejeitado) {
      return { icon: Upload, color: '#FF6B35', text: 'Reenviar' };
    }
    if (hasProof) {
      return { icon: CheckCircle, color: '#2E7D32', text: isPending ? 'Pendente' : 'Ativo' };
    }
    if (isAceite) {
      return { icon: Upload, color: '#704F38', text: 'Enviar Comprovativo' };
    }
    if (isPending) {
      return { icon: Clock, color: '#FB8C00', text: 'Aguardando' };
    }
    return { icon: Clock, color: '#9E9E9E', text: 'Não aceite' };
  };

  const statusInfo = getStatusInfo();

  return (
    <TouchableOpacity 
      style={styles.orderItem}
      onPress={() => navigation.navigate('CartDetailsScreen', { 
        cartId: item._id,
        cartData: item 
      })}
      activeOpacity={0.7}
    >
      {/* Header com status badge */}
      <View style={styles.orderHeader}>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
          <statusInfo.icon size={16} color="#FFF" weight="fill" />
          <Text style={styles.statusText}>{statusInfo.text}</Text>
        </View>
        
        {/* Botão de chat */}
        <TouchableOpacity
          style={styles.chatButton}
          onPress={async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              const sellerId = item.seller?._id || item.seller;
              const buyerId = userId;
              if (!sellerId || !buyerId) {
                alert('Não foi possível identificar vendedor ou comprador.');
                return;
              }
              const convRes = await fetch(`${BASE_URL}/api/chat/conversation/between/${sellerId}/${buyerId}`, {
                headers: { Authorization: token },
              });
              const convData = await convRes.json();
              const conversationId = convData._id;
              navigation.navigate('CompradorChatScreen', {
                conversationId,
                sellerId,
                buyerId,
              });
            } catch (err) {
              alert('Erro ao abrir chat: ' + err.message);
            }
          }}
        >
          <ChatCircleDots size={24} color="#704F38" weight="duotone" />
        </TouchableOpacity>
      </View>

      {/* Conteúdo principal */}
      <View style={styles.orderContent}>
        <Image source={imageUrl} style={styles.orderImage} />
        
        <View style={styles.orderDetails}>
          <Text style={styles.orderTitle} numberOfLines={2}>{item.cartName}</Text>
          
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Loja</Text>
              <Text style={styles.detailValue}>{item.platform}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Itens</Text>
              <Text style={styles.detailValue}>{item.itemCount}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Taxa</Text>
              <Text style={styles.detailValue}>{item.exchangeRate} Kz</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Vendedor</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{item.seller?.name}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Botões de ação */}
      {!isNegadoOuCancelado && (
        <View style={styles.actionContainer}>
          {comprovativoRejeitado ? (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#FF6B35' }]}
              onPress={() => navigation.navigate("UploadComprovativoScreen", {
                cart: item,
                cartId: item._id,
                seller: item.seller,
                orderId: item.orderId,
                totalPrice: item.totalPrice,
              })}
            >
              <Upload size={18} color="#FFF" weight="bold" />
              <Text style={styles.actionText}>Reenviar Comprovativo</Text>
            </TouchableOpacity>
          ) : hasProof ? (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#704F38' }]}
              onPress={() => navigation.navigate("MyOrder", { cart: item })}
            >
              <ArrowRight size={18} color="#FFF" weight="bold" />
              <Text style={styles.actionText}>
                {isPending ? "Ver Status" : "Seguir Pedido"}
              </Text>
            </TouchableOpacity>
          ) : isAceite ? (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#704F38' }]}
              onPress={() => navigation.navigate("UploadComprovativoScreen", {
                cart: item,
                cartId: item._id,
                seller: item.seller,
                orderId: item.orderId,
                totalPrice: item.totalPrice,
              })}
            >
              <Upload size={18} color="#FFF" weight="bold" />
              <Text style={styles.actionText}>Enviar Comprovativo</Text>
            </TouchableOpacity>
          ) : podeCancelarOuEditar ? (
            // Pedido ainda não aceito - mostrar botões de cancelar e editar
            <View>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => confirmCancelOrder(item._id, item.cartName)}
                >
                  <Trash size={14} color="#FFF" weight="bold" />
                  <Text style={styles.actionText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => editOrder(item)}
                >
                  <PencilSimple size={14} color="#FFF" weight="bold" />
                  <Text style={styles.actionText}>Editar</Text>
                </TouchableOpacity>
              </View>
              
              <View style={[styles.actionButton, styles.disabledButton, styles.waitingStatus]}>
                <Clock size={16} color="#666" />
                <Text style={[styles.actionText, { color: '#666' }]}>
                  {isPending ? "Aguardando Aprovação" : "Aguardando Aceite"}
                </Text>
              </View>
            </View>
          ) : (
            // Pedido não pode ser cancelado/editado - apenas mostrar status
            <View style={[styles.actionButton, styles.disabledButton]}>
              {isCancelado ? (
                <>
                  <X size={18} color="#E53E3E" />
                  <Text style={[styles.actionText, { color: '#E53E3E' }]}>
                    Pedido Cancelado
                  </Text>
                </>
              ) : (
                <>
                  <Clock size={18} color="#666" />
                  <Text style={[styles.actionText, { color: '#666' }]}>
                    {statusFromProgress}
                  </Text>
                </>
              )}
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};




  const tabIndicator = useRef(new Animated.Value(0)).current;
  const windowWidth = Dimensions.get('window').width;
  const tabWidth = windowWidth / 2 - 10;

  const handleTabPress = (tabName) => {
    setSelectedTab(tabName);
    Animated.spring(tabIndicator, {
      toValue: tabName === 'Ativos' ? 0 : tabWidth,
      useNativeDriver: true,
    }).start();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        backgroundColor="#F8F9FA" 
        barStyle="dark-content" 
        translucent={false}
      />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={{ width: "20%", marginLeft: 5 }}
          onPress={() => handleItemPress()}
        >
          <CaretLeft size={24} />
        </TouchableOpacity>
        <Text style={styles.headerText}>Meus Pedidos</Text>
        <TouchableOpacity
          style={{ width: "20%", alignItems: "flex-end", paddingRight: 15 }}
          onPress={() => {
            console.log('[ORDER-MANUAL] 🔄 Refresh manual iniciado');
            console.log('[ORDER-MANUAL] 📊 Tab atual:', selectedTab);
            fetchCarts(true);
          }}
        >
          <ArrowClockwise size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Tabs Container */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'Ativos' ? styles.activeTab : styles.inactiveTab]}
          onPress={() => handleTabPress('Ativos')}
        >
          <Text style={[styles.tabText, selectedTab === 'Ativos' ? styles.activeTabText : null]}>
            Ativos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'Completos' ? styles.activeTab : styles.inactiveTab]}
          onPress={() => handleTabPress('Completos')}
        >
          <Text style={[styles.tabText, selectedTab === 'Completos' ? styles.activeTabText : null]}>
            Completos
          </Text>
        </TouchableOpacity>
      </View>

      {/* Indicador de atualização */}
      {refreshing && (
        <View style={styles.refreshIndicator}>
          <ActivityIndicator size="small" color="#704F38" />
          <Text style={styles.refreshText}>Atualizando pedidos...</Text>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#704F38" />
          <Text style={styles.loadingText}>Carregando pedidos...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCarts}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item._id}
          style={styles.orderList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#704F38']} // Android
              tintColor="#704F38" // iOS
              progressBackgroundColor="#FFFFFF" // Android
              title="Atualizando pedidos..." // iOS
              titleColor="#704F38" // iOS
              size="default" // Android
            />
          }
          ListEmptyComponent={() => (
            <Text style={styles.emptyText}>
              {selectedTab === 'Ativos' ? 'Nenhum pedido ativo encontrado.' : 'Nenhum pedido completo encontrado.'}
            </Text>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: getSafeAreaStyle('#F8F9FA'),
  header: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  headerText: {
    fontSize: 24,
    fontWeight: "300",
    margin: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#704F38',
  },
  inactiveTab: {
    backgroundColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#704F38',
    fontFamily: 'Poppins_400Regular',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
  },
  tabIndicator: {
    height: 4,
    backgroundColor: '#704F38',
    position: 'absolute',
    bottom: 0,
  },
  tabContent: {
    flex: 1,
  },
  orderList: {
    flex: 1,
  },
  orderItem: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  chatButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  orderContent: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  orderImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
  orderDetails: {
    flex: 1,
    marginLeft: 12,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
    lineHeight: 20,
    fontFamily: 'Poppins_600SemiBold',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItem: {
    flex: 1,
    minWidth: '45%',
  },
  detailLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 2,
    fontWeight: '500',
    fontFamily: 'Poppins_400Regular',
  },
  detailValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  actionContainer: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#704F38',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  disabledButton: {
    backgroundColor: '#F5F5F5',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Poppins_400Regular',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cancelButton: {
    backgroundColor: '#E53E3E',
    flex: 1,
  },
  editButton: {
    backgroundColor: '#3182CE',
    flex: 1,
  },
  waitingStatus: {
    marginTop: 8,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  // Estilos antigos mantidos para compatibilidade
  orderItemTop: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  orderItemImage: {
    width: "30%",
    height: "100%",
    marginRight: 12,
    borderRadius: 8,
  },
  orderItemDetails: {
    flex: 1,
    justifyContent: 'space-around',
  },
  orderItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Poppins_600SemiBold',
  },
  itemSpace: {
    color: "#878787",
    fontFamily: 'Poppins_400Regular',
    marginBottom: 4,
  },
  actionTitle: {
    color: "white",
    marginRight: 6,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
  },
  // Novos estilos para loading e empty state
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingTop: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#704F38',
    fontWeight: '500',
    fontFamily: 'Poppins_400Regular',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#666666',
    fontStyle: 'italic',
    paddingHorizontal: 20,
    fontFamily: 'Poppins_400Regular',
  },
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

export default OrderScreen;
