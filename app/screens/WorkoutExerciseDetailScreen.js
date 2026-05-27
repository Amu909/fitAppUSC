import React, { useEffect, useRef } from 'react';
import { Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../ThemeContext';

const WorkoutExerciseDetailScreen = ({ route, navigation }) => {
  const { exercise, fallbackImage, group } = route.params;
  const { theme, isDark } = useTheme();
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslate = useRef(new Animated.Value(18)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroOpacity, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.timing(heroTranslate, {
        toValue: 0,
        duration: 380,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, [heroOpacity, heroTranslate, pulse]);

  const mediaScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.035],
  });

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.kicker, { color: theme.primary }]}>Detalle del ejercicio</Text>
      <Text style={[styles.title, { color: theme.text }]}>{exercise.name}</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>{exercise.description}</Text>

      <Animated.View
        style={[
          styles.heroCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
          {
            opacity: heroOpacity,
            transform: [{ translateY: heroTranslate }],
          },
        ]}
      >
        <Animated.View style={{ transform: [{ scale: mediaScale }] }}>
          {exercise.remoteMedia?.gifUrl ? (
            <Image source={{ uri: exercise.remoteMedia.gifUrl }} style={styles.heroImage} resizeMode="contain" />
          ) : (
            <Image source={exercise.image || fallbackImage} style={styles.heroImage} resizeMode="contain" />
          )}
        </Animated.View>
        <Text style={[styles.heroCaption, { color: theme.textMuted }]}>
          {exercise.remoteMedia?.gifUrl
            ? 'Demostracion animada del ejercicio para ayudarte a entender mejor la tecnica.'
            : 'Vista de referencia local. Si este ejercicio encuentra coincidencia remota, aqui se mostrara su GIF animado.'}
        </Text>
      </Animated.View>

      <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Grupo muscular</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>{group || 'General'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Enfoque</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>{exercise.focus}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Volumen</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>{exercise.reps}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Nivel</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>{exercise.level}</Text>
        </View>
        {exercise.remoteMedia?.equipments?.length ? (
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Equipo</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{exercise.remoteMedia.equipments.join(', ')}</Text>
          </View>
        ) : null}
      </View>

      {exercise.remoteMedia?.instructions?.length ? (
        <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.instructionsTitle, { color: theme.text }]}>Tecnica guiada</Text>
          {exercise.remoteMedia.instructions.slice(0, 5).map((step, index) => (
            <View key={`${step}-${index}`} style={styles.stepRow}>
              <View style={[styles.stepDot, { backgroundColor: theme.primary }]} />
              <Text style={[styles.stepText, { color: theme.textMuted }]}>{String(step).replace(/^Step:\d+\s*/i, '')}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
        <Text style={styles.primaryButtonText}>Volver</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f5' },
  content: { padding: 20, paddingTop: 56, paddingBottom: 32 },
  kicker: { color: '#e60404', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { fontSize: 30, fontWeight: '800', color: '#111827', marginTop: 8 },
  subtitle: { fontSize: 15, color: '#4b5563', marginTop: 8, lineHeight: 22 },
  heroCard: { marginTop: 20, backgroundColor: '#fff', borderRadius: 24, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#ece8e1' },
  heroImage: { width: 280, height: 280 },
  heroCaption: { marginTop: 12, color: '#6b7280', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  infoCard: { marginTop: 18, backgroundColor: '#fff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#ece8e1' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  infoLabel: { color: '#6b7280' },
  infoValue: { color: '#111827', fontWeight: '700' },
  instructionsTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  stepDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, marginRight: 10 },
  stepText: { flex: 1, fontSize: 14, lineHeight: 21 },
  primaryButton: { marginTop: 18, backgroundColor: '#e60404', borderRadius: 28, paddingVertical: 16, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default WorkoutExerciseDetailScreen;
