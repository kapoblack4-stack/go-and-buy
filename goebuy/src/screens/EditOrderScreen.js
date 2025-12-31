import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  FlatList
} from 'react-native';
import { ArrowLeft, Camera, X, Check, Plus, Trash } from 'phosphor-react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config';

const EditOrderScreen = ({ route }) => {
  const { cartId, cartData } = route.params || {};
  const navigation = useNavigation();

  // Verificar se os dados foram passados corretamente
  if (!cartData) {
    Alert.alert('Erro', 'Dados do pedido não encontrados.');
    navigation.goBack();
    return null;
  }

  // Estados para lista de pedidos existentes
  const [existingOrders, setExistingOrders] = useState([]);
  const [cartInfo, setCartInfo] = useState(cartData);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Estados para novo pedido
  const [showAddForm, setShowAddForm] = useState(false);
  const [productLink, setProductLink] = useState('');
  const [priceUSD, setPriceUSD] = useState('');
  const [description, setDescription] = useState('');
  const [deliveryRequested, setDeliveryRequested] = useState(false);
  const [images, setImages] = useState([]);
  const [addingOrder, setAddingOrder] = useState(false);

  // Solicitar permissões para câmera
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissão necessária', 'Precisamos de acesso às suas fotos para adicionar imagens.');
        }
      }
    })();
    
    // Carregar pedidos existentes
    fetchExistingOrders();
  }, []);

  // Buscar pedidos existentes do usuário neste carrinho
  const fetchExistingOrders = async () => {
    try {
      setRefreshing(true);
      const userId = await AsyncStorage.getItem('userId');
      const token = await AsyncStorage.getItem('token');
      
      const response = await fetch(`${BASE_URL}/api/orders/cart/${cartId}/buyer/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const orders = await response.json();
        setExistingOrders(orders);
      } else {
        console.error('Erro ao buscar pedidos existentes');
      }
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const pickImage = async () => {
    // Verificar limite de 4 imagens
    if (images.length >= 4) {
      Alert.alert('Limite atingido', 'Você pode adicionar no máximo 4 fotos por pedido.');
      return;
    }

    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImages([...images, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem');
    }
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  };

  // Função para excluir um pedido específico
  const deleteOrder = async (orderId) => {
    Alert.alert(
      'Excluir Pedido',
      'Tem certeza que deseja excluir este pedido?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const token = await AsyncStorage.getItem('token');
              
              const response = await fetch(`${BASE_URL}/api/orders/${orderId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });
              
              if (response.ok) {
                Alert.alert('Sucesso', 'Pedido excluído com sucesso!');
                fetchExistingOrders(); // Recarregar lista
              } else {
                Alert.alert('Erro', 'Não foi possível excluir o pedido');
              }
            } catch (error) {
              console.error('Erro ao excluir pedido:', error);
              Alert.alert('Erro', 'Erro ao excluir pedido');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Função para resetar formulário
  const resetForm = () => {
    setProductLink('');
    setPriceUSD('');
    setDescription('');
    setDeliveryRequested(false);
    setImages([]);
    setShowAddForm(false);
  };

  const validateForm = () => {
    if (!productLink.trim()) {
      Alert.alert('Erro', 'Link do produto é obrigatório');
      return false;
    }
    if (!priceUSD.trim() || isNaN(parseFloat(priceUSD))) {
      Alert.alert('Erro', 'Preço deve ser um número válido');
      return false;
    }
    if (images.length === 0) {
      Alert.alert('Erro', 'Adicione pelo menos uma imagem');
      return false;
    }
    return true;
  };

  // Função para adicionar novo pedido ao carrinho
  const addNewOrder = async () => {
    if (!validateForm()) return;

    setAddingOrder(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');

      const formData = new FormData();
      formData.append('cart', cartId);
      formData.append('productLink', productLink);
      formData.append('priceUSD', parseFloat(priceUSD));
      formData.append('description', description);
      formData.append('deliveryRequested', deliveryRequested);
      if (deliveryRequested && cartInfo.deliveryFee) {
        formData.append('deliveryFee', parseFloat(cartInfo.deliveryFee));
      }

      // Adicionar imagens
      images.forEach((imageUri, index) => {
        if (imageUri.startsWith('file://') || imageUri.startsWith('content://')) {
          formData.append('images', {
            uri: imageUri,
            type: 'image/jpeg',
            name: `image_${index}.jpg`,
          });
        }
      });

      const response = await fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert('Sucesso', 'Novo pedido adicionado com sucesso!');
        resetForm();
        fetchExistingOrders(); // Recarregar lista
      } else {
        throw new Error(result.message || 'Erro ao adicionar pedido');
      }
    } catch (error) {
      console.error('Erro ao adicionar pedido:', error);
      Alert.alert('Erro', error.message || 'Erro ao adicionar pedido');
    } finally {
      setAddingOrder(false);
    }
  };

  // Componente para renderizar cada pedido existente
  const renderOrderItem = ({ item, index }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderTitle}>Pedido {index + 1}</Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteOrder(item._id)}
        >
          <X size={20} color="#FF4444" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.orderLabel}>Descrição:</Text>
          <Text style={styles.orderValue}>{item.description}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.orderLabel}>Preço (USD):</Text>
          <Text style={styles.orderValue}>${item.priceUSD}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.orderLabel}>Link do Produto:</Text>
          <Text style={styles.orderLink} numberOfLines={1}>{item.productLink}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.orderLabel}>Status:</Text>
          <Text style={styles.orderStatus}>{item.status || 'Pedido Feito'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.orderLabel}>Entrega Solicitada:</Text>
          <Text style={styles.orderValue}>{item.deliveryRequested ? 'Sim' : 'Não'}</Text>
        </View>
        
        {item.deliveryRequested && (
          <View style={styles.detailRow}>
            <Text style={styles.orderLabel}>Taxa de Entrega:</Text>
            <Text style={styles.orderValue}>${item.deliveryFee || '0'}</Text>
          </View>
        )}
      </View>
      
      {item.images && item.images.length > 0 && (
        <View style={styles.orderImages}>
          <Text style={styles.orderLabel}>Fotos:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScrollView}>
            {item.images.map((image, imgIndex) => (
              <Image
                key={imgIndex}
                source={{ 
                  uri: image.startsWith('http') 
                    ? image 
                    : `${BASE_URL}/${image.replace(/\\/g, '/')}` 
                }}
                style={styles.orderImage}
                resizeMode="cover"
                onError={(error) => {
                  console.log('Erro ao carregar imagem:', error);
                  console.log('URL da imagem:', image);
                }}
              />
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color="#704F38" weight="bold" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gerenciar Pedidos</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Informações do Carrinho */}
        <View style={styles.cartInfoSection}>
          <View style={styles.cartInfoHeader}>
            <Text style={styles.cartInfoTitle}>📦 Informações de Entrega</Text>
          </View>
          <View style={styles.cartInfoContent}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>País:</Text>
              <Text style={styles.infoValue}>Angola 🇦🇴</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Província:</Text>
              <Text style={styles.infoValue}>{cartInfo.province || 'Não especificada'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Local de Retirada:</Text>
              <Text style={styles.infoValue}>{cartInfo.pickupLocation || 'Não especificado'}</Text>
            </View>
            
          </View>
        </View>

        {/* Lista de Pedidos Existentes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Detalhes dos Pedidos</Text>
            <View style={styles.ordersBadge}>
              <Text style={styles.ordersCount}>📦 Total de pedidos: {existingOrders.length}</Text>
              <TouchableOpacity style={styles.updateButton} onPress={fetchExistingOrders}>
                <Text style={styles.updateButtonText}>🔄 Atualizar Agora</Text>
              </TouchableOpacity>
            </View>
          </View>

          {refreshing ? (
            <ActivityIndicator size="large" color="#704F38" style={styles.loading} />
          ) : existingOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Nenhum pedido encontrado</Text>
            </View>
          ) : (
            <FlatList
              data={existingOrders}
              renderItem={renderOrderItem}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* Botão para Adicionar Novo Pedido */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddForm(!showAddForm)}
          >
            <Plus size={24} color="#FFF" weight="bold" />
            <Text style={styles.addButtonText}>Adicionar item</Text>
          </TouchableOpacity>
        </View>

        {/* Formulário para Novo Pedido */}
        {showAddForm && (
          <View style={styles.addFormSection}>
            <Text style={styles.addFormTitle}>Faça o seu pedido</Text>
            
            {/* Link do Produto */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Link do Produto *</Text>
              <TextInput
                style={styles.input}
                value={productLink}
                onChangeText={setProductLink}
                placeholder="Cole o link do produto aqui"
                multiline
                autoCapitalize="none"
              />
            </View>

            {/* Preço */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Preço (USD) *</Text>
              <TextInput
                style={styles.input}
                value={priceUSD}
                onChangeText={setPriceUSD}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>

            {/* Descrição */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Descrição</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Descreva o produto (cor, tamanho, etc.)"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Entrega */}
            <View style={styles.formGroup}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setDeliveryRequested(!deliveryRequested)}
              >
                <View style={[styles.checkbox, deliveryRequested && styles.checkboxChecked]}>
                  {deliveryRequested && <Check size={16} color="#FFF" weight="bold" />}
                </View>
                <Text style={styles.checkboxLabel}>Solicitar entrega</Text>
              </TouchableOpacity>

              {deliveryRequested && cartInfo.deliveryFee && (
                <View style={styles.deliveryInfoContainer}>
                  <Text style={styles.deliveryInfoText}>
                    📦 Taxa de entrega: <Text style={styles.deliveryFeeText}>${cartInfo.deliveryFee}</Text>
                  </Text>
                  <Text style={styles.deliveryNote}>
                    * Valor definido pelo vendedor
                  </Text>
                </View>
              )}
            </View>

            {/* Imagens */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Fotos do Produto * ({images.length}/4)</Text>
              <TouchableOpacity 
                style={[styles.imageButton, images.length >= 4 && styles.disabledButton]} 
                onPress={pickImage}
                disabled={images.length >= 4}
              >
                <Camera size={24} color={images.length >= 4 ? "#999" : "#704F38"} />
                <Text style={[styles.imageButtonText, images.length >= 4 && styles.disabledText]}>
                  Adicionar Foto
                </Text>
              </TouchableOpacity>

              {images.length > 0 && (
                <ScrollView horizontal style={styles.imagePreview} showsHorizontalScrollIndicator={false}>
                  {images.map((imageUri, index) => (
                    <View key={index} style={styles.imageContainer}>
                      <Image source={{ uri: imageUri }} style={styles.previewImage} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeImage(index)}
                      >
                        <X size={16} color="#FFF" weight="bold" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Botões de Ação */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={resetForm}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, addingOrder && styles.submitButtonDisabled]}
                onPress={addNewOrder}
                disabled={addingOrder}
              >
                {addingOrder ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Fazer Pedido</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Totais */}
        {existingOrders.length > 0 && (
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal (Itens)</Text>
              <Text style={styles.totalValue}>
                {existingOrders.reduce((sum, order) => sum + (order.priceUSD || 0), 0).toFixed(2)} AOA
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabelFinal}>Total Estimado</Text>
              <Text style={styles.totalValueFinal}>
                {existingOrders.reduce((sum, order) => sum + (order.priceUSD || 0), 0).toFixed(2)} AOA
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#704F38" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
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
    color: '#1A202C',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  
  // Estilos para informações do carrinho
  cartInfoSection: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cartInfoHeader: {
    backgroundColor: '#F7FAFC',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  cartInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
  },
  cartInfoContent: {
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 15,
    color: '#4A5568',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3748',
  },
  
  // Estilos para seções
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 10,
  },
  ordersBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ordersCount: {
    fontSize: 14,
    color: '#4A5568',
  },
  updateButton: {
    backgroundColor: '#EDF2F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  updateButtonText: {
    fontSize: 12,
    color: '#4A5568',
  },
  
  // Estilos para cards de pedidos
  orderCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  orderDetails: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  orderLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A5568',
    marginRight: 8,
    minWidth: 100,
  },
  orderValue: {
    fontSize: 15,
    color: '#2D3748',
    fontWeight: '500',
    flex: 1,
  },
  orderLink: {
    fontSize: 15,
    color: '#3182CE',
    textDecorationLine: 'underline',
    fontWeight: '500',
    flex: 1,
  },
  orderStatus: {
    fontSize: 15,
    fontWeight: '600',
    color: '#38A169',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  orderImages: {
    marginTop: 15,
  },
  imagesScrollView: {
    marginTop: 8,
  },
  orderImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  
  // Estilos para botão adicionar
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#704F38',
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#704F38',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
  },
  
  // Estilos para formulário de adicionar
  addFormSection: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  addFormTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 24,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    color: '#2D3748',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  
  // Estilos para checkbox
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#704F38',
    borderColor: '#704F38',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#2D3748',
  },
  deliveryInfoContainer: {
    marginTop: 15,
    backgroundColor: '#F7FAFC',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deliveryInfoText: {
    fontSize: 15,
    color: '#2D3748',
    marginBottom: 5,
  },
  deliveryFeeText: {
    fontWeight: '700',
    color: '#704F38',
  },
  deliveryNote: {
    fontSize: 12,
    color: '#4A5568',
    fontStyle: 'italic',
  },
  
  // Estilos para imagens
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  imageButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#704F38',
    fontWeight: '600',
  },
  imagePreview: {
    flexDirection: 'row',
    marginTop: 12,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  previewImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF4444',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // Estilos para botões de ação
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelButtonText: {
    color: '#4A5568',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#704F38',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#A0AEC0',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Estilos para totais
  totalsSection: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#4A5568',
  },
  totalValue: {
    fontSize: 14,
    color: '#2D3748',
  },
  totalLabelFinal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
  },
  totalValueFinal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#704F38',
  },
  
  // Estilos para estados
  loading: {
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#4A5568',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Estilos para botão desabilitado
  disabledButton: {
    opacity: 0.5,
    backgroundColor: '#F7FAFC',
  },
  disabledText: {
    color: '#999',
  },
});

export default EditOrderScreen;