import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { BASE_URL } from "../../config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Header from "../components/Header";

export default function UploadComprovativoScreen({ route }) {
  const { cartId, seller, totalPrice, cart } = route.params;
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    console.log("Cart ID recebido:", cartId);
    console.log("Total a ser pago:", totalPrice);
  }, []);

  // 📌 Selecionar arquivo (PDF ou imagem)
  const pickFile = async () => {
    Alert.alert(
      "Selecionar Comprovativo",
      "Escolha o tipo de arquivo:",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "📄 PDF",
          onPress: pickPDF
        },
        {
          text: "📷 Imagem",
          onPress: pickImage
        }
      ]
    );
  };

  // 📌 Selecionar PDF
  const pickPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const selected = result.assets[0];
      if (selected.mimeType !== "application/pdf") {
        Alert.alert("Formato inválido", "Por favor selecione um arquivo PDF.");
        return;
      }

      setFile({
        ...selected,
        type: "pdf"
      });
    } catch (error) {
      Alert.alert("Erro", "Não foi possível selecionar o arquivo.");
    }
  };

  // 📌 Selecionar imagem
  const pickImage = async () => {
    try {
      // Solicitar permissões
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'É necessário permissão para acessar a galeria.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled) return;

      const selected = result.assets[0];
      setFile({
        uri: selected.uri,
        name: `comprovativo_${Date.now()}.jpg`,
        type: "image",
        mimeType: "image/jpeg"
      });
    } catch (error) {
      Alert.alert("Erro", "Não foi possível selecionar a imagem.");
    }
  };

  // 📌 Enviar arquivo para o backend
  const uploadFile = async () => {
    if (!file) {
      Alert.alert("Atenção", "Selecione um arquivo antes de enviar.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    
    // Configurar dados baseado no tipo de arquivo
    if (file.type === "pdf") {
      formData.append("paymentProof", {
        uri: file.uri,
        type: "application/pdf",
        name: file.name || "comprovativo.pdf",
      });
    } else if (file.type === "image") {
      formData.append("paymentProof", {
        uri: file.uri,
        type: file.mimeType || "image/jpeg",
        name: file.name || "comprovativo.jpg",
      });
    }

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return console.warn("Token não encontrado.");
      }

      const response = await fetch(
        `${BASE_URL}/api/carts/${cartId}/payment-proof`,
        {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "multipart/form-data",
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Sucesso", "Comprovativo enviado com sucesso!");
        const token = await AsyncStorage.getItem("token");
        const updatedRes = await fetch(`${BASE_URL}/api/carts/${cartId}`, {
          headers: { Authorization: token },
        });
        const updatedCart = await updatedRes.json();

        // Remove a tela do comprovativo do stack para não permitir voltar
        navigation.reset({
          index: 0,
          routes: [{ name: "MyOrder", params: { cart: updatedCart } }],
        });
      } else {
        Alert.alert("Erro", data.error || "Falha ao enviar comprovativo.");
      }
    } catch (error) {
      Alert.alert("Erro", "Ocorreu um erro no upload.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="#FFF" 
        translucent={false}
      />
      <Header page={"Comprovativo de Pagamento"} />
      
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Card do Vendedor */}
        <View style={styles.sellerCard}>
          <View style={styles.sellerHeader}>
            <Ionicons name="person-circle" size={24} color="#704F38" />
            <Text style={styles.cardTitle}>Vendedor</Text>
          </View>
          <Text style={styles.sellerName}>{seller.name}</Text>
        </View>

        {/* Card de Informações Bancárias */}
        <View style={styles.bankCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="card" size={24} color="#704F38" />
            <Text style={styles.cardTitle}>Dados Bancários</Text>
          </View>
          {seller.contasBancarias?.map((conta, index) => (
            <View key={conta._id || index} style={styles.contaItem}>
              <View style={styles.contaRow}>
                <Ionicons name="business" size={16} color="#704F38" />
                <Text style={styles.contaLabel}>Banco:</Text>
                <Text style={styles.contaValue}>{conta.banco}</Text>
              </View>
              <View style={styles.contaRow}>
                <Ionicons name="card-outline" size={16} color="#704F38" />
                <Text style={styles.contaLabel}>IBAN:</Text>
                <Text style={styles.contaValue}>{conta.iban}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Card do Total */}
        <View style={styles.totalCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="cash" size={24} color="#2E8B57" />
            <Text style={[styles.cardTitle, { color: "#2E8B57" }]}>Total a Pagar</Text>
          </View>
          <Text style={styles.totalAmount}>
            {totalPrice.toLocaleString()} Kz
          </Text>
        </View>

        {/* Card de Aviso */}
        <View style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <Ionicons name="warning" size={24} color="#FF6B35" />
            <Text style={[styles.cardTitle, { color: "#FF6B35" }]}>Importante</Text>
          </View>
          <Text style={styles.warningText}>
            • Certifique-se de enviar o valor exato{'\n'}
            • Guarde o comprovativo de pagamento{'\n'}
            • Envie arquivos PDF ou imagens (JPG, PNG)
          </Text>
        </View>

        {/* Card de Upload */}
        <View style={styles.uploadCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="cloud-upload" size={24} color="#704F38" />
            <Text style={styles.cardTitle}>Enviar Comprovativo</Text>
          </View>

          <TouchableOpacity style={styles.selectButton} onPress={pickFile}>
            <Ionicons name="folder-open" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Selecionar Arquivo</Text>
          </TouchableOpacity>

          {file && (
            <View style={styles.selectedFileContainer}>
              <Ionicons 
                name={file.type === "pdf" ? "document-text" : "image"} 
                size={20} 
                color="#2E8B57" 
              />
              <Text style={styles.selectedFile}>
                {file.name || `comprovativo.${file.type === "pdf" ? "pdf" : "jpg"}`}
              </Text>
              <View style={styles.fileTypeIndicator}>
                <Text style={styles.fileTypeText}>
                  {file.type === "pdf" ? "PDF" : "IMG"}
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.uploadButton, loading && styles.uploadButtonDisabled]} 
            onPress={uploadFile}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Enviar Comprovativo</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  
  // Cards base
  sellerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  bankCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  totalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    borderLeftWidth: 4,
    borderLeftColor: "#2E8B57",
  },
  warningCard: {
    backgroundColor: "#FFF8F0",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    borderLeftWidth: 4,
    borderLeftColor: "#FF6B35",
  },
  uploadCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },

  // Headers dos cards
  sellerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Poppins_600SemiBold",
    color: "#2C3E50",
    marginLeft: 10,
  },

  // Vendedor
  sellerName: {
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    color: "#704F38",
    textAlign: "center",
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 10,
  },

  // Contas bancárias
  contaItem: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  contaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  contaLabel: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#6C757D",
    marginLeft: 8,
    marginRight: 8,
    minWidth: 50,
  },
  contaValue: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#2C3E50",
    flex: 1,
  },

  // Total
  totalAmount: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "Poppins_700Bold",
    color: "#2E8B57",
    textAlign: "center",
    backgroundColor: "#F0F8F4",
    padding: 15,
    borderRadius: 12,
  },

  // Aviso
  warningText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#8B4513",
    lineHeight: 22,
  },

  // Botões
  selectButton: {
    backgroundColor: "#704F38",
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  uploadButton: {
    backgroundColor: "#2E8B57",
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  uploadButtonDisabled: {
    backgroundColor: "#A0A0A0",
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Poppins_600SemiBold",
    color: "#FFFFFF",
  },
  buttonIcon: {
    marginRight: 8,
  },

  // Arquivo selecionado
  selectedFileContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F8F4",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#2E8B57",
  },
  selectedFile: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#2E8B57",
    flex: 1,
    marginLeft: 10,
    marginRight: 10,
  },
  fileTypeIndicator: {
    backgroundColor: "#2E8B57",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  fileTypeText: {
    fontSize: 10,
    fontFamily: "Poppins_600SemiBold",
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
