import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  FlatList,
  Text,
  TextInput,
  View,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MagnifyingGlass } from "phosphor-react-native";
import Header from '../../components/Header';
import BottomNavigation from "../../components/BottomNavigation";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { BASE_URL } from "../../../config";

const CarrinhosScreen = () => {
  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigation = useNavigation();

  // Função para buscar carrinhos
  const fetchCarts = async () => {
    try {
      setLoading(true);
      const sellerId = await AsyncStorage.getItem("userId");
      const token = await AsyncStorage.getItem("token");
      console.log("ID do vendedor:", sellerId);
      console.log("Token:", token);
      
      if (!sellerId) {
        console.warn("Vendedor não autenticado.");
        return;
      }

      if (!token) {
        console.warn("Token não encontrado.");
        return;
      }

      // Buscar TODOS os carrinhos do vendedor com autenticação
      const response = await fetch(`${BASE_URL}/api/carts/seller/${sellerId}/all`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Erro na resposta:', response.status);
        // Se falhar com /all, tentar com /open (fallback)
        const fallbackResponse = await fetch(`${BASE_URL}/api/carts/seller/${sellerId}/open`);
        const fallbackData = await fallbackResponse.json();
        setCarts(Array.isArray(fallbackData) ? fallbackData : []);
        console.log("Carrinhos (fallback):", fallbackData);
        return;
      }
      
      const data = await response.json();
      
      // Filtrar apenas carrinhos ATIVOS (não fechados, não cancelados, não finalizados)
      const activeCarts = Array.isArray(data) ? data.filter(cart => 
        !cart.isClosed && !cart.isCancelled && !cart.isFinished
      ) : [];
      
      setCarts(activeCarts);
      console.log("Todos os carrinhos:", data);
      console.log("Carrinhos ativos filtrados:", activeCarts);
    } catch (error) {
      console.error("Erro ao buscar carrinhos:", error);
      // Fallback para o endpoint original se houver erro
      try {
        const sellerId = await AsyncStorage.getItem("userId");
        const response = await fetch(`${BASE_URL}/api/carts/seller/${sellerId}/open`);
        const data = await response.json();
        setCarts(Array.isArray(data) ? data : []);
        console.log("Carrinhos (fallback após erro):", data);
      } catch (fallbackError) {
        console.error("Erro no fallback:", fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  // Recarregar quando a tela entra em foco
  useFocusEffect(
    React.useCallback(() => {
      fetchCarts();
    }, [])
  );

   const formatNumber = (num) => {
    if (!num) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleItemPress = (item) => {
    console.log("Item pressionado:", item);
    console.log(item.cartName);
    navigation.navigate("OrderScreen1", { cartId: item._id, cartName: item.cartName, cart: item });
  };

  const filteredCarts = carts.filter((item) =>
    item.cartName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderItem = ({ item }) => (
  <TouchableOpacity onPress={() => handleItemPress(item)} style={styles.itemTouchable}>
    <View style={styles.itemContainer}>
      {item.imageUrls && item.imageUrls.length > 0 && (
        <Image
          source={{ uri: `${BASE_URL}/${item.imageUrls[0].replace(/\\/g, "/")}` }}
          style={styles.itemImage}
          resizeMode="cover"
        />
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle}>{item.cartName}</Text>
        <Text style={styles.itemSpace}>Abertura: {new Date(item.openDate).toLocaleDateString()}</Text>
        <Text style={styles.itemSpace}>Fecho: {new Date(item.closeDate).toLocaleDateString()}</Text>
        <Text style={styles.itemSpace}>Preço: {formatNumber(item.exchangeRate)} Kz</Text>
        <Text style={[styles.itemSpace, styles.statusActive]}>
          Status: {item.isCancelled ? 'Cancelado' : item.isClosed ? 'Fechado' : item.isFinished ? 'Finalizado' : 'Ativo'}
        </Text>
      </View>
    </View>
    <View style={styles.separator} />
  </TouchableOpacity>
);


  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header page={'Meus Carrinhos'} />
        <View style={styles.contentContainer}>
          <View style={styles.searchContainer}>
            <MagnifyingGlass
              size={24}
              color="#878787"
              style={styles.searchIcon}
            />
            <TextInput
              placeholder="Pesquisar carrinho"
              style={styles.searchInput}
              placeholderTextColor="#878787"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#704F38" />
          ) : (
            <FlatList
              data={filteredCarts}
              renderItem={renderItem}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.flatListContentContainer}
              ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 , color: "black"}}>Nenhum carrinho ativo encontrado</Text>}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  container: {
    flex: 1,
    paddingVertical: 20,
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  searchIcon: {
    marginLeft: 10,
  },
  searchInput: {
    flex: 1,
    padding: 10,
    height: 40,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
  },
  itemTouchable: {},
  itemContainer: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
  },
  itemImage: {
    width: 100,
    height: 100,
    marginRight: 16,
    borderRadius: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 18,
    marginBottom: 4,
    fontFamily: 'Poppins_400Regular',
  },
  itemSpace: {
    paddingBottom: 3,
    color: "#878787",
    fontFamily: 'Poppins_400Regular',
  },
  statusActive: {
    color: "#22C55E", // Verde para indicar que está ativo
    fontWeight: "600",
  },
  separator: {
    height: 1,
    width: "90%",
    backgroundColor: "#DEDEDE",
    margin: 20,
  },
  flatListContentContainer: {
    paddingBottom: 100,
  },
});

export default CarrinhosScreen;
