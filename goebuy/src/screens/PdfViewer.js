import * as Print from "expo-print";
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

const PdfViewer = ({ route }) => {
  const { uri } = route.params;
  const pdfUrl = uri;

  const openPDF = async () => {
    await Print.printAsync({
      uri: pdfUrl,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Visualizar Comprovativo</Text>
      <Text style={styles.subtitle}>
        Clique no botão abaixo para abrir o PDF no visualizador externo.
      </Text>

      <TouchableOpacity style={styles.button} onPress={openPDF}>
        <Text style={styles.buttonText}>Abrir PDF</Text>
      </TouchableOpacity>
    </View>
  );
};

export default PdfViewer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f6fa",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#007BFF",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    elevation: 2, // sombra Android
    shadowColor: "#000", // sombra iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
