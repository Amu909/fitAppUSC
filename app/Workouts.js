import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const categories = [
  { id: '1', title: 'BRAZOS', image: require('../assets/images/WORKOUTS/BRAZOS.png') },
  { id: '2', title: 'RUNNING', image: require('../assets/images/WORKOUTS/RUNNING.png') },
  { id: '3', title: 'ENTRENAMIENTO DE FUERZA', image: require('../assets/images/WORKOUTS/FUERZA.png') },
  { id: '4', title: 'PECHO', image: require('../assets/images/WORKOUTS/PECHO.png') },
  // Puedes seguir agregando más categorías
];

const programs = [
  { id: '1', title: 'Cross-Training to 5K', trainer: 'with Meg', image: require('../assets/images/WORKOUTS/CROSS.png') },
  { id: '2', title: 'HIIT Burnout', trainer: 'with Akeem', image: require('../assets/images/WORKOUTS/HIIT.png') },
  // Puedes seguir agregando más programas
];

const HomeScreen = () => {
  const handleCategoryPress = (item) => {
    console.log('Pressed category:', item.title);
  };

  const handleProgramPress = (item) => {
    console.log('Pressed program:', item.title);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput placeholder="Search" style={styles.searchInput} />
        <Ionicons name="notifications-outline" size={24} color="#999" />
      </View>

      {/* Workout Categories */}
      <Text style={styles.sectionTitle}>Workout categories</Text>
      <FlatList
        data={categories}
        horizontal
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleCategoryPress(item)}
            style={styles.categoryCard}
          >
            <Image source={item.image} style={styles.categoryImage} />
            <View style={styles.overlay}>
              <Text style={styles.categoryText}>{item.title}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Programs for you */}
      <View style={styles.programHeader}>
        <Text style={styles.sectionTitle}>Programs for you</Text>
        <Text style={styles.seeAll}>See all</Text>
      </View>

      <FlatList
        horizontal
        data={programs}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleProgramPress(item)} style={styles.programCard}>
            <Image source={item.image} style={styles.programImage} />
            <Text style={styles.programTitle}>{item.title}</Text>
            <Text style={styles.programTrainer}>{item.trainer}</Text>
          </TouchableOpacity>
        )}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 10,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
    marginBottom: 10,
  },
  categoryCard: {
    width: 140,
    height: 140,
    borderRadius: 10,
    marginRight: 15,
    overflow: 'hidden',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  programHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  seeAll: {
    color: '#e60404',
    fontWeight: '600',
  },
  programCard: {
    width: Dimensions.get('window').width * 0.6,
    marginRight: 15,
  },
  programImage: {
    width: '100%',
    height: 140,
    borderRadius: 10,
  },
  programTitle: {
    fontWeight: 'bold',
    marginTop: 5,
    fontSize: 16,
  },
  programTrainer: {
    color: '#666',
  },
});

export default HomeScreen;
