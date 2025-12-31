import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  StyleSheet,
  FlatList,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Header from '../../components/Header';
import { BASE_URL } from "../../../config";
import { getSafeAreaStyle, configureStatusBar } from "../../utils/statusBar";

const VendedorCartsScreen = () => {
  const navigation = useNavigation();
  const [selectedTab, setSelectedTab] = useState('Ativos');
  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const windowWidth = Dimensions.get('window').width;
  const tabWidth = windowWidth / 2 - 10;

  // Configurar StatusBar ao entrar na tela
  useFocusEffect(
    React.useCallback(() => {
      configureStatusBar('#FFF', 'dark-content');
    }, [])
  );

  useEffect(() => {
    const fetchCarts = async () => {
      try {
        setLoading(true);
        const sellerId = await AsyncStorage.getItem("userId");
        const token = await AsyncStorage.getItem("token");
        console.log('[VendedorCartsScreen] sellerId:', sellerId);
        console.log('[VendedorCartsScreen] token:', token);
        if (!sellerId) {
          console.warn('[VendedorCartsScreen] Nenhum sellerId encontrado no AsyncStorage.');
          setCarts([]);
          return;
        }
        if (!token) {
          console.warn('[VendedorCartsScreen] Nenhum token encontrado no AsyncStorage.');
          setCarts([]);
          return;
        }
        const response = await fetch(`${BASE_URL}/api/carts/seller/${sellerId}/all`, {
          headers: {
            'Authorization': token,
            'Content-Type': 'application/json',
          },
        });
        console.log('[VendedorCartsScreen] Status da resposta:', response.status);
        const data = await response.json();
        console.log('[VendedorCartsScreen] Dados recebidos da API:', data);
        if (Array.isArray(data)) {
          setCarts(data);
        } else if (data && Array.isArray(data.carts)) {
          setCarts(data.carts);
        } else {
          setCarts([]);
          console.warn('[VendedorCartsScreen] Dados inesperados recebidos da API:', data);
        }
      } catch (error) {
        console.error("[VendedorCartsScreen] Erro ao buscar carrinhos:", error);
        setCarts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCarts();
  }, []);

  // Garante que carts é sempre um array antes de filtrar
  const filteredCarts = Array.isArray(carts) ? carts.filter(cart => {
    if (selectedTab === 'Ativos') {
      return !cart.isClosed && !cart.isCancelled && !cart.isFinished;
    } else {
      return cart.isClosed || cart.isCancelled || cart.isFinished;
    }
  }) : [];
  console.log('[VendedorCartsScreen] filteredCarts:', filteredCarts);

  const renderItem = ({ item }) => {
    // Só mostra o botão se o carrinho estiver ativo e todos os compradores finalizados
    let podeFechar = false;
    if (item.buyerCartProgress && Array.isArray(item.buyerCartProgress) && item.buyerCartProgress.length > 0 && !item.isClosed && !item.isCancelled) {
      podeFechar = item.buyerCartProgress.every(progress =>
        ['Entregue', 'Fechado', 'Cancelado'].includes(progress.status)
      );
    }
    return (
      <View style={styles.cartItem}>
        <TouchableOpacity onPress={() => navigation.navigate('MyCartDetailScreen', { cart: item })}>
          <Text style={styles.cartTitle}>{item.cartName}</Text>
          <Text style={styles.cartStatus}>Status: {item.isCancelled ? 'Cancelado' : item.isClosed ? 'Fechado' : item.isFinished ? 'Finalizado' : 'Ativo'}</Text>
          <Text style={styles.cartInfo}>Itens: {item.itemCount || 0}</Text>
          <Text style={styles.cartInfo}>Taxa: {item.exchangeRate} Kz</Text>
        </TouchableOpacity>
        {podeFechar && (
          <TouchableOpacity
            style={{
              backgroundColor: '#704F38',
              padding: 10,
              borderRadius: 8,
              marginTop: 10,
              alignItems: 'center',
            }}
            onPress={async () => {
              try {
                const token = await AsyncStorage.getItem('token');
                const res = await fetch(`${BASE_URL}/api/carts/${item._id}/close`, {
                  method: 'POST',
                  headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json',
                  },
                });
                if (res.ok) {
                  alert('Carrinho fechado com sucesso!');
                  // Atualiza lista após fechar
                  setCarts(prev => prev.map(c => c._id === item._id ? { ...c, isClosed: true } : c));
                } else {
                  const data = await res.json();
                  alert('Erro ao fechar carrinho: ' + (data?.error || res.status));
                }
              } catch (err) {
                alert('Erro ao fechar carrinho: ' + err.message);
              }
            }}
          >
            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 15 }}>Fechar Carrinho</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header page="Meus Carrinhos" />
      <View style={styles.tabsContainer}>
        <TouchableOpacity style={styles.tab} onPress={() => setSelectedTab('Ativos')}>
          <Text style={[styles.tabText, selectedTab === 'Ativos' && styles.activeTabText]}>Ativos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => setSelectedTab('Completos')}>
          <Text style={[styles.tabText, selectedTab === 'Completos' && styles.activeTabText]}>Completos</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#704F38" />
      ) : (
        <FlatList
          data={filteredCarts}
          renderItem={renderItem}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.flatListContentContainer}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: "black" }}>Nenhum carrinho encontrado</Text>}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: getSafeAreaStyle("#FFF"),
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    marginTop: 10,
    justifyContent: 'center',
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  tabText: {
    fontSize: 16,
    color: 'grey',
    fontFamily: 'Poppins_400Regular',
  },
  activeTabText: {
    color: 'black',
    fontFamily: 'Poppins_600SemiBold',
  },
  cartItem: {
    backgroundColor: '#F9F9F9',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  cartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Poppins_600SemiBold',
  },
  cartStatus: {
    color: '#704F38',
    fontWeight: 'bold',
    marginTop: 4,
  },
  cartInfo: {
    color: '#878787',
    fontFamily: 'Poppins_400Regular',
    marginBottom: 4,
  },
  flatListContentContainer: {
    paddingBottom: 100,
  },
});

export default VendedorCartsScreen;
