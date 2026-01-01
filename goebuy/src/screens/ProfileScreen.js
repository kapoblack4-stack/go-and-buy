import React, { useState, useEffect, useCallback } from "react";
import { Platform, StatusBar, Alert, RefreshControl } from "react-native";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
   ActivityIndicator,
} from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import { getSafeAreaStyle, configureStatusBar } from "../utils/statusBar";
 
import {
  MagnifyingGlass,
  Gear,
  Question,
  FileText,
  UserPlus,
  SignOut,
  User,
  CaretRight,
} from "phosphor-react-native";
import {
  CaretLeft,
  House,
  ShoppingCartSimple,
  ShoppingBagOpen,
  Bell,
} from "phosphor-react-native";
import { Check, PencilSimpleLine } from "phosphor-react-native";
const profileImageUrl = require("../../assets/imagens/logo.png");
import Header from "../components/Header";
import { useNavigation } from "@react-navigation/native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../config";
import { Star } from "phosphor-react-native";

const ProfileScreen = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Configurar StatusBar ao entrar na tela
  useFocusEffect(
    React.useCallback(() => {
      configureStatusBar('#F8F9FA', 'dark-content');
    }, [])
  );

  const fetchUser = useCallback(async () => {
    const token = await AsyncStorage.getItem("token");
    const userId = await AsyncStorage.getItem("userId");
    console.log("[ProfileScreen] token:", token);
    console.log("[ProfileScreen] userId:", userId);
    if (!token || !userId) return;
    try {
      const res = await fetch(`${BASE_URL}/api/auth/${userId}`, {
        headers: { Authorization: token },
      });
      const data = await res.json();
      console.log("[ProfileScreen] Dados recebidos do backend:", data);
      setUser(data);
    } catch (e) {
      console.log("[ProfileScreen] Erro ao buscar usuário:", e);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchUser();
      setLoading(false);
    };
    loadData();
  }, [fetchUser]);

  // Função para refresh
  const onRefresh = useCallback(async () => {
    console.log('[PULL-TO-REFRESH] Atualizando dados do perfil...');
    setRefreshing(true);
    try {
      await fetchUser();
    } catch (error) {
      console.error('Erro durante refresh do perfil:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchUser]);
  function navegar(pagina, namePage) {
    navigation.navigate(pagina, { namePage });
  }

  // Função para fazer logout
  const handleLogout = async () => {
    Alert.alert(
      "Confirmação",
      "Tem certeza que deseja sair da sua conta?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Sair",
          style: "destructive",
          onPress: async () => {
            try {
              // Limpar dados do AsyncStorage
              await AsyncStorage.removeItem("token");
              await AsyncStorage.removeItem("userId");
              await AsyncStorage.removeItem("userType");
              
              // Navegar para a tela de login
              navigation.reset({
                index: 0,
                routes: [{ name: "LoginScreen" }],
              });
            } catch (error) {
              console.error("Erro ao fazer logout:", error);
              Alert.alert("Erro", "Ocorreu um erro ao sair da conta. Tente novamente.");
            }
          }
        }
      ]
    );
  };
  // Função para montar o caminho correto da imagem
   function getProfileImage() {
    if (user?.profileImage) {
      // Sempre troca todas as barras invertidas por barras normais
      const url = user.profileImage.replace(/\\/g, '/');
      return { uri: url };
    }
    return require("../../assets/imagens/logo.png");
  }

  // Log para depuração do objeto user
  useEffect(() => {
    if (user) {
      console.log("[ProfileScreen] user state:", user);
    }
  }, [user]);

  return (
    <SafeAreaView style={styles.container}> 
      <Header page="Perfil" />
      {/* Indicador de atualização */}
      {refreshing && (
        <View style={styles.refreshIndicator}>
          <ActivityIndicator size="small" color="#704F38" />
          <Text style={styles.refreshText}>Atualizando perfil...</Text>
        </View>
      )}
      <ScrollView 
        style={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#704F38']} // Android
            tintColor="#704F38" // iOS
            progressBackgroundColor="#FFFFFF" // Android
            title="Atualizando perfil..." // iOS
            titleColor="#704F38" // iOS
          />
        }
      >
        <View style={styles.center}>
          <View style={styles.profileImageContainer}>
            <Image
              source={getProfileImage()}
              style={styles.profileImage}
            />
          </View>
        </View>
        <View style={styles.center}>
          <Text style={styles.userName}>{user?.name || "Usuário"}</Text>
          {user?.email && (
            <Text style={{ color: '#878787', fontSize: 15, marginTop: 2 }}>{user.email}</Text>
          )}
          {user?.phone && (
            <Text style={{ color: '#878787', fontSize: 15 }}>{user.phone}</Text>
          )}
        </View>
        <View style={styles.center}>
          {/* Estrelas */}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
            {[1,2,3,4,5].map((star) => (
              <Star
                key={star}
                size={24}
                color={star <= Math.round(user?.rating || 0) ? '#FFD700' : '#DDD'}
                weight={star <= Math.round(user?.rating || 0) ? 'fill' : 'regular'}
                style={{ marginRight: 2 }}
              />
            ))}
            <Text style={{ marginLeft: 8, fontSize: 16, color: '#704F38', fontFamily: 'Poppins_400Regular' }}>
              {user?.rating ? user.rating.toFixed(1) : '0.0'} / {user?.totalRatings || 0} avaliações
            </Text>
          </View>
        </View>
        <View style={styles.menuSection}>
          <MenuItem icon={User} text="Detalhes" style={styles.icon} onPress={() => navigation.navigate('UserDetailsScreen')} />
          <MenuItem icon={Gear} text="Definições" style={styles.icon} onPress={() => navigation.navigate('SettingsScreen')} />
          <MenuItem icon={Question} text="Centro de Ajuda" style={styles.icon} onPress={() => navigation.navigate('HelpCenterScreen')} />
          {/*<MenuItem icon={FileText} text="Política de Privacidade" style={styles.icon} />*/}
          {/*<MenuItem icon={UserPlus} text="Convidar amigos" style={styles.icon} />*/}
          <MenuItem icon={SignOut} text="Logout" style={styles.icon} onPress={handleLogout} />
        </View>
      </ScrollView>

     
    </SafeAreaView>
  );
};

const MenuItem = ({ icon: Icon, text, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
    >
      <Icon size={28} color="#704F38" />
      <Text style={styles.menuItemText}>{text}</Text>
      <CaretRight size={24} color="#704F38" style={styles.menuItemIcon} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: getSafeAreaStyle("#FFF"),
  containerBottomBar: {
    width: "100%",
    height: "10%",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: "3%",
    backgroundColor: "white",
    bottom: -25,
  },
  header: {
    alignItems: "center",
    marginTop: 20,
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  profileSection: {
    alignItems: "center",
    marginVertical: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60, // Metade do tamanho da largura/altura para tornar circular
  },
  userName: {
    fontSize: 22,
    fontWeight: "bold",
    marginVertical: 10,
    fontFamily: "Poppins_400Regular",
  },
  menuSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: "4%",
    borderBottomWidth: 1,
    borderBottomColor: "#EAEAEA",
    justifyContent: "space-between", // Adiciona espaço entre o texto e a seta
  },
  menuItemText: {
    fontSize: 18,
    marginLeft: 15,
    flex: 1, // Faz com que o texto ocupe todo o espaço disponível
    fontFamily: "Poppins_400Regular",
  },
  profileImageContainer: {
    alignItems: "center",
    marginVertical: 30,
    backgroundColor: "#E0E0E0",
    height: 120,
    width: 120,
    borderRadius: 70,
    position: "relative",
  },
  editIcon: {
    position: "absolute", // Posiciona o ícone sobre o contêiner da imagem de perfil
    right: -9, // Ajuste conforme necessário para alinhar onde você quer
    bottom: -8, // Ajuste conforme necessário para alinhar onde você quer
    backgroundColor: "#704F38", // Cor de fundo do ícone para corresponder ao seu esquema de cores
    borderRadius: 32, // Ajuste para corresponder à forma arredondada
    padding: 8, // Ajuste para tamanho correto do toque
    borderWidth: 1.5,
    borderColor: "#FFF", // Cor da borda branca
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 70,
    backgroundColor: "#E0E0E0", // Placeholder color
  },
  center: {
    justifyContent: "center",
    alignContent: "center",
    alignItems: "center",
  },
  icon: {
    fontSize: 16,
  },
  refreshIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF',
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 10,
  },
  refreshText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#704F38',
    fontWeight: '500',
    fontFamily: 'Poppins_400Regular',
  },
});

export default ProfileScreen;
