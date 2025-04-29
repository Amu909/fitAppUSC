import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import axios from 'axios';

export default function NutricionScreen() {
  const [recetas, setRecetas] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8000/recetas') // Usa tu IP local si pruebas en físico
      .then(response => setRecetas(response.data))
      .catch(error => console.error("Error al cargar recetas:", error));
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.nombre}</Text>
      <Text style={styles.subtitle}>Calorías: {item.calorias} kcal</Text>
      <Text style={styles.subtitle}>Categoría: {item.categoria}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🍽️ Recetas Nutricionales</Text>
      <FlatList
        data={recetas}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  card: {
    backgroundColor: '#f1f1f1',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  title: { fontSize: 18, fontWeight: 'bold' },
  subtitle: { fontSize: 14, color: '#666' },
});
