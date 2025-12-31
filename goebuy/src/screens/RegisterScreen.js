import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Dimensions,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { Check, PencilSimpleLine, CaretDown, Camera, Image as ImageIcon } from "phosphor-react-native";
import avatar from "../../assets/imagens/avatar.webp";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { BASE_URL } from "../../config";
import AsyncStorage from "@react-native-async-storage/async-storage";
const { width, height } = Dimensions.get("window");
// Captura o StatusBar height uma única vez para evitar mudanças ao voltar do background
const STATUSBAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;

// Lista de bancos angolanos com suas iniciais IBAN
const BANCOS_ANGOLA = [
  { id: 1, nome: "Banco Angolano de Investimentos", sigla: "BAI", inicial: "AO060040", maxChars: 25 },
  { id: 2, nome: "Banco Yetu", sigla: "BY", inicial: "AO060066", maxChars: 25 },
  { id: 3, nome: "Banco Angolano de Negócios e Comércio", sigla: "BANC", inicial: "AO060053", maxChars: 25 },
  { id: 4, nome: "Banco BAI Microfinanças", sigla: "BMF", inicial: "AO060048", maxChars: 25 },
  { id: 5, nome: "Banco BIC", sigla: "BIC", inicial: "AO060051", maxChars: 25 },
  { id: 6, nome: "Banco Caixa Geral de Angola", sigla: "BCGA", inicial: "AO060004", maxChars: 25 },
  { id: 7, nome: "Banco Comercial Angolano", sigla: "BCA", inicial: "AO060043", maxChars: 25 },
  { id: 8, nome: "Banco Comercial do Huambo", sigla: "BCH", inicial: "AO060059", maxChars: 25 },
  { id: 9, nome: "Banco da China", sigla: "BC", inicial: "AO060019", maxChars: 25 },
  { id: 10, nome: "Banco de Desenvolvimento de Angola", sigla: "BDA", inicial: "AO060054", maxChars: 25 },
  { id: 11, nome: "Bancos de Fomento Angola", sigla: "BFA", inicial: "AO060006", maxChars: 25 },
  { id: 12, nome: "Banco de Investimento", sigla: "BIR", inicial: "AO060067", maxChars: 25 },
  { id: 13, nome: "Banco de Negócios", sigla: "BNI", inicial: "AO060052", maxChars: 25 },
  { id: 14, nome: "Banco de Poupança e Crédito", sigla: "BPC", inicial: "AO060010", maxChars: 25 },
  { id: 15, nome: "Banco Económico", sigla: "BE", inicial: "AO060045", maxChars: 25 },
  { id: 16, nome: "Banco Keve", sigla: "KEVE", inicial: "AO060047", maxChars: 25 },
  { id: 17, nome: "Banco Kwanza Investimento", sigla: "BKI", inicial: "AO060057", maxChars: 25 },
  { id: 18, nome: "Banco Prestígio", sigla: "BPG", inicial: "AO060064", maxChars: 25 },
  { id: 19, nome: "Banco Millennium Atlântico", sigla: "BMA", inicial: "AO060055", maxChars: 25 },
  { id: 20, nome: "Banco Mais", sigla: "BMAIS", inicial: "AO060065", maxChars: 25 },
  { id: 21, nome: "Banco Sol", sigla: "BSOL", inicial: "AO060044", maxChars: 25 },
  { id: 22, nome: "Banco Valor", sigla: "BVB", inicial: "AO060062", maxChars: 25 },
  { id: 23, nome: "Banco VTB África", sigla: "VTB", inicial: "AO060056", maxChars: 25 },
  { id: 24, nome: "Finibanco Angola", sigla: "FNB", inicial: "AO060058", maxChars: 25 },
  { id: 25, nome: "Standard Bank de Angola", sigla: "SBA", inicial: "AO060060", maxChars: 25 },
  { id: 26, nome: "Standard Chartered Bank de Angola", sigla: "SCBA", inicial: "AO060063", maxChars: 25 },
  { id: 27, nome: "Banco de Crédito do Sul", sigla: "BCS", inicial: "AO060070", maxChars: 25 },
  { id: 28, nome: "Banco Postal", sigla: "BPT", inicial: "AO060069", maxChars: 25 },
  { id: 29, nome: "Banco da China", sigla: "BOCLB", inicial: "AO060071", maxChars: 25 },
];

