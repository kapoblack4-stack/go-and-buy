import React, { useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Star, CameraPlus } from "phosphor-react-native";
import { BASE_URL } from "../../../config";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const FeedbackScreen1 = ({ route }) => {
  const { cart, buyer } = route.params;
  const navigation = useNavigation();

  const [fotos, setFotos] = useState(
    cart?.images?.map((img, idx) => ({
      id: String(idx),
      uri: { uri: img },
    })) || []
  );
  const [rating, setRating] = useState(0);

  // Atualiza rating do comprador ao clicar nas estrelas
  const atualizarRatingComprador = async (novoRating) => {
    setRating(novoRating);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/${buyer.buyerId}/rating-buyer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: novoRating }),
      });
      const data = await res.json();
      console.log('[RATING-BUYER] Resposta do backend:', data);
      if (!res.ok) {
        alert('Erro ao atualizar rating do comprador: ' + (data?.error || data?.message));
      }
    } catch (error) {
      alert('Erro ao atualizar rating do comprador!');
    }
  };
  const [feedback, setFeedback] = useState("");

  const handleSendFeedback = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      
      console.log('[FEEDBACK-SELLER] Enviando feedback com rating:', rating);
      
      // Envia feedback para o cartProgress (com flag comFeedback = true)
      await fetch(`${BASE_URL}/api/carts/${cart._id}/buyer-progress-feed`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerId: buyer.buyerId,
          status: "Fechado",
          rating,
          feedback,
          comFeedback: true, // Flag para indicar que houve feedback (evita notificação duplicada)
        }),
      });

      // Marca como finalizado para o vendedor
      await fetch(`${BASE_URL}/api/carts/${cart._id}/buyer-finalize`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerId: buyer.buyerId,
          tipo: "vendedor",
        }),
      });

      // Atualiza o rating do comprador
      if (rating > 0) {
        console.log('[RATING-BUYER] Enviando rating para comprador:', buyer.buyerId, 'Rating:', rating);
        const ratingRes = await fetch(`${BASE_URL}/api/auth/${buyer.buyerId}/rating-buyer`, {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({ rating }),
        });
        
        const ratingData = await ratingRes.json();
        console.log('[RATING-BUYER] Resposta do backend:', ratingData);
        
        if (ratingRes.ok) {
          // Envia notificação para o comprador sobre a avaliação recebida
          try {
            console.log('[NOTIFICATION] Enviando notificação de avaliação para comprador:', buyer.buyerId);
            
            // Gerar estrelas visuais baseadas na pontuação
            const stars = "⭐".repeat(rating);
            const ratingText = rating === 1 ? "estrela" : "estrelas";
            
            const notificationRes = await fetch(`${BASE_URL}/api/notifications`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: token,
              },
              body: JSON.stringify({
                userId: buyer.buyerId,
                type: "rating",
                title: `Você foi avaliado! ${stars}`,
                message: `O vendedor te avaliou com ${rating} ${ratingText} ${stars} no carrinho "${cart.cartName}". Obrigado por ser um excelente comprador!`,
                data: {
                  cartId: cart._id,
                  cartName: cart.cartName,
                  rating: rating,
                  sellerId: cart.seller,
                  stars: stars
                }
              }),
            });
            
            if (notificationRes.ok) {
              console.log('[NOTIFICATION] Notificação de avaliação enviada com sucesso');
            } else {
              console.log('[NOTIFICATION] Erro ao enviar notificação de avaliação:', await notificationRes.text());
            }
          } catch (notificationError) {
            console.log('[NOTIFICATION] Erro ao enviar notificação de avaliação:', notificationError);
          }
        } else {
          alert('Erro ao atualizar rating do comprador: ' + (ratingData?.error || ratingData?.message));
        }
      }

      // Reset da navegação para evitar voltar à tela de feedback
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home1' }],
      });
    } catch (error) {
      console.log('[FEEDBACK-SELLER] Erro geral:', error);
      alert("Erro ao enviar feedback!");
    }
  };

  const handlePular = async () => {
    try {
      console.log('[PULAR-SELLER] Finalizando sem feedback - enviará notificação padrão');

       // Envia feedback para o cartProgress (com flag comFeedback = false)
      await fetch(`${BASE_URL}/api/carts/${cart._id}/buyer-progress-feed`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerId: buyer.buyerId,
          status: "Fechado",
          comFeedback: false, // Flag para indicar que pode enviar notificação padrão
        }),
      });

      // Marca como finalizado para o vendedor
      await fetch(`${BASE_URL}/api/carts/${cart._id}/buyer-finalize`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerId: buyer.buyerId,
          tipo: "vendedor",
        }),
      });
      console.log("Finalizado para o vendedor");
      console.log("Nome do carrinho:", cart.cartName);
      console.log("ID do carrinho:", cart._id);
      
      // Envia notificação para o comprador sobre finalização sem feedback
      await fetch(`${BASE_URL}/api/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: buyer.buyerId,
          sender: cart.seller,
          type: "pedido",
          title: "Pedido finalizado pelo vendedor",
          message: `O vendedor finalizou o pedido no carrinho ${cart.cartName}.`,
          data: { cartId: cart._id },
        }),
      });

      // Reset da navegação para evitar voltar à tela de feedback
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home1' }],
      });
    } catch (error) {
      alert("Erro ao finalizar pedido!");
    }
  };

  const removerFoto = (id) => {
    setFotos(fotos.filter((foto) => foto.id !== id));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={80}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.headerText}>Feedback</Text>
        </View>
        <ScrollView style={styles.scrollViewContainer}>
          <View style={styles.container}>
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
                  {cart?.cartName || "Carrinho"}
                </Text>
                <Text style={styles.itemSpace}>
                  {cart?.itemCount || 0} itens
                </Text>
                <Text style={styles.itemSpace}>
                  {cart?.totalPrice
                    ? `${cart.totalPrice} AOA`
                    : "Valor não disponível"}
                </Text>
              </View>
            </View>
            <View style={styles.separator} />
            <View style={styles.feedbackContainer}>
              <Text style={styles.feedbackQuestion}>
                Como foi o seu pedido?
              </Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.feedbackContainer}>
              <Text style={styles.pontuacao}>A sua pontuação</Text>
            </View>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => atualizarRatingComprador(star)}>
                  <Star
                    size={50}
                    color={star <= rating ? "#FFD700" : "#DEDEDE"}
                    style={styles.searchIcon}
                    weight={star <= rating ? "fill" : "regular"}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.separator} />

            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                onPress={handlePular}
                style={[styles.button, styles.cancelButton]}
              >
                <Text style={styles.buttonText}>Pular</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSendFeedback}
                style={[styles.button, styles.sendButton]}
              >
                <Text style={styles.buttonText}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  scrollViewContainer: {
    flex: 1,
  },
  container: {
    margin: "3%",
  },
  headerContainer: {
    justifyContent: "center",
    alignContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  headerText: {
    fontSize: 24,
    fontFamily: "Poppins_600SemiBold",
  },
  itemContainer: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
  },
  itemImage: {
    width: 100,
    height: 100,
    marginRight: 16,
    borderRadius: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
  },
  itemSpace: {
    color: "#878787",
    fontFamily: "Poppins_400Regular",
  },
  separator: {
    height: 1,
    backgroundColor: "#DEDEDE",
    marginVertical: 10,
  },

  feedbackQuestion: {
    fontSize: 26,
    fontFamily: "Poppins_400Regular",
  },
  pontuacao: {
    fontSize: 14,
    color: "#878787",
    fontFamily: "Poppins_400Regular",
  },
  starsContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignContent: "center",
    justifyContent: "center",
  },
  searchIcon: {
    margin: "2%",
    marginVertical: 0,
  },
  titleFeed: {
    marginVertical: "2%",
    fontFamily: "Poppins_400Regular",
  },

  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 20,
    marginTop: 10,
  },
  button: {
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    minWidth: "39%",
    height: "48%",
  },
  cancelButton: {
    backgroundColor: "#CCCCCC", // Cor do botão cancelar
    fontFamily: "Poppins_400Regular",
  },
  sendButton: {
    backgroundColor: "#704F38", // Cor do botão enviar
    fontFamily: "Poppins_400Regular",
  },
  buttonText: {
    color: "#FFF", // Cor do texto do botão
    fontSize: 16,
    fontWeight: "bold",
  },
  fotoContainer: {
    position: "relative",
    marginRight: 25,
    marginTop: 15,
    marginBottom: 10,
  },

  // Adicione estilos adicionais se necessário
});

export default FeedbackScreen1;
