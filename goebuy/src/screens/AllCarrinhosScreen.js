import React from "react";
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
import { MagnifyingGlass } from "phosphor-react-native";
import carrinhosData from "../mocks/mocks";
import Header from '../components/Header';

export default AllCarrinhosScreen = () => {

  const handleItemPress = (item) => {
    // Ação a ser executada quando um item é pressionado
    // Por exemplo, navegar para uma nova tela com os detalhes do item
    console.log('Item pressionado:', item);
  };

  const renderItem = ({ item }) => (
    <>
      <TouchableOpacity onPress={() => handleItemPress(item)} style={styles.itemTouchable}>
        <View style={styles.itemContainer}>
          <Image
            source={item.image}
            style={styles.itemImage}
            resizeMode="cover"
          />
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle}>{item.name}</Text>
            <Text style={styles.itemSpace}>Abertura: {item.date}</Text>
            <Text style={styles.itemSpace}>Fecho: {item.date}</Text>
            <Text style={styles.itemSpace}>Preço: {item.price}</Text>
            <Text style={styles.itemSpace}>Loja: {item.loja}</Text>
          </View>
        </View>
        <View style={styles.separator} />
      </TouchableOpacity>
    </>
  );

  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        <Header page={'Carrinhos'}></Header>
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
              placeholderTextColor={"#878787"}
            />
          </View>
          <FlatList
            data={carrinhosData}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.flatListContentContainer}
          />
        </View>
      </View>
    </View>
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
    fontFamily: 'Poppins_400Regular',
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
    fontFamily: 'Poppins_400Regular',

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
    borderColor: "#E8E8E8"

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
    fontFamily: 'Poppins_400Regular',

  },
  itemTouchable: {

  }
});


