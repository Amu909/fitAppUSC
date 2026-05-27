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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import AIAssistantPanel from './AIAssistantPanel';
import { requestModuleInsight } from './utils/aiClient';

const screenWidth = Dimensions.get('window').width;

const categories = [
  { id: '1', title: 'PECHO', image: require('../assets/images/WORKOUTS/PECHO.png'), exerciseGroup: 'Pecho', subtitle: 'Presses, aperturas y fondos' },
  { id: '2', title: 'ESPALDA', image: require('../assets/images/WORKOUTS/FUERZA.png'), exerciseGroup: 'Espalda', subtitle: 'Tirones, remos y peso muerto' },
  { id: '3', title: 'HOMBROS', image: require('../assets/images/WORKOUTS/CROSS.png'), exerciseGroup: 'Hombros', subtitle: 'Press y elevaciones del deltoide' },
  { id: '4', title: 'BICEPS', image: require('../assets/images/WORKOUTS/BRAZOS.png'), exerciseGroup: 'Biceps', subtitle: 'Curls y trabajo de flexion' },
  { id: '5', title: 'TRICEPS', image: require('../assets/images/WORKOUTS/BRAZOS.png'), exerciseGroup: 'Triceps', subtitle: 'Extensiones, fondos y press' },
  { id: '6', title: 'ANTEBRAZOS', image: require('../assets/images/WORKOUTS/BRAZOS.png'), exerciseGroup: 'Antebrazos', subtitle: 'Muneca, agarre y control' },
  { id: '7', title: 'ABDOMINALES', image: require('../assets/images/WORKOUTS/HIIT.png'), exerciseGroup: 'Abdominales', subtitle: 'Core frontal, inferior y oblicuos' },
  { id: '8', title: 'CUADRICEPS', image: require('../assets/images/WORKOUTS/RUNNING.png'), exerciseGroup: 'Cuadriceps', subtitle: 'Sentadillas, prensa y zancadas' },
  { id: '9', title: 'ISQUIOTIBIALES', image: require('../assets/images/WORKOUTS/RUNNING.png'), exerciseGroup: 'Isquiotibiales', subtitle: 'Cadena posterior y femoral' },
  { id: '10', title: 'GLUTEOS', image: require('../assets/images/WORKOUTS/CROSS.png'), exerciseGroup: 'Gluteos', subtitle: 'Empuje de cadera y estabilidad' },
  { id: '11', title: 'PANTORRILLAS', image: require('../assets/images/WORKOUTS/RUNNING.png'), exerciseGroup: 'Pantorrillas', subtitle: 'Elevaciones y trabajo de gemelo' },
  { id: '12', title: 'ADUCTORES', image: require('../assets/images/WORKOUTS/CROSS.png'), exerciseGroup: 'Aductores', subtitle: 'Muslo interno y control lateral' },
  { id: '13', title: 'ABDUCTORES', image: require('../assets/images/WORKOUTS/CROSS.png'), exerciseGroup: 'Abductores', subtitle: 'Cadera externa y estabilidad' },
  { id: '14', title: 'CARDIO', image: require('../assets/images/WORKOUTS/RUNNING.png'), exerciseGroup: 'Cardio', subtitle: 'Resistencia y capacidad aerobica' },
];

const programs = [
  { id: '1', title: 'Empuje de pecho', trainer: 'with Meg', image: require('../assets/images/WORKOUTS/PECHO.png'), exerciseGroup: 'Pecho' },
  { id: '2', title: 'Espalda y agarre', trainer: 'with Akeem', image: require('../assets/images/WORKOUTS/FUERZA.png'), exerciseGroup: 'Espalda' },
  { id: '3', title: 'Brazos completos', trainer: 'with Sofia', image: require('../assets/images/WORKOUTS/BRAZOS.png'), exerciseGroup: 'Biceps' },
  { id: '4', title: 'Pierna dominante', trainer: 'with Daniel', image: require('../assets/images/WORKOUTS/RUNNING.png'), exerciseGroup: 'Cuadriceps' },
];

