import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import { ActivityIndicator, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from './app/context/AuthContext';
// Pantallas
import Login from './app/screens/login';
import Home from './app/screens/home';
import Analytics from './app/screens/Analitics';
import Workouts from './app/screens/Workouts';
import Nutrition from './app/screens/Nutrition';
import IMCForm from './app/screens/IMCForum';
import WorkoutTimerScreen from './app/screens/WorkoutTimerScreen';
import ChatbotScreen from './app/screens/chatbot_screen_native';
import WorkoutExercisesScreen from './app/screens/WorkoutExercisesScreen';
import WorkoutExerciseDetailScreen from './app/screens/WorkoutExerciseDetailScreen';
import ManageRolesScreen from './app/screens/ManageRolesScreen';
import TopAppBar from './app/components/TopAppBar';
import ProfileScreen from './app/screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

SplashScreen.preventAutoHideAsync();

function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        header: () => <TopAppBar />,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: 56,
          paddingTop: 3,
          paddingBottom: 3,
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#eef2f7',
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          marginTop: -2,
          paddingBottom: 1,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Mis Analíticas') iconName = 'bar-chart';
          else if (route.name === 'Rutinas') iconName = 'fitness';
          else if (route.name === 'Nutrición') iconName = 'restaurant';
          else if (route.name === 'Chatbot') iconName = 'flash-outline';

          return <Ionicons name={iconName} size={20} color={color} />;
        },
        tabBarActiveTintColor: '#e60404',
        tabBarInactiveTintColor: '#94a3b8',
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Mis Analíticas" component={Analytics} />
      <Tab.Screen name="Rutinas" component={Workouts} />
      <Tab.Screen name="Nutrición" component={Nutrition} />
      <Tab.Screen name="Chatbot" component={ChatbotScreen} />
      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { isLoggedIn, authLoading } = useAuth();

  if (authLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#e60404" />
        <Text style={styles.loadingText}>Cargando sesión y permisos...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <>
          <Stack.Screen name="Main" component={BottomTabs} />
          <Stack.Screen
            name="WorkoutExercisesScreen"
            component={WorkoutExercisesScreen}
            options={{ headerShown: true, header: () => <TopAppBar /> }}
          />
          <Stack.Screen
            name="WorkoutExerciseDetailScreen"
            component={WorkoutExerciseDetailScreen}
            options={{ headerShown: true, header: () => <TopAppBar /> }}
          />
          <Stack.Screen
            name="ManageRolesScreen"
            component={ManageRolesScreen}
            options={{ headerShown: true, header: () => <TopAppBar /> }}
          />
          <Stack.Screen
            name="WorkoutTimerScreen"
            component={WorkoutTimerScreen}
            options={{ headerShown: true, header: () => <TopAppBar /> }}
          />
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

const styles = {
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 14,
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
};
