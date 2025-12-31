import React, { useState, useEffect, useRef } from "react";
import { useFocusEffect } from '@react-navigation/native';
import io from "socket.io-client";
import { CheckCircle } from "phosphor-react-native";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../../config";

const AtualizarPedidoScreen = ({ route }) => {
  const { cart, buyer } = route.params;
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [cartData, setCartData] = useState(cart);
  const socketRef = useRef(null);
  // Descobre status atual do comprador
  const myProgress = cartData?.buyerCartProgress?.find(
    (p) => (p.buyer?._id || p.buyer) === (buyer.buyerId || buyer._id)
  );
  const statusAtual = myProgress?.status;
  const finalizadoCliente = myProgress?.finalizadoCliente;

  // Função para buscar o cart atualizado do backend
  const fetchCartData = async (cartId) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/carts/${cartId}`, {
        headers: { Authorization: token },
      });
      if (!res.ok) throw new Error("Erro ao buscar carrinho atualizado");
      const cartAtualizado = await res.json();
      setCartData(cartAtualizado);
    } catch (err) {
      console.error("Erro ao buscar cart atualizado:", err);
    }
  };

  useEffect(() => {
    // Socket.io para atualização em tempo real
    if (!socketRef.current) {
      socketRef.current = io(BASE_URL.replace('/api', ''), {
        transports: ['websocket'],
        autoConnect: true,
      });
    }
    const socket = socketRef.current;
    socket.on('cartUpdated', (updatedCartId) => {
      if (updatedCartId === cart._id) {
        fetchCartData(cart._id);
      }
    });
    return () => {
      socket.off('cartUpdated');
    };
    // eslint-disable-next-line
  }, [cart]);

  // Sempre que a tela for focada, busca o cart atualizado
  useFocusEffect(
    React.useCallback(() => {
      fetchCartData(cart._id);
    }, [cart._id])
  );

  const atualizarStatusProgress = async (novoStatus) => {
    setLoading(true);
    console.log("Atualizando status para:", novoStatus);
    console.log("Cart ID:", cart._id);
    console.log("Buyer ID:", buyer.buyerId);
    if (!cart || !buyer || !buyer.buyerId) {
      Alert.alert("Erro", "Dados do carrinho ou comprador inválidos.");
      setLoading(false);
      return;
    }
    try {
      const token = await AsyncStorage.getItem("token");

      // Atualiza o cartProgress
      const responseCart = await fetch(
        `${BASE_URL}/api/carts/${cart._id}/buyer-progress`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({
            buyerId: buyer.buyerId,
            status: novoStatus,
          }),
        }
      );
      const dataCart = await responseCart.json();
      if (!responseCart.ok) {
        throw new Error(
          dataCart.message || "Erro ao atualizar status do carrinho"
        );
      }

      // Atualiza todas as orders deste comprador para o novo status
      const responseOrders = await fetch(
        `${BASE_URL}/api/orders/cart/${cart._id}/buyer/${buyer.buyerId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({
            status: novoStatus,
          }),
        }
      );
      const dataOrders = await responseOrders.json();
      if (!responseOrders.ok) {
        throw new Error(
          dataOrders.message || "Erro ao atualizar status das orders"
        );
      }

      Alert.alert("Sucesso", `Status atualizado para ${novoStatus}`);
      navigation.goBack();
    } catch (error) {
      Alert.alert("Erro", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Atualizar Status do Pedido</Text>
      <Text style={styles.subtitle}>
        Aqui você pode atualizar o andamento do pedido deste comprador. Marque cada etapa conforme for avançando:
      </Text>

      <TouchableOpacity
        style={[styles.button, statusAtual === "Enviado" && styles.selectedButton, { backgroundColor: "#704F38" }]}
        onPress={() => atualizarStatusProgress("Enviado")}
        disabled={loading || statusAtual === "Enviado" || statusAtual === "Entregue"}
      >
        <View style={styles.buttonContent}>
          <Text style={styles.buttonText}>Marcar como Enviado</Text>
          {statusAtual === "Enviado" && <CheckCircle size={22} color="#fff" weight="fill" style={{ marginLeft: 8 }} />}
        </View>
        {statusAtual === "Enviado" && <Text style={styles.statusInfo}>Já marcado como Enviado</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, statusAtual === "Entregue" && styles.selectedButton, { backgroundColor: "#228B22" }]}
        onPress={() => atualizarStatusProgress("Entregue")}
        disabled={loading || statusAtual === "Entregue"}
      >
        <View style={styles.buttonContent}>
          <Text style={styles.buttonText}>Marcar como Entregue</Text>
          {statusAtual === "Entregue" && <CheckCircle size={22} color="#fff" weight="fill" style={{ marginLeft: 8 }} />}
        </View>
        {statusAtual === "Entregue" && <Text style={styles.statusInfo}>Já marcado como Entregue</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#4682B4" }]}
        onPress={() => {
          navigation.navigate("FeedBackScreen1", {
            cart,
            buyer,
          });
        }}
        disabled={loading || statusAtual !== "Entregue" || !finalizadoCliente}
      >
        <Text style={styles.buttonText}>Terminar Pedido</Text>
        {statusAtual !== "Entregue" && (
          <Text style={styles.statusInfoSmall}>
            (Só disponível após marcar como Entregue)
          </Text>
        )}
        {statusAtual === "Entregue" && !finalizadoCliente && (
          <Text style={styles.statusInfoSmall}>
            (Aguarde o cliente Confirmar a recepção)
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 30 },
  button: {
    padding: 16,
    borderRadius: 25,
    marginVertical: 10,
    width: "80%",
    alignItems: "center",
    marginBottom: 8,
  },
  selectedButton: {
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusInfo: {
    color: '#FFD700',
    fontSize: 13,
    marginTop: 4,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statusInfoSmall: {
    color: '#fff',
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#555',
    marginBottom: 18,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});

export default AtualizarPedidoScreen;
