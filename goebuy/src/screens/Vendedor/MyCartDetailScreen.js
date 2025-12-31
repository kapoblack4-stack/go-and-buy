import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { ChatCircleDots } from "phosphor-react-native";
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert
} from "react-native";
import Header from '../../components/Header';
import { BASE_URL } from "../../../config";
import { Star } from "phosphor-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const MyCartDetailScreen = ({ route }) => {
  const navigation = useNavigation();
  const [showCancelModal, setShowCancelModal] = useState(false);
  
  // Função para cancelar carrinho
  const cancelarCarrinho = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      console.log('Tentando cancelar carrinho:', cart._id);
      
      const response = await fetch(`${BASE_URL}/api/carts/${cart._id}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Carrinho cancelado com sucesso:', result);
        
        Alert.alert(
          "Sucesso",
          "Carrinho cancelado com sucesso!",
          [
            {
              text: "OK",
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        const errorData = await response.json();
        console.error('Erro na resposta:', errorData);
        Alert.alert("Erro", errorData.error || `Não foi possível cancelar o carrinho. Status: ${response.status}`);
      }
    } catch (error) {
      console.error('Erro ao cancelar carrinho:', error);
      Alert.alert("Erro", `Erro de conexão: ${error.message}`);
    }
    setShowCancelModal(false);
  };
  
  // Verificar se os parâmetros foram passados corretamente
  if (!route?.params?.cart) {
    console.error('[MyCartDetailScreen] Parâmetro cart não encontrado:', route?.params);
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header page="Erro" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, textAlign: 'center', color: '#704F38' }}>
            Erro: Dados do carrinho não encontrados
          </Text>
          <TouchableOpacity 
            style={{ marginTop: 20, backgroundColor: '#704F38', padding: 12, borderRadius: 8 }}
            onPress={() => navigation.goBack()}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  const { cart } = route.params;

  // Debug: Log dos dados do carrinho recebidos
  console.log('[MyCartDetailScreen] Dados do carrinho recebidos:', {
    cartId: cart._id,
    cartName: cart.cartName,
    buyerCartProgressLength: cart.buyerCartProgress?.length || 0,
    buyerCartProgress: cart.buyerCartProgress?.map((progress, idx) => ({
      index: idx,
      buyerId: progress.buyer?._id || progress.buyer,
      buyerType: typeof progress.buyer,
      buyerName: progress.buyer?.name || 'N/A',
      buyerEmail: progress.buyer?.email || 'N/A',
      status: progress.status
    })) || []
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header page={cart.cartName || 'Detalhes do Carrinho'} />
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Imagem principal */}
        {cart.imageUrls && cart.imageUrls.length > 0 && (
          <Image
            source={{ uri: `${BASE_URL}/${cart.imageUrls[0].replace(/\\/g, "/")}` }}
            style={styles.cartImage}
            resizeMode="cover"
          />
        )}
        {/* Informações principais */}
        <View style={styles.infoBox}>
          <Text style={styles.title}>{cart.cartName}</Text>
          <Text style={styles.label}>Plataforma: <Text style={styles.value}>{cart.platform}</Text></Text>
          <Text style={styles.label}>Status: <Text style={styles.value}>{cart.isCancelled ? 'Cancelado' : cart.isClosed ? 'Fechado' : cart.isFinished ? 'Finalizado' : 'Ativo'}</Text></Text>
          <Text style={styles.label}>Abertura: <Text style={styles.value}>{new Date(cart.openDate).toLocaleDateString()}</Text></Text>
          <Text style={styles.label}>Fecho: <Text style={styles.value}>{new Date(cart.closeDate).toLocaleDateString()}</Text></Text>
          <Text style={styles.label}>Entrega: <Text style={styles.value}>{new Date(cart.deliveryDate).toLocaleDateString()}</Text></Text>
          <Text style={styles.label}>Taxa: <Text style={styles.value}>{cart.exchangeRate} Kz</Text></Text>
          <Text style={styles.label}>Descrição: <Text style={styles.value}>{cart.description || '-'}</Text></Text>
        </View>
        {/* Lista de compradores/pedidos */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Pedidos/Compradores</Text>
          {cart.buyerCartProgress && cart.buyerCartProgress.length > 0 ? (
            cart.buyerCartProgress.map((progress, idx) => {
              console.log(`[MyCartDetailScreen] Processando comprador ${idx}:`, {
                buyer: progress.buyer,
                buyerType: typeof progress.buyer,
                buyerIsObject: progress.buyer && typeof progress.buyer === 'object',
                buyerName: progress.buyer?.name,
                buyerEmail: progress.buyer?.email,
                rating: progress.rating,
                status: progress.status,
                comprovativoRejeitado: progress.comprovativoRejeitado,
                cartHasBuyers: cart?.buyers ? 'YES' : 'NO',
                cartBuyersLength: cart?.buyers?.length || 0
              });
              let buyerName = '-';
              let buyerPhoto = null;
              let buyerEmail = '-';
              let buyerPhone = '-';
              if (progress.buyer && typeof progress.buyer === 'object') {
                buyerName = progress.buyer.name && progress.buyer.name !== '' ? progress.buyer.name : '-';
                buyerEmail = progress.buyer.email || '-';
                buyerPhone = progress.buyer.phone || '-';
                if (progress.buyer.profileImage) {
                  buyerPhoto = `${BASE_URL}/${progress.buyer.profileImage.replace(/\\/g, '/')}`;
                }
              } else if (progress.buyer && typeof progress.buyer === 'string' && cart && Array.isArray(cart.buyers)) {
                const foundBuyer = cart.buyers.find(b => b._id === progress.buyer || b.id === progress.buyer);
                if (foundBuyer) {
                  buyerName = foundBuyer.name || '-';
                  buyerEmail = foundBuyer.email || '-';
                  buyerPhone = foundBuyer.phone || '-';
                  if (foundBuyer.profileImage) {
                    buyerPhoto = `${BASE_URL}/${foundBuyer.profileImage.replace(/\\/g, '/')}`;
                  }
                } else {
                  buyerName = '-';
                }
              } else {
                buyerName = '-';
              }
              return (
                <View key={idx} style={styles.buyerBox}>
                  <View style={styles.buyerRow}>
                    {buyerPhoto ? (
                      <Image source={{ uri: buyerPhoto }} style={styles.buyerPhoto} />
                    ) : (
                      <View style={styles.buyerPhotoPlaceholder} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.buyerLabel}>Nome: <Text style={styles.buyerValue}>{buyerName}</Text></Text>
                      <Text style={styles.buyerLabel}>Email: <Text style={styles.buyerValue}>{buyerEmail}</Text></Text>
                      <Text style={styles.buyerLabel}>Telefone: <Text style={styles.buyerValue}>{buyerPhone}</Text></Text>
                      <Text style={styles.buyerLabel}>Status: <Text style={styles.buyerValue}>{progress.status}</Text></Text>
                      <Text style={styles.buyerLabel}>Comprovativo Rejeitado: <Text style={styles.buyerValue}>{progress.comprovativoRejeitado ? 'Sim' : 'Não'}</Text></Text>
                      {/* Estrelas de avaliação */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        {[1,2,3,4,5].map((star) => (
                          <Star
                            key={star}
                            size={18}
                            color={star <= (progress.rating || 0) ? '#FFD700' : '#DDD'}
                            weight={star <= (progress.rating || 0) ? 'fill' : 'regular'}
                            style={{ marginRight: 2 }}
                          />
                        ))}
                      </View>
                    </View>
                    {/* Botão de chat */}
                    <View style={{ justifyContent: 'center', marginLeft: 8 }}>
                      <ChatCircleDots size={32} color="#704F38" weight="fill"
                        onPress={() => {
                          const sellerId = cart.seller && cart.seller._id ? cart.seller._id : cart.seller;
                          const buyerId = progress.buyer && progress.buyer._id ? progress.buyer._id : progress.buyer;
                          if (sellerId && buyerId) {
                            navigation.navigate('VendedorChatScreen', {
                              sellerId,
                              buyerId
                            });
                          } else {
                            alert('IDs de vendedor ou comprador não encontrados.');
                          }
                        }}
                      />
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.noOrdersContainer}>
              <Text style={styles.noOrdersText}>Nenhum pedido encontrado.</Text>
              
              {/* Só mostrar botões se o carrinho não estiver cancelado nem fechado */}
              {!cart.isCancelled && !cart.isClosed && !cart.isFinished ? (
                <>
                  <Text style={styles.noOrdersSubtext}>
                    Você pode editar as informações do carrinho ou cancelá-lo se necessário.
                  </Text>
                  
                  <View style={styles.buttonsContainer}>
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => {
                        navigation.navigate('CreateCartScreen', {
                          namePage: cart.platform,
                          editMode: true,
                          cartData: cart
                        });
                      }}
                    >
                      <Text style={styles.editButtonText}>✏️ Editar Carrinho</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.cancelButton}
                      onPress={() => setShowCancelModal(true)}
                    >
                      <Text style={styles.cancelButtonText}>🗑️ Cancelar Carrinho</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <Text style={styles.noOrdersSubtext}>
                  Este carrinho está {cart.isCancelled ? 'cancelado' : cart.isClosed ? 'fechado' : 'finalizado'}.
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Botão para fechar carrinho, se todos os compradores estiverem finalizados e carrinho ainda não estiver fechado */}
        {cart.buyerCartProgress && cart.buyerCartProgress.length > 0 && !cart.isClosed && !cart.isCancelled && (
          (() => {
            const todosFinalizados = cart.buyerCartProgress.every(progress =>
              ['Entregue', 'Fechado', 'Cancelado'].includes(progress.status)
            );
           
          
          })()
        )}
      </ScrollView>
      
      {/* Modal de confirmação para cancelar carrinho */}
      <Modal
        transparent={true}
        animationType="fade"
        visible={showCancelModal}
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Cancelar Carrinho</Text>
            <Text style={styles.modalText}>
              Tem certeza que deseja cancelar este carrinho? Esta ação não pode ser desfeita.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowCancelModal(false)}
              >
                <Text style={styles.modalCancelText}>Não</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalConfirmButton}
                onPress={cancelarCarrinho}
              >
                <Text style={styles.modalConfirmText}>Sim, Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  contentContainer: {
    padding: 20,
    alignItems: 'center',
  },
  cartImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoBox: {
    width: '100%',
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: 'Poppins_600SemiBold',
  },
  label: {
    fontSize: 15,
    color: '#704F38',
    marginBottom: 2,
    fontFamily: 'Poppins_400Regular',
  },
  value: {
    color: '#222',
    fontFamily: 'Poppins_400Regular',
  },
  sectionBox: {
    width: '100%',
    backgroundColor: '#F3F3F3',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#704F38',
    fontFamily: 'Poppins_600SemiBold',
  },
  buyerBox: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  buyerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  buyerPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#EEE',
  },
  buyerPhotoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#DDD',
  },
  buyerLabel: {
    fontSize: 14,
    color: '#704F38',
    fontFamily: 'Poppins_400Regular',
  },
  buyerValue: {
    color: '#222',
    fontFamily: 'Poppins_400Regular',
  },
  noOrdersContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noOrdersText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Poppins_400Regular',
    marginBottom: 8,
  },
  noOrdersSubtext: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  editButton: {
    flex: 1,
    backgroundColor: '#704F38',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Poppins_600SemiBold',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FF4444',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginLeft: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Poppins_600SemiBold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxWidth: 300,
    width: '100%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#704F38',
    fontFamily: 'Poppins_600SemiBold',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#666',
    fontFamily: 'Poppins_400Regular',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#CCCCCC',
    borderRadius: 8,
    paddingVertical: 12,
    marginRight: 8,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Poppins_600SemiBold',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#FF4444',
    borderRadius: 8,
    paddingVertical: 12,
    marginLeft: 8,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Poppins_600SemiBold',
  },
});

export default MyCartDetailScreen;