const matchesSearch = (item, term) => {
  if (!term) return true;
  const haystack = `${item.title} ${item.exerciseGroup} ${item.subtitle || ''} ${item.trainer || ''}`.toLowerCase();
  return haystack.includes(term.toLowerCase());
};

const HomeScreen = () => {
  const navigation = useNavigation();
  const { userProfile } = useAuth();
  const { theme, isDark } = useTheme();
  const [searchText, setSearchText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState('');

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

  const handleWorkoutAI = async () => {
    setAiLoading(true);
    try {
      const result = await requestModuleInsight({
        module: 'Rutinas',
        intent: 'Genera una rutina semanal personalizada con calentamiento, bloques principales, descanso y progresion.',
        userProfile,
        moduleData: {
          busqueda_actual: searchText,
          grupos_disponibles: categories.map((item) => item.exerciseGroup),
          programas_sugeridos: programs.map((item) => ({
            titulo: item.title,
            enfoque: item.exerciseGroup,
          })),
        },
      });
      setAiInsight(result.insight);
    } catch (error) {
      Alert.alert('IA no disponible', 'No fue posible generar la rutina personalizada.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
        <Ionicons name="search" size={20} color={theme.textSoft} />
        <TextInput
          placeholder="Busca grupo muscular o rutina"
          placeholderTextColor={theme.textSoft}
          style={[styles.searchInput, { color: theme.text }]}
          value={searchText}
          onChangeText={setSearchText}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searchText ? (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={22} color={theme.textSoft} />
          </TouchableOpacity>
        ) : (
          <Ionicons name="notifications-outline" size={24} color={theme.textSoft} />
        )}
      </View>

      <Text style={[styles.feedbackText, { color: theme.textMuted }]}>
        {searchText ? `Resultados en tiempo real para "${searchText}"` : 'Selecciona un grupo muscular para ver sus ejercicios'}
      </Text>

      <View style={styles.aiWrap}>
        <AIAssistantPanel
          title="Rutina con IA"
          subtitle="Crea una semana de entrenamiento usando tu perfil y los grupos disponibles."
          buttonLabel="Generar rutina"
          loading={aiLoading}
          insight={aiInsight}
          onPress={handleWorkoutAI}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Rutinas por grupo muscular</Text>
      <FlatList
        data={filteredCategories}
        horizontal
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryList}
        ListEmptyComponent={
            <View style={[styles.emptyState, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Sin coincidencias</Text>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>Prueba con palabras como pecho, piernas o brazos.</Text>
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
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Programas sugeridos</Text>
        <Text style={[styles.seeAll, { color: theme.primary }]}>Ver todos</Text>
      </View>

      <FlatList
        horizontal
        data={filteredPrograms}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryList}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => openWorkoutGroup(item)} style={[styles.programCard, { backgroundColor: theme.surface, shadowOpacity: isDark ? 0 : 0.12, elevation: isDark ? 0 : 4 }]} activeOpacity={0.85}>
            <Image source={item.image} style={styles.programImage} />
            <Text style={[styles.programTitle, { color: theme.text }]}>{item.title}</Text>
            <Text style={[styles.programTrainer, { color: theme.textMuted }]}>{item.trainer}</Text>
            <Text style={[styles.programTarget, { color: theme.primary }]}>Enfocado en {item.exerciseGroup}</Text>
          </TouchableOpacity>
        )}
      />

      <View style={styles.gridSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Explora mas rutinas</Text>
        <View style={styles.grid}>
          {filteredCategories.map((item) => (
            <TouchableOpacity key={item.id} style={[styles.quickButton, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]} onPress={() => openWorkoutGroup(item)} activeOpacity={0.85}>
              <Text style={[styles.quickButtonTitle, { color: theme.text }]}>{item.title}</Text>
              <Text style={[styles.quickButtonText, { color: theme.textMuted }]}>{item.exerciseGroup}</Text>
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
    borderWidth: 1,
    backgroundColor: '#f0f0f0',
    marginBottom: 12,
  },
  searchInput: { flex: 1, marginHorizontal: 10, fontSize: 16 },
  feedbackText: { marginHorizontal: 16, marginBottom: 10, color: '#6b7280', fontSize: 13 },
  aiWrap: { marginHorizontal: 16 },
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
