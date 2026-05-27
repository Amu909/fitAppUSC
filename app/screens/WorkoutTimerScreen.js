import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../ThemeContext';
import { saveWorkoutSession } from '../utils/activityLog';

const screenWidth = Dimensions.get('window').width;
const RING_SIZE = Math.min(screenWidth * 0.76, 308);
const STROKE_WIDTH = 22;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const SESSION_TARGETS = {
  WORK: 45 * 60,
  SPIN: 30 * 60,
  RUSTIC: 20 * 60,
};

const SESSION_LABELS = {
  WORK: 'Fuerza',
  SPIN: 'Cardio',
  RUSTIC: 'Core',
};

const formatTime = (totalSeconds) => {
  const safeSeconds = Math.max(0, totalSeconds || 0);
  const hours = String(Math.floor(safeSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((safeSeconds % 3600) / 60)).padStart(2, '0');
  const secs = String(safeSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${secs}`;
};

const formatShortDuration = (totalSeconds) => {
  const minutes = Math.max(1, Math.round(totalSeconds / 60));
  return `${minutes} min`;
};

export default function WorkoutTimerScreen({ route }) {
  const { type, label } = route.params;
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);
  const navigation = useNavigation();
  const { currentUser } = useAuth();
  const { theme, isDark } = useTheme();
  const targetSeconds = SESSION_TARGETS[type] || 30 * 60;
  const sessionTag = SESSION_LABELS[type] || 'Sesion';

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  const progress = useMemo(() => {
    const ratio = seconds / targetSeconds;
    if (!Number.isFinite(ratio)) {
      return 0;
    }
    return Math.min(Math.max(ratio, 0), 1);
  }, [seconds, targetSeconds]);

  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);
  const angle = progress * Math.PI * 2 - Math.PI / 2;
  const knobX = RING_SIZE / 2 + RADIUS * Math.cos(angle);
  const knobY = RING_SIZE / 2 + RADIUS * Math.sin(angle);
  const remainingSeconds = Math.max(0, targetSeconds - seconds);

  const handleReset = () => {
    setIsRunning(false);
    setSeconds(0);
  };

  const handleEnd = async () => {
    setIsRunning(false);

    if (currentUser?.uid && seconds > 0) {
      try {
        await saveWorkoutSession({
          userId: currentUser.uid,
          type,
          durationSeconds: seconds,
        });
      } catch (error) {
        console.error('No fue posible guardar la sesion', error);
      }
    }

    navigation.navigate('Main', { screen: 'Home' });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.shell, { backgroundColor: theme.surfaceDark }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={20} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.headerCopy}>
            <Text style={[styles.kicker, { color: theme.primary }]}>{sessionTag}</Text>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
              {label || `${type} session`}
            </Text>
          </View>

          <View style={[styles.goalChip, { backgroundColor: theme.primarySoft, borderColor: theme.border }]}>
            <Text style={[styles.goalChipText, { color: theme.primary }]}>{formatShortDuration(targetSeconds)}</Text>
          </View>
        </View>

        <View style={styles.ringSection}>
          <View style={[styles.ringCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                stroke={isDark ? 'rgba(255,255,255,0.10)' : '#eceff5'}
                strokeWidth={STROKE_WIDTH}
                fill="none"
                strokeLinecap="round"
              />
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                stroke={theme.primary}
                strokeWidth={STROKE_WIDTH}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                rotation={-90}
                originX={RING_SIZE / 2}
                originY={RING_SIZE / 2}
              />
              <Circle
                cx={knobX}
                cy={knobY}
                r={11}
                fill="#ffffff"
                stroke={theme.primary}
                strokeWidth={3}
              />
            </Svg>

            <View style={styles.timerCopy}>
              <Text style={[styles.timer, { color: theme.text }]}>{formatTime(seconds)}</Text>
              <Text style={[styles.timerCaption, { color: theme.textMuted }]}>
                {isRunning ? 'Sesion en curso' : 'Pulsa iniciar cuando estes listo'}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.metaCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
              <Text style={[styles.metaLabel, { color: theme.textSoft }]}>Progreso</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>{Math.round(progress * 100)}%</Text>
            </View>
            <View style={[styles.metaCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
              <Text style={[styles.metaLabel, { color: theme.textSoft }]}>Restante</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>{formatTime(remainingSeconds)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.sideControl, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
            onPress={handleReset}
            activeOpacity={0.88}
          >
            <Ionicons name="refresh-outline" size={20} color={theme.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.primaryControl,
              {
                backgroundColor: isRunning ? theme.surfaceAlt : theme.primary,
                borderColor: isRunning ? theme.border : theme.primary,
              },
            ]}
            onPress={() => setIsRunning((prev) => !prev)}
            activeOpacity={0.9}
          >
            <Ionicons name={isRunning ? 'pause' : 'play'} size={28} color={isRunning ? theme.text : '#fff'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sideControl, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
            onPress={handleEnd}
            activeOpacity={0.88}
          >
            <Ionicons name="checkmark-outline" size={22} color={theme.primary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.footerText, { color: theme.textSoft }]}>
          Reinicia a la izquierda, pausa o inicia en el centro y confirma la sesion a la derecha.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 14,
  },
  shell: {
    flex: 1,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 26,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerCopy: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: '900',
  },
  goalChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  goalChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  ringSection: {
    flex: 1,
    justifyContent: 'center',
  },
  ringCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    borderWidth: 1,
    paddingVertical: 26,
  },
  timerCopy: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '72%',
  },
  timer: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 0.6,
    fontFamily: 'Inter_700Bold',
  },
  timerCaption: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  metaCard: {
    width: '48.2%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metaValue: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: '900',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sideControl: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  primaryControl: {
    width: 86,
    height: 86,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  footerText: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
});
