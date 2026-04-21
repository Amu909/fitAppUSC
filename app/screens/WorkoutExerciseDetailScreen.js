import React, { useEffect, useRef } from 'react';
import { Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const WorkoutExerciseDetailScreen = ({ route, navigation }) => {
  const { exercise, fallbackImage } = route.params;
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>Detalle del ejercicio</Text>
      <Text style={styles.title}>{exercise.name}</Text>
      <Text style={styles.subtitle}>{exercise.description}</Text>

      <Animated.View
        style={[
          styles.heroCard,
          {
            opacity: heroOpacity,
            transform: [{ translateY: heroTranslate }],
          },
        ]}
      >
        <Animated.View style={{ transform: [{ scale: mediaScale }] }}>
          <Image source={exercise.image || fallbackImage} style={styles.heroImage} resizeMode="contain" />
        </Animated.View>
        <Text style={styles.heroCaption}>
          Vista animada de referencia. Si despues me compartes GIFs propios o con permiso de uso,
          esta pantalla ya queda lista para mostrarlos.
        </Text>
      </Animated.View>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Enfoque</Text>
          <Text style={styles.infoValue}>{exercise.focus}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Volumen</Text>
          <Text style={styles.infoValue}>{exercise.reps}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Nivel</Text>
          <Text style={styles.infoValue}>{exercise.level}</Text>
        </View>
      </View>

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
  primaryButton: { marginTop: 18, backgroundColor: '#e60404', borderRadius: 28, paddingVertical: 16, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default WorkoutExerciseDetailScreen;
