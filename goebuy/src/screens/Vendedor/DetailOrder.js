import React, { use, useState, useEffect, useRef } from "react";
import { Modal as RNModal, TextInput, Alert, Clipboard, Platform, StatusBar } from "react-native";
import io from "socket.io-client";
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ScrollView,
  Modal,
  Button,
  Linking,
} from "react-native";
import { ChatCircleDots, Handshake, SelectionAll, X, Truck } from "phosphor-react-native";
import Header from "../../components/Header";
import { useNavigation } from "@react-navigation/native";
import { BASE_URL } from "../../../config";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Captura o StatusBar height uma única vez para evitar mudanças ao voltar do background
const STATUSBAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;

const DetailOrder = ({ route }) => {

  const { cart, buyer } = route.params;
  const navigation = useNavigation();
  const [selectedImage, setSelectedImage] = useState(null);
  const [buyerData, setBuyerData] = useState(buyer);
  const [cartData, setCartData] = useState(cart);
  // Modal de motivo do cancelamento
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  // Verifica se o pedido foi cancelado para esconder botões e mostrar mensagem
  const isPedidoCancelado = () => {
    const progress = cartData.buyerCartProgress?.find(
      (item) => {
        // Extrair o ID do buyer, que pode ser string ou objeto populado
        let buyerId;
        if (item?.buyer) {
          if (typeof item.buyer === "object" && item.buyer._id) {
            buyerId = String(item.buyer._id);
          } else {
            buyerId = String(item.buyer);
          }
        } else {
          buyerId = "";
        }
        return buyerId === String(buyer.buyerId);
      }
    );
    return progress && progress.status === "Cancelado";
  };
  const socketRef = useRef(null);
  
  // Estados para controle de atualizações em tempo real
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  
  // Socket.io para atualização em tempo real do cart e pedidos
  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(BASE_URL.replace('/api', ''), {
        transports: ['websocket'],
        autoConnect: true,
      });
    }
    
    const socket = socketRef.current;
    
    // Listener para atualizações do carrinho
    socket.on('cartUpdated', (updatedCartId) => {
      if (updatedCartId === cart._id) {
        console.log('[SOCKET] Cart atualizado em tempo real');
        fetchCartData(cart._id);
        fetchBuyerOrders(); // Também atualiza os pedidos
      }
    });
    
    // Listener para novos pedidos adicionados
    socket.on('newOrderAdded', (data) => {
      if (data.cartId === cart._id && data.buyerId === buyer.buyerId) {
        console.log('[SOCKET] Novo pedido adicionado em tempo real');
        fetchBuyerOrders();
        fetchCartData(cart._id);
        setLastUpdateTime(Date.now());
        
        // Mostrar notificação visual sobre novo pedido
        alert('⚠️ ATENÇÃO: Um novo pedido foi adicionado por este comprador!');
      }
    });
    
    // Listener para atualizações de pedidos
    socket.on('orderUpdated', (data) => {
      if (data.cartId === cart._id && data.buyerId === buyer.buyerId) {
        console.log('[SOCKET] Pedido atualizado em tempo real');
        fetchBuyerOrders();
        setLastUpdateTime(Date.now());
      }
    });
    
    return () => {
      socket.off('cartUpdated');
      socket.off('newOrderAdded');
      socket.off('orderUpdated');
    };
    // eslint-disable-next-line
  }, [cart._id, buyer.buyerId]);

  // Função para buscar o cart atualizado do backend
  const fetchCartData = async (cartId) => {
    try {
      setIsUpdating(true);
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/carts/${cartId}`, {
        headers: { Authorization: token },
      });
      if (!res.ok) throw new Error("Erro ao buscar carrinho atualizado");
      const cartAtualizado = await res.json();
      
      // Verificar se houve mudanças no número de itens
      if (cartAtualizado.itemCount !== cartData.itemCount) {
        console.log('[UPDATE] Número de itens mudou:', cartData.itemCount, '->', cartAtualizado.itemCount);
        setLastUpdateTime(Date.now());
      }
      
      setCartData(cartAtualizado);
    } catch (err) {
      console.error("Erro ao buscar cart atualizado:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const fetchBuyerOrders = async () => {
    try {
      const res = await fetch(
        `${BASE_URL}/api/orders/cart/${cart._id}/buyer/${buyer.buyerId}`
      );
      const orders = await res.json();
      
      // Verificar se houve mudanças no número de pedidos
      if (orders.length !== buyerData.orders?.length) {
        console.log('[UPDATE] Número de pedidos mudou:', buyerData.orders?.length || 0, '->', orders.length);
        setLastUpdateTime(Date.now());
      }
      
      setBuyerData({ ...buyerData, orders });
    } catch (err) {
      console.error("Erro ao atualizar pedidos:", err);
    }
  };

  const atualizarBuyerCartProgress = async (cartId, buyerId, novoStatus) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await fetch(
        `${BASE_URL}/api/carts/${cartId}/buyer-progress`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({
            buyerId,
            status: novoStatus,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.message || "Erro ao atualizar progresso do comprador"
        );
      }
      setCartData(data.cart); // Atualiza o cart local com o novo progresso
      return data;
    } catch (error) {
      console.error("Erro ao atualizar buyerCartProgress:", error);
      alert(error.message);
    }
  };

  // Função para verificar se deve mostrar o botão de finalizar pedido do vendedor
  const podeAtualizarPedido = () => {
    const progress = cartData.buyerCartProgress?.find(
      (item) => {
        // Extrair o ID do buyer, que pode ser string ou objeto populado
        let buyerId;
        if (item?.buyer) {
          if (typeof item.buyer === "object" && item.buyer._id) {
            buyerId = String(item.buyer._id);
          } else {
            buyerId = String(item.buyer);
          }
        } else {
          buyerId = "";
        }
        return buyerId === String(buyer.buyerId);
      }
    );
    
    console.log('[DEBUG-ATUALIZAR-PEDIDO] Progress encontrado:', progress);
    console.log('[DEBUG-ATUALIZAR-PEDIDO] Status:', progress?.status);
    console.log('[DEBUG-ATUALIZAR-PEDIDO] finalizadoVendedor:', progress?.finalizadoVendedor);
    
    // O botão deve aparecer assim que o status for 'Em Progresso', 'Entregue', 'Enviado' ou 'Aceite', e não finalizado pelo vendedor
    const canUpdate = (
      progress &&
      ["Em Progresso", "Entregue", "Enviado", "Aceite"].includes(progress.status) &&
      !progress.finalizadoVendedor
    );
    
    console.log('[DEBUG-ATUALIZAR-PEDIDO] Pode atualizar:', canUpdate);
    return canUpdate;
  };

  const atualizarStatus = async (cartId, buyerId, novoStatus) => {
    try {
      // CRÍTICO: Sempre buscar dados mais recentes antes de aprovar
      console.log('[CRÍTICO] Buscando dados mais recentes antes de aprovar...');
      await fetchCartData(cartId);
      await fetchBuyerOrders();
      
      // Aguardar um momento para garantir que os dados foram atualizados
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const sellerId = cartData.seller?._id || cartData.seller || cart?.seller?._id || cart?.seller;
      const token = await AsyncStorage.getItem("token");
      
      // Atualiza status das orders
      const response = await fetch(
        `${BASE_URL}/api/orders/cart/${cartId}/buyer/${buyerId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({
            status: novoStatus,
            sender: sellerId, // quem está logado (vendedor/admin)
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Erro ao atualizar status");
      }
      // Atualiza buyerCartProgress do carrinho e o cart local
      await atualizarBuyerCartProgress(cartId, buyerId, novoStatus);
      // Busca o cart atualizado do backend
      await fetchCartData(cartId);

      // Se aceitou, cria/busca conversa e navega para o chat do vendedor
      if (novoStatus === "Aceite") {
        const sellerId = cartData.seller?._id || cartData.seller || cart?.seller?._id || cart?.seller;
        if (sellerId) {
          try {
            const convRes = await fetch(`${BASE_URL}/api/chat/conversation/between/${sellerId}/${buyerId}`, {
              headers: { Authorization: token },
            });
            const convData = await convRes.json();
            const conversationId = convData._id;
            navigation.navigate("VendedorChatScreen", {
              conversationId,
              sellerId,
              buyerId,
            });
          } catch (err) {
            alert("Erro ao criar/buscar conversa: " + err.message);
          }
        } else {
          alert("Não foi possível identificar o vendedor para criar o chat.");
        }
      } else {
        alert("Status atualizado com sucesso!");
        await fetchBuyerOrders(); // Atualiza os pedidos na tela
      }
      return data;
    } catch (error) {
      console.error("Erro no atualizarStatus:", error);
      alert(error.message);
    }
  };

  useEffect(() => {
    // Sempre busca o cart atualizado ao abrir a tela
    fetchCartData(cart._id);
    fetchBuyerOrders();
    
    // Auto-refresh a cada 10 segundos durante validação crítica
    const autoRefreshInterval = setInterval(() => {
      console.log('[AUTO-REFRESH] Atualizando dados...');
      fetchCartData(cart._id);
      fetchBuyerOrders();
    }, 10000); // 10 segundos
    
    return () => {
      clearInterval(autoRefreshInterval);
    };
    // eslint-disable-next-line
  }, []);

  // Garante atualização ao voltar para tela
  useFocusEffect(
    React.useCallback(() => {
      fetchCartData(cart._id);
    }, [cart._id])
  );

  // Sempre que a tela for focada, busca o cart atualizado
  useFocusEffect(
    React.useCallback(() => {
      fetchCartData(cart._id);
    }, [cart._id])
  );

  // LOGS PARA DEBUG
  console.log('paymentProofs:', cartData.paymentProofs);
  console.log('buyerId atual:', buyer.buyerId);
  console.log('cartData.buyerCartProgress:', cartData.buyerCartProgress);
  console.log('Estrutura completa do cartData:', {
    _id: cartData._id,
    buyerCartProgress: cartData.buyerCartProgress?.map(p => ({
      buyer: p.buyer,
      buyerString: p.buyer?.toString(),
      status: p.status,
      comprovativoConfirmado: p.comprovativoConfirmado,
      comprovativoRejeitado: p.comprovativoRejeitado
    }))
  });
  if (cartData.paymentProofs) {
    cartData.paymentProofs.forEach((proof, idx) => {
      console.log(`Comprovativo[${idx}]: buyerId=`, proof.buyerId, 'proofUrl=', proof.proofUrl);
    });
  }
  // Filtra o comprovativo do comprador atual
  const comprovativoDoComprador = cartData.paymentProofs?.find(
    (proof) => proof.buyer?.toString() === buyer.buyerId?.toString()
  );
  console.log('Comprovativo encontrado:', comprovativoDoComprador);
  const comprovativoUrl = comprovativoDoComprador?.proofUrl
    ? `${BASE_URL}/${comprovativoDoComprador.proofUrl.replace(/\\/g, "/")}`
    : null;
  return (
    <SafeAreaView style={styles.safeArea}>
      <Header page={"Seguir Pedido"} />
      
      {/* Indicador de atualizações em tempo real */}
      <View style={styles.statusIndicator}>
        <View style={[styles.statusDot, { backgroundColor: isUpdating ? '#FFA500' : '#4CAF50' }]} />
        <Text style={styles.statusText}>
          {isUpdating ? '🔄 Atualizando...' : '✅ Tempo Real Ativo'}
        </Text>
        <Text style={styles.lastUpdate}>
          Última atualização: {new Date(lastUpdateTime).toLocaleTimeString()}
        </Text>
      </View>
      
      <ScrollView style={styles.scrollViewStyle}>
        <View style={styles.container}>
          {/* Info do carrinho */}
          <View style={styles.itemContainer}>
            <Image
              source={{
                uri: `${BASE_URL}/${cart.imageUrls[0].replace(/\\/g, "/")}`,
              }}
              style={styles.itemImage}
              resizeMode="cover"
            />
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>
                {cart.cartName || "Carrinho sem nome"}
              </Text>
              <Text style={styles.itemSpace}>Itens: {cart.itemCount || 0}</Text>
              <Text style={styles.itemSpace}>
                Total: {cart.totalPrice || "Pendente"} AOA
              </Text>
            </View>
          </View>

          {/* Info do comprador */}
          <Text style={styles.sectionTitle}>Comprador</Text>
          <View style={styles.vendedorInfo}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Image
                source={
                  buyer.avatar || require("../../../assets/imagens/james.png")
                }
                style={styles.vendedorImage}
                resizeMode="cover"
              />
              <View style={styles.vendedorDetails}>
                <Text style={styles.vendedorName}>
                  {buyer.name || "Nome não disponível"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={async () => {
                try {
                  const token = await AsyncStorage.getItem("token");
                  const sellerId = cart.seller?._id || cart.seller;
                  const buyerId = buyer.buyerId;
                  if (!sellerId || !buyerId) {
                    alert("Não foi possível identificar vendedor ou comprador.");
                    return;
                  }
                  const convRes = await fetch(`${BASE_URL}/api/chat/conversation/between/${sellerId}/${buyerId}`, {
                    headers: { Authorization: token },
                  });
                  const convData = await convRes.json();
                  const conversationId = convData._id;
                  navigation.navigate("VendedorChatScreen", {
                    conversationId,
                    sellerId,
                    buyerId,
                  });
                } catch (err) {
                  alert("Erro ao abrir chat: " + err.message);
                }
              }}
            >
              <ChatCircleDots size={32} color="#704F38" />
            </TouchableOpacity>
          </View>

          {/* Informações de Entrega e Localização */}
          <View style={styles.sectionTitleWithIcon}>
            <Truck size={20} color="#704F38" />
            <Text style={[styles.sectionTitle, { marginLeft: 8, marginTop: 0 }]}>Informações de Entrega</Text>
          </View>
          <View style={styles.deliveryInfoContainer}>
            <View style={styles.deliveryInfoCard}>
              <View style={styles.deliveryRow}>
                <Text style={styles.deliveryLabel}>País:</Text>
                <Text style={styles.deliveryValue}>Angola 🇦🇴</Text>
              </View>
              
              <View style={styles.deliveryRow}>
                <Text style={styles.deliveryLabel}>Província:</Text>
                <Text style={styles.deliveryValue}>
                  {cartData.province || "Não especificada"}
                </Text>
              </View>
              
              <View style={styles.deliveryRow}>
                <Text style={styles.deliveryLabel}>Local de Retirada:</Text>
                <Text style={styles.deliveryValue}>
                  {cartData.pickupLocation || "Não especificado"}
                </Text>
              </View>
              
              {(() => {
                // Verifica se algum pedido tem entrega solicitada
                const hasDeliveryRequested = buyerData.orders?.some(order => order.deliveryRequested);
                const deliveryFeeValue = hasDeliveryRequested ? 
                  (buyerData.orders?.find(order => order.deliveryRequested)?.deliveryFee || cartData.deliveryFee) 
                  : null;
                
                return (
                  <>
                    <View style={[
                      styles.deliveryRow, 
                      { borderBottomWidth: hasDeliveryRequested && deliveryFeeValue ? 1 : 0 }
                    ]}>
                      <Text style={styles.deliveryLabel}>Entrega Solicitada:</Text>
                      <View style={styles.deliveryStatusContainer}>
                        <View style={[
                          styles.deliveryStatusDot, 
                          { backgroundColor: hasDeliveryRequested ? '#4CAF50' : '#FF9800' }
                        ]} />
                        <Text style={[
                          styles.deliveryValue,
                          { color: hasDeliveryRequested ? '#4CAF50' : '#FF9800', fontWeight: 'bold' }
                        ]}>
                          {hasDeliveryRequested ? 'Sim' : 'Não'}
                        </Text>
                      </View>
                    </View>
                    
                    {hasDeliveryRequested && deliveryFeeValue && (
                      <View style={[styles.deliveryRow, { borderBottomWidth: 0 }]}>
                        <Text style={styles.deliveryLabel}>Taxa de Entrega:</Text>
                        <Text style={[styles.deliveryValue, { color: '#704F38', fontWeight: 'bold' }]}>
                          {deliveryFeeValue} AOA
                        </Text>
                      </View>
                    )}
                  </>
                );
              })()}
            </View>
          </View>

          <Text style={styles.sectionTitle}>Detalhes dos Pedidos</Text>
          
          {/* Aviso de número de pedidos */}
          <View style={styles.ordersCountContainer}>
            <Text style={styles.ordersCountText}>
              📦 Total de pedidos: {buyerData.orders?.length || 0}
            </Text>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={() => {
                fetchBuyerOrders();
                fetchCartData(cart._id);
              }}
            >
              <Text style={styles.refreshButtonText}>🔄 Atualizar Agora</Text>
            </TouchableOpacity>
          </View>

          {buyerData.orders.map((order, idx) => (
            <View key={order._id || idx} style={{ marginBottom: 20 }}>
              {/* Infos do pedido */}
              <View style={styles.detailsContainer}>
                <View style={{ marginBottom: 10 }}>
                  <Text style={styles.detailText}>Descrição</Text>
                  <Text style={styles.descriptionText}>
                    {order.description || "N/A"}
                  </Text>
                </View>

                <View style={styles.detail}>
                  <Text style={styles.detailText}>Preço (USD)</Text>
                  <Text style={styles.detailText1}>
                    {order.priceUSD ? `$${order.priceUSD}` : "N/A"}
                  </Text>
                </View>

                <View style={styles.detail}>
                  <Text style={styles.detailText}>Link do Produto</Text>
                  {order.productLink && order.productLink !== "N/A" ? (
                    <View style={styles.linkContainer}>
                      <TouchableOpacity 
                        onPress={() => Linking.openURL(order.productLink)}
                        onLongPress={() => {
                          Clipboard.setString(order.productLink);
                          Alert.alert(
                            "Link Copiado! 📋",
                            "O link do produto foi copiado para a área de transferência.",
                            [{ text: "OK", style: "default" }]
                          );
                        }}
                        style={styles.linkButton}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.linkText} numberOfLines={1}>
                          {order.productLink}
                        </Text>
                        <Text style={styles.linkHint}>Toque para abrir • Segure para copiar</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={styles.detailText1}>N/A</Text>
                  )}
                </View>

                <View style={styles.detail}>
                  <Text style={styles.detailText}>Status</Text>
                  <Text style={styles.detailText1}>{order.status}</Text>
                </View>

                <View style={styles.detail}>
                  <Text style={styles.detailText}>Quantidade</Text>
                  <Text style={styles.detailText1}>{order.quantity || 1}</Text>
                </View>

                {/* Informações de Entrega do Pedido */}
                <View style={styles.detail}>
                  <Text style={styles.detailText}>Entrega Solicitada</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[
                      styles.deliveryStatusDot, 
                      { backgroundColor: order.deliveryRequested ? '#4CAF50' : '#FF9800' }
                    ]} />
                    <Text style={[
                      styles.detailText1,
                      { 
                        color: order.deliveryRequested ? '#4CAF50' : '#FF9800', 
                        fontWeight: 'bold',
                        marginLeft: 4
                      }
                    ]}>
                      {order.deliveryRequested ? 'Sim' : 'Não'}
                    </Text>
                  </View>
                </View>

                {order.deliveryRequested && order.deliveryFee && (
                  <View style={styles.detail}>
                    <Text style={styles.detailText}>Taxa de Entrega</Text>
                    <Text style={[styles.detailText1, { color: '#704F38', fontWeight: 'bold' }]}>
                      {order.deliveryFee} AOA
                    </Text>
                  </View>
                )}
              </View>

              {/* Fotos do pedido */}
              <Text style={styles.sectionLabel}>Fotos</Text>
              <View style={styles.imagesRow}>
                {(order.images || []).map((img, i) => {
                  const imageUri = `${BASE_URL}/${img.replace(/\\/g, "/")}`;
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => setSelectedImage(imageUri)}
                    >
                      <Image
                        source={{ uri: imageUri }}
                        style={styles.detailImage}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          <Modal visible={!!selectedImage} transparent={true}>
            <View style={styles.modalContainer}>
              <Image
                source={
                  typeof selectedImage === "string"
                    ? { uri: selectedImage }
                    : selectedImage
                }
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
              <Button title="Fechar" onPress={() => setSelectedImage(null)} />
            </View>
          </Modal>

          {/* Botões */}


          {/* Botão para visualizar comprovativo */}
          <TouchableOpacity
            style={[styles.button, !comprovativoUrl && { opacity: 0.5 }]}
            disabled={!comprovativoUrl}
            onPress={() => {
              if (comprovativoUrl) {
                navigation.navigate("PdfViewer", {
                  uri: comprovativoUrl,
                  cart: cartData,
                });
              }
            }}
          >
            <Text style={styles.buttonText}>Comprovativo</Text>
          </TouchableOpacity>


          {/* Botões de confirmação/rejeição do comprovativo (somem se cancelado ou se rejeitado) */}
          {!isPedidoCancelado() && comprovativoUrl && (() => {
            const progress = cartData.buyerCartProgress?.find(
              (item) => {
                // Extrair o ID do buyer, que pode ser string ou objeto populado
                let buyerId;
                if (item?.buyer) {
                  if (typeof item.buyer === "object" && item.buyer._id) {
                    buyerId = String(item.buyer._id);
                  } else {
                    buyerId = String(item.buyer);
                  }
                } else {
                  buyerId = "";
                }
                return buyerId === String(buyer.buyerId);
              }
            );
            
            // Debug: Log do progresso para verificar os campos
            console.log('[DEBUG-COMPROVATIVO] Progress encontrado:', progress);
            console.log('[DEBUG-COMPROVATIVO] comprovativoRejeitado:', progress?.comprovativoRejeitado);
            console.log('[DEBUG-COMPROVATIVO] comprovativoConfirmado:', progress?.comprovativoConfirmado);
            
            // Só mostra os botões se o comprovativo não foi rejeitado nem confirmado
            const isComprovativoRejeitado = progress?.comprovativoRejeitado || false;
            const isComprovativoConfirmado = progress?.comprovativoConfirmado || false;
            
            console.log('[DEBUG-COMPROVATIVO] isComprovativoRejeitado:', isComprovativoRejeitado);
            console.log('[DEBUG-COMPROVATIVO] isComprovativoConfirmado:', isComprovativoConfirmado);
            
            if (!isComprovativoRejeitado && !isComprovativoConfirmado) {
              console.log('[DEBUG-COMPROVATIVO] Mostrando botões');
              return (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                  <TouchableOpacity
                    style={[styles.acceptButton, { backgroundColor: '#4CAF50', flex: 1, marginRight: 5 }]}
                    onPress={async () => {
                      try {
                        const token = await AsyncStorage.getItem("token");
                        console.log('[DEBUG-ACEITAR] Antes de aceitar comprovativo');
                        console.log('[DEBUG-ACEITAR] Cart ID:', cart._id, 'Buyer ID:', buyer.buyerId);
                        
                        // Verificar se existe buyerCartProgress para este comprador
                        const existingProgress = cartData.buyerCartProgress?.find(
                          (item) => item.buyer?.toString() === buyer.buyerId?.toString()
                        );
                        
                        if (!existingProgress) {
                          console.log('[DEBUG-ACEITAR] ⚠️ Não encontrado buyerCartProgress para este comprador, criando...');
                          // Se não existe, podemos ter que criar um novo registro
                          // Vamos tentar atualizar mesmo assim, o backend deve criar se não existir
                        } else {
                          console.log('[DEBUG-ACEITAR] ✅ buyerCartProgress encontrado:', existingProgress);
                        }
                        
                        await atualizarBuyerCartProgress(cart._id, buyer.buyerId, "Aceite");
                        console.log('[DEBUG-ACEITAR] Após atualizarBuyerCartProgress');
                        
                        // Aguardar um momento para garantir que o estado foi atualizado
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                        await fetchCartData(cart._id);
                        console.log('[DEBUG-ACEITAR] Após fetchCartData, novo status:', cartData.buyerCartProgress);
                        
                        // Forçar re-render
                        setCartData(prevData => ({ ...prevData }));
                        
                        console.log('[DEBUG-ACEITAR] Verificando se pode atualizar pedido...');
                        console.log('[DEBUG-ACEITAR] podeAtualizarPedido():', podeAtualizarPedido());
                        
                        alert('Pagamento confirmado!');
                      } catch (err) {
                        alert('Erro ao confirmar pagamento: ' + err.message);
                      }
                    }}
                  >
                    <Text style={styles.acceptText}>Confirmar Pagamento Recebido</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.acceptButton, { backgroundColor: '#D32F2F', flex: 1, marginLeft: 5 }]}
                    onPress={async () => {
                      try {
                        const token = await AsyncStorage.getItem("token");
                        // Chama endpoint para marcar comprovativoRejeitado (sem cancelar o pedido)
                        await fetch(`${BASE_URL}/api/carts/${cart._id}/rejeitar-comprovativo`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: token
                          },
                          body: JSON.stringify({ buyerId: buyer.buyerId })
                        });
                        console.log('[DEBUG-REJEITAR] Comprovativo rejeitado, buscando dados atualizados...');
                        
                        // Aguardar um pouco para garantir que o backend atualizou
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                        await fetchCartData(cart._id);
                        console.log('[DEBUG-REJEITAR] Dados atualizados, cartData:', cartData.buyerCartProgress);
                        
                        // Forçar uma atualização do estado
                        setCartData(prevCartData => ({ ...prevCartData }));
                        
                        alert('Comprovativo rejeitado! O comprador poderá enviar outro.');
                      } catch (err) {
                        alert('Erro ao rejeitar comprovativo: ' + err.message);
                      }
                    }}
                  >
                    <Text style={styles.acceptText}>Rejeitar Comprovativo</Text>
                  </TouchableOpacity>
                </View>
              );
            }
            
            // Se foi rejeitado, mostra mensagem informativa
            if (isComprovativoRejeitado) {
              console.log('[DEBUG-COMPROVATIVO] Mostrando mensagem de rejeitado');
              return (
                <View style={{ backgroundColor: '#FFF3CD', padding: 12, borderRadius: 8, marginVertical: 10 }}>
                  <Text style={{ color: '#856404', textAlign: 'center', fontWeight: 'bold' }}>
                    ⚠️ Comprovativo rejeitado
                  </Text>
                  <Text style={{ color: '#856404', textAlign: 'center', fontSize: 12, marginTop: 4 }}>
                    Aguardando novo comprovativo do comprador
                  </Text>
                </View>
              );
            }
            
            // Se foi confirmado, mostra mensagem de sucesso
            if (isComprovativoConfirmado) {
              console.log('[DEBUG-COMPROVATIVO] Mostrando mensagem de confirmado');
              return (
                <View style={{ backgroundColor: '#D4EDDA', padding: 12, borderRadius: 8, marginVertical: 10 }}>
                  <Text style={{ color: '#155724', textAlign: 'center', fontWeight: 'bold' }}>
                    ✅ Pagamento confirmado
                  </Text>
                </View>
              );
            }
            
            console.log('[DEBUG-COMPROVATIVO] Nenhuma condição atendida, retornando null');
            return null;
          })()}


          {/* Botão de rejeitar todos os pedidos (some se cancelado ou se comprovativo confirmado) */}
          {(() => {
            // Verificar se comprovativo foi confirmado
            const progress = cartData.buyerCartProgress?.find(
              (item) => {
                // Extrair o ID do buyer, que pode ser string ou objeto populado
                let buyerId;
                if (item?.buyer) {
                  if (typeof item.buyer === "object" && item.buyer._id) {
                    buyerId = String(item.buyer._id);
                  } else {
                    buyerId = String(item.buyer);
                  }
                } else {
                  buyerId = "";
                }
                return buyerId === String(buyer.buyerId);
              }
            );
            
            const isComprovativoConfirmado = progress?.comprovativoConfirmado || false;
            
            // Só mostra o botão se não estiver cancelado E o comprovativo não foi confirmado
            return !isPedidoCancelado() && !isComprovativoConfirmado ? (
              <TouchableOpacity
                style={[styles.acceptButton, { backgroundColor: '#D32F2F' }]}
                onPress={() => setShowCancelModal(true)}
              >
                <X size={20} color="#fff" />
                <Text style={styles.acceptText}>Rejeitar Todos os Pedidos</Text>
              </TouchableOpacity>
            ) : null;
          })()}


          {/* Botão de aceitar todos os pedidos (some se cancelado ou se comprovativo confirmado) */}
          {(() => {
            // Verificar se comprovativo foi confirmado
            const progress = cartData.buyerCartProgress?.find(
              (item) => {
                // Extrair o ID do buyer, que pode ser string ou objeto populado
                let buyerId;
                if (item?.buyer) {
                  if (typeof item.buyer === "object" && item.buyer._id) {
                    buyerId = String(item.buyer._id);
                  } else {
                    buyerId = String(item.buyer);
                  }
                } else {
                  buyerId = "";
                }
                return buyerId === String(buyer.buyerId);
              }
            );
            
            const isComprovativoConfirmado = progress?.comprovativoConfirmado || false;
            
            // Só mostra o botão se não estiver cancelado E o comprovativo não foi confirmado
            return !isPedidoCancelado() && !isComprovativoConfirmado ? (
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => atualizarStatus(cart._id, buyer.buyerId, "Aceite")}
              >
                <Handshake size={20} color="#fff" />
                <Text style={styles.acceptText}>Aceitar Todos os Pedidos</Text>
              </TouchableOpacity>
            ) : null;
          })()}

          {/* Botão de atualizar pedido (some se cancelado) */}
          {(() => {
            const canUpdate = podeAtualizarPedido();
            const isNotCanceled = !isPedidoCancelado();
            
            console.log('[DEBUG-RENDER-ATUALIZAR] canUpdate:', canUpdate);
            console.log('[DEBUG-RENDER-ATUALIZAR] isNotCanceled:', isNotCanceled);
            console.log('[DEBUG-RENDER-ATUALIZAR] Mostrar botão:', canUpdate && isNotCanceled);
            
            return canUpdate && isNotCanceled ? (
              <TouchableOpacity
                style={[styles.acceptButton, { backgroundColor: "#704F38" }]}
                onPress={async () => {
                  await fetchCartData(cart._id);
                  const progress = cartData.buyerCartProgress?.find(
                    (item) => item.buyer?.toString() === buyer.buyerId?.toString()
                  );
                  navigation.navigate("AtualizarPedidoScreen", {
                    cart: cartData,
                    buyer: { ...buyerData, buyerId: progress?.buyer?.toString() || buyer.buyerId },
                  });
                }}
              >
                <Text style={styles.acceptText}>Atualizar Pedido</Text>
              </TouchableOpacity>
            ) : null;
          })()}

          {/* Modal para motivo do cancelamento */}
          <RNModal
            visible={showCancelModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowCancelModal(false)}
          >
            <View style={styles.centeredView}>
              <View style={[styles.container, { backgroundColor: '#fff', padding: 20, borderRadius: 10, width: '90%' }]}> 
                <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 10 }}>Motivo do cancelamento</Text>
                <TextInput
                  style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                  placeholder="Descreva o motivo do cancelamento..."
                  value={cancelReason}
                  onChangeText={setCancelReason}
                  maxLength={200}
                  multiline
                  editable={!isCancelling}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                  <TouchableOpacity
                    style={[styles.acceptButton, { backgroundColor: '#ccc', marginRight: 10 }]}
                    onPress={() => { setShowCancelModal(false); setCancelReason(""); }}
                    disabled={isCancelling}
                  >
                    <Text style={styles.acceptText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.acceptButton, { backgroundColor: '#D32F2F' }]}
                    disabled={cancelReason.trim().length < 5 || isCancelling}
                    onPress={async () => {
                      if (cancelReason.trim().length < 5) return;
                      setIsCancelling(true);
                      Alert.alert(
                        'Confirmação',
                        'Tem certeza que deseja cancelar este pedido?',
                        [
                          { text: 'Não', onPress: () => setIsCancelling(false), style: 'cancel' },
                          { text: 'Sim', onPress: async () => {
                            setShowCancelModal(false);
                            setIsCancelling(false);
                            await atualizarStatus(cart._id, buyer.buyerId, "Cancelado");
                            // Aqui você pode salvar o motivo no backend se desejar
                            setCancelReason("");
                          } }
                        ]
                      );
                    }}
                  >
                    <Text style={styles.acceptText}>Confirmar Cancelamento</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </RNModal>

          {/* Mensagem de pedido cancelado */}
          {isPedidoCancelado() && (
            <View style={{ alignItems: 'center', marginVertical: 30 }}>
              <Text style={{ color: '#D32F2F', fontWeight: 'bold', fontSize: 20 }}>Pedido Cancelado</Text>
              {cancelReason ? (
                <Text style={{ color: '#333', marginTop: 10, textAlign: 'center' }}>Motivo: {cancelReason}</Text>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: STATUSBAR_HEIGHT + 20,
    backgroundColor: "#FFF", // ou a cor de
  },
  scrollViewStyle: {
    flex: 1, // Você pode remover esta linha se você já definiu flex: 1 no estilo safeArea
    // Adicione outros estilos para o ScrollView, se necessário
  },
  container: {
    marginHorizontal: 20,
    backgroundColor: "#FFF",
  },
  center: {
    justifyContent: "center",
    alignContent: "center",
    alignItems: "center",
  },
  header: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignContent: "center",
    alignItems: "center",
  },
  headerText: {
    fontSize: 24,
    fontWeight: "300",
    margin: 16,
  },
  itemContainer: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
    borderBottomColor: "#DEDEDE",
    borderBottomWidth: 1,
  },
  itemSpace: {
    paddingBottom: 3,
    color: "#878787",
    fontFamily: "Poppins_400Regular",
  },
  itemImage: {
    width: 100,
    height: 100,
    marginRight: 16,
    borderRadius: 8, // Adicione um borderRadius se as imagens deveriam ter cantos arredondados
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontWeight: "400",
    fontSize: 18,
    marginBottom: 4,
    fontFamily: "Poppins_400Regular",
  },
  detailsContainer: {
    margin: "3%",
    paddingBottom: 20,
    borderBottomColor: "#DEDEDE",
    borderBottomWidth: 1,
  },

  detail: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
  },
  detailText: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
  },
  detailText1: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
  },

  relative: {
    position: "relative",
  },

  verticalLine: {
    height: 49,
    width: 5,
    backgroundColor: "#704F38",
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 18,
    paddingBottom: 0,
    paddingTop: 0,
    top: 36,
    position: "absolute",
  },
  sectionTitle: {
    fontWeight: "bold",
    fontSize: 18,
    marginTop: 20,
    marginLeft: 20,
    fontFamily: "Poppins_500Medium",
  },
  sectionTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginLeft: 20,
  },
  descriptionContainer: {
    marginTop: 30,
    borderWidth: 1,
    marginHorizontal: 25,
    borderColor: "#E8E8E8",
    height: 120,
    width: "90%",
    alignContent: "center",
    alignItems: "center",
    borderRadius: 10,
    padding: 5,
    paddingTop: 10,
  },
  description: {
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
  },
  vendedorInfo: {
    flexDirection: "row",
    marginTop: 20,
    marginLeft: "3%",
    justifyContent: "space-between",
    alignItems: "center",
  },
  vendedorImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  vendedorDetails: {
    marginLeft: 10,
  },
  vendedorName: {
    fontWeight: "bold",
    fontSize: 18,
    fontFamily: "Poppins_400Regular",
  },
  totalCarrinhos: {
    fontSize: 16,
  },
  starsContainer: {
    flexDirection: "row",
    marginTop: 5,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 25,
  },
  input: {
    width: "100%",
    padding: 10,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    marginTop: 5,
  },
  descriptionInput: {
    textAlignVertical: "top", // Para alinhar o texto no topo no Android
    height: 130,
  },
  foto: {
    width: 100,
    height: 90,
    borderRadius: 5,
    marginRight: 10,
    marginTop: 5,
  },
  itemCarrinhoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    marginHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: "#e1e1e1",
    backgroundColor: "#fff", // Cor de fundo para cada item do carrinho
  },
  itemNome: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#704F38", // Cor do texto para o nome do item
  },
  row: {
    flexDirection: "row",
    alignContent: "center",
    alignItems: "center",
  },
  itemPreco: {
    fontSize: 16,
    color: "#704F38", // Cor do texto para o preço do item
  },
  sectionLabel: { fontWeight: "bold", marginTop: 8 },
  linkContainer: {
    flex: 1,
    marginLeft: 10,
    backgroundColor: '#F0F8FF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#1E90FF',
  },
  linkButton: {
    width: '100%',
  },
  linkText: { 
    color: "#1E90FF", 
    textDecorationLine: "underline",
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
  },
  linkHint: {
    fontSize: 10,
    color: "#666",
    fontStyle: "italic",
    marginTop: 2,
    fontFamily: "Poppins_300Light",
  },
  imagesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8, // opcional, para espaçamento entre imagens
  },
  detailImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
  },
  button: {
    backgroundColor: "#8B5E3C",
    padding: 12,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 10,
    marginTop: 10,
  },
  buttonText: { color: "#fff", fontWeight: "bold" },
  acceptButton: {
    flexDirection: "row",
    backgroundColor: "#8B5E3C",
    padding: 12,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  acceptText: { color: "#fff", fontWeight: "bold", marginLeft: 8 },
  modalContainer: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenImage: {
    width: "100%",
    height: "80%",
  },
  descriptionText: {
    fontSize: 14,
    color: "#333",
    marginTop: 2,
    lineHeight: 20,
  },
  
  // Estilos para informações de entrega
  deliveryInfoContainer: {
    marginHorizontal: 20,
    marginVertical: 10,
  },
  deliveryInfoCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#704F38',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  deliveryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  deliveryLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#333',
    flex: 1,
  },
  deliveryValue: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#555',
    flex: 1,
    textAlign: 'right',
  },
  deliveryStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  deliveryStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  
  // Estilos para indicadores de tempo real
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 16,
  },
  lastUpdate: {
    fontSize: 10,
    color: '#666',
    flex: 1,
  },
  ordersCountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 8,
  },
  ordersCountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    backgroundColor: '#704F38',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  refreshButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default DetailOrder;
