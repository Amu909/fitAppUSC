import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pedometer } from 'expo-sensors';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../NotificationContext';
import { useTheme } from '../ThemeContext';
import { safeFormatDate } from '../utils/dateFormat';
import {
  formatDurationLabel,
  getYesterdayActivityLogs,
  getYesterdayRange,
} from '../utils/activityLog';

const screenWidth = Dimensions.get('window').width;

const spotlightSessions = [
  {
    id: 'work',
    type: 'WORK',
    title: 'Sesion de fuerza',
    duration: '30 min',
    calories: 'Explora rutinas',
    image: require('../../assets/images/WORKOUTS/FUERZA.png'),
  },
  {
    id: 'spin',
    type: 'SPIN',
    title: 'Running guiado',
    duration: 'Cardio',
    calories: 'Activa tu resistencia',
    image: require('../../assets/images/WORKOUTS/RUNNING.png'),
  },
  {
    id: 'rustic',
    type: 'RUSTIC',
    title: 'Core intenso',
    duration: 'Movilidad',
    calories: 'Trabaja estabilidad',
    image: require('../../assets/images/WORKOUTS/HIIT.png'),
  },
];

const formatYesterdayLabel = () =>
  safeFormatDate(getYesterdayRange().start, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

export default function Home() {
  const navigation = useNavigation();
  const { userProfile, currentUser } = useAuth();
  const { unreadCount } = useNotifications();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [yesterdayLogs, setYesterdayLogs] = useState([]);
  const [yesterdaySteps, setYesterdaySteps] = useState(null);

  const firstName =
    userProfile?.fullName?.trim()?.split(' ')?.[0] ||
    currentUser?.displayName?.trim()?.split(' ')?.[0] ||
    'Usuario';

  const avatarUrl = userProfile?.photoURL || currentUser?.photoURL || '';
  const yesterdayLabel = useMemo(() => formatYesterdayLabel(), []);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      const loadYesterdayData = async () => {
        if (!currentUser?.uid) {
          if (active) {
            setYesterdayLogs([]);
            setYesterdaySteps(null);
            setLoading(false);
          }
          return;
        }

        setLoading(true);
        try {
          const logsPromise = getYesterdayActivityLogs(currentUser.uid);
          const stepsPromise = (async () => {
            try {
              const available = await Pedometer.isAvailableAsync();
              if (!available) {
                return null;
              }

              const permission = await Pedometer.requestPermissionsAsync();
              if (!permission.granted) {
                return null;
              }

              const { start, end } = getYesterdayRange();
              const result = await Pedometer.getStepCountAsync(start, end);
              return typeof result?.steps === 'number' ? result.steps : null;
            } catch {
              return null;
            }
          })();

          const [logs, steps] = await Promise.all([logsPromise, stepsPromise]);

          if (!active) {
            return;
          }

          setYesterdayLogs(logs);
          setYesterdaySteps(steps);
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      loadYesterdayData();

      return () => {
        active = false;
      };
    }, [currentUser?.uid])
  );

  const totalDurationSeconds = useMemo(
    () => yesterdayLogs.reduce((sum, item) => sum + (item.durationSeconds || 0), 0),
    [yesterdayLogs]
  );

  const goToWorkout = (type) => {
    navigation.navigate('SessionPlanScreen', { type });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.userRow}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: theme.primarySoft }]}>
              <Text style={[styles.avatarFallbackText, { color: theme.primary }]}>
                {firstName[0]?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}

          <View style={styles.headerCopy}>
            <Text style={[styles.greeting, { color: theme.text }]}>Hola, {firstName}</Text>
            <Text style={[styles.prompt, { color: theme.textMuted }]}>Que plan vas a seguir hoy?</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.notificationButton, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('NotificationsScreen')}
        >
          <Ionicons name="notifications-outline" size={20} color={theme.text} />
          {unreadCount > 0 ? <View style={styles.notificationDot} /> : null}
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.heroRail}>
        {spotlightSessions.map((session) => (
          <TouchableOpacity
            key={session.id}
            style={styles.heroCard}
            activeOpacity={0.9}
            onPress={() => goToWorkout(session.type)}
          >
            <Image source={session.image} style={styles.heroImage} />
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>{session.title}</Text>
              <Text style={styles.heroMeta}>
                {session.duration} | {session.calories}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Ayer</Text>
        <Text style={[styles.sectionMeta, { color: theme.textMuted }]}>{yesterdayLabel}</Text>
      </View>

      <View style={[styles.metricsCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
        <View style={styles.metricsTop}>
          <View style={styles.metricBlock}>
            <Text style={[styles.metricLabel, { color: theme.textSoft }]}>Pasos reales</Text>
            <Text style={[styles.metricValue, { color: theme.text }]}>
              {yesterdaySteps === null ? '--' : yesterdaySteps.toLocaleString('es-CO')}
            </Text>
          </View>
          <View style={[styles.metricDivider, { backgroundColor: theme.borderSoft }]} />
          <View style={styles.metricBlock}>
            <Text style={[styles.metricLabel, { color: theme.textSoft }]}>Tiempo entrenado</Text>
            <Text style={[styles.metricValue, { color: theme.text }]}>
              {totalDurationSeconds > 0 ? formatDurationLabel(totalDurationSeconds) : '--'}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textMuted }]}>Cargando actividad real de ayer...</Text>
          </View>
        ) : yesterdayLogs.length > 0 ? (
          <View style={styles.activitiesList}>
            {yesterdayLogs.map((activity) => (
              <TouchableOpacity
                key={activity.id}
                style={styles.activityRow}
                activeOpacity={0.88}
                onPress={() => goToWorkout(activity.type)}
              >
                <View style={[styles.activityIconWrap, { backgroundColor: activity.color }]}>
                  <Ionicons name={activity.icon} size={18} color={activity.iconColor} />
                </View>

                <View style={styles.activityCopy}>
                  <Text style={[styles.activityTitle, { color: theme.text }]}>{activity.title}</Text>
                  <Text style={[styles.activitySubtitle, { color: theme.textMuted }]}>{activity.subtitle}</Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color={theme.textSoft} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Sin actividades registradas ayer</Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              El home ya no inventa sesiones. Cuando termines un entreno con el boton `END`, aparecera aqui al dia siguiente.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.moreRow}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('Main', { screen: 'Rutinas' })}
        >
          <Text style={[styles.moreText, { color: theme.text }]}>Ir a rutinas</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.textSoft} />
        </TouchableOpacity>
      </View>

      <View style={styles.quickStrip}>
        <TouchableOpacity
          style={[styles.quickChip, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}
          onPress={() => goToWorkout('WORK')}
          activeOpacity={0.9}
        >
          <Ionicons name="flame-outline" size={18} color={theme.primary} />
          <Text style={[styles.quickChipText, { color: theme.text }]}>Quemar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickChip, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}
          onPress={() => goToWorkout('SPIN')}
          activeOpacity={0.9}
        >
          <Ionicons name="bicycle-outline" size={18} color={theme.primary} />
          <Text style={[styles.quickChipText, { color: theme.text }]}>Cardio</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickChip, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}
          onPress={() => goToWorkout('RUSTIC')}
          activeOpacity={0.9}
        >
          <Ionicons name="barbell-outline" size={18} color={theme.primary} />
          <Text style={[styles.quickChipText, { color: theme.text }]}>Potencia</Text>
        </TouchableOpacity>
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
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 118,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerCopy: {
    marginLeft: 12,
    flex: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '900',
  },
  prompt: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '600',
  },
  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  notificationDot: {
    position: 'absolute',
    right: 11,
    top: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#e60404',
  },
  heroRail: {
    paddingRight: 8,
  },
  heroCard: {
    width: Math.min(screenWidth * 0.74, 296),
    height: 176,
    borderRadius: 22,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#111827',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 18, 28, 0.28)',
  },
  heroContent: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '900',
    maxWidth: '78%',
  },
  heroMeta: {
    color: '#f3f4f6',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  sectionRow: {
    marginTop: 26,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 27,
    fontWeight: '900',
  },
  sectionMeta: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  metricsCard: {
    backgroundColor: '#fff',
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  metricsTop: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 16,
  },
  metricBlock: {
    flex: 1,
  },
  metricDivider: {
    width: 1,
    marginHorizontal: 14,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  metricValue: {
    marginTop: 8,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
  },
  loadingState: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 18,
    paddingBottom: 8,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
  },
  activitiesList: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 6,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },
  activityIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityCopy: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 10,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  activitySubtitle: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 18,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  moreRow: {
    marginTop: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moreText: {
    fontSize: 14,
    fontWeight: '800',
  },
  quickStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  quickChip: {
    width: '31.5%',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8,
  },
});
