import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const WorkoutTimerScreen = ({ route }) => {
  const { type } = route.params;
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);
  const navigation = useNavigation();

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

  const formatTime = (totalSeconds) => {
    const mins = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const secs = String(totalSeconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const handleReset = () => {
    setIsRunning(false);
    setSeconds(0);
  };

  const handleEnd = () => {
    navigation.navigate('Main', { screen: 'Home' });

  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{type} SESSION</Text>
      <Text style={styles.timer}>{formatTime(seconds)}</Text>

      <View style={styles.buttonsContainer}>
        <View style={styles.topButtons}>
          <TouchableOpacity
            style={[styles.button, isRunning ? styles.pause : styles.start]}
            onPress={() => setIsRunning((prev) => !prev)}
          >
            <Text style={styles.buttonText}>{isRunning ? 'PAUSE' : 'START'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.reset]} onPress={handleReset}>
            <Text style={styles.buttonText}>RESET</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.button, styles.end]} onPress={handleEnd}>
          <Text style={styles.buttonText}>END</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default WorkoutTimerScreen;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 40, color: '#e60404' },
  timer: { fontSize: 72, fontWeight: 'bold', marginBottom: 40, fontFamily: 'Inter_700Bold' },
  buttonsContainer: { alignItems: 'center' },
  topButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 20,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginHorizontal: 10,
  },
  start: { backgroundColor: '#28a745' },
  pause: { backgroundColor: '#ffc107' },
  reset: { backgroundColor: '#058de7' },
  end: { backgroundColor: '#dc3545' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
