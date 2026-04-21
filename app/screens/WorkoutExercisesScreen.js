import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const EXERCISE_LIBRARY = {
  Brazos: [
    { name: 'Curl de biceps', reps: '4 x 12', focus: 'Biceps braquial', level: 'Intermedio', image: require('../../assets/images/WORKOUTS/BRAZOS.png'), description: 'Movimiento controlado para desarrollar fuerza en biceps y antebrazo.' },
    { name: 'Fondos en banco', reps: '4 x 10', focus: 'Triceps', level: 'Principiante', image: require('../../assets/images/WORKOUTS/BRAZOS.png'), description: 'Ejercicio de empuje para activar la parte posterior del brazo.' },
    { name: 'Curl martillo', reps: '3 x 12', focus: 'Braquial y antebrazo', level: 'Intermedio', image: require('../../assets/images/WORKOUTS/BRAZOS.png'), description: 'Variante ideal para mejorar volumen y estabilidad de agarre.' },
    { name: 'Extension de triceps', reps: '3 x 15', focus: 'Triceps', level: 'Intermedio', image: require('../../assets/images/WORKOUTS/BRAZOS.png'), description: 'Aislamiento para potenciar extension completa del codo.' },
  ],
  Cardio: [
    { name: 'Trote continuo', reps: '20 min', focus: 'Resistencia aerobica', level: 'Principiante', image: require('../../assets/images/WORKOUTS/RUNNING.png'), description: 'Trabajo constante para mejorar resistencia y recuperacion cardiaca.' },
    { name: 'Sprints cortos', reps: '10 x 30 s', focus: 'Velocidad y potencia', level: 'Avanzado', image: require('../../assets/images/WORKOUTS/RUNNING.png'), description: 'Intervalico de alta intensidad para velocidad y potencia.' },
    { name: 'Saltos de cuerda', reps: '5 x 2 min', focus: 'Capacidad cardiovascular', level: 'Intermedio', image: require('../../assets/images/WORKOUTS/HIIT.png'), description: 'Movimiento ritmico que eleva pulsaciones y coordinacion.' },
    { name: 'Burpees', reps: '4 x 12', focus: 'Trabajo metabolico', level: 'Intermedio', image: require('../../assets/images/WORKOUTS/HIIT.png'), description: 'Patron global para mejorar acondicionamiento fisico general.' },
  ],
  'Fuerza total': [
    { name: 'Sentadilla', reps: '4 x 10', focus: 'Piernas y core', level: 'Principiante', image: require('../../assets/images/WORKOUTS/FUERZA.png'), description: 'Base de fuerza para tren inferior y control postural.' },
    { name: 'Peso muerto', reps: '4 x 8', focus: 'Cadena posterior', level: 'Intermedio', image: require('../../assets/images/WORKOUTS/FUERZA.png'), description: 'Ejercicio compuesto para gluteos, espalda y femoral.' },
    { name: 'Press militar', reps: '4 x 10', focus: 'Hombros y triceps', level: 'Intermedio', image: require('../../assets/images/WORKOUTS/FUERZA.png'), description: 'Empuje vertical para fuerza de hombros y control del core.' },
    { name: 'Remo con barra', reps: '4 x 10', focus: 'Espalda', level: 'Intermedio', image: require('../../assets/images/WORKOUTS/FUERZA.png'), description: 'Tiron horizontal enfocado en espalda media y dorsales.' },
  ],
  Pecho: [
    { name: 'Press plano', reps: '4 x 10', focus: 'Pectoral mayor', level: 'Intermedio', image: require('../../assets/images/WORKOUTS/PECHO.png'), description: 'Ejercicio principal de empuje horizontal para desarrollo del pecho.' },
    { name: 'Flexiones', reps: '4 x 15', focus: 'Pecho y core', level: 'Principiante', image: require('../../assets/images/WORKOUTS/PECHO.png'), description: 'Patron basico de empuje con control de tronco y hombros.' },
    { name: 'Aperturas con mancuernas', reps: '3 x 12', focus: 'Pectoral', level: 'Intermedio', image: require('../../assets/images/WORKOUTS/PECHO.png'), description: 'Movimiento de apertura para trabajo analitico del pectoral.' },
    { name: 'Press inclinado', reps: '3 x 10', focus: 'Pecho superior', level: 'Intermedio', image: require('../../assets/images/WORKOUTS/PECHO.png'), description: 'Variante de empuje para enfatizar la zona clavicular.' },
  ],
  Espalda: [
    { name: 'Dominadas', reps: '4 x 8', focus: 'Dorsales', level: 'Avanzado', image: require('../../assets/images/WORKOUTS/FUERZA.png'), description: 'Tiron vertical de alta demanda para dorsal y agarre.' },
    { name: 'Remo con mancuerna', reps: '4 x 12', focus: 'Espalda media', level: 'Intermedio', image: require('../../assets/images/WORKOUTS/FUERZA.png'), description: 'Trabajo unilateral para corregir asimetrias y ganar control.' },
    { name: 'Jalon al pecho', reps: '3 x 12', focus: 'Dorsal ancho', level: 'Principiante', image: require('../../assets/images/WORKOUTS/FUERZA.png'), description: 'Alternativa guiada para construir fuerza en espalda.' },
    { name: 'Face pulls', reps: '3 x 15', focus: 'Trapecio y deltoide posterior', level: 'Intermedio', image: require('../../assets/images/WORKOUTS/FUERZA.png'), description: 'Ejercicio correctivo para hombro y postura.' },
  ],
  Piernas: [
    { name: 'Sentadilla goblet', reps: '4 x 12', focus: 'Cuadriceps y gluteos', level: 'Principiante', image: require('../../assets/images/WORKOUTS/RUNNING.png'), description: 'Sentadilla accesible para aprender patron de movimiento.' },
    { name: 'Zancadas', reps: '3 x 12 por pierna', focus: 'Piernas y estabilidad', level: 'Intermedio', image: require('../../assets/images/WORKOUTS/RUNNING.png'), description: 'Trabajo unilateral para fuerza, coordinacion y equilibrio.' },
    { name: 'Hip thrust', reps: '4 x 10', focus: 'Gluteos', level: 'Intermedio', image: require('../../assets/images/WORKOUTS/CROSS.png'), description: 'Empuje de cadera para desarrollar potencia posterior.' },
    { name: 'Elevacion de talones', reps: '4 x 20', focus: 'Pantorrillas', level: 'Principiante', image: require('../../assets/images/WORKOUTS/RUNNING.png'), description: 'Aislamiento de gemelos con alto volumen.' },
  ],
  Hombros: [
    { name: 'Press militar con mancuernas', reps: '4 x 10', focus: 'Deltoides anterior', level: 'Intermedio', image: require('../../assets/images/WORKOUTS/FUERZA.png'), description: 'Empuje vertical con recorrido controlado y estable.' },
    { name: 'Elevaciones laterales', reps: '4 x 15', focus: 'Deltoide medio', level: 'Principiante', image: require('../../assets/images/WORKOUTS/FUERZA.png'), description: 'Trabajo analitico para anchura visual del hombro.' },
    { name: 'Pajaros', reps: '3 x 15', focus: 'Deltoide posterior', level: 'Intermedio', image: require('../../assets/images/WORKOUTS/FUERZA.png'), description: 'Movimiento clave para hombro posterior y postura.' },
    { name: 'Encogimientos', reps: '3 x 15', focus: 'Trapecio', level: 'Principiante', image: require('../../assets/images/WORKOUTS/FUERZA.png'), description: 'Trabajo puntual de trapecio superior.' },
  ],
  Core: [
    { name: 'Plancha frontal', reps: '4 x 40 s', focus: 'Abdomen profundo', level: 'Principiante', image: require('../../assets/images/WORKOUTS/HIIT.png'), description: 'Estabilizacion central para mejorar control del tronco.' },
    { name: 'Crunch bicicleta', reps: '4 x 20', focus: 'Oblicuos', level: 'Intermedio', image: require('../../assets/images/WORKOUTS/HIIT.png'), description: 'Patron dinamico orientado a oblicuos y coordinacion.' },
    { name: 'Elevaciones de piernas', reps: '4 x 15', focus: 'Abdomen inferior', level: 'Intermedio', image: require('../../assets/images/WORKOUTS/HIIT.png'), description: 'Trabajo de flexion de cadera y control abdominal.' },
    { name: 'Mountain climbers', reps: '4 x 30 s', focus: 'Core y cardio', level: 'Intermedio', image: require('../../assets/images/WORKOUTS/HIIT.png'), description: 'Ejercicio dinamico para abdomen y acondicionamiento.' },
  ],
  Gluteos: [
    { name: 'Hip thrust', reps: '4 x 12', focus: 'Gluteo mayor', level: 'Intermedio', image: require('../../assets/images/WORKOUTS/CROSS.png'), description: 'Movimiento dominante de cadera para potencia de gluteo.' },
    { name: 'Patada de gluteo', reps: '3 x 15 por pierna', focus: 'Extension de cadera', level: 'Principiante', image: require('../../assets/images/WORKOUTS/CROSS.png'), description: 'Aislamiento simple para activacion glutea.' },
    { name: 'Sentadilla sumo', reps: '4 x 12', focus: 'Gluteos y aductores', level: 'Intermedio', image: require('../../assets/images/WORKOUTS/CROSS.png'), description: 'Variante amplia para gluteo y muslo interno.' },
    { name: 'Puente de gluteo', reps: '4 x 15', focus: 'Activacion y fuerza', level: 'Principiante', image: require('../../assets/images/WORKOUTS/CROSS.png'), description: 'Ejercicio base para activar la cadena posterior.' },
  ],
};

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
    <Animated.View style={[styles.exerciseCard, { opacity, transform: [{ translateY }] }]}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <View style={styles.exerciseTopRow}>
          <View style={styles.exerciseBadge}>
            <Text style={styles.exerciseBadgeText}>{String(index + 1).padStart(2, '0')}</Text>
          </View>
          <View style={styles.exerciseHeading}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            <Text style={styles.exerciseFocus}>{exercise.focus}</Text>
          </View>
          <View style={[styles.levelPill, { backgroundColor: levelStyle.backgroundColor }]}>
            <Text style={[styles.levelText, { color: levelStyle.color }]}>{exercise.level}</Text>
          </View>
        </View>
        <View style={styles.exerciseMetaRow}>
          <Text style={styles.metaLabel}>Volumen</Text>
          <Text style={styles.exerciseReps}>{exercise.reps}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const WorkoutExercisesScreen = ({ route }) => {
  const navigation = useNavigation();
  const { group, title, subtitle, coverImage } = route.params;
  const [searchText, setSearchText] = useState('');
  const allExercises = useMemo(() => EXERCISE_LIBRARY[group] || [], [group]);

  const exercises = useMemo(() => {
    if (!searchText) return allExercises;
    return allExercises.filter((exercise) =>
      `${exercise.name} ${exercise.focus} ${exercise.description}`.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [allExercises, searchText]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>Biblioteca de ejercicios</Text>
      <Text style={styles.title}>{title || group}</Text>
      <Text style={styles.subtitle}>{subtitle || `Seleccion de ejercicios para ${group}`}</Text>

      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Busca en vivo</Text>
        <Text style={styles.heroText}>Escribe y el filtrado se aplica de inmediato, sin necesidad de pulsar un boton.</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Busca ejercicios, por ejemplo press plano"
          style={styles.searchInput}
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
                fallbackImage: exercise.image || coverImage,
              })
            }
          />
        ))}
        {!exercises.length ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No encontramos ejercicios</Text>
            <Text style={styles.emptyText}>Prueba con otra palabra clave dentro de este grupo.</Text>
          </View>
        ) : null}
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('WorkoutTimerScreen', { type: title || group })}>
        <Text style={styles.primaryButtonText}>Iniciar sesion</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
        <Text style={styles.secondaryButtonText}>Volver a rutinas</Text>
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
