// OrdersScreen.js
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { 
  Star, 
  ShoppingBag, 
  User, 
  CurrencyCircleDollar,
  CaretRight,
  Package,
  Clock,
  CheckCircle
} from "phosphor-react-native";
import Header from "../../components/Header";
import { BASE_URL } from "../../../config";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const OrdersScreen = ({ route }) => {
  const { cart } = route.params;
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState([]);
  const [imageErrors, setImageErrors] = useState({});
  const [updateMessage, setUpdateMessage] = useState(null);
  const navigation = useNavigation();

  // Função para determinar cor do status
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'entregue':
      case 'fechado':
        return '#4CAF50';
      case 'em processamento':
      case 'processando':
        return '#FF9800';
      case 'pendente':
        return '#2196F3';
      case 'cancelado':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  // Função para determinar ícone do status
  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'entregue':
      case 'fechado':
        return CheckCircle;
      case 'em processamento':
      case 'processando':
        return Clock;
      case 'pendente':
        return Package;
      default:
        return Package;
    }
  };

  // Função para formatar números
  const formatNumber = (num) => {
    if (!num) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Função para buscar carrinho atualizado do servidor
  const fetchUpdatedCart = useCallback(async () => {
    try {
      console.log("[REFRESH] Buscando dados atualizados do carrinho...");
      
      // Buscar token de autenticação
      const token = await AsyncStorage.getItem("token");
      const headers = {
        'Content-Type': 'application/json',
      };
      
      // Adicionar token se disponível
      if (token) {
        headers.Authorization = token;
      }
      
      const response = await fetch(`${BASE_URL}/api/carts/${cart._id}`, {
        headers: headers
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const updatedCart = await response.json();
      console.log("[REFRESH] Carrinho atualizado obtido:", {
        cartId: updatedCart._id,
        buyerProgressCount: updatedCart.buyerCartProgress?.length || 0,
        originalCount: cart.buyerCartProgress?.length || 0,
        novosCompradores: (updatedCart.buyerCartProgress?.length || 0) > (cart.buyerCartProgress?.length || 0)
      });
      
      return updatedCart;
    } catch (error) {
      console.error("[REFRESH] Erro ao buscar carrinho atualizado:", error);
      return cart; // Fallback para o carrinho original
    }
  }, [cart._id]);

  // Função para buscar informações dos compradores
  const fetchBuyersInfo = useCallback(async (updatedCartData = null) => {
    console.log("[FETCH] Iniciando busca de informações dos compradores...");
    
    // Use o carrinho atualizado se fornecido, senão use o original
    const cartToUse = updatedCartData || cart;
    console.log("Cart data to use:", {
      cartId: cartToUse._id,
      buyerProgressCount: cartToUse.buyerCartProgress?.length || 0
    });

    if (cartToUse && cartToUse.buyerCartProgress) {
      try {
        const buyersWithInfo = await Promise.all(
          cartToUse.buyerCartProgress.map(async (item, index) => {
            console.log(`\n📦 Comprador ${index + 1}`);
            console.log("ID:", item._id || index.toString());
            console.log("Buyer completo:", item.buyer);
            
            // ⚠️ CORREÇÃO: Extrair o ID correto do buyer
            let buyerId;
            if (typeof item.buyer === 'string') {
              buyerId = item.buyer;
            } else if (item.buyer && item.buyer._id) {
              buyerId = item.buyer._id;
            } else {
              console.error("❌ Não foi possível extrair buyerId de:", item.buyer);
              buyerId = null;
            }
            
            console.log("Buyer ID extraído:", buyerId);

            let buyerInfo = null;
            let buyerOrders = [];

            if (buyerId) {
              try {
                // 1️⃣ Buscar dados completos do comprador
                const res = await fetch(`${BASE_URL}/api/auth/${buyerId}`);
                buyerInfo = await res.json();
                
                console.log("Buyer info obtida:", {
                  name: buyerInfo?.name,
                  profileImage: buyerInfo?.profileImage
                });

                // 2️⃣ Buscar TODAS as ordens desse comprador nesse carrinho
                const ordersRes = await fetch(
                  `${BASE_URL}/api/orders/cart/${cartToUse._id}/buyer/${buyerId}`
                );

                console.log("Orders status:", ordersRes.status);

                const rawResponse = await ordersRes.text();
                console.log("Orders raw response:", rawResponse);

                try {
                  buyerOrders = JSON.parse(rawResponse);
                } catch (parseErr) {
                  console.error("❌ Erro ao converter ordens para JSON:", parseErr);
                  buyerOrders = [];
                }
              } catch (err) {
                console.error("❌ Erro ao buscar comprador ou ordens:", err);
              }
            }

            // ⚠️ CORREÇÃO: Usar dados já populados se disponíveis
            const finalBuyerInfo = buyerInfo || {
              name: item.buyer?.name || "Nome não disponível",
              email: item.buyer?.email || "",
              profileImage: item.buyer?.profileImage || null
            };

            // Processar URL da imagem corretamente
            let avatarUri = null;
            if (finalBuyerInfo?.profileImage) {
              const imagePath = finalBuyerInfo.profileImage.replace(/\\/g, "/");
              if (imagePath.startsWith('http')) {
                avatarUri = imagePath;
              } else if (imagePath.startsWith('uploads/')) {
                avatarUri = `${BASE_URL}/${imagePath}`;
              } else {
                avatarUri = `${BASE_URL}/uploads/${imagePath}`;
              }
            }
            
            console.log("Avatar processado:", {
              buyerId: buyerId,
              finalAvatarUri: avatarUri,
              willUseDefault: !avatarUri
            });

            return {
              id: item._id || index.toString(),
              name: finalBuyerInfo?.name || "Nome não disponível",
              cartStatus: cartToUse.cartName || "Carrinho sem nome",
              orderStatus: item.status || "Sem status",
              price: item.price ? `${item.price} AOA` : "Pendente",
              avatar: avatarUri
                ? { uri: avatarUri }
                : require("../../../assets/imagens/logo.png"),
              orders: buyerOrders,
              buyerId: buyerId || "ID não disponível",
            };
          })
        );
        setBuyers(buyersWithInfo);
        console.log("[FETCH] Dados atualizados com sucesso! Total de compradores:", buyersWithInfo.length);
        
        // Verificar se há novos compradores
        if (updatedCartData && buyersWithInfo.length > buyers.length) {
          const novosCompradores = buyersWithInfo.length - buyers.length;
          console.log(`[NOVOS COMPRADORES] Encontrados ${novosCompradores} novos compradores!`);
          setUpdateMessage(`🎉 ${novosCompradores} novo${novosCompradores > 1 ? 's' : ''} comprador${novosCompradores > 1 ? 'es' : ''} encontrado${novosCompradores > 1 ? 's' : ''}!`);
          
          // Limpar mensagem após 3 segundos
          setTimeout(() => {
            setUpdateMessage(null);
          }, 3000);
        } else if (updatedCartData) {
          setUpdateMessage("✅ Dados atualizados!");
          setTimeout(() => {
            setUpdateMessage(null);
          }, 2000);
        }
      } catch (error) {
        console.error("[FETCH] Erro ao buscar dados:", error);
      }
    }
  }, [cart]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchBuyersInfo();
      setLoading(false);
    };
    loadData();
  }, [fetchBuyersInfo]);

  // Função para refresh
  const onRefresh = useCallback(async () => {
    console.log('[PULL-TO-REFRESH] Usuário puxou para atualizar pedidos');
    setRefreshing(true);
    
    try {
      // 1️⃣ Primeiro buscar dados atualizados do carrinho
      const updatedCart = await fetchUpdatedCart();
      
      // 2️⃣ Então buscar informações dos compradores com dados atualizados
      await fetchBuyersInfo(updatedCart);
      
      console.log('[PULL-TO-REFRESH] Atualização concluída com sucesso');
    } catch (error) {
      console.error('[PULL-TO-REFRESH] Erro durante refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchBuyersInfo, fetchUpdatedCart]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#F8F9FA" barStyle="dark-content" />
      <Header page={`Pedidos: ${cart.cartName}`} />
      
      {/* Indicador de atualização */}
      {refreshing && (
        <View style={styles.refreshIndicator}>
          <ActivityIndicator size="small" color="#704F38" />
          <Text style={styles.refreshText}>Atualizando pedidos...</Text>
        </View>
      )}

      {/* Mensagem de novos compradores */}
      {updateMessage && (
        <View style={styles.updateMessageContainer}>
          <Text style={styles.updateMessageText}>{updateMessage}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#704F38" />
          <Text style={styles.loadingText}>Carregando pedidos...</Text>
        </View>
      ) : buyers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Package size={64} color="#CCCCCC" />
          <Text style={styles.emptyTitle}>Nenhum pedido encontrado</Text>
          <Text style={styles.emptySubtitle}>
            Este carrinho ainda não possui pedidos de compradores.
          </Text>
        </View>
      ) : (
        <FlatList
          data={buyers}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#704F38']} // Android
              tintColor="#704F38" // iOS
              progressBackgroundColor="#FFFFFF" // Android
              title="Atualizando pedidos..." // iOS
              titleColor="#704F38" // iOS
            />
          }
          renderItem={({ item, index }) => {
            const StatusIcon = getStatusIcon(item.orderStatus);
            const statusColor = getStatusColor(item.orderStatus);
            const totalPrice = item.orders && item.orders.length > 0
              ? item.orders.reduce((acc, order) => acc + ((order.priceUSD || 0) * (cart.exchangeRate || 1)), 0)
              : 0;

            return (
              <TouchableOpacity
                style={[styles.modernCard, { marginTop: index === 0 ? 0 : 16 }]}
                onPress={() =>
                  navigation.navigate("DetailOrder", {
                    cart,
                    buyer: item,
                  })
                }
                activeOpacity={0.7}
              >
                {/* Header do Card */}
                <View style={styles.cardHeader}>
                  <View style={styles.buyerInfo}>
                    <View style={styles.avatarContainer}>
                      <Image 
                        source={
                          imageErrors[item.id] || !item.avatar?.uri
                            ? require("../../../assets/imagens/logo.png")
                            : item.avatar
                        } 
                        style={styles.modernAvatar}
                        onError={() => {
                          console.log('[OrdersScreen] Erro ao carregar imagem do comprador:', item.name, item.avatar);
                          setImageErrors(prev => ({...prev, [item.id]: true}));
                        }}
                        onLoad={() => {
                          console.log('[OrdersScreen] Imagem carregada com sucesso:', item.name, item.avatar);
                        }}
                      />
                      <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
                    </View>
                    
                    <View style={styles.buyerDetails}>
                      <Text style={styles.buyerName}>{item.name}</Text>
                      <View style={styles.statusContainer}>
                        <StatusIcon size={16} color={statusColor} weight="fill" />
                        <Text style={[styles.statusText, { color: statusColor }]}>
                          {item.orderStatus}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <CaretRight size={24} color="#704F38" weight="bold" />
                </View>

                {/* Estatísticas */}
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <ShoppingBag size={20} color="#704F38" weight="duotone" />
                    <Text style={styles.statLabel}>Pedidos</Text>
                    <Text style={styles.statValue}>{item.orders ? item.orders.length : 0}</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <CurrencyCircleDollar size={20} color="#704F38" weight="duotone" />
                    <Text style={styles.statLabel}>Total</Text>
                    <Text style={styles.statValue}>{formatNumber(Math.round(totalPrice))} AOA</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Star size={20} color="#FFD700" weight="fill" />
                    <Text style={styles.statLabel}>Avaliação</Text>
                    <Text style={styles.statValue}>4.8</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
  updateMessageContainer: {
    backgroundColor: '#E8F5E8',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 8,
  },
  updateMessageText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'Poppins_600SemiBold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#704F38',
    fontWeight: '500',
    fontFamily: 'Poppins_400Regular',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'Poppins_600SemiBold',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Poppins_400Regular',
  },
  listContainer: {
    padding: 16,
  },
  modernCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  buyerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  modernAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F0F0',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  buyerDetails: {
    flex: 1,
  },
  buyerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
    fontFamily: 'Poppins_600SemiBold',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
    fontFamily: 'Poppins_500Medium',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 8,
    marginBottom: 4,
    fontFamily: 'Poppins_400Regular',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    fontFamily: 'Poppins_600SemiBold',
  },
});

export default OrdersScreen;