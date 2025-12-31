import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import {
  CaretLeft,
  House,
  ShoppingCartSimple,
  ShoppingBagOpen,
  Bell,
  User,
} from "phosphor-react-native";

export default BottomBar = ({ page }) => {
  return (
    <View style={styles.containerBottomBar}>
      <TouchableOpacity>
        <House weight="fill" size={35} color="#704F38" />
      </TouchableOpacity>
      <TouchableOpacity>
        <ShoppingCartSimple size={35} color="#704F38" />
      </TouchableOpacity>
      <TouchableOpacity>
      <ShoppingBagOpen size={35} color="#704F38" />
      </TouchableOpacity>
      <TouchableOpacity>
        <Bell  size={35} color="#704F38" />
      </TouchableOpacity>
      <TouchableOpacity>
        <User size={35} color="#704F38" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
    containerBottomBar: {
    width: "100%",
    height: "10%",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: "3%",
    backgroundColor: "white",
  },
});
