import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BASE_URL } from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const EmailVerificationScreen = ({ route }) => {
  const navigation = useNavigation();
  const { 
    email, 
    userName = '', 
    userId = '', 
    isSeller = false, 
    fromLogin = false 
  } = route?.params || {};

  // Verificação de segurança para email
  if (!email) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Erro</Text>
          <Text>Email não informado. Volte e tente novamente.</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef([]);

  // Timer para reenvio
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  // Função para formatar email para exibição
  const formatEmailForDisplay = (email) => {
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 3) return email;
    
    const visibleStart = localPart.substring(0, 2);
    const visibleEnd = localPart.substring(localPart.length - 1);
    const hiddenPart = '*'.repeat(Math.max(1, localPart.length - 3));
    
    return `${visibleStart}${hiddenPart}${visibleEnd}@${domain}`;
  };

  // Função para lidar com mudança de código
  const handleCodeChange = (text, index) => {
    if (text.length > 1) return; // Prevenir input múltiplo
    
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);
    
    // Auto-focus próximo campo
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Auto-verificar quando todos os campos estão preenchidos
    if (newCode.every(digit => digit !== '') && text) {
      handleVerifyCode(newCode.join(''));
    }
  };

  // Função para lidar com backspace
  const handleKeyPress = (event, index) => {
    if (event.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Verificar código
  const handleVerifyCode = async (codeToVerify = null) => {
    const finalCode = codeToVerify || code.join('');
    
    if (finalCode.length !== 6) {
      Alert.alert('Erro', 'Por favor, digite o código completo de 6 dígitos');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`${BASE_URL}/api/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          code: finalCode
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Salvar dados do usuário se tiver token
        if (data.token) {
          await AsyncStorage.setItem('token', data.token);
        }
        await AsyncStorage.setItem('userId', data.user.id);
        
        Alert.alert(
          'Sucesso! 🎉',
          'Email verificado com sucesso! Sua conta foi ativada.',
          [
            {
              text: 'Continuar',
              onPress: () => {
                if (fromLogin) {
                  // Se veio do login, fazer login automático
                  Alert.alert(
                    'Verificação concluída!',
                    'Agora você pode fazer login normalmente.',
                    [
                      {
                        text: 'Voltar ao Login',
                        onPress: () => navigation.navigate('LoginScreen')
                      }
                    ]
                  );
                } else {
                  // Se é novo registro, navegar para a tela apropriada
                  if (isSeller) {
                    navigation.navigate('Home1');
                  } else {
                    navigation.navigate('Home');
                  }
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Erro', data.error || 'Código inválido');
        // Limpar código em caso de erro
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error('Erro ao verificar código:', error);
      Alert.alert('Erro', 'Erro de conexão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reenviar código
  const handleResendCode = async () => {
    if (!canResend) return;
    
    setIsResending(true);
    
    try {
      const response = await fetch(`${BASE_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Sucesso', 'Novo código enviado para seu email');
        setTimer(60);
        setCanResend(false);
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        Alert.alert('Erro', data.error || 'Erro ao reenviar código');
      }
    } catch (error) {
      console.error('Erro ao reenviar código:', error);
      Alert.alert('Erro', 'Erro de conexão. Tente novamente.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={{ fontSize: 18, color: "#333" }}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verificar Email</Text>
        </View>

        <View style={styles.content}>
          {/* Ícone e título */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Text style={{ fontSize: 30, color: "#704F38" }}>✉️</Text>
            </View>
          </View>

          <Text style={styles.title}>Confirme seu email</Text>
          <Text style={styles.subtitle}>
            Enviamos um código de 6 dígitos para{'\n'}
            <Text style={styles.emailText}>{formatEmailForDisplay(email)}</Text>
          </Text>

          {/* Campo de código */}
          <View style={styles.codeContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => inputRefs.current[index] = ref}
                style={[
                  styles.codeInput,
                  digit ? styles.codeInputFilled : null
                ]}
                value={digit}
                onChangeText={(text) => handleCodeChange(text, index)}
                onKeyPress={(event) => handleKeyPress(event, index)}
                keyboardType="numeric"
                maxLength={1}
                autoFocus={index === 0}
                editable={!isLoading}
              />
            ))}
          </View>

          {/* Timer e reenvio */}
          <View style={styles.resendContainer}>
            {!canResend ? (
              <View style={styles.timerContainer}>
                <Text style={{ fontSize: 14, color: "#666" }}>⏰</Text>
                <Text style={styles.timerText}>
                  Reenviar código em {timer}s
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.resendButton}
                onPress={handleResendCode}
                disabled={isResending}
              >
                {isResending ? (
                  <ActivityIndicator size="small" color="#704F38" />
                ) : (
                  <>
                    <Text style={{ fontSize: 14, color: "#704F38" }}>✉️</Text>
                    <Text style={styles.resendText}>Reenviar código</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Botão verificar */}
          <TouchableOpacity
            style={[
              styles.verifyButton,
              code.every(digit => digit !== '') ? styles.verifyButtonActive : null
            ]}
            onPress={() => handleVerifyCode()}
            disabled={isLoading || !code.every(digit => digit !== '')}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Text style={{ fontSize: 16, color: "#FFF" }}>✓</Text>
                <Text style={styles.verifyButtonText}>Verificar</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Informações adicionais */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              💡 Não recebeu o email? Verifique sua pasta de spam ou lixo eletrônico
            </Text>
            <Text style={styles.infoText}>
              ⏰ O código expira em 10 minutos
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 30,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  emailText: {
    fontWeight: '600',
    color: '#704F38',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  codeInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1A1A',
    backgroundColor: '#FFF',
    marginHorizontal: 4,
  },
  codeInputFilled: {
    borderColor: '#704F38',
    backgroundColor: '#F7FAFC',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resendText: {
    fontSize: 14,
    color: '#704F38',
    fontWeight: '600',
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#CBD5E0',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    gap: 8,
    marginBottom: 40,
    minWidth: 200,
  },
  verifyButtonActive: {
    backgroundColor: '#704F38',
  },
  verifyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default EmailVerificationScreen;