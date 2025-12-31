import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { 
  CaretLeft, 
  Key, 
  FileText, 
  Trash, 
  Eye, 
  EyeSlash 
} from 'phosphor-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config';
import { getSafeAreaStyle, configureStatusBar } from '../utils/statusBar';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  
  // Estados para modal de mudança de senha
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Configurar StatusBar ao entrar na tela
  useFocusEffect(
    React.useCallback(() => {
      configureStatusBar('#F8F9FA', 'dark-content');
    }, [])
  );

  // Função para mudar senha
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Erro', 'A nova senha e confirmação não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Erro', 'A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');

      const response = await fetch(`${BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Sucesso', 'Senha alterada com sucesso!');
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Erro', data.message || 'Erro ao alterar senha');
      }
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      Alert.alert('Erro', 'Erro ao alterar senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Função para abrir políticas de privacidade
  const handlePrivacyPolicy = () => {
    Alert.alert(
      'Políticas de Privacidade',
      'Você será redirecionado para visualizar nossas políticas de privacidade.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Abrir',
          onPress: () => {
            // URL das políticas de privacidade (substitua pela URL real)
            const privacyUrl = 'https://gobuy.ao/privacy-policy';
            Linking.openURL(privacyUrl).catch(() => {
              Alert.alert('Erro', 'Não foi possível abrir o link');
            });
          },
        },
      ]
    );
  };

  // Função para deletar conta
  const handleDeleteAccount = () => {
    Alert.alert(
      'Desativar Conta',
      'Tem certeza que deseja desativar sua conta? Você não conseguirá mais fazer login, mas seus dados serão mantidos para questões legais.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desativar',
          style: 'destructive',
          onPress: confirmDeleteAccount,
        },
      ]
    );
  };
  

  const confirmDeleteAccount = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');

      const response = await fetch(`${BASE_URL}/api/auth/delete-account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        // Limpar dados locais
        await AsyncStorage.multiRemove(['token', 'userId']);
        
        Alert.alert(
          'Conta Desativada',
          'Sua conta foi desativada com sucesso. Você não conseguirá mais fazer login.',
          [
            {
              text: 'OK',
              onPress: () => navigation.reset({
                index: 0,
                routes: [{ name: 'LoginScreen' }],
              }),
            },
          ]
        );
      } else {
        const data = await response.json();
        Alert.alert('Erro', data.message || 'Erro ao deletar conta');
      }
    } catch (error) {
      console.error('Erro ao deletar conta:', error);
      Alert.alert('Erro', 'Erro ao deletar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const MenuItem = ({ icon: Icon, text, onPress, textColor = "#222", danger = false }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <Icon size={20} color={danger ? "#FF3B30" : "#704F38"} weight="regular" />
        <Text style={[styles.menuItemText, { color: danger ? "#FF3B30" : textColor }]}>
          {text}
        </Text>
      </View>
      <CaretLeft size={16} color="#999" style={{ transform: [{ rotate: '180deg' }] }} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <CaretLeft size={22} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Definições</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Menu Items */}
      <View style={styles.menuSection}>
        <MenuItem
          icon={Key}
          text="Mudar Palavra-passe"
          onPress={() => setShowPasswordModal(true)}
        />
        
        <View style={styles.divider} />
        
        <MenuItem
          icon={FileText}
          text="Políticas de Privacidade"
          onPress={handlePrivacyPolicy}
        />
        
        <View style={styles.divider} />
        
        <MenuItem
          icon={Trash}
          text="Desativar Conta"
          onPress={handleDeleteAccount}
          danger={true}
        />
      </View>

      {/* Modal para mudança de senha */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Mudar Palavra-passe</Text>
            
            {/* Senha atual */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Senha Atual</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Digite sua senha atual"
                  secureTextEntry={!showCurrentPassword}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholderTextColor="#999"
                />
                <TouchableOpacity
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  style={styles.eyeButton}
                >
                  {showCurrentPassword ? 
                    <EyeSlash size={18} color="#999" /> : 
                    <Eye size={18} color="#999" />
                  }
                </TouchableOpacity>
              </View>
            </View>

            {/* Nova senha */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nova Senha</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Digite a nova senha"
                  secureTextEntry={!showNewPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholderTextColor="#999"
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  style={styles.eyeButton}
                >
                  {showNewPassword ? 
                    <EyeSlash size={18} color="#999" /> : 
                    <Eye size={18} color="#999" />
                  }
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirmar senha */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirmar Nova Senha</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirme a nova senha"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholderTextColor="#999"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeButton}
                >
                  {showConfirmPassword ? 
                    <EyeSlash size={18} color="#999" /> : 
                    <Eye size={18} color="#999" />
                  }
                </TouchableOpacity>
              </View>
            </View>

            {/* Botões */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleChangePassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>Alterar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Loading overlay */}
      {loading && !showPasswordModal && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#704F38" />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: getSafeAreaStyle('#F8F9FA'),
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  
  backButton: {
    padding: 8,
  },
  
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
  
  headerRight: {
    width: 40,
  },
  
  menuSection: {
    backgroundColor: '#FFF',
    marginTop: 20,
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 8,
  },
  
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  menuItemText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#222',
  },
  
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
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
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#222',
    textAlign: 'center',
    marginBottom: 24,
  },
  
  inputContainer: {
    marginBottom: 20,
  },
  
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#222',
    marginBottom: 8,
  },
  
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#222',
  },
  
  eyeButton: {
    padding: 12,
  },
  
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  
  cancelButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  
  confirmButton: {
    backgroundColor: '#704F38',
  },
  
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
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
});

export default SettingsScreen;