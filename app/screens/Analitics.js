import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Pedometer } from 'expo-sensors';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../ThemeContext';
import AIAssistantPanel from '../AIAssistantPanel';
import { requestModuleInsight } from '../utils/aiClient';
import { safeFormatDate } from '../utils/dateFormat';

const RING_COLORS = {
  move: '#ff1236',
  exercise: '#72ff00',
  stand: '#1fe4ff',
};

const formatToday = () =>
  safeFormatDate(new Date(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const buildBaseMetrics = (profile, steps) => {
  const age = Number(profile?.age) || 24;
  const weight = Number(profile?.weight) || 70;
  const height = Number(profile?.height) || 170;

  const sleepHours = Number((6.4 + (height % 5) * 0.21).toFixed(1));
  const calories = Math.round(260 + weight * 4.2 + steps * 0.03);
  const heartRate = Math.max(58, Math.round(78 - age * 0.25));
  const spo2 = Math.min(99, 96 + (height % 3));
  const stress = Math.max(12, Math.round(36 - sleepHours * 2));
  const activeMinutes = Math.round(24 + steps / 500);
  const hydration = Number((1.7 + weight / 90).toFixed(1));
  const standHours = Math.min(16, Math.max(4, Math.round(steps / 900)));

  return {
    steps,
    sleepHours,
    calories,
    heartRate,
    spo2,
    stress,
    activeMinutes,
    hydration,
    standHours,
    stepGoal: 10000,
    sleepGoal: 8,
    calorieGoal: 900,
    activeGoal: 45,
    standGoal: 12,
  };
};

const progressValue = (value, goal) => Math.min(1, value / goal);

function ActivityRing({ radius, strokeWidth, progress, color }) {
  const normalizedProgress = Math.max(0, Math.min(progress, 1));
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - normalizedProgress * circumference;

  return (
    <>
      <Circle
        cx="0"
        cy="0"
        r={radius}
        stroke="rgba(255,255,255,0.09)"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Circle
        cx="0"
        cy="0"
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        rotation="-90"
        origin="0, 0"
      />
    </>
  );
}

function ActivityRings({ move, exercise, stand }) {
  const size = 226;
  const center = size / 2;

  return (
    <View style={styles.ringsWrap}>
      <Svg width={size} height={size}>
        <G x={center} y={center}>
          <ActivityRing radius={78} strokeWidth={20} progress={move} color={RING_COLORS.move} />
          <ActivityRing radius={53} strokeWidth={18} progress={exercise} color={RING_COLORS.exercise} />
          <ActivityRing radius={30} strokeWidth={16} progress={stand} color={RING_COLORS.stand} />
        </G>
      </Svg>
      <View style={styles.ringsCenterHole} />
    </View>
  );
}

function RingMetric({ label, value, unit, color }) {
  return (
    <View style={styles.ringMetric}>
      <Text style={[styles.ringMetricLabel, { color }]}>{label}</Text>
      <Text style={styles.ringMetricValue}>{value}</Text>
      <Text style={styles.ringMetricUnit}>{unit}</Text>
    </View>
  );
}

export default function AnalyticsDashboard() {
  const { userProfile } = useAuth();
  const { theme, isDark } = useTheme();
  const [stepCount, setStepCount] = useState(0);
  const [pedometerReady, setPedometerReady] = useState(false);
  const [pedometerSource, setPedometerSource] = useState('estimado');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState('');

  const firstName = userProfile?.fullName?.trim()?.split(' ')?.[0] || 'Usuario';
  const today = useMemo(() => formatToday(), []);

  useEffect(() => {
    let subscription;

    const setupPedometer = async () => {
      try {
        const available = await Pedometer.isAvailableAsync();
        if (!available) {
          setPedometerReady(false);
          return;
        }

        const permission = await Pedometer.requestPermissionsAsync();
        if (!permission.granted) {
          setPedometerReady(false);
          return;
        }

        setPedometerReady(true);

        if (Platform.OS === 'ios') {
          const end = new Date();
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const result = await Pedometer.getStepCountAsync(start, end);
          if (typeof result?.steps === 'number') {
            setStepCount(result.steps);
            setPedometerSource('smartwatch/dispositivo');
          }
        }

        subscription = Pedometer.watchStepCount((result) => {
          if (typeof result?.steps === 'number') {
            setStepCount((prev) => Math.max(prev, result.steps));
            setPedometerSource('smartwatch/dispositivo');
          }
        });
      } catch (error) {
        setPedometerReady(false);
      }
    };

    setupPedometer();

    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

  const fallbackSteps = useMemo(() => {
    const age = Number(userProfile?.age) || 24;
    const weight = Number(userProfile?.weight) || 70;
    return Math.round(6200 + age * 11 + weight * 8);
  }, [userProfile]);

  const wearable = useMemo(
    () => buildBaseMetrics(userProfile, stepCount || fallbackSteps),
    [fallbackSteps, stepCount, userProfile]
  );

  const achievementScore = Math.round(
    progressValue(wearable.steps, wearable.stepGoal) * 35 +
      progressValue(wearable.activeMinutes, wearable.activeGoal) * 35 +
      progressValue(wearable.standHours, wearable.standGoal) * 30
  );

  const ringProgress = {
    move: progressValue(wearable.calories, wearable.calorieGoal),
    exercise: progressValue(wearable.activeMinutes, wearable.activeGoal),
    stand: progressValue(wearable.standHours, wearable.standGoal),
  };

  const cards = [
    {
      key: 'steps',
      title: 'Pasos',
      value: wearable.steps.toLocaleString('es-CO'),
      unit: pedometerReady ? 'datos reales' : 'estimado',
      icon: <FontAwesome5 name="walking" size={22} color={theme.primary} />,
    },
    {
      key: 'sleep',
      title: 'Sueno',
      value: wearable.sleepHours.toFixed(1),
      unit: 'horas',
      icon: <Ionicons name="bed-outline" size={22} color={theme.primary} />,
    },
    {
      key: 'calories',
      title: 'Calorias',
      value: wearable.calories,
      unit: 'kcal',
      icon: <MaterialCommunityIcons name="fire" size={24} color={theme.primary} />,
    },
    {
      key: 'heart',
      title: 'Corazon',
      value: wearable.heartRate,
      unit: 'bpm',
      icon: <Ionicons name="heart-circle-outline" size={24} color={theme.primary} />,
    },
    {
      key: 'spo2',
      title: 'Oxigeno',
      value: wearable.spo2,
      unit: '% SpO2',
      icon: <MaterialCommunityIcons name="molecule-co2" size={24} color={theme.primary} />,
    },
    {
      key: 'stress',
      title: 'Estres',
      value: wearable.stress,
      unit: 'score',
      icon: <Ionicons name="pulse-outline" size={22} color={theme.primary} />,
    },
    {
      key: 'training',
      title: 'Entreno',
      value: wearable.activeMinutes,
      unit: 'min activos',
      icon: <FontAwesome5 name="dumbbell" size={20} color={theme.primary} />,
    },
    {
      key: 'water',
      title: 'Agua',
      value: wearable.hydration,
      unit: 'litros',
      icon: <Ionicons name="water-outline" size={22} color={theme.primary} />,
    },
  ];

  const handleAnalyticsAI = async () => {
    setAiLoading(true);
    try {
      const result = await requestModuleInsight({
        module: 'Analiticas',
        intent: 'Analiza mis metricas actuales y dame prioridades de entrenamiento, recuperacion, hidratacion y nutricion para hoy.',
        userProfile,
        moduleData: {
          fecha: today,
          fuente_pasos: pedometerSource,
          logro_diario: achievementScore,
          metricas: wearable,
          recuperacion: Math.max(62, 92 - wearable.stress),
          energia: Math.min(97, 68 + wearable.activeMinutes / 3),
        },
      });
      setAiInsight(result.insight);
    } catch (error) {
      Alert.alert('IA no disponible', 'No fue posible generar el analisis en este momento.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: isDark ? theme.surface : '#111114',
            borderColor: isDark ? theme.border : '#1d1f27',
            shadowOpacity: isDark ? 0 : 0.14,
            elevation: isDark ? 0 : 8,
          },
        ]}
      >
        <View style={styles.heroTop}>
          {userProfile?.photoURL ? (
            <Image source={{ uri: userProfile.photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarFallbackText}>{firstName[0]?.toUpperCase() || 'U'}</Text>
            </View>
          )}

          <View style={styles.heroCopy}>
            <Text style={[styles.date, { color: '#c6cad6' }]}>{today}</Text>
            <Text style={styles.greeting}>Buen dia,</Text>
            <Text style={styles.greeting}>{firstName}</Text>
            <Text style={[styles.metaCopy, { color: '#d8dbe3' }]}>
              {pedometerReady
                ? `Pasos sincronizados desde ${pedometerSource}.`
                : 'Mostrando datos derivados del perfil mientras se conecta un wearable.'}
            </Text>
          </View>

          <View style={[styles.scoreBadge, { backgroundColor: theme.primary }]}>
            <Ionicons name="trophy-outline" size={14} color="#fff" />
            <Text style={styles.scoreText}>{achievementScore}</Text>
          </View>
        </View>

        <View style={[styles.ringPanel, { backgroundColor: isDark ? theme.surfaceDark : '#14141a', borderColor: isDark ? theme.border : '#191b22' }]}>
          <View style={styles.ringMetricsColumn}>
            <RingMetric label="Move" value={wearable.calories} unit="kcal" color={RING_COLORS.move} />
            <RingMetric label="Exercise" value={wearable.activeMinutes} unit="min" color={RING_COLORS.exercise} />
            <RingMetric label="Stand" value={wearable.standHours} unit="horas" color={RING_COLORS.stand} />
          </View>

          <ActivityRings move={ringProgress.move} exercise={ringProgress.exercise} stand={ringProgress.stand} />
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryPill, { backgroundColor: isDark ? theme.surfaceAlt : '#161933' }]}>
          <Text style={[styles.summaryLabel, { color: isDark ? theme.textSoft : '#ffffff' }]}>Recuperacion</Text>
          <Text style={styles.summaryValue}>{Math.max(62, 92 - wearable.stress)}%</Text>
        </View>
        <View style={[styles.summaryPill, { backgroundColor: isDark ? theme.surfaceAlt : '#161933' }]}>
          <Text style={[styles.summaryLabel, { color: isDark ? theme.textSoft : '#ffffff' }]}>Energia</Text>
          <Text style={styles.summaryValue}>{Math.min(97, 68 + wearable.activeMinutes / 3)}%</Text>
        </View>
      </View>

      <AIAssistantPanel
        title="Analisis inteligente"
        subtitle="Cruza tus metricas del dia con tu perfil para sugerir prioridades."
        buttonLabel="Analizar mis datos"
        loading={aiLoading}
        insight={aiInsight}
        onPress={handleAnalyticsAI}
      />

      <View style={styles.grid}>
        {cards.map((card) => (
          <View
            key={card.key}
            style={[
              styles.metricCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.borderSoft,
                shadowOpacity: isDark ? 0 : 0.05,
                elevation: isDark ? 0 : 3,
              },
            ]}
          >
            <View style={[styles.metricIconWrap, { backgroundColor: theme.primarySoft }]}>{card.icon}</View>
            <Text style={[styles.metricTitle, { color: theme.text }]}>{card.title}</Text>
            <Text style={[styles.metricValue, { color: theme.text }]}>{card.value}</Text>
            <Text style={[styles.metricUnit, { color: theme.textMuted }]}>{card.unit}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6fb',
  },
  content: {
    padding: 18,
    paddingBottom: 110,
  },
  heroCard: {
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    marginTop: 34,
  },
  avatarFallback: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 34,
  },
  avatarFallbackText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  heroCopy: {
    flex: 1,
    marginLeft: 14,
    paddingRight: 10,
  },
  date: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  greeting: {
    marginTop: 4,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
    color: '#ffffff',
  },
  metaCopy: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 160,
  },
  scoreBadge: {
    minWidth: 66,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 42,
  },
  scoreText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 4,
  },
  ringPanel: {
    marginTop: 18,
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  ringMetricsColumn: {
    width: 92,
    justifyContent: 'center',
  },
  ringMetric: {
    marginBottom: 18,
  },
  ringMetricLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  ringMetricValue: {
    marginTop: 2,
    color: '#ffffff',
    fontSize: 31,
    fontWeight: '900',
    lineHeight: 34,
  },
  ringMetricUnit: {
    marginTop: 2,
    color: '#c7cad4',
    fontSize: 12,
    fontWeight: '700',
  },
  ringsWrap: {
    width: 226,
    height: 226,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -12,
  },
  ringsCenterHole: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0d0e12',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 4,
  },
  summaryPill: {
    width: '48.5%',
    borderRadius: 18,
    padding: 16,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  metricCard: {
    width: '48.3%',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
  },
  metricIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTitle: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '600',
  },
  metricValue: {
    marginTop: 8,
    fontSize: 29,
    fontWeight: '800',
  },
  metricUnit: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },
});
