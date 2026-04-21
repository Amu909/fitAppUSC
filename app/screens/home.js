import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const screenWidth = Dimensions.get('window').width;

const Home = () => {
  const navigation = useNavigation();

  const goToWorkout = (type) => {
    navigation.navigate('WorkoutTimerScreen', { type });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MI META DE HOY ES:</Text>

      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.slider}>
        <TouchableOpacity style={styles.slide} onPress={() => goToWorkout('WORK')}>
          <Text style={styles.goal}>🔥 WORK</Text>
          <Text style={styles.subtitle}>6 SESIONES EN 30 MINUTOS</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.slide} onPress={() => goToWorkout('SPIN')}>
          <Text style={styles.goal}>🔥 SPIN</Text>
          <Text style={styles.subtitle}>6 SESIONES EN 30 MINUTOS</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.slide} onPress={() => goToWorkout('RUSTIC')}>
          <Text style={styles.goal}>🔥 RUSTIC</Text>
          <Text style={styles.subtitle}>6 SESIONES EN 30 MINUTOS</Text>
        </TouchableOpacity>
      </ScrollView>

      <Text style={styles.mainTitle}>Burn Fat + Lean Down</Text>
      <Text style={styles.secondaryTitle}>AT HOME OR AT THE GYM</Text>

      <Image
        source={require('../assets/images/fitgirl.png')}
        style={styles.image}
        resizeMode="contain"
      />

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>VAMOS!</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: '#fff' },
  title: {
    marginTop: 50,
    fontSize: 16,
    color: '#e60404',
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
  },
  slider: { marginVertical: 20 },
  slide: {
    width: screenWidth - 80,
    marginHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#e60404',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goal: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    marginTop: 10,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
    marginTop: 30,
  },
  secondaryTitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 20,
    fontFamily: 'Inter_400Regular',
  },
  image: { height: 200, width: 200 },
  button: {
    backgroundColor: '#e60404',
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 30,
    marginTop: 30,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
  },
});
