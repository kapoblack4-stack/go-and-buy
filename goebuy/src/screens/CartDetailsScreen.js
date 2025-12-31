import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
  Dimensions,
} from 'react-native';
import {
  CaretLeft,
  Package,
  MapPin,
  CurrencyDollar,
  User,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Truck,
} from 'phosphor-react-native';
import { BASE_URL } from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { getSafeAreaStyle, configureStatusBar } from '../utils/statusBar';

const { width } = Dimensions.get('window');

const CartDetailsScreen = ({ route }) => {
  const navigation = useNavigation();
  const { cartId, cartData } = route.params;
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartInfo, setCartInfo] = useState(cartData || null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    configureStatusBar('#F8F9FA', 'dark-content');
    fetchUserId();
    fetchCartDetails();
    fetchCartOrders();
  }, []);

  const fetchUserId = async () => {
    const id = await AsyncStorage.getItem('userId');
    setUserId(id);
  };

  const fetchCartDetails = async () => {
    if (cartData) return; // Já temos os dados
    
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/api/carts/${cartId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setCartInfo(data);
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes do carrinho:', error);
    }
  };

  const fetchCartOrders = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/api/orders/cart/${cartId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      } else {
        console.error('Erro ao buscar pedidos do carrinho');
      }
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Entregue':
        return '#22C55E';
      case 'Fechado':
        return '#059669';
      case 'Aceite':
        return '#3B82F6';
      case 'Em Progresso':
        return '#F59E0B';
      case 'Aguardando':
        return '#EF4444';
      case 'Negado':
      case 'Cancelado':
        return '#DC2626';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Entregue':
      case 'Fechado':
        return CheckCircle;
      case 'Aceite':
        return Package;
      case 'Em Progresso':
        return Clock;
      case 'Aguardando':
        return Clock;
      case 'Negado':
      case 'Cancelado':
        return XCircle;
      default:
        return Package;
    }
  };

  const renderOrderItem = (order, index) => {
    const StatusIcon = getStatusIcon(order.status);
    const statusColor = getStatusColor(order.status);
    
    // Debug: Log para verificar dados do pedido
    console.log('[CART-DETAILS] Pedido', index + 1, ':', {
      id: order._id,
      description: order.description,
      priceUSD: order.priceUSD,
      productLink: order.productLink,
      images: order.images?.length || 0,
      status: order.status
    });
    
    return (
      <View key={order._id || index} style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View style={styles.orderNumber}>
            <Package size={20} color="#704F38" weight="duotone" />
            <Text style={styles.orderNumberText}>Pedido #{index + 1}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <StatusIcon size={14} color="#FFF" weight="fill" />
            <Text style={styles.statusText}>{order.status}</Text>
          </View>
        </View>

        <View style={styles.orderContent}>
          <View style={styles.orderInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Descrição:</Text>
              <Text style={styles.infoValue} numberOfLines={2}>
                {order.description || 'Não informado'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Preço:</Text>
              <Text style={styles.priceValue}>
                ${order.priceUSD ? order.priceUSD.toFixed(2) : '0.00'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Quantidade:</Text>
              <Text style={styles.infoValue}>{order.quantity || 1}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Link:</Text>
              {order.productLink ? (
                <TouchableOpacity 
                  onPress={() => {
                    // Abrir link no navegador ou mostrar em modal
                    Alert.alert(
                      'Link do Produto',
                      order.productLink,
                      [
                        { text: 'Fechar', style: 'cancel' },
                        { 
                          text: 'Copiar', 
                          onPress: () => {
                            // Copiar para clipboard se disponível
                            console.log('Link copiado:', order.productLink);
                          }
                        }
                      ]
                    );
                  }}
                >
                  <Text style={styles.linkValue} numberOfLines={1}>
                    {order.productLink}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.infoValue}>Não informado</Text>
              )}
            </View>

            {order.createdAt && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Criado em:</Text>
                <Text style={styles.dateValue}>
                  {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                </Text>
              </View>
            )}
          </View>

          {order.images && order.images.length > 0 ? (
            <View style={styles.imagesContainer}>
              <Text style={styles.imagesTitle}>Fotos do Produto:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.imagesRow}>
                  {order.images.map((imagePath, imgIndex) => (
                    <Image
                      key={imgIndex}
                      source={{ 
                        uri: imagePath.startsWith('http') 
                          ? imagePath 
                          : `${BASE_URL}/${imagePath.replace(/\\/g, '/')}`
                      }}
                      style={styles.orderImage}
                      resizeMode="cover"
                      onError={(error) => {
                        console.log('Erro ao carregar imagem:', error);
                      }}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : (
            <View style={styles.noImagesContainer}>
              <Package size={32} color="#CBD5E0" />
              <Text style={styles.noImagesText}>Nenhuma foto disponível</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#F8F9FA" barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#704F38" />
          <Text style={styles.loadingText}>Carregando detalhes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#F8F9FA" barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <CaretLeft size={24} color="#333" weight="bold" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes do Carrinho</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Informações do Carrinho */}
        {cartInfo && (
          <View style={styles.cartInfoCard}>
            <View style={styles.cartHeader}>
              <View style={styles.cartImageContainer}>
                <Image
                  source={
                    cartInfo.imageUrls?.[0]
                      ? { uri: `${BASE_URL}/${cartInfo.imageUrls[0].replace(/\\/g, '/')}` }
                      : require('../../assets/imagens/kratos.png')
                  }
                  style={styles.cartImage}
                  resizeMode="cover"
                />
              </View>
              <View style={styles.cartDetails}>
                <Text style={styles.cartName}>{cartInfo.cartName}</Text>
                <View style={styles.cartMetrics}>
                  <View style={styles.metricItem}>
                    <Package size={16} color="#704F38" />
                    <Text style={styles.metricText}>{cartInfo.itemCount} itens</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <User size={16} color="#704F38" />
                    <Text style={styles.metricText}>{cartInfo.seller?.name}</Text>
                  </View>
                </View>
              </View>
            </View>
            
            <View style={styles.cartInfoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Plataforma:</Text>
                <Text style={styles.infoValue}>{cartInfo.platform}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Taxa de Câmbio:</Text>
                <Text style={styles.infoValue}>{cartInfo.exchangeRate} Kz</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Entrega:</Text>
                <Text style={styles.infoValue}>
                  {cartInfo.deliveryFee ? `$${cartInfo.deliveryFee.toFixed(2)}` : 'Não'}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Total:</Text>
                <Text style={styles.totalValue}>
                  ${cartInfo.totalPrice ? cartInfo.totalPrice.toFixed(2) : '0.00'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Lista de Pedidos */}
        <View style={styles.ordersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pedidos no Carrinho</Text>
            <Text style={styles.orderCount}>
              {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'}
            </Text>
          </View>

          {orders.length === 0 ? (
            <View style={styles.emptyState}>
              <Package size={48} color="#CBD5E0" />
              <Text style={styles.emptyTitle}>Nenhum pedido encontrado</Text>
              <Text style={styles.emptyText}>
                Este carrinho ainda não possui pedidos ou eles foram removidos.
              </Text>
            </View>
          ) : (
            <View style={styles.ordersList}>
              {orders.map((order, index) => renderOrderItem(order, index))}
            </View>
          )}
        </View>

        {/* Botão de Ação */}
        {cartInfo && (
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('MyOrder', { cart: cartInfo })}
            >
              <ArrowRight size={20} color="#FFF" weight="bold" />
              <Text style={styles.actionButtonText}>Acompanhar Progresso</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: getSafeAreaStyle('#F8F9FA'),
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    fontFamily: 'Poppins_600SemiBold',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#704F38',
    fontWeight: '500',
  },
  
  // Cart Info Card
  cartInfoCard: {
    backgroundColor: '#FFF',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cartHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  cartImageContainer: {
    marginRight: 12,
  },
  cartImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
  cartDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cartName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
    fontFamily: 'Poppins_600SemiBold',
  },
  cartMetrics: {
    gap: 8,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricText: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
  },
  cartInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoItem: {
    flex: 1,
    minWidth: '45%',
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 16,
    color: '#704F38',
    fontWeight: '700',
  },
  
  // Orders Section
  ordersSection: {
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    fontFamily: 'Poppins_600SemiBold',
  },
  orderCount: {
    fontSize: 14,
    color: '#704F38',
    fontWeight: '500',
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ordersList: {
    gap: 12,
  },
  
  // Order Card
  orderCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderNumber: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#704F38',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600',
  },
  orderContent: {
    gap: 12,
  },
  orderInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  priceValue: {
    fontSize: 16,
    color: '#22C55E',
    fontWeight: '700',
  },
  linkValue: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    textDecorationLine: 'underline',
  },
  dateValue: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  
  // Images
  imagesContainer: {
    marginTop: 8,
  },
  imagesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
  },
  imagesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  orderImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  
  // No Images State
  noImagesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginTop: 8,
  },
  noImagesText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A5568',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Action Section
  actionSection: {
    padding: 16,
    paddingBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#704F38',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
});

export default CartDetailsScreen;