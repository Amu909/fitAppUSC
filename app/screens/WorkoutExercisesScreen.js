import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../ThemeContext';
import AIAssistantPanel from '../AIAssistantPanel';
import { requestModuleInsight } from '../utils/aiClient';
import { enrichExercisesWithRemoteMedia } from '../utils/exerciseMedia';
import { EXERCISE_LIBRARY, SEARCH_HINTS } from '../utils/workoutLibrary';

const getLevelStyle = (level) => {
  switch (level) {
    case 'Principiante':
      return { backgroundColor: '#dcfce7', color: '#166534' };
    case 'Intermedio':
      return { backgroundColor: '#fef3c7', color: '#92400e' };
    case 'Avanzado':
      return { backgroundColor: '#fee2e2', color: '#991b1b' };
    default:
      return { backgroundColor: '#e5e7eb', color: '#374151' };
  }
};

const AnimatedExerciseCard = ({ exercise, index, onPress }) => {
  const { theme, isDark } = useTheme();
  const translateY = useRef(new Animated.Value(24)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, delay: index * 90, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 320, delay: index * 90, useNativeDriver: true }),
    ]).start();
  }, [index, opacity, translateY]);

  const levelStyle = getLevelStyle(exercise.level);

  return (
    <Animated.View style={[styles.exerciseCard, { backgroundColor: theme.surface, borderColor: theme.border, shadowOpacity: isDark ? 0 : 0.05, elevation: isDark ? 0 : 2, opacity, transform: [{ translateY }] }]}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <View style={styles.exerciseTopRow}>
          {exercise.remoteMedia?.gifUrl ? (
            <Image
              source={{ uri: exercise.remoteMedia.gifUrl }}
              style={styles.exerciseThumb}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.exerciseBadge}>
              <Text style={styles.exerciseBadgeText}>{String(index + 1).padStart(2, '0')}</Text>
            </View>
          )}
          <View style={styles.exerciseHeading}>
            <Text style={[styles.exerciseName, { color: theme.text }]}>{exercise.name}</Text>
            <Text style={[styles.exerciseFocus, { color: theme.textMuted }]}>{exercise.focus}</Text>
          </View>
          <View style={[styles.levelPill, { backgroundColor: levelStyle.backgroundColor }]}>
            <Text style={[styles.levelText, { color: levelStyle.color }]}>{exercise.level}</Text>
          </View>
        </View>
        <View style={styles.exerciseMetaRow}>
          <Text style={[styles.metaLabel, { color: theme.textMuted }]}>Volumen</Text>
          <Text style={styles.exerciseReps}>{exercise.reps}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const WorkoutExercisesScreen = ({ route }) => {
  const navigation = useNavigation();
  const { userProfile } = useAuth();
  const { theme, isDark } = useTheme();
  const { group, title, subtitle, coverImage } = route.params;
  const [searchText, setSearchText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState('');
  const [allExercises, setAllExercises] = useState(EXERCISE_LIBRARY[group] || []);

  useEffect(() => {
    let active = true;
    const baseExercises = EXERCISE_LIBRARY[group] || [];
    setAllExercises(baseExercises);

    const loadRemoteMedia = async () => {
      const enriched = await enrichExercisesWithRemoteMedia(baseExercises, group);
      if (active) {
        setAllExercises(enriched);
      }
    };

    loadRemoteMedia();

    return () => {
      active = false;
    };
  }, [group]);

  const exercises = useMemo(() => {
    if (!searchText) return allExercises;
    return allExercises.filter((exercise) =>
      `${exercise.name} ${exercise.focus} ${exercise.description}`.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [allExercises, searchText]);

  const searchPlaceholder = SEARCH_HINTS[group] || 'Busca ejercicios dentro de este grupo';

  const handleGroupAI = async () => {
    setAiLoading(true);
    try {
      const result = await requestModuleInsight({
        module: 'Detalle de rutina',
        intent: `Personaliza una sesion de ${title || group} con orden de ejercicios, volumen, descansos y ajustes por nivel.`,
        userProfile,
        moduleData: {
          grupo: group,
          titulo: title,
          subtitulo: subtitle,
          busqueda_actual: searchText,
          ejercicios: allExercises.map((exercise) => ({
            nombre: exercise.name,
            volumen: exercise.reps,
            foco: exercise.focus,
            nivel: exercise.level,
            descripcion: exercise.description,
          })),
        },
      });
      setAiInsight(result.insight);
    } catch (error) {
      Alert.alert('IA no disponible', 'No fue posible personalizar esta rutina.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.kicker, { color: theme.primary }]}>Biblioteca de ejercicios</Text>
      <Text style={[styles.title, { color: theme.text }]}>{title || group}</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle || `Seleccion de ejercicios para ${group}`}</Text>

      <AIAssistantPanel
        title="Personalizacion inteligente"
        subtitle="Ajusta esta sesion segun tu perfil, objetivo y nivel de esfuerzo."
        buttonLabel="Personalizar sesion"
        loading={aiLoading}
        insight={aiInsight}
        onPress={handleGroupAI}
      />

      <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.heroTitle, { color: theme.text }]}>Busca en vivo</Text>
        <Text style={[styles.heroText, { color: theme.textMuted }]}>Escribe y el filtrado se aplica de inmediato, sin necesidad de pulsar un boton.</Text>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <TextInput
          placeholder={searchPlaceholder}
          placeholderTextColor={theme.textSoft}
          style={[styles.searchInput, { color: theme.text }]}
          value={searchText}
          onChangeText={setSearchText}
          autoCorrect={false}
        />
      </View>

      <View style={styles.exerciseList}>
        {exercises.map((exercise, index) => (
          <AnimatedExerciseCard
            key={`${exercise.name}-${index}`}
            exercise={exercise}
            index={index}
            onPress={() =>
              navigation.navigate('WorkoutExerciseDetailScreen', {
                exercise,
                group,
                fallbackImage: exercise.image || coverImage,
              })
            }
          />
        ))}
        {!exercises.length ? (
          <View style={[styles.emptyState, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No encontramos ejercicios</Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>Prueba con otra palabra clave dentro de este grupo.</Text>
          </View>
        ) : null}
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('WorkoutTimerScreen', { type: title || group })}>
        <Text style={styles.primaryButtonText}>Iniciar sesion</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.secondaryButton, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => navigation.goBack()}>
        <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Volver a rutinas</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f5' },
  content: { padding: 20, paddingTop: 56, paddingBottom: 32 },
  kicker: { color: '#e60404', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { fontSize: 31, fontWeight: '800', color: '#111827', marginTop: 8 },
  subtitle: { fontSize: 15, color: '#4b5563', marginTop: 8, lineHeight: 22 },
  heroCard: { marginTop: 20, backgroundColor: '#ffffff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#ece8e1' },
  heroTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  heroText: { fontSize: 14, color: '#6b7280', lineHeight: 21, marginTop: 8 },
  searchContainer: { marginTop: 16, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 14 },
  searchInput: { fontSize: 15, paddingVertical: 14 },
  exerciseList: { marginTop: 18 },
  exerciseCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#ece8e1', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  exerciseTopRow: { flexDirection: 'row', alignItems: 'center' },
  exerciseBadge: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  exerciseBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  exerciseThumb: { width: 64, height: 64, borderRadius: 14, marginRight: 12, backgroundColor: '#e5e7eb' },
  exerciseHeading: { flex: 1, paddingRight: 10 },
  exerciseName: { fontSize: 17, fontWeight: '700', color: '#111827' },
  exerciseFocus: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  levelPill: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999 },
  levelText: { fontSize: 11, fontWeight: '700' },
  exerciseMetaRow: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaLabel: { color: '#6b7280', fontSize: 13 },
  exerciseReps: { color: '#e60404', fontSize: 14, fontWeight: '700' },
  primaryButton: { marginTop: 18, backgroundColor: '#e60404', borderRadius: 28, paddingVertical: 16, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryButton: { marginTop: 12, backgroundColor: '#fff', borderRadius: 28, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#d1d5db' },
  secondaryButtonText: { color: '#374151', fontSize: 15, fontWeight: '600' },
  emptyState: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#e5e7eb' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  emptyText: { marginTop: 8, color: '#6b7280' },
});

export default WorkoutExercisesScreen;
