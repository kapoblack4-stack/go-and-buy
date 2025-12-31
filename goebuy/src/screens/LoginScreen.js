import React, { useState } from "react";
import { BASE_URL } from "../../config";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import logo from "../../assets/imagens/logo.png";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PushNotificationService from "../services/PushNotificationService";

const { width, height } = Dimensions.get("window");
// Captura o StatusBar height uma única vez para evitar mudanças ao voltar do background
const STATUSBAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;

const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();
  
  // Estados para feedback visual
  const [toast, setToast] = useState({
    visible: false,
    type: 'error', // 'success', 'error', 'warning', 'info'
    message: '',
  });
  
  const [fieldErrors, setFieldErrors] = useState({
    email: false,
    password: false,
  });
  
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

  const handleLogin = async () => {
    // Resetar erros visuais
    setFieldErrors({ email: false, password: false });
    
    // Validar campos obrigatórios
    if (!email || !password) {
      setIsLoading(false);
      const newErrors = {
        email: !email,
        password: !password,
      };
      setFieldErrors(newErrors);
      
      // Mensagem específica baseada nos campos faltando
      let message = 'Por favor, preencha ';
      if (!email && !password) {
        message += 'o email e a senha';
      } else if (!email) {
        message += 'o email';
      } else if (!password) {
        message += 'a senha';
      }
      
      showToast('warning', message);
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
        }),
      });
      const data = await response.json();
      
      if (response.ok && data.user) {
        const token = data.token;
        await AsyncStorage.setItem("token", token);
        await AsyncStorage.setItem("userId", data.user._id);
        
        // ✅ VERIFICAR SE A CONTA ESTÁ ATIVA
        if (data.user.isActive === false || data.user.isEmailVerified === false) {
          // Conta não está ativa - solicitar verificação de email
          showToast('warning', 'Por favor, verifique seu email para ativar a conta');
          
          setTimeout(() => {
            navigation.navigate('EmailVerificationScreen', {
              email: data.user.email,
              userName: data.user.name,
              userId: data.user._id,
              isSeller: data.user.isSeller,
              fromLogin: true
            });
          }, 1500);
          return;
        }
        
        // Tentar salvar push token pendente após login
        try {
          await PushNotificationService.savePendingToken();
          console.log('[LOGIN] Push token pendente processado');
        } catch (error) {
          console.log('[LOGIN] Erro ao processar push token pendente:', error);
        }
        
        // Navegar diretamente sem alert
        console.log("data.user.isSeller home1");
        showToast('success', `Bem-vindo${data.user.isSeller ? ', vendedor' : ''}!`);

        // Pequeno delay para mostrar o toast antes de navegar
        setTimeout(() => {
          if (data.user.isSeller === true) {
            console.log("login home1");
            navigation.navigate("Home1");
          } else {
            console.log("login home");
            navigation.navigate("Home");
          }
        }, 1000);
      } else {
        // Mostrar toast com erro genérico
        showToast('error', 'Verifique suas credenciais');
        
        // Destacar campos com erro
        setFieldErrors({ email: true, password: true });
        
        console.log("Erro de login:", data.error || "Credenciais inválidas.");
      }
    } catch (error) {
      console.log(error);
      // Mostrar toast de erro de conexão
      showToast('error', 'Erro de conexão. Verifique sua internet e tente novamente.');
      console.log("Erro ao fazer login. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: "white" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Login</Text>
      </View>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
          <View style={styles.logoContaier}>
            <View>
              <Image style={styles.logo} source={logo}></Image>
            </View>
          </View>

          <View style={styles.inputFieldContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              placeholder="cleusiaast@gmail.com"
              placeholderTextColor="#A9A9A9"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                // Limpar erro quando usuário começar a digitar
                if (fieldErrors.email) {
                  setFieldErrors(prev => ({ ...prev, email: false }));
                }
              }}
              style={[styles.inputField, fieldErrors.email && styles.inputFieldError]}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.inputFieldContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              placeholder="***************"
              placeholderTextColor="#A9A9A9"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                
                if (fieldErrors.password) {
                  setFieldErrors(prev => ({ ...prev, password: false }));
                }
              }}
              style={[styles.inputField, fieldErrors.password && styles.inputFieldError]}
              secureTextEntry
            />
            <TouchableOpacity
              onPress={() => navigation.navigate("ForgotPasswordScreen")}
              style={styles.forgotPassword}
            >
              <Text style={styles.forgotPasswordText}>
                Esqueceu a password?
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.loginButtonContainer}>
            <TouchableOpacity 
              onPress={handleLogin} 
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Entrar</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate("RegisterScreen")}
              style={styles.forgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Criar conta</Text>
            </TouchableOpacity>
          </View>
          
          {/* Toast Notification */}
          {toast.visible && (
            <View style={[styles.toastContainer, styles[`toast${toast.type}`]]}>
              <Text style={styles.toastText}>{toast.message}</Text>
            </View>
          )}
          </ScrollView>
    </KeyboardAvoidingView>
  );
};const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: width * 0.08,
    paddingBottom: height * 0.03,
  },
  headerContainer: {
    paddingTop: STATUSBAR_HEIGHT > 0 ? STATUSBAR_HEIGHT + 20 : height * 0.06,
    paddingBottom: height * 0.02,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  headerText: {
    fontSize: width * 0.08, // responsivo
    fontFamily: "Poppins_400Regular",
  },
  inputFieldContainer: {
    marginBottom: height * 0.02,
  },
  inputLabel: {
    fontSize: width * 0.045,
    color: "#000000",
    marginBottom: 10,
    fontFamily: "Poppins_400Regular",
  },
  inputField: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#D6D7DA",
    borderRadius: 40,
    padding: 15,
    fontSize: width * 0.04,
    height: height * 0.07,
    fontFamily: "Poppins_400Regular",
  },
  forgotPassword: {
    alignSelf: "flex-end",
  },
  forgotPasswordText: {
    color: "#704F38",
    fontSize: width * 0.035,
    fontWeight: "600",
    textDecorationLine: "underline",
    fontFamily: "Poppins_600SemiBold",
  },
  loginButton: {
    backgroundColor: "#704F38",
    borderRadius: 35,
    height: height * 0.07,
    width: width * 0.8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: height * 0.02,
    marginBottom: height * 0.015,
    shadowColor: "#704F38",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonDisabled: {
    backgroundColor: "#A08070",
    opacity: 0.7,
  },
  loginButtonContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: width * 0.045,
    fontFamily: "Poppins_400Regular",
  },
  logo: {
    height: height * 0.25,
    width: width * 0.5,
    resizeMode: "contain",
  },
  logoContaier: {
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: height * 0.04,
  },
  inputFieldError: {
    borderColor: "#FF4444",
    borderWidth: 2,
  },
  // Estilos para Toast
  toastContainer: {
    position: 'absolute',
    top: height * 0.1,
    left: width * 0.05,
    right: width * 0.05,
    backgroundColor: '#FF4444',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  toasterror: {
    backgroundColor: '#FF4444',
  },
  toastsuccess: {
    backgroundColor: '#4CAF50',
  },
  toastwarning: {
    backgroundColor: '#FF9800',
  },
  toastinfo: {
    backgroundColor: '#2196F3',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: width * 0.04,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
  },
});

export default LoginScreen;
