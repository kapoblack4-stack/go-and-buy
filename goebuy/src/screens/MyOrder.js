import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ScrollView,
  Platform,
  StatusBar,
} from "react-native";
import {
  ChatCircleDots,
  CheckCircle,
  ClipboardText,
  Handshake,
  Package,
  AirplaneTakeoff,
  Truck,
  CaretLeft,
  Star,
} from "phosphor-react-native";
import Header from "../components/Header";
import { useNavigation } from "@react-navigation/native";
import { BASE_URL } from "../../config";
import AsyncStorage from "@react-native-async-storage/async-storage";
const MyOrder = ({ route }) => {
  const navigation = useNavigation();
  const { cart } = route.params;
  const [imageUrl, setImageUrl] = useState(null);
  const [userId, setUserId] = useState(null);
  const [seller, setSeller] = useState(null);
  const [cartData, setCartData] = useState(cart);
  const socketRef = useRef(null);

  // Função para buscar o cart atualizado do backend
  const fetchCartData = async (cartId) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/carts/${cartId}`, {
        headers: { Authorization: token },
      });
      if (!res.ok) throw new Error("Erro ao buscar carrinho atualizado");
      const cartAtualizado = await res.json();
      
      // Debug: verificar estrutura dos dados
      console.log('[MYORDER] Cart atualizado:', cartAtualizado);
      console.log('[MYORDER] itemCount:', cartAtualizado.itemCount);
      console.log('[MYORDER] totalPrice:', cartAtualizado.totalPrice);
      console.log('[MYORDER] items:', cartAtualizado.items);
      
      setCartData(cartAtualizado);
      // Atualiza imagem e vendedor
      const imageUrl = cartAtualizado.imageUrls?.[0]
        ? { uri: `${BASE_URL}/${cartAtualizado.imageUrls[0].replace(/\\/g, "/")}` }
        : require("../../assets/imagens/logo.png");
      setImageUrl(imageUrl);
      if (cartAtualizado?.seller) {
        fetch(`${BASE_URL}/api/auth/${cartAtualizado.seller}`)
          .then((res) => res.json())
          .then((data) => setSeller(data))
          .catch((err) => console.error("Erro ao buscar vendedor:", err));
      }
    } catch (err) {
      console.error("Erro ao buscar cart atualizado:", err);
    }
  };

  useEffect(() => {
    fetchCartData(cart._id);
    // eslint-disable-next-line
  }, [cart]);

  // Socket.io para atualização em tempo real
  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(BASE_URL.replace('/api', ''), {
        transports: ['websocket'],
        autoConnect: true,
      });
    }
    const socket = socketRef.current;
    // Escuta evento de atualização do carrinho
    socket.on('cartUpdated', (updatedCartId) => {
      if (updatedCartId === cart._id) {
        fetchCartData(cart._id);
      }
    });
    return () => {
      socket.off('cartUpdated');
    };
  }, [cart]);

  const handleItemPress = () => {
    navigation.navigate("OrderScreen");
  };

  useEffect(() => {
    // Recupera o ID do comprador do AsyncStorage
    const fetchUserId = async () => {
      const id = await AsyncStorage.getItem("userId");
      setUserId(id);
      console.log("User ID:", id);
    };
    fetchUserId();
  }, []);

  const pedido = {
    id: "CARSH1234567",
    chegada: "12/12/2023",
    link: "shein.cart.1234",
    vendedor: "Romeno do Rosário",
    avaliacao: 3, // Número de estrelas cheias
    totalCarrinhos: "99",
    state: "progresso",
    imagemCarrinho: require("../../assets/imagens/carrinho1.png"),
    imagemVendedor: require("../../assets/imagens/logo.png"),
    feito: "12/12/2023",
    aceite: "13/12/2023",
    progresso: "14/12/2023",
    enviado: "15/12/2023",
    entregue: "16/12/2023",
  };

  // Mapeamento de status do BD para nosso sistema interno
  const statusMap = {
    "Pedido Feito": "feito",
    Aceite: "aceite",
    "Em Progresso": "progresso",
    Enviado: "enviado",
    Entregue: "entregue",
    Negado: "negado",
    Cancelado: "cancelado",
    Fechado: "fechado", // <-- Adicionado
  };

  // Supondo que você já pegou da API:
  const buyerProgress = cartData.buyerCartProgress.find(
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
      return buyerId === String(userId);
    }
  );

  // Estado atual do pedido (convertendo do BD para nosso formato interno)
  const currentState = statusMap[buyerProgress?.status] || "feito";
  
  // Debug: Log do estado atual
  console.log('[MYORDER-DEBUG] 🎯 Estado atual:', {
    buyerProgressStatus: buyerProgress?.status,
    currentState: currentState,
    buyerProgress: buyerProgress,
    userId: userId
  });

  // Novo: checar se já finalizou
  const finalizadoCliente = buyerProgress?.finalizadoCliente;

  const estadosPedido = [
    { nome: "feito", label: "Pedido feito", nextIcon: ClipboardText },
    { nome: "progresso", label: "Em Progresso", nextIcon: Package },
    { nome: "aceite", label: "Pedido aceite", nextIcon: Handshake },
    { nome: "enviado", label: "Enviado", nextIcon: AirplaneTakeoff },
    { nome: "entregue", label: "Entregue", nextIcon: Truck },
    { nome: "fechado", label: "Pedido fechado", nextIcon: CheckCircle }, // <-- Adicionado
  ];

  const getStatusColor = (status) => {
    const orderProgress = [
      "feito",
      "progresso",
      "aceite",
      "enviado",
      "entregue",
      "fechado",
    ];
    const currentIndex = orderProgress.indexOf(currentState);
    const statusIndex = orderProgress.indexOf(status);

    return currentIndex >= statusIndex ? "#704F38" : "#A9A9A9";
  };
  const isFechado =
    cartData?.buyerCartProgress?.find((p) => {
      // Extrair o ID do buyer, que pode ser string ou objeto populado
      let buyerId;
      if (p?.buyer) {
        if (typeof p.buyer === "object" && p.buyer._id) {
          buyerId = String(p.buyer._id);
        } else {
          buyerId = String(p.buyer);
        }
      } else {
        buyerId = "";
      }
      return buyerId === String(userId);
    })?.status === "Fechado";

  const calcularEstimativaChegada = (closeDate, deliveryDays) => {
    const fechamento = new Date(closeDate);
    fechamento.setDate(fechamento.getDate() + deliveryDays);
    return fechamento.toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Status real do comprador no carrinho
  const buyerStatus =
    cartData?.buyerCartProgress?.find(
      (p) => {
        // Extrair o ID do buyer, que pode ser string ou objeto populado
        let buyerId;
        if (p?.buyer) {
          if (typeof p.buyer === "object" && p.buyer._id) {
            buyerId = String(p.buyer._id);
          } else {
            buyerId = String(p.buyer);
          }
        } else {
          buyerId = "";
        }
        return buyerId === String(userId);
      }
    )?.status || "Pedido Feito";

  function getBuyerProgress(cart, userId) {
    if (!cart || !cart.buyerCartProgress) {
      console.log("Carrinho inválido ou sem progresso.");
      return null;
    }

    const progress = cart.buyerCartProgress.find((item, i) => {
      // Extrair o ID do buyer, que pode ser string ou objeto populado
      let buyerId;
      if (item?.buyer) {
        if (typeof item.buyer === "object" && item.buyer._id) {
          buyerId = String(item.buyer._id);
          console.log(`Item[${i}] buyerId:`, buyerId);
        } else {
          buyerId = String(item.buyer);
          console.log(`Item[${i}] buyerId:`, buyerId);
        }
      } else {
        buyerId = "";
        console.log(`Item[${i}] buyerId: (vazio)`);
      }
      console.log(`Comparando com userId:`, userId);
      return buyerId === String(userId);
    });

    console.log(
      "Progresso encontrado:",
      progress ? progress.status : "Não encontrado"
    );
    return progress ? progress.status : null;
  }

  // Verifica se o status do buyerCartProgress é "Entregue" e se já finalizou
  const isEntregue =
    cartData?.buyerCartProgress?.find((p) => {
      // Extrair o ID do buyer, que pode ser string ou objeto populado
      let buyerId;
      if (p?.buyer) {
        if (typeof p.buyer === "object" && p.buyer._id) {
          buyerId = String(p.buyer._id);
        } else {
          buyerId = String(p.buyer);
        }
      } else {
        buyerId = "";
      }
      return buyerId === String(userId);
    })?.status === "Entregue";

  getBuyerProgress(cartData, userId);

  // Função para renderizar estrelas de avaliação
  const renderStars = (rating) => {
    let stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        i < rating ? (
          <Star key={`star_${i}`} size={18} color="#FFC107" weight="fill" />
        ) : (
          <Star key={`star_${i}`} size={18} color="#FFC107" />
        )
      );
    }
    return stars;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={{ width: "20%", marginLeft: 5 }}
          onPress={() => handleItemPress()}
        >
          <CaretLeft size={24} />
        </TouchableOpacity>
        <Text style={styles.headerText}>Seguir pedido</Text>
        <Text style={{ width: "20%", color: "white" }}>yay</Text>
      </View>
      <ScrollView style={styles.scrollViewStyle}>
        <View style={styles.container}>
          {/* Info do carrinho */}
          <View style={styles.itemContainer}>
            <Image
              source={imageUrl}
              style={styles.itemImage}
            />
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>{cartData.cartName || cartData.name}</Text>
              <Text style={styles.itemSpace}>
                Itens: {cartData.itemCount || 0}
              </Text>
              <Text style={styles.itemSpace}>
                Total: {cartData.totalPrice ? `${cartData.totalPrice.toFixed(2)}` : '0.00'} AOA
              </Text>
            </View>
          </View>

          {/* Vendedor */}
          <Text style={styles.sectionTitle}>Vendedor</Text>
          <View style={styles.vendedorInfo}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {cart.seller.profileImage ? (
                <Image
                  source={{
                    uri: `${BASE_URL}/${cart.seller.profileImage.replace(/\\/g, "/")}`,
                  }}
                  style={styles.vendedorImage}
                  resizeMode="cover"
                />
              ) : (
                <Image
                  source={require("../../assets/imagens/logo.png")}
                  style={styles.vendedorImage}
                />
              )}
              <View style={styles.vendedorDetails}>
                <Text style={styles.vendedorName}>
                  {cart.seller?.name || "Vendedor"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={async () => {
                try {
                  const token = await AsyncStorage.getItem("token");
                  const sellerId = cart.seller?._id || cart.seller;
                  const buyerId = userId;
                  if (!sellerId || !buyerId) {
                    alert("Não foi possível identificar vendedor ou comprador.");
                    return;
                  }
                  const convRes = await fetch(`${BASE_URL}/api/chat/conversation/between/${sellerId}/${buyerId}`, {
                    headers: { Authorization: token },
                  });
                  const convData = await convRes.json();
                  const conversationId = convData._id;
                  navigation.navigate("CompradorChatScreen", {
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

          {/* Detalhes */}
          <Text style={styles.sectionTitle}>Detalhes do Pedido</Text>
          <View style={styles.detailsContainer}>
            <View style={styles.detail}>
              <Text style={styles.detailText}>Estimativa de Chegada</Text>
              <Text style={styles.detailText1}>
                {calcularEstimativaChegada(cart.closeDate, cart.deliveryDays)}
              </Text>
            </View>
            <View style={styles.detail}>
              <Text style={styles.detailText}>ID do pedido</Text>
              <Text style={styles.detailText1}>{cart._id}</Text>
            </View>
            <View style={styles.detail}>
              <Text style={styles.detailText}>Link enviado</Text>
              <Text style={styles.detailText1}>{pedido.link}</Text>
            </View>
          </View>

          {/* Avaliação - Só exibe se o pedido estiver completo e tiver rating */}
          {(buyerProgress?.status === "Fechado" || buyerProgress?.status === "Entregue") && 
           buyerProgress?.rating > 0 && (
            <>
              <Text style={styles.sectionTitle}>Avaliação</Text>
              <View style={styles.ratingContainer}>
                <View style={styles.starsContainer}>
                  {renderStars(buyerProgress.rating)}
                </View>
                <Text style={styles.ratingText}>
                  {buyerProgress.rating.toFixed(1)} de 5 estrelas
                </Text>
                {buyerProgress.feedback && (
                  <Text style={styles.feedbackText}>
                    "{buyerProgress.feedback}"
                  </Text>
                )}
              </View>
            </>
          )}

          {/* Status */}
          <Text style={styles.sectionTitle}>Estado do Pedido</Text>
          <View style={styles.detailsContainer1}>
            {estadosPedido.map((estado, index) => (
              <View key={index} style={styles.state}>
                <View style={styles.stateDetails}>
                  <CheckCircle
                    weight="fill"
                    color={getStatusColor(estado.nome, buyerStatus)}
                    size={40}
                  />
                  <View style={styles.stateText}>
                    <Text style={styles.actualState}>{estado.label}</Text>
                    <Text style={styles.stateDate}>{estado.data}</Text>
                  </View>
                </View>
                <estado.nextIcon color="#704F38" size={35} />
                {index < estadosPedido.length - 1 && (
                  <View
                    style={[
                      styles.verticalLine,
                      {
                        backgroundColor: getStatusColor(
                          estadosPedido[index + 1].nome,
                          buyerStatus
                        ),
                      },
                    ]}
                  />
                )}
              </View>
            ))}
          </View>
          {buyerProgress && buyerProgress.status === "Entregue" && !isFechado && !buyerProgress.finalizadoCliente && (
            <TouchableOpacity
              style={{
                backgroundColor: "#704F38",
                padding: 16,
                borderRadius: 25,
                marginVertical: 20,
                alignItems: "center",
              }}
              onPress={() => {
                navigation.navigate("FeedBackScreen", {
                  cart,
                  buyer: { buyerId: userId },
                });
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
                Confirme a recepção do pedido
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFF", // ou a cor de
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 10 : 0,
  },
  scrollViewStyle: {
    flex: 1, // Você pode remover esta linha se você já definiu flex: 1 no estilo safeArea
    // Adicione outros estilos para o ScrollView, se necessário
  },
  container: {
    marginHorizontal: 13,
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
  detailsContainer1: {
    margin: "3%",
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
  state: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stateDetails: {
    display: "flex",
    flexDirection: "row",
    paddingBottom: 30,
  },
  relative: {
    position: "relative",
  },
  stateText: {
    marginLeft: "10%",
    fontFamily: "Poppins_400Regular",
  },
  actualState: {
    fontSize: 18,
    fontFamily: "Poppins_400Regular",
  },
  stateDate: {
    fontSize: 14,
    marginTop: 2,
    color: "#A9A9A9",
    fontFamily: "Poppins_400Regular",
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
    fontSize: 18,
    marginTop: 20,
    marginLeft: "3%",
    fontFamily: "Poppins_600SemiBold",
  },
  descriptionContainer: {
    marginTop: 30,
    borderWidth: 1,
    marginHorizontal: 25,
    borderColor: "#E8E8E8",
    height: 120,
    width: "80%",
    right: 12.5,
    justifyContent: "center",
    alignContent: "center",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 20,
  },
  description: {
    fontSize: 17,
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
  ratingContainer: {
    margin: "3%",
    paddingBottom: 20,
    borderBottomColor: "#DEDEDE",
    borderBottomWidth: 1,
  },
  ratingText: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    marginTop: 8,
    color: "#704F38",
    fontWeight: "500",
  },
  feedbackText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    marginTop: 8,
    color: "#666",
    fontStyle: "italic",
    lineHeight: 20,
  },
});

export default MyOrder;
