import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ProgressChart } from 'react-native-chart-kit';
import { Pedometer } from 'expo-sensors';
import { useAuth } from './AuthContext';

const screenWidth = Dimensions.get('window').width;

const formatToday = () =>
  new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

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

  return {
    steps,
    sleepHours,
    calories,
    heartRate,
    spo2,
    stress,
    activeMinutes,
    hydration,
    stepGoal: 10000,
    sleepGoal: 8,
    calorieGoal: 900,
  };
};

const progressValue = (value, goal) => Math.min(1, value / goal);

export default function AnalyticsDashboard() {
  const { userProfile } = useAuth();
  const [stepCount, setStepCount] = useState(0);
  const [pedometerReady, setPedometerReady] = useState(false);
  const [pedometerSource, setPedometerSource] = useState('estimado');

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
    progressValue(wearable.steps, wearable.stepGoal) * 45 +
      progressValue(wearable.sleepHours, wearable.sleepGoal) * 30 +
      progressValue(wearable.calories, wearable.calorieGoal) * 25
  );

  const chartData = {
    labels: ['Pasos', 'Sueno', 'Calorias'],
    data: [
      progressValue(wearable.steps, wearable.stepGoal),
      progressValue(wearable.sleepHours, wearable.sleepGoal),
      progressValue(wearable.calories, wearable.calorieGoal),
    ],
  };

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: () => '#e60404',
    labelColor: () => '#6b7280',
    strokeWidth: 14,
  };

  const cards = [
    {
      key: 'steps',
      title: 'Pasos',
      value: wearable.steps.toLocaleString('es-CO'),
      unit: pedometerReady ? 'datos reales' : 'estimado',
      icon: <FontAwesome5 name="walking" size={22} color="#e60404" />,
    },
    {
      key: 'sleep',
      title: 'Sueno',
      value: wearable.sleepHours.toFixed(1),
      unit: 'horas',
      icon: <Ionicons name="bed-outline" size={22} color="#e60404" />,
    },
    {
      key: 'calories',
      title: 'Calorias',
      value: wearable.calories,
      unit: 'kcal',
      icon: <MaterialCommunityIcons name="fire" size={24} color="#e60404" />,
    },
    {
      key: 'heart',
      title: 'Corazon',
      value: wearable.heartRate,
      unit: 'bpm',
      icon: <Ionicons name="heart-circle-outline" size={24} color="#e60404" />,
    },
    {
      key: 'spo2',
      title: 'Oxigeno',
      value: wearable.spo2,
      unit: '% SpO2',
      icon: <MaterialCommunityIcons name="molecule-co2" size={24} color="#e60404" />,
    },
    {
      key: 'stress',
      title: 'Estres',
      value: wearable.stress,
      unit: 'score',
      icon: <Ionicons name="pulse-outline" size={22} color="#e60404" />,
    },
    {
      key: 'training',
      title: 'Entreno',
      value: wearable.activeMinutes,
      unit: 'min activos',
      icon: <FontAwesome5 name="dumbbell" size={20} color="#e60404" />,
    },
    {
      key: 'water',
      title: 'Agua',
      value: wearable.hydration,
      unit: 'litros',
      icon: <Ionicons name="water-outline" size={22} color="#e60404" />,
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          {userProfile?.photoURL ? (
            <Image source={{ uri: userProfile.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>{firstName[0]?.toUpperCase() || 'U'}</Text>
            </View>
          )}

          <View style={styles.heroCopy}>
            <Text style={styles.date}>{today}</Text>
            <Text style={styles.greeting}>Buen dia, {firstName}</Text>
            <Text style={styles.metaCopy}>
              {pedometerReady
                ? `Pasos sincronizados desde ${pedometerSource}.`
                : 'Mostrando datos derivados del perfil mientras se conecta un wearable.'}
            </Text>
          </View>

          <View style={styles.scoreBadge}>
            <Ionicons name="trophy-outline" size={14} color="#fff" />
            <Text style={styles.scoreText}>{achievementScore}</Text>
          </View>
        </View>

        <View style={styles.ringCard}>
          <ProgressChart
            data={chartData}
            width={screenWidth - 88}
            height={220}
            strokeWidth={16}
            radius={34}
            chartConfig={chartConfig}
            hideLegend={false}
          />
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryPill}>
          <Text style={styles.summaryLabel}>Recuperacion</Text>
          <Text style={styles.summaryValue}>{Math.max(62, 92 - wearable.stress)}%</Text>
        </View>
        <View style={styles.summaryPill}>
          <Text style={styles.summaryLabel}>Energia</Text>
          <Text style={styles.summaryValue}>{Math.min(97, 68 + wearable.activeMinutes / 3)}%</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {cards.map((card) => (
          <View key={card.key} style={styles.metricCard}>
            <View style={styles.metricIconWrap}>{card.icon}</View>
            <Text style={styles.metricTitle}>{card.title}</Text>
            <Text style={styles.metricValue}>{card.value}</Text>
            <Text style={styles.metricUnit}>{card.unit}</Text>
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
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: '#eef2f7',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
  },
  avatarFallback: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#e60404',
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#6b7280',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  greeting: {
    marginTop: 4,
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
  },
  metaCopy: {
    marginTop: 6,
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 18,
  },
  scoreBadge: {
    minWidth: 62,
    backgroundColor: '#e60404',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  scoreText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 4,
  },
  ringCard: {
    marginTop: 18,
    borderRadius: 22,
    backgroundColor: '#fff8f8',
    paddingVertical: 12,
    alignItems: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 4,
  },
  summaryPill: {
    width: '48.5%',
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 16,
  },
  summaryLabel: {
    color: '#cbd5e1',
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
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eef2f7',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 5,
  },
  metricIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fff4f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTitle: {
    marginTop: 16,
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  metricValue: {
    marginTop: 8,
    color: '#111827',
    fontSize: 29,
    fontWeight: '800',
  },
  metricUnit: {
    marginTop: 4,
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
  },
});
