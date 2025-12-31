import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { CaretLeft } from "phosphor-react-native";
import { useNavigation } from "@react-navigation/native";

const Header = ({ page }) => {
  const navigation = useNavigation();

  const handleItemPress = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.headerContainer}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => handleItemPress()}>
          <CaretLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerText}>{page}</Text>
        <View style={styles.spacer} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: 'transparent',
    // CORRIGIDO: Container estável que não é afetado por mudanças de StatusBar
    position: 'relative',
    zIndex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'transparent',
    // CORRIGIDO: altura fixa para evitar problemas de layout
    minHeight: 56,
    // CORRIGIDO: Evitar mudanças de posicionamento
    ...(Platform.OS === 'android' && {
      elevation: 0,
      shadowOpacity: 0,
    }),
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  headerText: {
    fontSize: 20,
    fontFamily: "Poppins_400Regular",
    textAlign: 'center',
    flex: 1,
    marginHorizontal: 16,
    color: '#333',
    fontWeight: '500',
  },
  spacer: {
    width: 40,
  },
});

export default Header;


