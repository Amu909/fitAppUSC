import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from './app/AuthContext';
// Pantallas
import Login from './app/login';
import Home from './app/home';
import Analytics from './app/Analitics';
import Workouts from './app/Workouts';
import Nutrition from './app/Nutrition';
import IMCForm from './app/IMCForum';
import WorkoutTimerScreen from './app/WorkoutTimerScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

SplashScreen.preventAutoHideAsync();

function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Mis Analíticas') iconName = 'bar-chart';
          else if (route.name === 'Rutinas') iconName = 'fitness';
          else if (route.name === 'Nutrición') iconName = 'restaurant';
          else if (route.name === 'Calculadora') iconName = 'calculator-outline';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#e60404',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Mis Analíticas" component={Analytics} />
      <Tab.Screen name="Rutinas" component={Workouts} />
      <Tab.Screen name="Nutrición" component={Nutrition} />
      <Tab.Screen name="Calculadora" component={IMCForm} />


    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { isLoggedIn } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (

      <>
        
        <Stack.Screen name="Main" component={BottomTabs} />
        <Stack.Screen name="WorkoutTimerScreen" component={WorkoutTimerScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={Login} />

        
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
  });

  React.useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return <View />;

  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
