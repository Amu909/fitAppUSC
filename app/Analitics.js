import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions, ScrollView } from 'react-native';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ProgressChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

export default function AnalyticsDashboard() {
  const data = {
    labels: ['Pasos', 'Sueño', 'Calorías'], // Etiquetas opcionales
    data: [891 / 10000, 8.12 / 10, 345 / 1000], // Normalización de datos
  };

  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: () => `#e60404`,
    labelColor: () => '#333',
    strokeWidth: 5,
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Image source={require('../assets/images/user.png')} style={styles.avatar} />
        <View style={styles.userInfo}>
          <Text style={styles.date}>Abril, 2025</Text>
          <Text style={styles.greeting}>¡Buen día, Luis! 🔥</Text>
        </View>
        <Text style={styles.trophy}>🏆 739</Text>
      </View>

      <View style={styles.chartContainer}>
        <ProgressChart
          data={data}
          width={screenWidth - 40}
          height={220}
          strokeWidth={16}
          radius={32}
          chartConfig={chartConfig}
          hideLegend={false}
        />
      </View>

      <View style={styles.grid}>
        <View style={[styles.card, styles.white]}>
          <FontAwesome5 name="walking" size={28} color="#e60404" />
          <Text style={styles.cardTitle}>Pasos</Text>
          <Text style={styles.cardValue}>891</Text>
          <Text style={styles.cardUnit}>steps</Text>
        </View>
        <View style={[styles.card, styles.white]}>
          <Ionicons name="bed-outline" size={20} color="#e60404" />
          <Text style={styles.cardTitle}>Sueño</Text>
          <Text style={styles.cardValue}>8.12</Text>
          <Text style={styles.cardUnit}>horas</Text>
        </View>
        <View style={[styles.card, styles.white]}>
          <MaterialCommunityIcons name="fire" size={28} color="#e60404" />
          <Text style={styles.cardTitle}>Calorías</Text>
          <Text style={styles.cardValue}>345</Text>
          <Text style={styles.cardUnit}>kcal</Text>
        </View>
        <View style={[styles.card, styles.white]}>
          <Ionicons name="heart-circle-outline" size={28} color="#e60404" />
          <Text style={styles.cardTitle}>Corazón</Text>
          <Text style={styles.cardValue}>71</Text>
          <Text style={styles.cardUnit}>bpm</Text>
        </View>
        <View style={[styles.card, styles.white]}>
          <FontAwesome5 name="dumbbell" size={28} color="#e60404" />
          <Text style={styles.cardTitle}>Entreno</Text>
          <Text style={styles.cardValue}>32</Text>
          <Text style={styles.cardUnit}>minutos</Text>
        </View>
        <View style={[styles.card, styles.white]}>
          <Ionicons name="water" size={28} color="#e60404" />
          <Text style={styles.cardTitle}>Agua</Text>
          <Text style={styles.cardValue}>2.5</Text>
          <Text style={styles.cardUnit}>litros</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#white',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfo: {
    marginLeft: 15,
    flex: 1,
  },
  date: {
    color: '#white',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  greeting: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
  },
  trophy: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#e60404',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: (screenWidth - 60) / 2,
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 14,
    color: '#555',
    fontFamily: 'Inter_400Regular',
    marginTop: 10,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    fontFamily: 'Inter_700Bold',
    marginTop: 5,
  },
  cardUnit: {
    fontSize: 12,
    color: '#aaa',
    fontFamily: 'Inter_400Regular',
  },
  red: {
    backgroundColor: '#ffeaea',
  },
  gray: {
    backgroundColor: '#f1f1f1',
  },
  blue: {
    backgroundColor: '#e3f0ff',
  },
  white: {
    backgroundColor: '#ffffff',
  },
});
