import React, { useMemo, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';

const screenWidth = Dimensions.get('window').width;

const categories = [
  { id: '1', title: 'BRAZOS', image: require('../../assets/images/WORKOUTS/BRAZOS.png'), exerciseGroup: 'Brazos', subtitle: 'Biceps, triceps y antebrazo' },
  { id: '2', title: 'RUNNING', image: require('../../assets/images/WORKOUTS/RUNNING.png'), exerciseGroup: 'Cardio', subtitle: 'Resistencia y capacidad aerobica' },
  { id: '3', title: 'FUERZA', image: require('../../assets/images/WORKOUTS/FUERZA.png'), exerciseGroup: 'Fuerza total', subtitle: 'Trabajo compuesto de cuerpo completo' },
  { id: '4', title: 'PECHO', image: require('../../assets/images/WORKOUTS/PECHO.png'), exerciseGroup: 'Pecho', subtitle: 'Pectoral mayor, menor y empuje' },
  { id: '5', title: 'ESPALDA', image: require('../../assets/images/WORKOUTS/FUERZA.png'), exerciseGroup: 'Espalda', subtitle: 'Dorsal, trapecio y zona media' },
  { id: '6', title: 'PIERNAS', image: require('../../assets/images/WORKOUTS/RUNNING.png'), exerciseGroup: 'Piernas', subtitle: 'Cuadriceps, femoral y pantorrilla' },
  { id: '7', title: 'HOMBROS', image: require('../../assets/images/WORKOUTS/CROSS.png'), exerciseGroup: 'Hombros', subtitle: 'Deltoides y estabilidad' },
  { id: '8', title: 'CORE', image: require('../../assets/images/WORKOUTS/HIIT.png'), exerciseGroup: 'Core', subtitle: 'Abdomen, oblicuos y zona lumbar' },
  { id: '9', title: 'GLUTEOS', image: require('../../assets/images/WORKOUTS/CROSS.png'), exerciseGroup: 'Gluteos', subtitle: 'Potencia de cadera y estabilidad' },
];

const programs = [
  { id: '1', title: 'Cross-Training to 5K', trainer: 'with Meg', image: require('../../assets/images/WORKOUTS/CROSS.png'), exerciseGroup: 'Cardio' },
  { id: '2', title: 'HIIT Burnout', trainer: 'with Akeem', image: require('../../assets/images/WORKOUTS/HIIT.png'), exerciseGroup: 'Core' },
  { id: '3', title: 'Upper Body Builder', trainer: 'with Sofia', image: require('../../assets/images/WORKOUTS/BRAZOS.png'), exerciseGroup: 'Brazos' },
  { id: '4', title: 'Leg Power', trainer: 'with Daniel', image: require('../../assets/images/WORKOUTS/RUNNING.png'), exerciseGroup: 'Piernas' },
];

const matchesSearch = (item, term) => {
  if (!term) return true;
  const haystack = `${item.title} ${item.exerciseGroup} ${item.subtitle || ''} ${item.trainer || ''}`.toLowerCase();
  return haystack.includes(term.toLowerCase());
};

const HomeScreen = () => {
  const navigation = useNavigation();
  const [searchText, setSearchText] = useState('');

  const filteredCategories = useMemo(
    () => categories.filter((item) => matchesSearch(item, searchText)),
    [searchText]
  );

  const filteredPrograms = useMemo(
    () => programs.filter((item) => matchesSearch(item, searchText)),
    [searchText]
  );

  const openWorkoutGroup = (item) => {
    navigation.navigate('WorkoutExercisesScreen', {
      group: item.exerciseGroup,
      title: item.title,
      subtitle: item.subtitle || item.trainer,
      coverImage: item.image,
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          placeholder="Busca grupo muscular o rutina"
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searchText ? (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={22} color="#999" />
          </TouchableOpacity>
        ) : (
          <Ionicons name="notifications-outline" size={24} color="#999" />
        )}
      </View>

      <Text style={styles.feedbackText}>
        {searchText ? `Resultados en tiempo real para "${searchText}"` : 'Selecciona un grupo muscular para ver sus ejercicios'}
      </Text>

      <Text style={styles.sectionTitle}>Rutinas por grupo muscular</Text>
      <FlatList
        data={filteredCategories}
        horizontal
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Sin coincidencias</Text>
            <Text style={styles.emptyText}>Prueba con palabras como pecho, piernas o brazos.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => openWorkoutGroup(item)} style={styles.categoryCard} activeOpacity={0.85}>
            <Image source={item.image} style={styles.categoryImage} />
            <View style={styles.overlay}>
              <Text style={styles.categoryText}>{item.title}</Text>
              <Text style={styles.categorySubtitle}>{item.subtitle}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <View style={styles.programHeader}>
        <Text style={styles.sectionTitle}>Programas sugeridos</Text>
        <Text style={styles.seeAll}>Ver todos</Text>
      </View>

      <FlatList
        horizontal
        data={filteredPrograms}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryList}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => openWorkoutGroup(item)} style={styles.programCard} activeOpacity={0.85}>
            <Image source={item.image} style={styles.programImage} />
            <Text style={styles.programTitle}>{item.title}</Text>
            <Text style={styles.programTrainer}>{item.trainer}</Text>
            <Text style={styles.programTarget}>Enfocado en {item.exerciseGroup}</Text>
          </TouchableOpacity>
        )}
      />

      <View style={styles.gridSection}>
        <Text style={styles.sectionTitle}>Explora mas rutinas</Text>
        <View style={styles.grid}>
          {filteredCategories.map((item) => (
            <TouchableOpacity key={item.id} style={styles.quickButton} onPress={() => openWorkoutGroup(item)} activeOpacity={0.85}>
              <Text style={styles.quickButtonTitle}>{item.title}</Text>
              <Text style={styles.quickButtonText}>{item.exerciseGroup}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 50 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    marginBottom: 12,
  },
  searchInput: { flex: 1, marginHorizontal: 10, fontSize: 16 },
  feedbackText: { marginHorizontal: 16, marginBottom: 10, color: '#6b7280', fontSize: 13 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 16, marginBottom: 10, color: '#111827' },
  categoryList: { paddingHorizontal: 16 },
  categoryCard: { width: 180, height: 180, borderRadius: 16, marginRight: 15, overflow: 'hidden', backgroundColor: '#1f2937' },
  categoryImage: { width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end', padding: 14 },
  categoryText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  categorySubtitle: { color: '#f3f4f6', fontSize: 12, marginTop: 4 },
  programHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginTop: 24, marginBottom: 10 },
  seeAll: { color: '#e60404', fontWeight: '600' },
  programCard: {
    width: screenWidth * 0.62,
    marginRight: 15,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  programImage: { width: '100%', height: 150, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  programTitle: { fontWeight: 'bold', marginTop: 10, fontSize: 16, marginHorizontal: 12, color: '#111827' },
  programTrainer: { color: '#6b7280', marginHorizontal: 12, marginTop: 4 },
  programTarget: { color: '#e60404', marginHorizontal: 12, marginTop: 6, fontWeight: '600' },
  gridSection: { marginTop: 28, paddingBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16 },
  quickButton: { width: '48%', backgroundColor: '#f8fafc', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  quickButtonTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  quickButtonText: { marginTop: 6, fontSize: 13, color: '#6b7280' },
  emptyState: { width: 260, backgroundColor: '#f8fafc', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#e5e7eb' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  emptyText: { marginTop: 8, color: '#6b7280', lineHeight: 20 },
});

export default HomeScreen;
