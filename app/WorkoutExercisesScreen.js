import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import AIAssistantPanel from './AIAssistantPanel';
import { requestModuleInsight } from './utils/aiClient';

const EXERCISE_LIBRARY = {
  Pecho: [
    { name: 'Press de banca', reps: '4 x 8-10', focus: 'Pectoral medio', level: 'Intermedio', image: require('../assets/images/WORKOUTS/PECHO.png'), description: 'Ejercicio base de empuje horizontal para desarrollar fuerza y masa en pecho.' },
    { name: 'Press inclinado', reps: '4 x 10', focus: 'Pecho superior', level: 'Intermedio', image: require('../assets/images/WORKOUTS/PECHO.png'), description: 'Variante inclinada para enfatizar la zona clavicular del pectoral.' },
    { name: 'Press declinado', reps: '3 x 10', focus: 'Pecho inferior', level: 'Intermedio', image: require('../assets/images/WORKOUTS/PECHO.png'), description: 'Movimiento orientado a la porcion inferior del pecho con buen control de descenso.' },
    { name: 'Aperturas con mancuernas', reps: '3 x 12', focus: 'Aduccion de pecho', level: 'Intermedio', image: require('../assets/images/WORKOUTS/PECHO.png'), description: 'Trabajo de apertura para mejorar estiramiento y contraccion del pectoral.' },
    { name: 'Fondos en paralelas', reps: '3 x 8-12', focus: 'Pecho y triceps', level: 'Avanzado', image: require('../assets/images/WORKOUTS/PECHO.png'), description: 'Empuje en cadena cerrada que combina pecho inferior, hombro y triceps.' },
  ],
  Cardio: [
    { name: 'Cinta de correr', reps: '20-30 min', focus: 'Resistencia aerobica', level: 'Principiante', image: require('../assets/images/WORKOUTS/RUNNING.png'), description: 'Trabajo continuo en cinta para mejorar resistencia y gasto energetico.' },
    { name: 'Bicicleta estatica', reps: '20 min', focus: 'Cardio de bajo impacto', level: 'Principiante', image: require('../assets/images/WORKOUTS/RUNNING.png'), description: 'Opcion estable para resistencia cardiovascular sin tanto impacto articular.' },
    { name: 'Remo', reps: '12-18 min', focus: 'Cardio y espalda', level: 'Intermedio', image: require('../assets/images/WORKOUTS/FUERZA.png'), description: 'Trabajo completo que combina resistencia cardiovascular y traccion.' },
    { name: 'Eliptica', reps: '18-25 min', focus: 'Cardio global', level: 'Principiante', image: require('../assets/images/WORKOUTS/RUNNING.png'), description: 'Movimiento continuo de bajo impacto para subir pulsaciones con fluidez.' },
    { name: 'Escaladora', reps: '10-15 min', focus: 'Piernas y cardio', level: 'Intermedio', image: require('../assets/images/WORKOUTS/RUNNING.png'), description: 'Trabajo intenso para gluteos, piernas y capacidad cardiovascular.' },
  ],
  Espalda: [
    { name: 'Dominadas', reps: '4 x 6-10', focus: 'Dorsales', level: 'Avanzado', image: require('../assets/images/WORKOUTS/FUERZA.png'), description: 'Tiron vertical exigente para dorsal ancho, agarre y control escapular.' },
    { name: 'Jalon al pecho', reps: '4 x 10-12', focus: 'Dorsal ancho', level: 'Principiante', image: require('../assets/images/WORKOUTS/FUERZA.png'), description: 'Variante guiada para aprender el patron de traccion vertical.' },
    { name: 'Remo con barra', reps: '4 x 8-10', focus: 'Espalda media', level: 'Intermedio', image: require('../assets/images/WORKOUTS/FUERZA.png'), description: 'Tiron horizontal compuesto para dorsales, romboides y core.' },
    { name: 'Remo con mancuerna', reps: '4 x 12', focus: 'Espalda media', level: 'Intermedio', image: require('../assets/images/WORKOUTS/FUERZA.png'), description: 'Trabajo unilateral para corregir asimetrias y ganar control.' },
    { name: 'Peso muerto', reps: '4 x 6-8', focus: 'Cadena posterior', level: 'Avanzado', image: require('../assets/images/WORKOUTS/FUERZA.png'), description: 'Compuesto global para espalda, gluteos, femoral y estabilidad.' },
  ],
  Hombros: [
    { name: 'Press militar', reps: '4 x 8-10', focus: 'Deltoide anterior', level: 'Intermedio', image: require('../assets/images/WORKOUTS/FUERZA.png'), description: 'Empuje vertical base para hombro, triceps y estabilidad del core.' },
    { name: 'Elevaciones laterales', reps: '4 x 12-15', focus: 'Deltoide medio', level: 'Principiante', image: require('../assets/images/WORKOUTS/FUERZA.png'), description: 'Movimiento analitico para dar amplitud visual al hombro.' },
    { name: 'Elevaciones frontales', reps: '3 x 12', focus: 'Deltoide anterior', level: 'Principiante', image: require('../assets/images/WORKOUTS/FUERZA.png'), description: 'Trabajo frontal con recorrido controlado para hombro anterior.' },
    { name: 'Pajaros', reps: '3 x 15', focus: 'Deltoide posterior', level: 'Intermedio', image: require('../assets/images/WORKOUTS/FUERZA.png'), description: 'Clave para fortalecer hombro posterior y mejorar postura.' },
    { name: 'Encogimientos', reps: '3 x 15', focus: 'Trapecio superior', level: 'Principiante', image: require('../assets/images/WORKOUTS/FUERZA.png'), description: 'Trabajo puntual para trapecio, estabilidad y control escapular.' },
  ],
  Biceps: [
    { name: 'Curl con barra', reps: '4 x 10', focus: 'Biceps braquial', level: 'Intermedio', image: require('../assets/images/WORKOUTS/BRAZOS.png'), description: 'Curl bilateral para fuerza y masa en el biceps.' },
    { name: 'Curl con mancuernas', reps: '4 x 12', focus: 'Biceps braquial', level: 'Principiante', image: require('../assets/images/WORKOUTS/BRAZOS.png'), description: 'Variante accesible para aislar cada brazo con mejor recorrido.' },
    { name: 'Curl martillo', reps: '3 x 12', focus: 'Braquial y braquiorradial', level: 'Intermedio', image: require('../assets/images/WORKOUTS/BRAZOS.png'), description: 'Patron neutro que fortalece biceps y antebrazo.' },
    { name: 'Curl concentrado', reps: '3 x 10', focus: 'Pico del biceps', level: 'Intermedio', image: require('../assets/images/WORKOUTS/BRAZOS.png'), description: 'Trabajo unilateral para maxima concentracion y control.' },
    { name: 'Curl en banco inclinado', reps: '3 x 12', focus: 'Biceps en estiramiento', level: 'Intermedio', image: require('../assets/images/WORKOUTS/BRAZOS.png'), description: 'Ejercicio con gran recorrido que enfatiza el estiramiento del biceps.' },
  ],
  Triceps: [
    { name: 'Extension en polea', reps: '4 x 12', focus: 'Triceps lateral', level: 'Principiante', image: require('../assets/images/WORKOUTS/BRAZOS.png'), description: 'Extension controlada para volumen y tecnica en triceps.' },
    { name: 'Extension con mancuerna', reps: '3 x 12', focus: 'Triceps largo', level: 'Intermedio', image: require('../assets/images/WORKOUTS/BRAZOS.png'), description: 'Extension por encima de la cabeza para alargar la porcion larga.' },
    { name: 'Fondos en paralelas', reps: '3 x 8-12', focus: 'Triceps y pecho', level: 'Avanzado', image: require('../assets/images/WORKOUTS/BRAZOS.png'), description: 'Empuje de alta demanda para fuerza funcional del brazo.' },
    { name: 'Extension francesa', reps: '3 x 10', focus: 'Triceps largo', level: 'Intermedio', image: require('../assets/images/WORKOUTS/BRAZOS.png'), description: 'Aislamiento clasico para la extension del codo.' },
    { name: 'Press cerrado', reps: '4 x 8', focus: 'Triceps y empuje', level: 'Intermedio', image: require('../assets/images/WORKOUTS/PECHO.png'), description: 'Variante de press para dar protagonismo al triceps.' },
  ],
  Antebrazos: [
    { name: 'Curl de muneca', reps: '4 x 15', focus: 'Flexores de muneca', level: 'Principiante', image: require('../assets/images/WORKOUTS/BRAZOS.png'), description: 'Trabajo de flexion para fuerza de muneca y antebrazo.' },
    { name: 'Extension de muneca', reps: '4 x 15', focus: 'Extensores de muneca', level: 'Principiante', image: require('../assets/images/WORKOUTS/BRAZOS.png'), description: 'Patron complementario para equilibrio y salud del antebrazo.' },
    { name: 'Curl inverso', reps: '3 x 12', focus: 'Braquiorradial', level: 'Intermedio', image: require('../assets/images/WORKOUTS/BRAZOS.png'), description: 'Curl prono que fortalece agarre y cara superior del antebrazo.' },
    { name: "Farmer's walk", reps: '4 x 30 m', focus: 'Agarre y antebrazo', level: 'Intermedio', image: require('../assets/images/WORKOUTS/BRAZOS.png'), description: 'Caminata cargada para resistencia de agarre y control corporal.' },
  ],
  Abdominales: [
    { name: 'Crunch', reps: '4 x 20', focus: 'Abdomen superior', level: 'Principiante', image: require('../assets/images/WORKOUTS/HIIT.png'), description: 'Movimiento basico para flexion controlada del tronco.' },
    { name: 'Elevaciones de piernas', reps: '4 x 15', focus: 'Abdomen inferior', level: 'Intermedio', image: require('../assets/images/WORKOUTS/HIIT.png'), description: 'Trabajo enfocado en core inferior y control lumbo-pelvico.' },
    { name: 'Plancha', reps: '4 x 40 s', focus: 'Core profundo', level: 'Principiante', image: require('../assets/images/WORKOUTS/HIIT.png'), description: 'Estabilizacion isometrica para abdomen y columna.' },
    { name: 'Crunch en polea', reps: '3 x 15', focus: 'Abdomen con carga', level: 'Intermedio', image: require('../assets/images/WORKOUTS/HIIT.png'), description: 'Variante con resistencia para ganar fuerza abdominal.' },
    { name: 'Russian twist', reps: '3 x 24', focus: 'Oblicuos', level: 'Intermedio', image: require('../assets/images/WORKOUTS/HIIT.png'), description: 'Rotacion controlada para oblicuos y coordinacion del core.' },
  ],
  Cuadriceps: [
    { name: 'Sentadilla', reps: '4 x 8-10', focus: 'Cuadriceps y gluteos', level: 'Intermedio', image: require('../assets/images/WORKOUTS/RUNNING.png'), description: 'Base del tren inferior para fuerza y control de rodilla.' },
    { name: 'Prensa de piernas', reps: '4 x 12', focus: 'Cuadriceps', level: 'Principiante', image: require('../assets/images/WORKOUTS/RUNNING.png'), description: 'Trabajo guiado para volumen del cuadriceps con estabilidad.' },
    { name: 'Zancadas', reps: '3 x 12 por pierna', focus: 'Cuadriceps y equilibrio', level: 'Intermedio', image: require('../assets/images/WORKOUTS/RUNNING.png'), description: 'Patron unilateral que mejora fuerza, estabilidad y coordinacion.' },
    { name: 'Extension de piernas', reps: '3 x 15', focus: 'Cuadriceps aislado', level: 'Principiante', image: require('../assets/images/WORKOUTS/RUNNING.png'), description: 'Aislamiento directo para estimular la parte frontal del muslo.' },
    { name: 'Sentadilla hack', reps: '4 x 10', focus: 'Cuadriceps dominante', level: 'Intermedio', image: require('../assets/images/WORKOUTS/RUNNING.png'), description: 'Variante guiada para cargar con seguridad el cuadriceps.' },
  ],
  Isquiotibiales: [
    { name: 'Peso muerto rumano', reps: '4 x 8-10', focus: 'Femoral y gluteo', level: 'Intermedio', image: require('../assets/images/WORKOUTS/FUERZA.png'), description: 'Bisagra de cadera para fortalecer toda la cadena posterior.' },
    { name: 'Curl femoral acostado', reps: '4 x 12', focus: 'Isquiotibiales', level: 'Principiante', image: require('../assets/images/WORKOUTS/RUNNING.png'), description: 'Trabajo guiado para femoral en flexion de rodilla.' },
    { name: 'Curl femoral sentado', reps: '3 x 12', focus: 'Isquiotibiales', level: 'Principiante', image: require('../assets/images/WORKOUTS/RUNNING.png'), description: 'Variante sentada con recorrido controlado para femoral.' },
    { name: 'Buenos dias', reps: '3 x 10', focus: 'Cadena posterior', level: 'Intermedio', image: require('../assets/images/WORKOUTS/FUERZA.png'), description: 'Bisagra tecnica que fortalece lumbar, gluteo y femoral.' },
  ],
  Gluteos: [
    { name: 'Hip thrust', reps: '4 x 10', focus: 'Gluteo mayor', level: 'Intermedio', image: require('../assets/images/WORKOUTS/CROSS.png'), description: 'Movimiento principal para potencia de cadera y fuerza de gluteo.' },
    { name: 'Sentadilla bulgara', reps: '3 x 10 por pierna', focus: 'Gluteo y cuadriceps', level: 'Intermedio', image: require('../assets/images/WORKOUTS/CROSS.png'), description: 'Trabajo unilateral para gluteo, estabilidad y control.' },
    { name: 'Patada de gluteo', reps: '3 x 15 por pierna', focus: 'Extension de cadera', level: 'Principiante', image: require('../assets/images/WORKOUTS/CROSS.png'), description: 'Aislamiento simple para activar gluteo con control.' },
    { name: 'Abduccion de cadera', reps: '3 x 18', focus: 'Gluteo medio', level: 'Principiante', image: require('../assets/images/WORKOUTS/CROSS.png'), description: 'Trabajo lateral para estabilizar cadera y pelvis.' },
    { name: 'Puente de gluteo', reps: '4 x 15', focus: 'Activacion glutea', level: 'Principiante', image: require('../assets/images/WORKOUTS/CROSS.png'), description: 'Base para activar cadena posterior y aprender empuje de cadera.' },
  ],
  Pantorrillas: [
    { name: 'Elevacion de talones de pie', reps: '4 x 18', focus: 'Gemelo', level: 'Principiante', image: require('../assets/images/WORKOUTS/RUNNING.png'), description: 'Trabajo basico de pie para desarrollo de pantorrilla.' },
    { name: 'Elevacion de talones sentado', reps: '4 x 20', focus: 'Soleo', level: 'Principiante', image: require('../assets/images/WORKOUTS/RUNNING.png'), description: 'Variante sentada para enfatizar el soleo.' },
    { name: 'Elevacion en prensa', reps: '4 x 15', focus: 'Pantorrilla con carga', level: 'Intermedio', image: require('../assets/images/WORKOUTS/RUNNING.png'), description: 'Gemelo en maquina para subir carga con estabilidad.' },
    { name: 'Elevacion a una pierna', reps: '3 x 15 por pierna', focus: 'Gemelo unilateral', level: 'Intermedio', image: require('../assets/images/WORKOUTS/RUNNING.png'), description: 'Trabajo unilateral para corregir diferencias de fuerza.' },
  ],
  Aductores: [
    { name: 'Aductores en maquina', reps: '4 x 15', focus: 'Muslo interno', level: 'Principiante', image: require('../assets/images/WORKOUTS/CROSS.png'), description: 'Trabajo guiado para fortalecer la cara interna del muslo.' },
    { name: 'Aductores con polea', reps: '3 x 15 por pierna', focus: 'Aductores', level: 'Intermedio', image: require('../assets/images/WORKOUTS/CROSS.png'), description: 'Variante unilateral con cable para control y rango.' },
    { name: 'Sissy squat', reps: '3 x 12', focus: 'Aductores y cuadriceps', level: 'Avanzado', image: require('../assets/images/WORKOUTS/CROSS.png'), description: 'Patron tecnico que reta rodilla, control corporal y muslo interno.' },
  ],
  Abductores: [
    { name: 'Abduccion en maquina', reps: '4 x 15', focus: 'Gluteo medio', level: 'Principiante', image: require('../assets/images/WORKOUTS/CROSS.png'), description: 'Trabajo lateral en maquina para estabilizar cadera.' },
    { name: 'Abduccion con banda', reps: '3 x 20', focus: 'Abductores de cadera', level: 'Principiante', image: require('../assets/images/WORKOUTS/CROSS.png'), description: 'Movimiento con banda para activar gluteo medio y control lateral.' },
    { name: 'Patinador lateral', reps: '3 x 16', focus: 'Abductores y cardio', level: 'Intermedio', image: require('../assets/images/WORKOUTS/CROSS.png'), description: 'Desplazamiento lateral para potencia y estabilidad de cadera.' },
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

const SEARCH_HINTS = {
  Pecho: 'Busca ejercicios, por ejemplo press de banca',
  Espalda: 'Busca ejercicios, por ejemplo remo con barra',
  Hombros: 'Busca ejercicios, por ejemplo press militar',
  Biceps: 'Busca ejercicios, por ejemplo curl con barra',
  Triceps: 'Busca ejercicios, por ejemplo extension en polea',
  Antebrazos: 'Busca ejercicios, por ejemplo curl inverso',
  Abdominales: 'Busca ejercicios, por ejemplo crunch',
  Cuadriceps: 'Busca ejercicios, por ejemplo sentadilla',
  Isquiotibiales: 'Busca ejercicios, por ejemplo peso muerto rumano',
  Gluteos: 'Busca ejercicios, por ejemplo hip thrust',
  Pantorrillas: 'Busca ejercicios, por ejemplo elevacion de talones',
  Aductores: 'Busca ejercicios, por ejemplo aductores en maquina',
  Abductores: 'Busca ejercicios, por ejemplo abduccion con banda',
  Cardio: 'Busca ejercicios, por ejemplo bicicleta estatica',
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
          <View style={styles.exerciseBadge}>
            <Text style={styles.exerciseBadgeText}>{String(index + 1).padStart(2, '0')}</Text>
          </View>
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
  const allExercises = useMemo(() => EXERCISE_LIBRARY[group] || [], [group]);

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
