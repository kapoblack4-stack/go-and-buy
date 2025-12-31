import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Image,
  Modal,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/Header";
import { useNavigation } from "@react-navigation/native";
import { BASE_URL } from "../../../config";

// Captura o StatusBar height uma única vez para evitar mudanças ao voltar do background
const STATUSBAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;

const CreateCartScreen = ({ route }) => {
  const { namePage, editMode = false, cartData = null } = route.params;
  const [openDate, setOpenDate] = useState(editMode && cartData ? new Date(cartData.openDate) : new Date());
  const [closeDate, setCloseDate] = useState(editMode && cartData ? new Date(cartData.closeDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7 dias depois
  const [deliveryDate, setDeliveryDate] = useState(editMode && cartData ? new Date(cartData.deliveryDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)); // 14 dias depois
  const [cartName, setCartName] = useState(editMode && cartData ? cartData.cartName : "");
  const [exchangeRate, setExchangeRate] = useState(editMode && cartData ? cartData.exchangeRate.toString() : "");
  const [description, setDescription] = useState(editMode && cartData ? cartData.description : "");
  const navigation = useNavigation();
  const [showClosePicker, setShowClosePicker] = useState(false);
  const [showDeliveryPicker, setShowDeliveryPicker] = useState(false);
  const [deliveryDays, setDeliveryDays] = useState([]);
  const [images, setImages] = useState(() => {
    if (editMode && cartData && cartData.imageUrls) {
      return cartData.imageUrls.map(url => {
        const fullUrl = `${BASE_URL}/${url.replace(/\\/g, "/")}`;
        return fullUrl;
      });
    }
    return [];
  });
  const [selectedProvince, setSelectedProvince] = useState(editMode && cartData ? cartData.province : "");
  const [pickupLocation, setPickupLocation] = useState(editMode && cartData ? cartData.pickupLocation : "");
  const [deliveryFee, setDeliveryFee] = useState(editMode && cartData ? cartData.deliveryFee.toString() : "");
  const [showProvincePicker, setShowProvincePicker] = useState(false);
  
  // Estados para controle de validação/erros
  const [errors, setErrors] = useState({
    cartName: false,
    description: false,
    exchangeRate: false,
    selectedProvince: false,
    pickupLocation: false,
    deliveryFee: false,
    images: false,
    closeDate: false,
    deliveryDate: false,
  });

  // Estados para modal customizado
  const [customAlert, setCustomAlert] = useState({
    visible: false,
    type: 'info', // 'success', 'error', 'warning', 'info'
    title: '',
    message: '',
    onConfirm: null,
  });

  // Estado para toast notification
  const [toast, setToast] = useState({
    visible: false,
    type: 'success', // 'success', 'info', 'warning', 'error'
    message: '',
  });

  const provinces = [
    "Luanda", "Benguela", "Huíla", "Huambo", "Uíge", "Malanje", 
    "Lunda Norte", "Lunda Sul", "Moxico", "Cuando Cubango", 
    "Namibe", "Zaire", "Cabinda", "Cunene", "Bié", "Cuanza Norte", 
    "Cuanza Sul", "Bengo"
  ];
  

  const handleSubmit = async () => {
    const formData = new FormData();
    const token = await AsyncStorage.getItem("token");
    console.log("Token:", token);

    // Resetar erros
    const newErrors = {
      cartName: false,
      description: false,
      exchangeRate: false,
      selectedProvince: false,
      pickupLocation: false,
      deliveryFee: false,
      images: false,
      closeDate: false,
      deliveryDate: false,
    };

    // Validar campos obrigatórios
    if (!cartName.trim()) newErrors.cartName = true;
    if (!description.trim()) newErrors.description = true;
    if (!exchangeRate.trim()) newErrors.exchangeRate = true;
    if (!selectedProvince) newErrors.selectedProvince = true;
    if (!pickupLocation.trim()) newErrors.pickupLocation = true;
    if (!deliveryFee.trim()) newErrors.deliveryFee = true;
    if (images.length === 0) newErrors.images = true;

    // Validações de datas
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const closeDateForComparison = new Date(closeDate);
    closeDateForComparison.setHours(0, 0, 0, 0);
    
    const deliveryDateForComparison = new Date(deliveryDate);
    deliveryDateForComparison.setHours(0, 0, 0, 0);

    if (closeDateForComparison <= today) {
      newErrors.closeDate = true;
    }
    if (deliveryDateForComparison <= closeDateForComparison) {
      newErrors.deliveryDate = true;
    }

    // Atualizar estados de erro
    setErrors(newErrors);

    // Verificar se há erros
    const hasErrors = Object.values(newErrors).some(error => error);
    
    if (hasErrors) {
      let errorList = [];
      if (newErrors.cartName) errorList.push("Nome do carrinho");
      if (newErrors.description) errorList.push("Descrição");
      if (newErrors.exchangeRate) errorList.push("Câmbio");
      if (newErrors.selectedProvince) errorList.push("Província");
      if (newErrors.pickupLocation) errorList.push("Local de retirada");
      if (newErrors.deliveryFee) errorList.push("Taxa de entrega");
      if (newErrors.images) errorList.push("Imagem do carrinho");
      if (newErrors.closeDate) errorList.push("Data de fecho válida");
      if (newErrors.deliveryDate) errorList.push("Data de entrega válida");
      
      const errorMessage = errorList.join(", ");
      showCustomAlert(
        'error',
        'Campos Obrigatórios',
        `Por favor, preencha: ${errorMessage}`
      );
      return;
    }

    formData.append("platform", namePage);
    formData.append("cartName", cartName);
    formData.append("description", description);
    formData.append("exchangeRate", exchangeRate);
    formData.append("openDate", openDate.toISOString());
    formData.append("closeDate", closeDate.toISOString());
    formData.append("deliveryDate", deliveryDate.toISOString());
    formData.append("province", selectedProvince);
    formData.append("pickupLocation", pickupLocation);
    formData.append("deliveryFee", deliveryFee);

    // Debug: Verificar se os dados estão sendo adicionados
    console.log("FormData sendo enviado:");
    console.log("Province:", selectedProvince);
    console.log("Pickup Location:", pickupLocation);
    console.log("Delivery Fee:", deliveryFee);

    images.forEach((imageUri, index) => {
      const uriString = typeof imageUri === 'string' ? imageUri : imageUri.uri;
      
      // Se for uma imagem existente (URL completa), apenas referenciamos
      if (uriString.startsWith('http') || uriString.startsWith(`${BASE_URL}`)) {
        // Para imagens existentes no modo de edição, enviamos apenas a referência
        formData.append("existingImages", uriString.replace(`${BASE_URL}/`, ''));
      } else {
        // Para imagens novas, enviamos o arquivo
        const filename = uriString.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const ext = match ? match[1] : "jpg";

        formData.append("images", {
          uri: uriString,
          name: `image_${index}.${ext}`,
          type: `image/${ext}`,
        });
      }
    });

    try {
      const url = editMode ? `${BASE_URL}/api/carts/${cartData._id}` : `${BASE_URL}/api/carts`;
      const method = editMode ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method: method,
        headers: {
          Authorization: token,
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("Erro no servidor:", text);
        showCustomAlert(
          'error',
          'Erro no Servidor',
          `Ocorreu um erro ao ${editMode ? 'atualizar' : 'criar'} o carrinho. Tente novamente.`
        );
        return;
      }

      const data = await response.json();
      console.log(`Carrinho ${editMode ? 'atualizado' : 'criado'} com sucesso:`, data);
      showToast('success', `Carrinho ${editMode ? 'atualizado' : 'criado'} com sucesso!`);
      
      // Navegar após 1.5 segundos para dar tempo de ver o toast
      setTimeout(() => {
        navigation.navigate(editMode ? "MyCartDetailScreen" : "Home1", 
          editMode ? { cart: data } : undefined);
      }, 1500);
    } catch (error) {
      console.error("Erro ao criar carrinho:", error);
    }
  };

  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      showCustomAlert(
        'warning',
        'Permissão Necessária',
        'É necessário permitir o acesso à galeria para selecionar imagens.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const newImage = result.assets[0].uri;
      setImages([newImage]);
    }
  };

  const removeImage = (indexToRemove) => {
    setImages(images.filter((_, index) => index !== indexToRemove));
  };

  // Função para limpar erros específicos
  const clearError = (fieldName) => {
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  // Função para mostrar alert customizado
  const showCustomAlert = (type, title, message, onConfirm = null) => {
    setCustomAlert({
      visible: true,
      type,
      title,
      message,
      onConfirm,
    });
  };

  // Função para fechar alert customizado
  const hideCustomAlert = () => {
    setCustomAlert(prev => ({ ...prev, visible: false }));
    if (customAlert.onConfirm) {
      customAlert.onConfirm();
    }
  };

  // Função para mostrar toast
  const showToast = (type, message) => {
    setToast({
      visible: true,
      type,
      message,
    });
    
    // Auto-hide após 3 segundos
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  };
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <View style={styles.container}>
        <Header page={editMode ? "Editar carrinho" : "Criar carrinho"} />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Seção: Informações Básicas */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle" size={24} color="#704F38" />
              <Text style={styles.sectionTitle}>Informações Básicas</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.title}>Nome do carrinho</Text>
              <View style={[styles.inputContainer, errors.cartName && styles.errorInput]}>
                <Ionicons name="cart" size={20} color="#704F38" style={styles.inputIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder={"Carrinho da " + namePage}
                  placeholderTextColor="#878787"
                  value={cartName}
                  onChangeText={(text) => {
                    setCartName(text);
                    clearError('cartName');
                  }}
                />
              </View>
              {errors.cartName && <Text style={styles.errorText}>Nome do carrinho é obrigatório</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.title}>Descrição</Text>
              <View style={[styles.inputContainer, errors.description && styles.errorInput]}>
                <Ionicons name="document-text" size={20} color="#704F38" style={styles.inputIcon} />
                <TextInput
                  style={[styles.inputWithIcon, styles.descriptionInput]}
                  placeholder="Descreva seu carrinho..."
                  placeholderTextColor="#878787"
                  multiline
                  value={description}
                  onChangeText={(text) => {
                    setDescription(text);
                    clearError('description');
                  }}
                />
              </View>
              {errors.description && <Text style={styles.errorText}>Descrição é obrigatória</Text>}
            </View>
          </View>

          {/* Seção: Datas */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar" size={24} color="#704F38" />
              <Text style={styles.sectionTitle}>Cronograma</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.title}>Data de Abertura</Text>
              <View style={styles.dateInputDisabled}>
                <Ionicons name="play-circle" size={20} color="#704F38" />
                <Text style={styles.dateTextDisabled}>
                  {openDate.toLocaleDateString('pt-BR')} (Hoje)
                </Text>
                <Ionicons name="lock-closed" size={20} color="#878787" />
              </View>
              <Text style={styles.helperText}>
                O carrinho abrirá automaticamente hoje
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.title}>Data de Fecho</Text>
              <TouchableOpacity
                onPress={() => setShowClosePicker(true)}
                style={[styles.dateInput, errors.closeDate && styles.errorInput]}
              >
                <Ionicons name="stop-circle" size={20} color="#704F38" />
                <Text style={styles.dateText}>
                  {closeDate.toLocaleDateString('pt-BR')}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#704F38" />
              </TouchableOpacity>
              {errors.closeDate && <Text style={styles.errorText}>Data deve ser posterior à hoje</Text>}
              {showClosePicker && (
                <View style={Platform.OS === 'ios' ? styles.iosPickerContainer : null}>
                  <DateTimePicker
                    value={closeDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? "spinner" : "default"}
                    onChange={(event, selectedDate) => {
                      if (Platform.OS === "android") {
                        setShowClosePicker(false);
                        if (selectedDate) {
                          setCloseDate(selectedDate);
                          clearError('closeDate');
                        }
                      } else {
                        // No iOS, apenas atualiza a data, não fecha o picker
                        if (selectedDate) {
                          setCloseDate(selectedDate);
                          clearError('closeDate');
                        }
                      }
                    }}
                  />
                  {Platform.OS === 'ios' && (
                    <View style={styles.iosPickerButtons}>
                      <TouchableOpacity 
                        style={[styles.pickerButton, styles.cancelButton]}
                        onPress={() => setShowClosePicker(false)}
                      >
                        <Text style={[styles.pickerButtonText, styles.cancelButtonText]}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.pickerButton}
                        onPress={() => setShowClosePicker(false)}
                      >
                        <Text style={styles.pickerButtonText}>Confirmar</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.title}>Estimativa de Entrega</Text>
              <TouchableOpacity
                onPress={() => setShowDeliveryPicker(true)}
                style={[styles.dateInput, errors.deliveryDate && styles.errorInput]}
              >
                <Ionicons name="time" size={20} color="#704F38" />
                <Text style={styles.dateText}>
                  {deliveryDate.toLocaleDateString('pt-BR')}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#704F38" />
              </TouchableOpacity>
              {errors.deliveryDate && <Text style={styles.errorText}>Data deve ser posterior ao fecho</Text>}
              {showDeliveryPicker && (
                <View style={Platform.OS === 'ios' ? styles.iosPickerContainer : null}>
                  <DateTimePicker
                    value={deliveryDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? "spinner" : "default"}
                    onChange={(event, selectedDate) => {
                      if (Platform.OS === "android") {
                        setShowDeliveryPicker(false);
                        if (selectedDate) {
                          setDeliveryDate(selectedDate);
                          clearError('deliveryDate');
                        }
                      } else {
                        // No iOS, apenas atualiza a data, não fecha o picker
                        if (selectedDate) {
                          setDeliveryDate(selectedDate);
                          clearError('deliveryDate');
                        }
                      }
                    }}
                  />
                  {Platform.OS === 'ios' && (
                    <View style={styles.iosPickerButtons}>
                      <TouchableOpacity 
                        style={[styles.pickerButton, styles.cancelButton]}
                        onPress={() => setShowDeliveryPicker(false)}
                      >
                        <Text style={[styles.pickerButtonText, styles.cancelButtonText]}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.pickerButton}
                        onPress={() => setShowDeliveryPicker(false)}
                      >
                        <Text style={styles.pickerButtonText}>Confirmar</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Seção: Localização e Entrega */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location" size={24} color="#704F38" />
              <Text style={styles.sectionTitle}>Localização e Entrega</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.title}>Província</Text>
              <TouchableOpacity
                onPress={() => setShowProvincePicker(true)}
                style={[styles.dateInput, errors.selectedProvince && styles.errorInput]}
              >
                <Ionicons name="map" size={20} color="#704F38" />
                <Text style={[styles.dateText, { color: selectedProvince ? "#000" : "#878787" }]}>
                  {selectedProvince || "Selecione a província"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#704F38" />
              </TouchableOpacity>
              {errors.selectedProvince && <Text style={styles.errorText}>Província deve ser selecionada</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.title}>Local de Retirada</Text>
              <View style={[styles.inputContainer, errors.pickupLocation && styles.errorInput]}>
                <Ionicons name="home" size={20} color="#704F38" style={styles.inputIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="Ex: Rua da Maianga, Luanda"
                  placeholderTextColor="#878787"
                  value={pickupLocation}
                  onChangeText={(text) => {
                    setPickupLocation(text);
                    clearError('pickupLocation');
                  }}
                />
              </View>
              {errors.pickupLocation && <Text style={styles.errorText}>Local de retirada é obrigatório</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.title}>Taxa de Entrega (Kz)</Text>
              <View style={[styles.inputContainer, errors.deliveryFee && styles.errorInput]}>
                <Ionicons name="cash" size={20} color="#704F38" style={styles.inputIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="Ex: 500"
                  placeholderTextColor="#878787"
                  keyboardType="numeric"
                  value={deliveryFee}
                  onChangeText={(text) => {
                    setDeliveryFee(text);
                    clearError('deliveryFee');
                  }}
                />
              </View>
              {errors.deliveryFee && <Text style={styles.errorText}>Taxa de entrega é obrigatória</Text>}
            </View>
          </View>

          {/* Seção: Detalhes Financeiros */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="wallet" size={24} color="#704F38" />
              <Text style={styles.sectionTitle}>Detalhes Financeiros</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.title}>Câmbio em Kz(1$ = ? Kz)</Text>
              <View style={[styles.inputContainer, errors.exchangeRate && styles.errorInput]}>
                <Ionicons name="trending-up" size={20} color="#704F38" style={styles.inputIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="1000 Kz"
                  placeholderTextColor="#878787"
                  keyboardType="numeric"
                  value={exchangeRate}
                  onChangeText={(text) => {
                    setExchangeRate(text);
                    clearError('exchangeRate');
                  }}
                />
              </View>
              {errors.exchangeRate && <Text style={styles.errorText}>Câmbio é obrigatório</Text>}
            </View>
          </View>

          {/* Seção: Imagem */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="camera" size={24} color="#704F38" />
              <Text style={styles.sectionTitle}>Imagem do Carrinho</Text>
            </View>

            <TouchableOpacity 
              style={[styles.modernImageButton, errors.images && styles.errorImageButton]} 
              onPress={() => {
                pickImage();
                clearError('images');
              }}
            >
              <Ionicons name="cloud-upload" size={24} color="#FFF" />
              <Text style={styles.modernImageButtonText}>Escolher Imagem</Text>
            </TouchableOpacity>
            {errors.images && <Text style={styles.errorText}>Selecione ao menos uma imagem</Text>}

            <View style={styles.imagePreviewSection}>
              {images.map((uri, index) => (
                <View key={index} style={styles.modernImagePreview}>
                  <Image
                    source={{ uri: typeof uri === 'string' ? uri : uri.uri }}
                    style={styles.modernSelectedImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    onPress={() => removeImage(index)}
                    style={styles.modernRemoveButton}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.modernButton} onPress={handleSubmit}>
            <View style={styles.buttonContent}>
              <Ionicons name="rocket" size={24} color="#FFF" />
              <Text style={styles.modernButtonText}>Abrir Carrinho</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* Modal para selecionar província */}
        <Modal
          visible={showProvincePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowProvincePicker(false)}
        >
          <View style={styles.modernModalOverlay}>
            <View style={styles.modernModalContent}>
              <View style={styles.modernModalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Ionicons name="map" size={24} color="#704F38" />
                  <Text style={styles.modernModalTitle}>Selecione a Província</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowProvincePicker(false)}
                  style={styles.modernCloseButton}
                >
                  <Ionicons name="close" size={24} color="#704F38" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modernProvinceList} showsVerticalScrollIndicator={false}>
                {provinces.map((province, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.modernProvinceItem,
                      selectedProvince === province && styles.modernSelectedProvinceItem
                    ]}
                    onPress={() => {
                      setSelectedProvince(province);
                      clearError('selectedProvince');
                      setShowProvincePicker(false);
                    }}
                  >
                    <View style={styles.provinceItemContent}>
                      <Ionicons 
                        name="location" 
                        size={20} 
                        color={selectedProvince === province ? "#FFF" : "#704F38"} 
                      />
                      <Text
                        style={[
                          styles.modernProvinceText,
                          selectedProvince === province && styles.modernSelectedProvinceText
                        ]}
                      >
                        {province}
                      </Text>
                      {selectedProvince === province && (
                        <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Toast Notification */}
        {toast.visible && (
          <View style={[styles.toastContainer, styles[`toast${toast.type}`]]}>
            <View style={styles.toastContent}>
              <Ionicons 
                name={toast.type === 'success' ? 'checkmark-circle' : 'information-circle'} 
                size={24} 
                color="#FFF" 
              />
              <Text style={styles.toastText}>{toast.message}</Text>
            </View>
          </View>
        )}

        {/* Modal de Alert Customizado */}
        <Modal
          visible={customAlert.visible}
          transparent={true}
          animationType="fade"
          onRequestClose={hideCustomAlert}
        >
          <View style={styles.alertOverlay}>
            <View style={styles.alertContainer}>
              <View style={[styles.alertIconContainer, styles[`alert${customAlert.type}`]]}>
                <Ionicons 
                  name={
                    customAlert.type === 'success' ? 'checkmark-circle' :
                    customAlert.type === 'error' ? 'close-circle' :
                    customAlert.type === 'warning' ? 'warning' :
                    'information-circle'
                  } 
                  size={40} 
                  color="#FFF" 
                />
              </View>
              
              <Text style={styles.alertTitle}>{customAlert.title}</Text>
              <Text style={styles.alertMessage}>{customAlert.message}</Text>
              
              <TouchableOpacity 
                style={[styles.alertButton, styles[`alertButton${customAlert.type}`]]}
                onPress={hideCustomAlert}
              >
                <Text style={styles.alertButtonText}>
                  {customAlert.type === 'success' ? 'Ótimo!' : 'Entendi'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    paddingTop: STATUSBAR_HEIGHT + 16,
  },
  sectionCard: {
    backgroundColor: "#FFF",
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 15,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "Poppins_400Regular",
    color: "#704F38",
    marginLeft: 10,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  inputWithIcon: {
    flex: 1,
    height: 50,
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: "#333",
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 15,
    height: 50,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: "#333",
    marginLeft: 12,
  },
  dateInputDisabled: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 15,
    height: 50,
    opacity: 0.7,
  },
  dateTextDisabled: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: "#666",
    marginLeft: 12,
    fontStyle: "italic",
  },
  helperText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#878787",
    marginTop: 5,
    fontStyle: "italic",
  },
  descriptionInput: {
    height: 100,
    textAlignVertical: "top",
    paddingTop: 15,
  },
  modernButton: {
    backgroundColor: "#704F38",
    marginHorizontal: 20,
    height: 60,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 40,
    shadowColor: "#704F38",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  modernButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "Poppins_400Regular",
    marginLeft: 10,
  },
  title: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: "#333",
    marginBottom: 8,
    fontWeight: "500",
  },
  modernImageButton: {
    backgroundColor: "#704F38",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 10,
    shadowColor: "#704F38",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  modernImageButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    fontWeight: "600",
    marginLeft: 8,
  },
  imagePreviewSection: {
    marginTop: 15,
  },
  modernImagePreview: {
    position: "relative",
    marginBottom: 15,
  },
  modernSelectedImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  modernRemoveButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 15,
    padding: 2,
  },
  modernModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modernModalContent: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    width: "90%",
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 15,
  },
  modernModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  modernModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "Poppins_400Regular",
    color: "#704F38",
    marginLeft: 10,
  },
  modernCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
  },
  modernProvinceList: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  modernProvinceItem: {
    paddingVertical: 15,
    paddingHorizontal: 15,
    marginVertical: 2,
    borderRadius: 10,
    backgroundColor: "#F8F9FA",
  },
  modernSelectedProvinceItem: {
    backgroundColor: "#704F38",
  },
  provinceItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  modernProvinceText: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: "#333",
    flex: 1,
    marginLeft: 12,
  },
  modernSelectedProvinceText: {
    color: "#FFF",
    fontWeight: "600",
  },
  iosPickerContainer: {
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    overflow: "hidden",
  },
  iosPickerButtons: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: "#F0F0F0",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  pickerButton: {
    backgroundColor: "#704F38",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  pickerButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Poppins_400Regular",
  },
  cancelButton: {
    backgroundColor: "#9E9E9E",
  },
  cancelButtonText: {
    color: "#FFF",
  },
  
  // Estilos para campos com erro
  errorInput: {
    borderColor: "#FF4444",
    borderWidth: 2,
    backgroundColor: "#FFF5F5",
  },
  errorImageButton: {
    backgroundColor: "#FF4444",
  },
  errorText: {
    color: "#FF4444",
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    marginTop: 5,
    marginLeft: 5,
  },

  // Estilos para Toast
  toastContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    zIndex: 9999,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  toastsuccess: {
    backgroundColor: "#4CAF50",
  },
  toastinfo: {
    backgroundColor: "#2196F3",
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toastText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    marginLeft: 12,
    flex: 1,
  },

  // Estilos para Alert Customizado
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  alertContainer: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 15,
    minWidth: 300,
  },
  alertIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  alertsuccess: {
    backgroundColor: "#4CAF50",
  },
  alerterror: {
    backgroundColor: "#FF4444",
  },
  alertwarning: {
    backgroundColor: "#FF9800",
  },
  alertinfo: {
    backgroundColor: "#2196F3",
  },
  alertTitle: {
    fontSize: 22,
    fontWeight: "bold",
    fontFamily: "Poppins_600SemiBold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  alertMessage: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 25,
  },
  alertButton: {
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    minWidth: 120,
  },
  alertButtonsuccess: {
    backgroundColor: "#4CAF50",
  },
  alertButtonerror: {
    backgroundColor: "#FF4444",
  },
  alertButtonwarning: {
    backgroundColor: "#FF9800",
  },
  alertButtoninfo: {
    backgroundColor: "#2196F3",
  },
  alertButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Poppins_600SemiBold",
    textAlign: "center",
  },
});

export default CreateCartScreen;
