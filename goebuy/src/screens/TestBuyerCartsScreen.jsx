import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TestBuyerCartsScreen = () => {
  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCarts = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      const response = await fetch('http://192.168.1.60:5000/api/carts/buyer/my-carts', {
        headers: {
          Authorization: `Bearer ${'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NDcxMjZmZGE4NjQyN2QxMDBhZDBlZiIsImlhdCI6MTc1NDIyMzU4Mn0.sB96vF8Fe2e_IzgTqy7K_MDumbKZw-aPBB3TBYzLaxA'}`,
        },
      });

      const data = await response.json();
      console.log("Carts fetched:", data);
      setCarts(data);
    } catch (error) {
      console.error('Erro ao buscar carrinhos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCarts();
  }, []);

  const renderCart = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.cartName || 'Sem nome'}</Text>
      <Text>Plataforma: {item.platform}</Text>
      <Text>Data de Fecho: {new Date(item.closeDate).toLocaleDateString()}</Text>
      <Text>Estado: {item.isOpen ? 'Aberto' : 'Fechado'}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#704F38" />
      </View>
    );
  }

  return (
    <FlatList
      data={carts}
      keyExtractor={(item) => item._id}
      renderItem={renderCart}
      contentContainerStyle={styles.list}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#eee',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
    fontSize: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default TestBuyerCartsScreen;
