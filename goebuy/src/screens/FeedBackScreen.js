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
import { Star, CameraPlus, CaretLeft } from "phosphor-react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../config";

const FeedbackScreen = ({ route, navigation }) => {
  const { cart, buyer } = route.params;

  // Debug: log dos dados do carrinho
  console.log('[FEEDBACK] Dados do carrinho:', cart);
  console.log('[FEEDBACK] imageUrls:', cart?.imageUrls);

  const [fotos, setFotos] = useState(
    cart?.images?.map((img, idx) => ({
      id: String(idx),
      uri: { uri: img },
    })) || []
  );
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");

  // Função para enviar feedback e fechar pedido
  const handleSendFeedback = async () => {
    if (rating === 0) {
      alert("Por favor, selecione uma pontuação antes de enviar.");
      return;
    }
    if (feedback.trim() === "") {
      alert("Por favor, escreva um feedback antes de enviar.");
      return;
    }
    if (fotos.length === 0) {
      alert("Por favor, adicione pelo menos uma foto antes de enviar.");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");
      // Extrai apenas as URIs das imagens adicionadas
      const imagens = fotos.map((f) => f.uri.uri);

      // Envia feedback (NÃO fecha o pedido, só salva feedback e rating)

      // Envia feedback (NÃO fecha o pedido, só salva feedback e rating)
      const feedbackRes = await fetch(`${BASE_URL}/api/carts/${cart._id}/buyer-progress-feed`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          buyerId: buyer.buyerId,
          status: "Entregue",
          rating,
          feedback,
          imagens,
        }),
      });
      const feedbackData = await feedbackRes.json();
      console.log('[FEEDBACK] Resposta do backend:', feedbackData);

      // Atualiza o rating do vendedor
      if (cart?.seller?._id) {
        console.log('[RATING] Enviando rating para vendedor:', cart.seller._id, 'Rating:', rating);
        const ratingRes = await fetch(`${BASE_URL}/api/auth/${cart.seller._id}/rating`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({ rating }),
        });
        const ratingText = await ratingRes.text();
        console.log('[RATING] Status:', ratingRes.status);
        console.log('[RATING] Texto da resposta:', ratingText);
        let ratingData;
        try {
          ratingData = JSON.parse(ratingText);
        } catch (e) {
          console.log('[RATING] Erro ao fazer parse do JSON:', e);
          alert('Erro ao atualizar rating do vendedor: resposta não é JSON.');
          return;
        }
        console.log('[RATING] Resposta do backend (JSON):', ratingData);
        if (!ratingRes.ok) {
          alert('Erro ao atualizar rating do vendedor: ' + (ratingData?.error || ratingData?.message));
        } else {
          // Envia notificação para o vendedor sobre a avaliação recebida
          try {
            console.log('[NOTIFICATION] Enviando notificação de avaliação para vendedor:', cart.seller._id);
            
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
                userId: cart.seller._id,
                type: "rating",
                title: `Nova Avaliação Recebida! ${stars}`,
                message: `Parabéns! Você recebeu ${rating} ${ratingText} ${stars} no carrinho "${cart.cartName}". Continue oferecendo um excelente serviço!`,
                data: {
                  cartId: cart._id,
                  cartName: cart.cartName,
                  rating: rating,
                  buyerId: buyer.buyerId,
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
        }
      } else {
        console.log('[RATING] Não foi possível encontrar o ID do vendedor no carrinho:', cart);
      }

      // Marca como finalizado para o cliente (com flag indicando que houve feedback)
      console.log('[FINALIZE] buyerId:', buyer?.buyerId);
      console.log('[FINALIZE] cartId:', cart?._id);
      console.log('[FINALIZE] tipo:', 'cliente');
      console.log('[FINALIZE] comFeedback: true (para evitar notificação duplicada)');
      const res = await fetch(`${BASE_URL}/api/carts/${cart._id}/buyer-finalize`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          buyerId: buyer.buyerId,
          tipo: "cliente",
          comFeedback: true, // Flag para indicar que já houve feedback e notificação
        }),
      });
      const data = await res.json();
      console.log('[FINALIZE] Resposta do backend:', data);
      if (!res.ok) {
        alert("Erro ao finalizar pedido!");
        return;
      }

      // Reset da navegação para evitar voltar à tela de feedback
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (error) {
      alert("Erro ao enviar feedback: " + error.message);
    }
  };

  // Função para apenas fechar pedido sem feedback
  const handlePularFeedback = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      console.log('[PULAR] Finalizando sem feedback - enviará notificação padrão');
      // Não altera status, apenas marca como finalizado para o cliente
      await fetch(`${BASE_URL}/api/carts/${cart._id}/buyer-finalize`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          buyerId: buyer.buyerId,
          tipo: "cliente",
          comFeedback: false, // Flag para indicar que pode enviar notificação padrão
        }),
      });
      
      // Reset da navegação para evitar voltar à tela de feedback
      navigation.reset({
        index: 0,
        routes: [{ name: 'OrderScreen' }],
      });
    } catch (error) {
      alert("Erro ao finalizar pedido!");
    }
  };

  // Função para adicionar imagem do produto recebido
  const handleAddPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newFoto = {
        id: String(Date.now()),
        uri: { uri: result.assets[0].uri },
      };
      setFotos([...fotos, newFoto]);
    }
  };
  const removerFoto = (id) => {
    setFotos(fotos.filter((foto) => foto.id !== id));
  };

  const renderItem = ({ item }) => (
    <View style={styles.fotoContainer}>
      <Image source={item.uri} style={styles.foto} />
      <TouchableOpacity
        style={styles.removerFotoButton}
        onPress={() => removerFoto(item.id)}
      >
        <Text style={styles.removerFotoTexto}>X</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={80}
      >
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <CaretLeft size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerText}>Feedback</Text>
          <View style={styles.placeholder} />
        </View>
        <ScrollView style={styles.scrollViewContainer}>
          <View style={styles.container}>
            <View style={styles.itemContainer}>
              <Image
                source={
                  cart?.imageUrls?.[0]
                    ? { uri: `${BASE_URL}/${cart.imageUrls[0].replace(/\\/g, '/')}` }
                    : require("../../assets/imagens/carrinho1.png")
                }
                style={styles.itemImage}
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
              <Text style={styles.pontuacao}>Dê a sua pontuação</Text>
            </View>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
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
            <View style={styles.titleFeed}>
              <Text style={{ fontFamily: "Poppins_400Regular" }}>
                Dê um feedback detalhado
              </Text>
            </View>
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              multiline
              placeholderTextColor={"#878787"}
              placeholder="Digite aqui..."
              numberOfLines={4}
              blurOnSubmit={true}
              value={feedback}
              onChangeText={setFeedback}
            />
            <TouchableOpacity
              style={styles.cameraPlus}
              onPress={handleAddPhoto}
            >
              <CameraPlus
                size={20}
                color="#704F38"
                style={styles.searchIcon}
                weight="fill"
              />
              <Text style={styles.adicionar}>Adicionar foto</Text>
            </TouchableOpacity>
            <FlatList
              horizontal
              data={fotos}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              style={styles.fotosList}
            />
            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                onPress={handlePularFeedback}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 16,
    backgroundColor: "#FFF",
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#fff",
  },
  placeholder: {
    width: 40,
    height: 40,
  },
  headerText: {
    fontSize: 24,
    fontFamily: "Poppins_600SemiBold",
    flex: 1,
    textAlign: "center",
    color: "#1A1A1A",
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
  feedbackContainer: {
    padding: 20,
    justifyContent: "center",
    alignContent: "center",
    alignItems: "center",
    // Estilos adicionais se necessário
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
  descriptionInput: {
    textAlignVertical: "top", // Para alinhar o texto no topo no Android
    height: 130,
    fontFamily: "Poppins_400Regular",
  },
  input: {
    width: "100%",
    padding: 10,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    marginTop: 5,
  },
  cameraPlus: {
    flexDirection: "row",
    marginTop: "2%",
  },
  adicionar: {
    color: "#704F38",
    fontFamily: "Poppins_400Regular",
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 20,
  },
  button: {
    paddingVertical: 20,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    minWidth: "39%",
    height: "36%",
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
  foto: {
    width: 100,
    height: 90,
    borderRadius: 5,
  },
  removerFotoButton: {
    position: "absolute",
    right: -10,
    top: -10,
    backgroundColor: "#704F38",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  removerFotoTexto: {
    color: "white",
    fontSize: 14,
  },
  // Adicione estilos adicionais se necessário
});

export default FeedbackScreen;