const RegisterScreen = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roles, setRoles] = useState({ buyer: false, seller: false });
  const [isSeller, setIsSeller] = useState(false);
  // ou true, se for vendedor
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const navigation = useNavigation();
  const [profileImage, setProfileImage] = useState(null);
  const [contasBancarias, setContasBancarias] = useState([{ 
    banco: null, 
    bancoNome: "", 
    iban: "",
    ibanPrefix: "" 
  }]);
  
  // Estados para modal de seleção de banco
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedContaIndex, setSelectedContaIndex] = useState(0);
  
  // Estados para validação de email
  const [emailError, setEmailError] = useState("");
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailTimeout, setEmailTimeout] = useState(null);

  // Cleanup do timeout quando componente for desmontado
  useEffect(() => {
    return () => {
      if (emailTimeout) {
        clearTimeout(emailTimeout);
      }
    };
  }, [emailTimeout]);

  // Função para verificar se email já existe no backend
  const checkEmailExists = async (email) => {
    try {
      const response = await fetch(`${BASE_URL}/api/auth/check-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.exists;
      }
      return false;
    } catch (error) {
      console.log('Erro ao verificar email:', error);
      return false;
    }
  };

  // Função de validação de email
  const validateEmail = (email) => {
    // Regex mais robusta para validação de email
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    // Verificações básicas
    if (!email) {
      return { isValid: false, error: "Email é obrigatório" };
    }
    
    if (email.length < 5) {
      return { isValid: false, error: "Email muito curto" };
    }
    
    if (email.length > 254) {
      return { isValid: false, error: "Email muito longo" };
    }
    
    if (!emailRegex.test(email)) {
      return { isValid: false, error: "Formato de email inválido" };
    }
    
    // Verificações adicionais
    const parts = email.split('@');
    if (parts.length !== 2) {
      return { isValid: false, error: "Email deve conter apenas um @" };
    }
    
    const [localPart, domain] = parts;
    
    // Validação da parte local (antes do @)
    if (localPart.length > 64) {
      return { isValid: false, error: "Parte local do email muito longa" };
    }
    
    if (localPart.startsWith('.') || localPart.endsWith('.')) {
      return { isValid: false, error: "Email não pode começar ou terminar com ponto" };
    }
    
    if (localPart.includes('..')) {
      return { isValid: false, error: "Email não pode ter pontos consecutivos" };
    }
    
    // Validação do domínio
    if (domain.length > 253) {
      return { isValid: false, error: "Domínio muito longo" };
    }
    
    if (!domain.includes('.')) {
      return { isValid: false, error: "Domínio deve conter pelo menos um ponto" };
    }
    
    // Verificar domínios comuns suspeitos
    const suspiciousDomains = ['test.com', 'example.com', 'fake.com'];
    if (suspiciousDomains.includes(domain.toLowerCase())) {
      return { isValid: false, error: "Por favor, use um email válido" };
    }
    
    return { isValid: true, error: "" };
  };

  // Função para validar email em tempo real com debouncing
  const handleEmailChange = (text) => {
    const cleanEmail = text.toLowerCase().trim();
    setEmail(cleanEmail);
    
    // Limpar timeout anterior
    if (emailTimeout) {
      clearTimeout(emailTimeout);
    }
    
    // Validação básica imediata
    if (cleanEmail.length > 0) {
      const validation = validateEmail(cleanEmail);
      
      if (!validation.isValid) {
        setIsEmailValid(false);
        setEmailError(validation.error);
        setIsCheckingEmail(false);
        return;
      }
      
      // Se formato está correto, verificar no backend com delay
      setIsCheckingEmail(true);
      setEmailError("");
      
      const timeout = setTimeout(async () => {
        try {
          const emailExists = await checkEmailExists(cleanEmail);
          
          if (emailExists) {
            setIsEmailValid(false);
            setEmailError("Este email já está em uso");
          } else {
            setIsEmailValid(true);
            setEmailError("");
          }
        } catch (error) {
          setIsEmailValid(false);
          setEmailError("Erro ao verificar email");
        } finally {
          setIsCheckingEmail(false);
        }
      }, 800); // Delay de 800ms
      
      setEmailTimeout(timeout);
    } else {
      setIsEmailValid(false);
      setEmailError("");
      setIsCheckingEmail(false);
    }
  };


  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };
  function addConta() {
    setContasBancarias([...contasBancarias, { 
      banco: null, 
      bancoNome: "", 
      iban: "",
      ibanPrefix: "" 
    }]);
  }

  function updateConta(index, field, value) {
    const novas = [...contasBancarias];
    novas[index][field] = value;
    setContasBancarias(novas);
  }

  function removeConta(index) {
    const novas = contasBancarias.filter((_, i) => i !== index);
    setContasBancarias(novas);
  }

  // Função para abrir modal de seleção de banco
  function openBankSelector(index) {
    setSelectedContaIndex(index);
    setModalVisible(true);
  }

  // Função para selecionar banco
  function selectBank(banco) {
    const novas = [...contasBancarias];
    novas[selectedContaIndex] = {
      ...novas[selectedContaIndex],
      banco: banco,
      bancoNome: banco.nome,
      ibanPrefix: banco.inicial,
      iban: banco.inicial, // Inicia com a inicial
    };
    setContasBancarias(novas);
    setModalVisible(false);
  }

  // Função para validar e formatar IBAN
  function handleIbanChange(index, value) {
    const conta = contasBancarias[index];
    const banco = conta.banco;
    
    if (!banco) return;
    
    // Remove espaços e converte para maiúsculo
    let cleanValue = value.replace(/\s/g, '').toUpperCase();
    
    // Verifica se começa com a inicial do banco
    if (!cleanValue.startsWith(banco.inicial)) {
      cleanValue = banco.inicial + cleanValue.replace(banco.inicial, '');
    }
    
    // Limita ao número máximo de caracteres
    if (cleanValue.length > banco.maxChars) {
      cleanValue = cleanValue.substring(0, banco.maxChars);
    }
    
    updateConta(index, "iban", cleanValue);
  }
  const handleRegister = async () => {
    // Implement registration logic here
    console.log("Register Pressed", { name, email, password, confirmPassword });
    
    // Validações de campos obrigatórios
    if (!name || !email || !password || !phone) {
      alert("Preencha todos os campos!");
      return;
    }

    // Validação de email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      alert(`Email inválido: ${emailValidation.error}`);
      return;
    }

    // Outras validações
    if (password !== confirmPassword) {
      alert("As passwords não coincidem.");
      return;
    }

    if (roles === null) {
      alert("Selecione um tipo de conta.");
      return;
    }
    
    if (!agreeToTerms) {
      alert("Você deve concordar com os termos e condições.");
      return;
    }
    
    if (password.length < 6) {
      alert("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    
    if (phone.length < 8) {
      alert("O telefone deve ter pelo menos 8 caracteres.");
      return;
    }
    
    if (name.length < 3) {
      alert("O nome deve ter pelo menos 3 caracteres.");
      return;
    }

    if (!profileImage) {
      alert("Por favor, adicione uma imagem de perfil.");
      return;
    }
    // contas bancarias
    if (isSeller && contasBancarias.length === 0) {
      alert("Por favor, adicione pelo menos uma conta bancária.");
      return;    
    }
    if (isSeller) {
      for (let conta of contasBancarias) {
        if (!conta.banco || !conta.iban) {
          alert("Preencha todos os campos das contas bancárias.");
          return;
        }
        
        // Validação específica do IBAN
        const banco = conta.banco;
        if (conta.iban.length !== banco.maxChars) {
          alert(`O IBAN do ${banco.nome} deve ter exatamente ${banco.maxChars} caracteres.`);
          return;
        }
        
        if (!conta.iban.startsWith(banco.inicial)) {
          alert(`O IBAN do ${banco.nome} deve começar com ${banco.inicial}.`);
          return;
        }
      }
    }


    const formData = new FormData();

    formData.append("name", name);
    formData.append("email", email.toLowerCase().trim());
    formData.append("password", password);
    formData.append("isSeller", isSeller);
    formData.append("phone", phone);
    // Adiciona as contas bancárias, se for vendedor
    if (isSeller) { 
      // Preparar dados das contas bancárias para o backend
      const contasBancariasParaEnvio = contasBancarias.map(conta => ({
        banco: conta.banco?.nome || conta.bancoNome, // Enviar nome do banco como string
        sigla: conta.banco?.sigla || '', // Sigla do banco
        iban: conta.iban,
        codigoBanco: conta.banco?.inicial || conta.ibanPrefix // Código/inicial do banco
      }));
      
      formData.append("contasBancarias", JSON.stringify(contasBancariasParaEnvio));
    }

    // Adiciona a imagem de perfil (obrigatória)
    const filename = profileImage.split("/").pop();
    const match = /\.(\w+)$/.exec(filename);
    const ext = match ? match[1] : "jpg";

    formData.append("profileImage", {
      uri: profileImage,
      name: `profile.${ext}`,
      type: `image/${ext}`,
    });

    try {
      const response = await fetch(
        `${BASE_URL}/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "multipart/form-data",
          },
          body: formData,
        }
      );

      const data = await response.json();
      console.log("[RegisterScreen] Resposta do backend:", data);
      if (response.ok) {
        Alert.alert("Sucesso! 📧", "Conta criada com sucesso! Enviamos um código de verificação para seu email.", [
          {
            text: 'Verificar Email',
            onPress: () => {
              navigation.navigate('EmailVerificationScreen', {
                email: email.toLowerCase().trim(),
                userName: name,
                userId: data.user.id,
                isSeller: isSeller
              });
            }
          }
        ]);
      } else {
        alert(data.error || "Erro ao registrar");
      }
    } catch (error) {
      console.log("Error registering user:", error);
      alert("Erro ao criar conta. Tente novamente mais tarde.");
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: "#FFF" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.headerText}>Criar conta</Text>
      </View>
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: height * 0.05 }}
      >
        <View style={styles.center}>
          <Text style={styles.photoInstructionText}>Adicione sua foto de perfil</Text>
          <TouchableOpacity onPress={pickImage} style={styles.profileImageWrapper}>
            <View style={styles.profileImageContainer}>
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={styles.pfp}
                />
              ) : (
                <View style={styles.placeholderContainer}>
                  <Camera size={48} color="#704F38" weight="light" />
                  <Text style={styles.placeholderText}>Tocar para adicionar</Text>
                </View>
              )}
            </View>
            <View style={styles.editIcon}>
              <Camera size={20} color="#FFF" weight="bold" />
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.title}>Nome</Text>
          <TextInput
            placeholder="Cleusia dos Anjos"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
          <Text style={styles.title}>Email</Text>
          <View style={styles.emailContainer}>
            <TextInput
              placeholder="cleusiaast@gmail.com"
              value={email}
              onChangeText={handleEmailChange}
              style={[
                styles.input,
                emailError ? styles.inputError : null,
                isEmailValid ? styles.inputValid : null
              ]}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {email.length > 0 && (
              <View style={styles.emailValidationContainer}>
                {isCheckingEmail ? (
                  <View style={styles.validationLoading}>
                    <Text style={styles.loadingText}>🔍 Verificando email...</Text>
                  </View>
                ) : isEmailValid ? (
                  <View style={styles.validationSuccess}>
                    <Check size={16} color="#22C55E" />
                    <Text style={styles.validationText}> Email válido e disponível</Text>
                  </View>
                ) : emailError ? (
                  <View style={styles.validationError}>
                    <Text style={styles.errorText}>❌ {emailError}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>
          <Text style={styles.title}>Telefone</Text>
          <TextInput
            placeholder="956314947"
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
            keyboardType="phone-pad"
          />
          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              onPress={() => {
                setRoles({ buyer: true, seller: false });
                setIsSeller(false);
              }}
              style={styles.checkbox}
            >
              {roles.buyer && (
                <View style={styles.checked}>
                  <Check size={20} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.checkboxLabel}>Sou Comprador</Text>
          </View>

          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              onPress={() => {
                setRoles({ buyer: false, seller: true });
                setIsSeller(true); // <-- atualiza o estado no momento da seleção
              }}
              style={styles.checkbox}
            >
              {roles.seller && (
                <View style={styles.checked}>
                  <Check size={20} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.checkboxLabel}>Sou Vendedor</Text>
          </View>

          <Text style={styles.title}>Password</Text>
          <TextInput
            placeholder="******************"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            secureTextEntry
          />
          <Text style={styles.title}>Confirmação da Password</Text>
          <TextInput
            placeholder="******************"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            style={styles.input}
            secureTextEntry
          />

          {isSeller && (
            <>
              <Text style={styles.title}>Contas Bancárias</Text>
              {contasBancarias.map((conta, index) => (
                <View key={index} style={styles.contaBancariaContainer}>
                  <Text style={styles.subtitleConta}>Conta {index + 1}</Text>
                  
                  {/* Seletor de Banco */}
                  <TouchableOpacity 
                    style={styles.bankSelector}
                    onPress={() => openBankSelector(index)}
                  >
                    <Text style={[styles.bankSelectorText, !conta.bancoNome && styles.placeholder]}>
                      {conta.bancoNome || "Selecione o banco"}
                    </Text>
                    <CaretDown size={20} color="#666" />
                  </TouchableOpacity>
                  
                  {/* Campo IBAN */}
                  {conta.banco && (
                    <View style={styles.ibanContainer}>
                      <Text style={styles.ibanLabel}>
                        IBAN (máx. {conta.banco.maxChars} caracteres)
                      </Text>
                      <TextInput
                        placeholder={`${conta.banco.inicial}XXXXXXXXXXXX`}
                        value={conta.iban}
                        onChangeText={(text) => handleIbanChange(index, text)}
                        style={[
                          styles.input,
                          styles.ibanInput,
                          conta.iban.length === conta.banco.maxChars ? styles.ibanComplete : null
                        ]}
                        maxLength={conta.banco.maxChars}
                        autoCapitalize="characters"
                      />
                      <Text style={styles.ibanCounter}>
                        {conta.iban.length}/{conta.banco.maxChars}
                      </Text>
                    </View>
                  )}
                  
                  {/* Botão de remover conta */}
                  {contasBancarias.length > 1 && (
                    <TouchableOpacity 
                      onPress={() => removeConta(index)}
                      style={styles.removeContaButton}
                    >
                      <Text style={styles.removeContaText}>Remover conta</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              <TouchableOpacity onPress={addConta} style={styles.addContaButton}>
                <Text style={styles.addContaText}>+ Adicionar outra conta</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              onPress={() => setAgreeToTerms(!agreeToTerms)}
              style={styles.checkbox}
            >
              {agreeToTerms && (
                <View style={styles.checked}>
                  <Check size={20} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.checkboxLabel}>
              Concordo com os
              <Text style={styles.linkText}> Termos & Condições </Text>e com a
              <Text style={styles.linkText}> Política de Privacidade.</Text>
            </Text>
          </View>
          <View style={styles.loginButtonContainer}>
            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleRegister}
            >
              <Text style={styles.registerButtonText}>Entrar</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Modal de Seleção de Banco */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Selecione o Banco</Text>
                <TouchableOpacity 
                  onPress={() => setModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <FlatList
                data={BANCOS_ANGOLA}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.bankItem}
                    onPress={() => selectBank(item)}
                  >
                    <View style={styles.bankItemContent}>
                      <Text style={styles.bankName}>{item.nome}</Text>
                      <Text style={styles.bankDetails}>
                        {item.sigla} • {item.inicial}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  header: {
    paddingTop: STATUSBAR_HEIGHT > 0 ? STATUSBAR_HEIGHT + 20 : height * 0.06,
    paddingBottom: height * 0.02,
    marginHorizontal: width * 0.1,
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  headerText: {
    fontSize: width * 0.07,
    fontWeight: "bold",
    fontFamily: "Poppins_400Regular",
  },
  photoInstructionText: {
    fontSize: width * 0.04,
    color: "#333",
    fontWeight: "600",
    marginBottom: height * 0.02,
    fontFamily: "Poppins_600SemiBold",
    textAlign: "center",
  },
  profileImageWrapper: {
    position: "relative",
    marginBottom: height * 0.03,
  },
  profileImageContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
    height: width * 0.35,
    width: width * 0.35,
    borderRadius: (width * 0.35) / 2,
    borderWidth: 3,
    borderColor: "#704F38",
    borderStyle: "dashed",
    overflow: "hidden",
  },
  pfp: {
    height: "100%",
    width: "100%",
    borderRadius: (width * 0.35) / 2,
  },
  placeholderContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: width * 0.032,
    color: "#704F38",
    fontFamily: "Poppins_400Regular",
    marginTop: height * 0.01,
  },
  editIcon: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: "#704F38",
    borderRadius: 30,
    padding: width * 0.025,
    borderWidth: 3,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  inputContainer: {
    paddingHorizontal: width * 0.08,
    paddingBottom: height * 0.03,
  },
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#D6D7DA",
    borderRadius: 40,
    padding: width * 0.034,
    marginBottom: height * 0.025,
    fontSize: width * 0.04,
    fontFamily: "Poppins_400Regular",
  },
  inputError: {
    borderColor: "#EF4444",
    borderWidth: 2,
  },
  inputValid: {
    borderColor: "#22C55E",
    borderWidth: 2,
  },
  emailContainer: {
    marginBottom: height * 0.01,
  },
  emailValidationContainer: {
    marginTop: -height * 0.02,
    marginBottom: height * 0.015,
    paddingHorizontal: width * 0.04,
  },
  validationSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  validationError: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  validationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  validationText: {
    fontSize: width * 0.032,
    color: '#22C55E',
    fontWeight: '500',
  },
  errorText: {
    fontSize: width * 0.032,
    color: '#EF4444',
    fontWeight: '500',
  },
  loadingText: {
    fontSize: width * 0.032,
    color: '#3B82F6',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: height * 0.02,
  },
  checkbox: {
    height: width * 0.07,
    width: width * 0.07,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D6D7DA",
    alignItems: "center",
    justifyContent: "center",
    marginRight: width * 0.02,
  },
  checked: {
    height: "100%",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    backgroundColor: "#704F38",
  },
  checkboxLabel: {
    flex: 1,
    fontSize: width * 0.032,
    color: "#686868",
    fontFamily: "Poppins_400Regular",
  },
  linkText: {
    color: "#704F38",
    textDecorationLine: "underline",
  },
  registerButton: {
    marginTop: height * 0.03,
    backgroundColor: "#704F38",
    borderRadius: 35,
    height: height * 0.08,
    width: width * 0.8,
    alignItems: "center",
    justifyContent: "center",
  },
  registerButtonText: {
    color: "#FFF",
    fontSize: width * 0.045,
    fontWeight: "400",
    fontFamily: "Poppins_400Regular",
  },
  title: {
    fontWeight: "bold",
    marginBottom: height * 0.015,
    fontSize: width * 0.045,
    fontFamily: "Poppins_400Regular",
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  center1: {
    justifyContent: "center",
    alignItems: "center",
    left: 2,
  },
  loginButtonContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  // Estilos para contas bancárias
  contaBancariaContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: width * 0.04,
    marginBottom: height * 0.02,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  subtitleConta: {
    fontSize: width * 0.038,
    fontWeight: "600",
    color: "#704F38",
    marginBottom: height * 0.015,
    fontFamily: "Poppins_600SemiBold",
  },
  bankSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#D6D7DA",
    borderRadius: 40,
    padding: width * 0.034,
    marginBottom: height * 0.015,
  },
  bankSelectorText: {
    fontSize: width * 0.04,
    color: "#333",
    fontFamily: "Poppins_400Regular",
    flex: 1,
  },
  placeholder: {
    color: "#A9A9A9",
  },
  ibanContainer: {
    marginTop: height * 0.01,
  },
  ibanLabel: {
    fontSize: width * 0.032,
    color: "#666",
    marginBottom: height * 0.008,
    fontFamily: "Poppins_400Regular",
  },
  ibanInput: {
    fontFamily: "monospace",
    fontSize: width * 0.035,
    letterSpacing: 1,
  },
  ibanComplete: {
    borderColor: "#22C55E",
    borderWidth: 2,
  },
  ibanCounter: {
    fontSize: width * 0.03,
    color: "#666",
    textAlign: "right",
    marginTop: height * 0.005,
    fontFamily: "Poppins_400Regular",
  },
  removeContaButton: {
    marginTop: height * 0.015,
    alignSelf: "flex-start",
  },
  removeContaText: {
    color: "#DC3545",
    fontSize: width * 0.032,
    fontWeight: "500",
    fontFamily: "Poppins_500Medium",
  },
  addContaButton: {
    marginBottom: height * 0.02,
    alignSelf: "flex-start",
  },
  addContaText: {
    color: "#704F38",
    fontSize: width * 0.036,
    fontWeight: "500",
    fontFamily: "Poppins_500Medium",
  },
  // Estilos para modal de seleção de banco
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.8,
    paddingHorizontal: width * 0.05,
    paddingBottom: height * 0.03,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: height * 0.02,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
    marginBottom: height * 0.02,
  },
  modalTitle: {
    fontSize: width * 0.045,
    fontWeight: "600",
    color: "#333",
    fontFamily: "Poppins_600SemiBold",
  },
  closeButton: {
    padding: width * 0.02,
  },
  closeButtonText: {
    fontSize: width * 0.05,
    color: "#666",
  },
  bankItem: {
    paddingVertical: height * 0.02,
    paddingHorizontal: width * 0.02,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F4",
  },
  bankItemContent: {
    flex: 1,
  },
  bankName: {
    fontSize: width * 0.038,
    color: "#333",
    fontWeight: "500",
    marginBottom: height * 0.005,
    fontFamily: "Poppins_500Medium",
  },
  bankDetails: {
    fontSize: width * 0.032,
    color: "#666",
    fontFamily: "Poppins_400Regular",
  },
});

export default RegisterScreen;
