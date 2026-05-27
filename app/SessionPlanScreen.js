import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import AIAssistantPanel from './AIAssistantPanel';
import { useAuth } from './context/AuthContext';
import { useTheme } from './ThemeContext';
import { requestModuleInsight } from './utils/aiClient';
import { enrichExercisesWithRemoteMedia } from './utils/exerciseMedia';
import { buildSessionHighlights, buildSessionPlan } from './utils/sessionPlanner';

function SessionExerciseCard({ exercise, index, theme, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.exerciseCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <View style={styles.exerciseTopRow}>
        {exercise.remoteMedia?.gifUrl ? (
          <Image source={{ uri: exercise.remoteMedia.gifUrl }} style={styles.exerciseThumb} resizeMode="cover" />
        ) : (
          <View style={[styles.exerciseBadge, { backgroundColor: theme.primarySoft }]}>
            <Text style={[styles.exerciseBadgeText, { color: theme.primary }]}>
              {String(index + 1).padStart(2, '0')}
            </Text>
          </View>
        )}

        <View style={styles.exerciseCopy}>
          <Text style={[styles.exerciseName, { color: theme.text }]}>{exercise.name}</Text>
          <Text style={[styles.exerciseFocus, { color: theme.textMuted }]}>{exercise.focus}</Text>
          <Text style={[styles.exercisePrescription, { color: theme.primary }]}>
            {exercise.prescription} - {exercise.reps}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function SessionPlanScreen({ route }) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { userProfile } = useAuth();
  const { type = 'WORK' } = route.params || {};
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState('');
  const [planExercises, setPlanExercises] = useState([]);

  const sessionPlan = useMemo(() => buildSessionPlan(type, userProfile || {}), [type, userProfile]);
  const highlights = useMemo(() => buildSessionHighlights(planExercises), [planExercises]);

  useEffect(() => {
    let active = true;
    setPlanExercises(sessionPlan.exercises);

    const loadRemoteMedia = async () => {
      const byGroup = sessionPlan.exercises.reduce((acc, exercise) => {
        const key = exercise.group || 'Cardio';
        acc[key] = acc[key] || [];
        acc[key].push(exercise);
        return acc;
      }, {});

      const enrichedGroups = await Promise.all(
        Object.entries(byGroup).map(async ([group, exercises]) => enrichExercisesWithRemoteMedia(exercises, group))
      );

      if (active) {
        setPlanExercises(enrichedGroups.flat());
      }
    };

    loadRemoteMedia();
    return () => {
      active = false;
    };
  }, [sessionPlan]);

  const handleAiPlan = async () => {
    setAiLoading(true);
    try {
      const result = await requestModuleInsight({
        module: 'Plan de sesion',
        intent: `Ajusta esta ${sessionPlan.title} con orden, descansos, rango de esfuerzo y alternativa si el gym esta lleno.`,
        userProfile,
        moduleData: {
          tipo: type,
          enfoque: sessionPlan.focusTitle,
          resumen: sessionPlan.planSummary,
          ejercicios: planExercises.map((exercise) => ({
            nombre: exercise.name,
            grupo: exercise.group,
            volumen: exercise.reps,
            prescripcion: exercise.prescription,
          })),
        },
      });
      setAiInsight(result.insight);
    } catch {
      Alert.alert('IA no disponible', 'No fue posible personalizar este plan ahora mismo.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
        <Image source={sessionPlan.coverImage} style={styles.heroImage} />
        <View style={styles.heroOverlay} />
        <View style={styles.heroCopy}>
          <Text style={styles.heroKicker}>{sessionPlan.emphasisLabel}</Text>
          <Text style={styles.heroTitle}>{sessionPlan.title}</Text>
          <Text style={styles.heroText}>{sessionPlan.description}</Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
          <Text style={[styles.metricLabel, { color: theme.textSoft }]}>Duracion</Text>
          <Text style={[styles.metricValue, { color: theme.text }]}>{sessionPlan.durationLabel}</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
          <Text style={[styles.metricLabel, { color: theme.textSoft }]}>Ejercicios</Text>
          <Text style={[styles.metricValue, { color: theme.text }]}>{highlights.totalExercises}</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
          <Text style={[styles.metricLabel, { color: theme.textSoft }]}>Meta media</Text>
          <Text style={[styles.metricValue, { color: theme.text }]}>
            {highlights.averageRepTarget > 0 ? `${highlights.averageRepTarget}` : '--'}
          </Text>
        </View>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
        <Text style={[styles.summaryTitle, { color: theme.text }]}>{sessionPlan.focusTitle}</Text>
        <Text style={[styles.summaryText, { color: theme.textMuted }]}>{sessionPlan.planSummary}</Text>
        <Text style={[styles.recommendationText, { color: theme.primary }]}>{sessionPlan.recommendation}</Text>
        <View style={styles.groupRow}>
          {highlights.primaryGroups.map((group) => (
            <View key={group} style={[styles.groupPill, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
              <Text style={[styles.groupPillText, { color: theme.text }]}>{group}</Text>
            </View>
          ))}
        </View>
      </View>

      <AIAssistantPanel
        title="Ajuste con IA"
        subtitle="Refina la sesion segun el equipo disponible, tu energia de hoy y tu objetivo actual."
        buttonLabel="Ajustar este plan"
        loading={aiLoading}
        insight={aiInsight}
        onPress={handleAiPlan}
      />

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Ejercicios sugeridos</Text>
      <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
        Se prioriza una seleccion corta y util para que no entres al gym sin estructura.
      </Text>

      <View style={styles.exerciseList}>
        {planExercises.map((exercise, index) => (
          <SessionExerciseCard
            key={`${exercise.group}-${exercise.name}`}
            exercise={exercise}
            index={index}
            theme={theme}
            onPress={() =>
              navigation.navigate('WorkoutExerciseDetailScreen', {
                exercise,
                group: exercise.group,
                fallbackImage: exercise.image || sessionPlan.coverImage,
              })
            }
          />
        ))}
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('WorkoutTimerScreen', { type, label: sessionPlan.title })}
      >
        <Ionicons name="play-outline" size={18} color="#fff" />
        <Text style={styles.primaryButtonText}>Iniciar sesion</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 34,
  },
  heroCard: {
    height: 224,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 11, 18, 0.42)',
  },
  heroCopy: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
  },
  heroKicker: {
    color: '#fda4af',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroTitle: {
    marginTop: 8,
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
  },
  heroText: {
    marginTop: 8,
    color: '#f3f4f6',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    maxWidth: '92%',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  metricCard: {
    width: '31.5%',
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metricValue: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: '900',
  },
  summaryCard: {
    marginTop: 18,
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  summaryText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  recommendationText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '800',
  },
  groupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
  },
  groupPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  groupPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  sectionTitle: {
    marginTop: 20,
    fontSize: 22,
    fontWeight: '900',
  },
  sectionSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  exerciseList: {
    marginTop: 14,
  },
  exerciseCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
  },
  exerciseTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseBadge: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exerciseBadgeText: {
    fontSize: 15,
    fontWeight: '900',
  },
  exerciseThumb: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginRight: 12,
    backgroundColor: '#d1d5db',
  },
  exerciseCopy: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '900',
  },
  exerciseFocus: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
  },
  exercisePrescription: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '800',
  },
  primaryButton: {
    marginTop: 18,
    borderRadius: 18,
    paddingVertical: 16,
    backgroundColor: '#e60404',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    marginLeft: 8,
  },
});
