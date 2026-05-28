import React from 'react';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#e60404', marginBottom: 12 }}>
            Error al iniciar la app
          </Text>
          <Text style={{ fontSize: 13, color: '#111', fontFamily: 'monospace' }}>
            {this.state.error?.message || String(this.state.error)}
          </Text>
          {this.state.error?.stack ? (
            <Text style={{ marginTop: 16, fontSize: 11, color: '#555', fontFamily: 'monospace' }}>
              {this.state.error.stack}
            </Text>
          ) : null}
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

import { getAiHealth } from './app/utils/aiClient';
import { AuthProvider, useAuth } from './app/context/AuthContext';
import { NotificationProvider } from './app/NotificationContext';
import { ThemeProvider, useTheme } from './app/ThemeContext';
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
import NotificationsScreen from './app/NotificationsScreen';
import SettingsScreen from './app/SettingsScreen';
import SessionPlanScreen from './app/SessionPlanScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore splash lifecycle errors on native builds.
});

function BottomTabs() {
  const { theme } = useTheme();

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
          backgroundColor: theme.surface,
          borderTopWidth: 1,
          borderTopColor: theme.borderSoft,
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
        tabBarIcon: ({ color }) => {
          let iconName;

          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Mis Analiticas') iconName = 'bar-chart';
          else if (route.name === 'Rutinas') iconName = 'fitness';
          else if (route.name === 'Nutricion') iconName = 'restaurant';
          else if (route.name === 'Chatbot') iconName = 'flash-outline';

          return <Ionicons name={iconName} size={20} color={color} />;
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.tabInactive,
        sceneStyle: {
          backgroundColor: theme.background,
        },
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Mis Analiticas" component={Analytics} />
      <Tab.Screen name="Rutinas" component={Workouts} />
      <Tab.Screen name="Nutricion" component={Nutrition} />
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
  const { theme } = useTheme();

  if (authLoading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textMuted }]}>Cargando sesion y permisos...</Text>
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
          <Stack.Screen
            name="NotificationsScreen"
            component={NotificationsScreen}
            options={{ headerShown: true, header: () => <TopAppBar /> }}
          />
          <Stack.Screen
            name="SettingsScreen"
            component={SettingsScreen}
            options={{ headerShown: true, header: () => <TopAppBar /> }}
          />
          <Stack.Screen
            name="SessionPlanScreen"
            component={SessionPlanScreen}
            options={{ headerShown: true, header: () => <TopAppBar /> }}
          />
        </>
      ) : (
        <Stack.Screen name="Login" component={Login} />
      )}
    </Stack.Navigator>
  );
}

function AppShell() {
  const { theme, isDark } = useTheme();

  const navigationTheme = React.useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
        background: theme.background,
        card: theme.surface,
        text: theme.text,
        border: theme.borderSoft,
        primary: theme.primary,
        notification: theme.primary,
      },
    }),
    [isDark, theme]
  );

  return (
    <NavigationContainer theme={navigationTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
  });

  React.useEffect(() => {
    getAiHealth().catch(() => {});
  }, []);

  React.useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {
        // Ignore splash lifecycle errors on native builds.
      });
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.bootScreen}>
        <ActivityIndicator size="large" color="#e60404" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <AppShell />
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = {
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '600',
  },
  bootScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
};
