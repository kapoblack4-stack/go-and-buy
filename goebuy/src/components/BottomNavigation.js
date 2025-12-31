import React, { useState } from "react";
import { StyleSheet, View, TouchableOpacity, Animated } from "react-native";
import { MagnifyingGlass, House, ShoppingCartSimple, ShoppingBagOpen, Bell, User } from "phosphor-react-native";

const BottomNavigation = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position] = useState(new Animated.Value(-8));

  const iconPositions = {
    0: "-10%",
    1: "77%",
    2: "164%",
    3: "250%",
    4: "336%", // Adicionando uma posição para o ícone de usuário
  };

  const onPress = (index) => {
    setSelectedIndex(index);
    Animated.spring(position, {
      toValue: iconPositions[index],
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.selectionIndicator,
          {
            transform: [{ translateX: position }],
          },
        ]}
      />
      <TouchableOpacity style={styles.iconContainer} onPress={() => onPress(0)}>
        <House size={24} color={selectedIndex === 0 ? "#000" : "#888"} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconContainer} onPress={() => onPress(1)}>
        <ShoppingCartSimple size={24} color={selectedIndex === 1 ? "#000" : "#888"} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconContainer} onPress={() => onPress(2)}>
        <ShoppingBagOpen size={24} color={selectedIndex === 2 ? "#000" : "#888"} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconContainer} onPress={() => onPress(3)}>
        <Bell size={24} color={selectedIndex === 3 ? "#000" : "#888"} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconContainer} onPress={() => onPress(4)}>
        <User size={24} color={selectedIndex === 4 ? "#000" : "#888"} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 30,
    paddingVertical: 8,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
    height: "12%"
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    alignContent: "center"
  },
  selectionIndicator: {
    position: "absolute",
    top: "32%",
    left: 28,
    width: "12.5%",
    height: "60%",
    borderRadius: 50,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
});

export default BottomNavigation;
