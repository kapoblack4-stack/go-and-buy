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
  Image,
  StatusBar,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../config";
import james from "../../assets/imagens/avatar.webp";
import { CaretLeft } from "phosphor-react-native";

export default function ChatScreen({ route, navigation }) {
  // Função para atualizar o rating do comprador
  const atualizarRatingComprador = async (buyerId, rating) => {
    const token = await AsyncStorage.getItem("token");
    const res = await fetch(`${BASE_URL}/api/auth/${buyerId}/rating-buyer`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({ rating }),
    });
    const data = await res.json();
    console.log('[RATING-BUYER] Resposta do backend:', data);
    if (!res.ok) {
      alert('Erro ao atualizar rating do comprador: ' + (data?.error || data?.message));
    } else {
      alert('Rating do comprador atualizado com sucesso!');
    }
  };
  const { conversationId, sellerId, buyerId } = route.params || {};
  const [userId, setUserId] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sellerName, setSellerName] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhoto, setBuyerPhoto] = useState(null);

  function getProfileImage(user) {
    if (user?.profileImage) {
      const url = user.profileImage.replace(/\\/g, '/');
      return { uri: `${BASE_URL}/${url}` };
    }
    return james;
  }
  const flatListRef = useRef();
  const socketRef = useRef(null);

  useEffect(() => {
    // Recupera o id do vendedor logado
    const fetchUserId = async () => {
      const id = await AsyncStorage.getItem("userId");
      setUserId(id);
    };
    fetchUserId();
  }, []);

  useEffect(() => {
    socketRef.current = io(BASE_URL.replace("/api", ""), {
      transports: ["websocket"],
    });

    socketRef.current.on("connect", () => {
      console.log("✅ Vendedor conectado:", socketRef.current.id);
      if (conversationId) {
        socketRef.current.emit("joinConversation", conversationId);
        console.log("📡 Vendedor entrou na sala:", conversationId);
      }
    });

    // Receber mensagens em tempo real
    socketRef.current.on("receiveMessage", (message) => {
      console.log("📩 Mensagem recebida:", message);
      setMessages((prev) => {
        const exists = prev.some((m) => m._id === message._id);
        if (exists) return prev;
        return [...prev, message];
      });
      flatListRef.current?.scrollToEnd({ animated: true });
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [conversationId]);


  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      let convId = conversationId;
      // Se não tiver conversationId, busca ou cria
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
      const token = await AsyncStorage.getItem("token");
      if (sellerId) {
        const res = await fetch(`${BASE_URL}/api/auth/${sellerId}`);
        const data = await res.json();
        setSellerName(data.name);
      }
      if (buyerId) {
        const res = await fetch(`${BASE_URL}/api/auth/${buyerId}`);
        const data = await res.json();
        setBuyerName(data.name);
        setBuyerPhoto(getProfileImage(data));
      }
    };
    fetchNames();
  }, [sellerId, buyerId]);

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
      console.log("conversationId indefinido", { conversationId, sellerId, buyerId });
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
      console.log("Erro ao enviar mensagem:", data);
      alert("Erro ao enviar mensagem: " + (data?.error || JSON.stringify(data)));
    }
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.message,
        item.sender === userId ? styles.seller : styles.buyer,
      ]}
    >
      <Text style={styles.messageText}>{item.text}</Text>
      <Text style={styles.messageMeta}>
        {new Date(item.createdAt).toLocaleString()}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0} // ajusta conforme o header
      >
  <View style={[styles.header, Platform.OS === "android" ? { marginTop: StatusBar.currentHeight || 24 } : {}]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <CaretLeft size={24} color="white" />
          </TouchableOpacity>
          <Image source={buyerPhoto || james} style={styles.pfp} resizeMode="cover" />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.name}>{buyerName || "Comprador"}</Text>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id || item.createdAt}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 10, flexGrow: 1 }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Digite sua mensagem..."
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Text style={styles.sendButtonText}>Enviar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#704F38",
  },
  header: {
    backgroundColor: "#704F38",
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  pfp: {
    width: 50,
    height: 50,
    borderRadius: 30,
    marginLeft: 20,
  },
  name: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  message: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 8,
    maxWidth: "80%",
  },
  seller: {
    backgroundColor: "#E0E0E0",
    alignSelf: "flex-end",
  },
  buyer: {
    backgroundColor: "#F5F5F5",
    alignSelf: "flex-start",
  },
  messageText: {
    fontSize: 16,
  },
  messageMeta: {
    fontSize: 10,
    color: "#888",
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#EEE",
    backgroundColor: "#FFF",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: "#704F38",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
