import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Modal,
  SafeAreaView,
  Platform,
  StatusBar,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../config";
import Header from "../components/Header";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from 'expo-image-picker';
import { Camera, User } from "phosphor-react-native";

const UserDetailsScreen = () => {
  useEffect(() => {
    if (user) {
      console.log('[UserDetailsScreen] user:', user);
      if (user.contasBancarias) {
        console.log('[UserDetailsScreen] contasBancarias:', user.contasBancarias);
      }
    }
  }, [user]);
  const [user, setUser] = useState(null);
  const [iban, setIban] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [novoIban, setNovoIban] = useState("");
  const [novoBanco, setNovoBanco] = useState("");
  const [editandoConta, setEditandoConta] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const navigation = useNavigation();

  // Função para selecionar imagem
  const selecionarImagem = () => {
    Alert.alert(
      "Selecionar Foto",
      "Escolha uma opção:",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Câmera", onPress: () => abrirCamera() },
        { text: "Galeria", onPress: () => abrirGaleria() },
      ]
    );
  };

  const abrirCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert("Erro", "Permissão da câmera é necessária!");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImagem(result.assets[0]);
    }
  };

  const abrirGaleria = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert("Erro", "Permissão da galeria é necessária!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImagem(result.assets[0]);
    }
  };

  const uploadImagem = async (imageAsset) => {
    if (!verificarConectividade()) return;

    setUploadingImage(true);
    try {
      const userId = await AsyncStorage.getItem("userId");
      const token = await AsyncStorage.getItem("token");
      
      if (!userId || !token) {
        Alert.alert("Erro", "Sessão expirada. Faça login novamente.");
        setUploadingImage(false);
        return;
      }

      const formData = new FormData();
      formData.append('profileImage', {
        uri: imageAsset.uri,
        type: 'image/jpeg',
        name: `profile_${userId}.jpg`,
      });

      console.log("Fazendo upload da imagem...");

      const response = await fetch(`${BASE_URL}/api/auth/${userId}/profile-image`, {
        method: "POST",
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: token,
        },
        body: formData,
      });

      console.log("Resposta upload imagem - Status:", response.status);

      if (response.ok) {
        const updatedUser = await response.json();
        console.log("Usuário atualizado com nova imagem:", updatedUser);
        
        setUser(updatedUser);
        setProfileImage(updatedUser.profileImage);
        Alert.alert("Sucesso", "Foto de perfil atualizada!");
      } else {
        const errorText = await response.text();
        console.error("Erro no upload:", errorText);
        
        if (response.status === 401) {
          Alert.alert("Erro", "Sessão expirada. Faça login novamente.");
        } else if (response.status === 413) {
          Alert.alert("Erro", "Imagem muito grande. Escolha uma imagem menor.");
        } else {
          Alert.alert("Erro", "Não foi possível atualizar a foto de perfil");
        }
      }
    } catch (err) {
      console.error("Erro no upload da imagem:", err);
      Alert.alert("Erro", "Erro de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setUploadingImage(false);
    }
  };

  // Verificar conectividade
  const verificarConectividade = () => {
    if (!BASE_URL) {
      Alert.alert("Erro", "Configuração do servidor não encontrada.");
      return false;
    }
    return true;
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userId = await AsyncStorage.getItem("userId");
        const token = await AsyncStorage.getItem("token");
        
        if (!userId || !token) {
          Alert.alert("Erro", "Dados de login não encontrados. Faça login novamente.");
          navigation.goBack();
          return;
        }

        console.log("Buscando dados do usuário:", userId);

        const response = await fetch(`${BASE_URL}/api/auth/${userId}`, {
          headers: { Authorization: token },
        });

        console.log("Resposta fetch user - Status:", response.status);

        if (!response.ok) {
          if (response.status === 401) {
            Alert.alert("Erro", "Sessão expirada. Faça login novamente.");
            navigation.goBack();
            return;
          } else if (response.status === 404) {
            Alert.alert("Erro", "Usuário não encontrado.");
            navigation.goBack();
            return;
          }
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log("Dados do usuário recebidos:", data);
        
        setUser(data);
        setName(data.name || "");
        setEmail(data.email || "");
        setTelefone(data.telefone || data.phone || "");
        setIban(data.iban || "");
        setProfileImage(data.profileImage || null);
      } catch (err) {
        console.error("Erro ao buscar usuário:", err);
        Alert.alert("Erro", "Erro ao carregar dados do usuário. Verifique sua conexão.");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleSave = async () => {
    // Verificar conectividade
    if (!verificarConectividade()) return;

    // Validação dos campos obrigatórios
    if (!name.trim()) {
      Alert.alert("Erro", "Nome é obrigatório");
      return;
    }

    if (!telefone.trim()) {
      Alert.alert("Erro", "Telefone é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const userId = await AsyncStorage.getItem("userId");
      const token = await AsyncStorage.getItem("token");
      
      if (!userId || !token) {
        Alert.alert("Erro", "Sessão expirada. Faça login novamente.");
        setSaving(false);
        return;
      }

      console.log("Enviando dados para o backend:", { name, email, telefone });

      const response = await fetch(`${BASE_URL}/api/auth/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({ 
          name: name.trim(), 
          email, 
          telefone: telefone.trim() 
        }),
      });

      console.log("Resposta do backend - Status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erro do backend:", errorText);
        
        if (response.status === 401) {
          Alert.alert("Erro", "Sessão expirada. Faça login novamente.");
        } else if (response.status === 400) {
          Alert.alert("Erro", "Dados inválidos. Verifique as informações.");
        } else {
          Alert.alert("Erro", `Erro ao atualizar: ${errorText}`);
        }
        setSaving(false);
        return;
      }

      const updated = await response.json();
      console.log("Dados atualizados:", updated);
      
      setUser(updated);
      // Atualizar os campos com os dados retornados
      setName(updated.name || "");
      setTelefone(updated.telefone || updated.phone || "");
      
      Alert.alert("Sucesso", "Informações atualizadas com sucesso!");
    } catch (err) {
      console.error("Erro na requisição:", err);
      Alert.alert("Erro", "Erro de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const adicionarContaBancaria = async () => {
    // Verificar conectividade
    if (!verificarConectividade()) return;

    if (!novoBanco.trim() || !novoIban.trim()) {
      Alert.alert("Erro", "Por favor, preencha banco e IBAN");
      return;
    }

    // Validação básica do IBAN (números apenas, sem espaços)
    const ibanLimpo = novoIban.replace(/\s/g, '');
    if (ibanLimpo.length < 10) {
      Alert.alert("Erro", "IBAN deve ter pelo menos 10 dígitos");
      return;
    }
    
    try {
      const userId = await AsyncStorage.getItem("userId");
      const token = await AsyncStorage.getItem("token");
      
      if (!userId || !token) {
        Alert.alert("Erro", "Sessão expirada. Faça login novamente.");
        return;
      }

      console.log("Adicionando conta bancária:", { banco: novoBanco.trim(), iban: ibanLimpo });

      const response = await fetch(`${BASE_URL}/api/auth/${userId}/conta-bancaria`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({ 
          banco: novoBanco.trim(), 
          iban: ibanLimpo 
        }),
      });

      console.log("Resposta adicionar conta - Status:", response.status);

      if (response.ok) {
        const updatedUser = await response.json();
        console.log("Usuário atualizado com nova conta:", updatedUser);
        
        setUser(updatedUser);
        setNovoBanco("");
        setNovoIban("");
        setModalVisible(false);
        Alert.alert("Sucesso", "Conta bancária adicionada!");
      } else {
        const errorText = await response.text();
        console.error("Erro ao adicionar conta:", errorText);
        
        if (response.status === 401) {
          Alert.alert("Erro", "Sessão expirada. Faça login novamente.");
        } else if (response.status === 400) {
          Alert.alert("Erro", "Dados da conta bancária inválidos.");
        } else {
          Alert.alert("Erro", "Não foi possível adicionar a conta");
        }
      }
    } catch (err) {
      console.error("Erro na requisição de adicionar conta:", err);
      Alert.alert("Erro", "Erro de conexão. Verifique sua internet e tente novamente.");
    }
  };

  const removerContaBancaria = async (contaId) => {
    // Verificar se é a última conta bancária
    if (user.contasBancarias && user.contasBancarias.length <= 1) {
      Alert.alert("Aviso", "Deve manter pelo menos uma conta bancária cadastrada.");
      return;
    }

    Alert.alert(
      "Confirmar",
      "Deseja remover esta conta bancária?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            try {
              const userId = await AsyncStorage.getItem("userId");
              const token = await AsyncStorage.getItem("token");
              
              if (!userId || !token) {
                Alert.alert("Erro", "Sessão expirada. Faça login novamente.");
                return;
              }

              console.log("Removendo conta bancária:", contaId);
              
              const response = await fetch(`${BASE_URL}/api/auth/${userId}/conta-bancaria/${contaId}`, {
                method: "DELETE",
                headers: { Authorization: token },
              });

              console.log("Resposta remover conta - Status:", response.status);

              if (response.ok) {
                const updatedUser = await response.json();
                console.log("Usuário atualizado após remoção:", updatedUser);
                
                setUser(updatedUser);
                Alert.alert("Sucesso", "Conta bancária removida!");
              } else {
                const errorText = await response.text();
                console.error("Erro ao remover conta:", errorText);
                
                if (response.status === 401) {
                  Alert.alert("Erro", "Sessão expirada. Faça login novamente.");
                } else if (response.status === 404) {
                  Alert.alert("Erro", "Conta bancária não encontrada.");
                } else {
                  Alert.alert("Erro", "Não foi possível remover a conta");
                }
              }
            } catch (err) {
              console.error("Erro na requisição de remover conta:", err);
              Alert.alert("Erro", "Erro de conexão. Verifique sua internet e tente novamente.");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}><ActivityIndicator size="large" color="#704F38" /></View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="#FFF" 
        translucent={false}
      />
      <View style={styles.headerContainer}>
          <Header page="Detalhes do Usuário" />
        </View>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        
      <View style={styles.formContainer}>
        {/* Seção da Foto de Perfil */}
        <View style={styles.profileImageSection}>
          <Text style={styles.label}>Foto de Perfil</Text>
          <View style={styles.profileImageContainer}>
            <TouchableOpacity 
              style={styles.profileImageWrapper}
              onPress={selecionarImagem}
              disabled={uploadingImage}
            >
              {profileImage ? (
                <Image 
                  source={{ uri: `${BASE_URL}/${profileImage.replace(/\\/g, "/")}` }} 
                  style={styles.profileImage}
                  onError={() => {
                    console.log('Erro ao carregar imagem de perfil');
                    setProfileImage(null);
                  }}
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <User size={40} color="#999" weight="light" />
                </View>
              )}
              
              {/* Overlay com ícone de câmera */}
              <View style={styles.cameraOverlay}>
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Camera size={20} color="#FFF" weight="bold" />
                )}
              </View>
            </TouchableOpacity>
            
            <Text style={styles.profileImageHint}>
              Toque para {profileImage ? 'alterar' : 'adicionar'} sua foto
            </Text>
          </View>
        </View>

        <Text style={styles.label}>Nome *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Digite seu nome completo"
        />
        
        <Text style={styles.label}>Email</Text>
        <View style={styles.emailContainer}>
          <Text style={styles.emailText}>{email}</Text>
        </View>
        
        <Text style={styles.label}>Telefone</Text>
        <TextInput
          style={styles.input}
          value={telefone}
          onChangeText={setTelefone}
          placeholder="Digite seu telefone"
          keyboardType="phone-pad"
        />
        
        {/* Contas Bancárias apenas para vendedor (isSeller) */}
        {user?.isSeller && (
          <View style={{ marginTop: 20 }}>
            <View style={styles.contasHeader}>
              <Text style={styles.label}>Contas Bancárias</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.addButtonText}>+ Adicionar</Text>
              </TouchableOpacity>
            </View>
            
            {Array.isArray(user.contasBancarias) && user.contasBancarias.length > 0 ? (
              user.contasBancarias.map((conta, idx) => (
                <View key={conta._id || idx} style={styles.ibanBox}>
                  <View style={styles.ibanInfo}>
                    <Text style={styles.ibanBanco}>{conta.banco}</Text>
                    <Text style={styles.ibanIban}>{conta.iban}</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.removeButton,
                      user.contasBancarias.length <= 1 && styles.removeButtonDisabled
                    ]}
                    onPress={() => removerContaBancaria(conta._id)}
                    disabled={user.contasBancarias.length <= 1}
                  >
                    <Text style={[
                      styles.removeButtonText,
                      user.contasBancarias.length <= 1 && styles.removeButtonTextDisabled
                    ]}>
                      {user.contasBancarias.length <= 1 ? "Mínimo 1" : "Remover"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.noAccountsText}>Nenhuma conta bancária cadastrada</Text>
            )}
          </View>
        )}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.cancelButton]}
            onPress={() => {
              setName(user?.name || "");
              setTelefone(user?.telefone || "");
              Alert.alert("Cancelado", "Alterações descartadas");
            }}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.saveButton, saving && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>{saving ? "Salvando..." : "Salvar"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal para adicionar conta bancária */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nova Conta Bancária</Text>
            
            <Text style={styles.label}>Banco</Text>
            <TextInput
              style={styles.input}
              value={novoBanco}
              onChangeText={setNovoBanco}
              placeholder="Nome do banco"
            />
            
            <Text style={styles.label}>IBAN</Text>
            <TextInput
              style={styles.input}
              value={novoIban}
              onChangeText={setNovoIban}
              placeholder="Número do IBAN (sem AO06)"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setModalVisible(false);
                  setNovoBanco("");
                  setNovoIban("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={adicionarContaBancaria}
              >
                <Text style={styles.modalSaveText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </SafeAreaView>);
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFF",
    ...Platform.select({
      ios: {
        paddingTop: 0, // SafeAreaView já cuida do padding no iOS
      },
      android: {
        paddingTop: StatusBar.currentHeight -40 || 0,
      },
    }),
  },
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  contentContainer: {
    paddingBottom: 20,
  },
  headerContainer: {
    backgroundColor: "#FFF",
    paddingTop: Platform.OS === 'ios' ? 10 : 0,
  },
  formContainer: {
    margin: 20,
    backgroundColor: "#F8F9FD",
    borderRadius: 20,
    padding: 25,
    shadowColor: "#704F38",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  label: {
    fontSize: 16,
    marginBottom: 6,
    fontFamily: "Poppins_400Regular",
    color: "#333",
  },
  input: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  
  // Estilos da Foto de Perfil
  profileImageSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImageContainer: {
    alignItems: 'center',
  },
  profileImageWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0F0F0',
    borderWidth: 3,
    borderColor: '#704F38',
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0F0F0',
    borderWidth: 3,
    borderColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#704F38',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  profileImageHint: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    marginTop: 5,
  },
  
  emailContainer: {
    backgroundColor: "#F0F0F0",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D0D0D0",
    padding: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  emailText: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: "#666",
  },
  contasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: "#704F38",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    gap: 15,
    paddingHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "#F5F5F5",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#704F38",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    flex: 1,
    shadowColor: "#704F38",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  saveButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    fontWeight: "600",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  ibanBox: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ibanInfo: {
    flex: 1,
  },
  ibanBanco: {
    fontSize: 15,
    color: '#704F38',
    fontFamily: 'Poppins_500Medium',
  },
  ibanIban: {
    fontSize: 16,
    color: '#222',
    fontFamily: 'Poppins_400Regular',
  },
  removeButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  removeButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  removeButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '600',
  },
  removeButtonTextDisabled: {
    color: '#999',
  },
  noAccountsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
    gap: 15,
  },
  modalCancelButton: {
    backgroundColor: '#F5F5F5',
    padding: 14,
    borderRadius: 10,
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalCancelText: {
    color: '#666',
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '600',
  },
  modalSaveButton: {
    backgroundColor: '#704F38',
    padding: 14,
    borderRadius: 10,
    flex: 1,
    alignItems: 'center',
    shadowColor: '#704F38',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  modalSaveText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '600',
  },
});

export default UserDetailsScreen;
