import React, { useEffect } from "react";
import {
  SafeAreaView,
  StyleSheet,
  FlatList,
  Text,
  TextInput,
  View,
  Image,
  TouchableOpacity,
} from "react-native";
import { BASE_URL } from "../../config";
import { MagnifyingGlass } from "phosphor-react-native";
import carrinhosData from "../mocks/mocks";
import Header from "../components/Header";
import { useNavigation } from "@react-navigation/native";

const CarrinhosScreen = ({ route }) => {
  const { namePage } = route.params;
  const [carts, setCarts] = React.useState([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [seller, setSeller] = React.useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchCarts = async () => {
      let platform;

      switch (namePage) {
        case "Carrinhos da SHEIN":
          platform = "Shein";
          break;
        case "Carrinhos da Zara":
          platform = "Zara";
          break;
        case "Carrinhos da Aliexpress":
          platform = "AliExpress";
          break;
        default:
          console.warn("Plataforma desconhecida");
          return;
      }

      try {
        const response = await fetch(
          `${BASE_URL}/api/carts/platform/${platform}`
        );
        const data = await response.json();
        console.log("Dados recebidos:", data);
        setCarts(data);
      } catch (error) {
        console.error("Erro ao buscar carrinhos:", error);
      }
    };

    fetchCarts();
  }, [namePage]);

  const handleItemPress = (item) => {
    // Ação a ser executada quando um item é pressionado
    // Por exemplo, navegar para uma nova tela com os detalhes do item
    console.log("Item pressionado é aqui:", item);
    console.log(namePage);
    navigation.navigate("DetailsCarrinhos1", {item});
    //navigation.navigate("CarrinhosScreen", {namePage});
  };

  const renderItem = ({ item }) => (
    <>
      <TouchableOpacity
        onPress={() => handleItemPress(item)}
        style={styles.itemTouchable}
      >
        <View style={styles.itemContainer}>
          <Image
            source={{
              uri: `${BASE_URL}/${item.imageUrls[0].replace(
                /\\/g,
                "/"
              )}`,
            }}
            style={styles.itemImage}
            resizeMode="cover"
          />
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle}>{item.cartName}</Text>
            <Text style={styles.itemSpace}>
              Abertura: {new Date(item.openDate).toLocaleDateString()}
            </Text>
            <Text style={styles.itemSpace}>
              Fecho: {new Date(item.closeDate).toLocaleDateString()}
            </Text>
            <Text style={styles.itemSpace}>Preço: {item.exchangeRate} Kz</Text>
          </View>
        </View>
        <View style={styles.separator} />
      </TouchableOpacity>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header page={namePage}></Header>
        <View style={styles.contentContainer}>
          <View style={styles.searchContainer}>
            <MagnifyingGlass
              size={24}
              color="#878787"
              style={styles.searchIcon}
            />
            <TextInput
              placeholder="Pesquisar carrinho"
              value={searchTerm}
              onChangeText={setSearchTerm}
              style={styles.searchInput}
              placeholderTextColor={"#878787"}
            />
          </View>
          <FlatList
            data={carts.filter((item) =>
              item.cartName?.toLowerCase().includes(searchTerm.toLowerCase())
            )}
            renderItem={renderItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.flatListContentContainer}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFF", // ou a cor de
  },
  container: {
    flex: 1,
  },
  searchInput: {
    height: 40,
    backgroundColor: "#F0F0F0",
    borderRadius: 20,
    padding: 10,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    padding: 10,
    paddingRight: 10, // para garantir que o texto não sobreponha o ícone
    height: 40,
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
  },
  itemContainer: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
  },
  itemImage: {
    width: 100,
    height: 100,
    marginRight: 16,
    borderRadius: 8, // Adicione um borderRadius se as imagens deveriam ter cantos arredondados
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontWeight: "400",
    fontSize: 18,
    marginBottom: 4,
    fontFamily: "Poppins_400Regular",
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  separator: {
    height: 1,
    width: "90%",
    backgroundColor: "#DEDEDE",
    margin: 20,
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

  flatListContentContainer: {
    paddingBottom: 100, // Ajuste este valor conforme necessário
  },
  itemSpace: {
    paddingBottom: 3,
    color: "#878787",
    fontFamily: "Poppins_400Regular",
  },
  itemTouchable: {},
});

export default CarrinhosScreen;
