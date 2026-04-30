import React from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';

const screenWidth = Dimensions.get('window').width;

const spotlightSessions = [
  {
    id: 'work',
    type: 'WORK',
    title: 'Sesion de fuerza',
    duration: '30 min',
    calories: '212 kcal',
    image: require('../assets/images/WORKOUTS/FUERZA.png'),
  },
  {
    id: 'spin',
    type: 'SPIN',
    title: 'Running guiado',
    duration: '42 min',
    calories: '640 kcal',
    image: require('../assets/images/WORKOUTS/RUNNING.png'),
  },
  {
    id: 'rustic',
    type: 'RUSTIC',
    title: 'Core intenso',
    duration: '24 min',
    calories: '186 kcal',
    image: require('../assets/images/WORKOUTS/HIIT.png'),
  },
];

const recentActivities = [
  {
    id: 'strength',
    title: 'Sesion de fuerza',
    subtitle: '30 min | 182 kcal',
    icon: 'barbell-outline',
    color: '#d9f99d',
    iconColor: '#365314',
    type: 'WORK',
  },
  {
    id: 'running',
    title: 'Running urbano',
    subtitle: '24:14 | 5,53 km | 215 kcal',
    icon: 'walk-outline',
    color: '#f5d0fe',
    iconColor: '#86198f',
    type: 'SPIN',
  },
  {
    id: 'mobility',
    title: 'Movilidad y reset',
    subtitle: '18 min | Enfoque en recuperacion',
    icon: 'body-outline',
    color: '#bfdbfe',
    iconColor: '#1d4ed8',
    type: 'RUSTIC',
  },
];

export default function Home() {
  const navigation = useNavigation();
  const { userProfile, currentUser } = useAuth();
  const { theme, isDark } = useTheme();

  const firstName =
    userProfile?.fullName?.trim()?.split(' ')?.[0] ||
    currentUser?.displayName?.trim()?.split(' ')?.[0] ||
    'Luis';

  const avatarUrl = userProfile?.photoURL || currentUser?.photoURL || '';
  const steps = userProfile?.weight ? Math.round(18000 + Number(userProfile.weight) * 43) : 21898;
  const distance = userProfile?.height ? (Number(userProfile.height) / 11).toFixed(1) : '17.5';

  const goToWorkout = (type) => {
    navigation.navigate('WorkoutTimerScreen', { type });
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
              <Text style={[styles.avatarFallbackText, { color: theme.primary }]}>{firstName[0]?.toUpperCase() || 'L'}</Text>
            </View>
          )}

          <View style={styles.headerCopy}>
            <Text style={[styles.greeting, { color: theme.text }]}>Hola, {firstName}</Text>
            <Text style={[styles.prompt, { color: theme.textMuted }]}>Que plan vas a seguir hoy?</Text>
          </View>
        </View>

        <TouchableOpacity style={[styles.notificationButton, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]} activeOpacity={0.85}>
          <Ionicons name="notifications-outline" size={20} color={theme.text} />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.heroRail}
      >
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

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Ayer</Text>

      <View style={[styles.metricsCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
        <View style={styles.metricsTop}>
          <View style={styles.metricBlock}>
            <Text style={[styles.metricLabel, { color: theme.textSoft }]}>Pasos</Text>
            <Text style={[styles.metricValue, { color: theme.text }]}>{steps.toLocaleString('es-CO')}</Text>
          </View>
          <View style={[styles.metricDivider, { backgroundColor: theme.borderSoft }]} />
          <View style={styles.metricBlock}>
            <Text style={[styles.metricLabel, { color: theme.textSoft }]}>Distancia (km)</Text>
            <Text style={[styles.metricValue, { color: theme.text }]}>{distance}</Text>
          </View>
        </View>

        <View style={styles.activitiesList}>
          {recentActivities.map((activity) => (
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

        <TouchableOpacity
          style={styles.moreRow}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('Main', { screen: 'Rutinas' })}
        >
          <Text style={[styles.moreText, { color: theme.text }]}>+ 3 actividades mas</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.textSoft} />
        </TouchableOpacity>
      </View>

      <View style={styles.quickStrip}>
        <TouchableOpacity style={[styles.quickChip, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]} onPress={() => goToWorkout('WORK')} activeOpacity={0.9}>
          <Ionicons name="flame-outline" size={18} color={theme.primary} />
          <Text style={[styles.quickChipText, { color: theme.text }]}>Quemar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.quickChip, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]} onPress={() => goToWorkout('SPIN')} activeOpacity={0.9}>
          <Ionicons name="bicycle-outline" size={18} color={theme.primary} />
          <Text style={[styles.quickChipText, { color: theme.text }]}>Cardio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.quickChip, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]} onPress={() => goToWorkout('RUSTIC')} activeOpacity={0.9}>
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
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#e60404',
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
    color: '#111827',
  },
  prompt: {
    marginTop: 2,
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#eef2f7',
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
  sectionTitle: {
    marginTop: 26,
    marginBottom: 14,
    color: '#111827',
    fontSize: 27,
    fontWeight: '900',
  },
  metricsCard: {
    borderWidth: 1,
    backgroundColor: '#fff',
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: '#eef2f7',
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
    backgroundColor: '#eef2f7',
    marginHorizontal: 14,
  },
  metricLabel: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '700',
  },
  metricValue: {
    marginTop: 8,
    color: '#111827',
    fontSize: 34,
    lineHeight: 36,
    fontWeight: '900',
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
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  activitySubtitle: {
    marginTop: 3,
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '600',
  },
  moreRow: {
    marginTop: 4,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moreText: {
    color: '#111827',
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#fee2e2',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickChipText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8,
  },
});
