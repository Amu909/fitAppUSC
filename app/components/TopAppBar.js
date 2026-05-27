import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../ThemeContext';

const MAIN_LINKS = [
  { label: 'Inicio', icon: 'home-outline', navigateTo: { name: 'Main', params: { screen: 'Home' } } },
  { label: 'Mis analiticas', icon: 'bar-chart-outline', navigateTo: { name: 'Main', params: { screen: 'Mis Analiticas' } } },
  { label: 'Rutinas', icon: 'fitness-outline', navigateTo: { name: 'Main', params: { screen: 'Rutinas' } } },
  { label: 'Nutricion', icon: 'restaurant-outline', navigateTo: { name: 'Main', params: { screen: 'Nutricion' } } },
  { label: 'Chatbot', icon: 'chatbubble-ellipses-outline', navigateTo: { name: 'Main', params: { screen: 'Chatbot' } } },
  { label: 'Notificaciones', icon: 'notifications-outline', navigateTo: { name: 'NotificationsScreen' } },
  { label: 'Mi perfil', icon: 'person-circle-outline', navigateTo: { name: 'Main', params: { screen: 'Perfil' } } },
];

const SETTINGS_LINKS = [
  { label: 'Configuracion general', icon: 'settings-outline', action: 'settings' },
  { label: 'Creditos', icon: 'ribbon-outline', action: 'credits' },
  { label: 'Ayuda y soporte', icon: 'help-circle-outline', action: 'support' },
];

export default function TopAppBar() {
  const navigation = useNavigation();
  const { userProfile, currentUser, logout } = useAuth();
  const { theme } = useTheme();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [mainExpanded, setMainExpanded] = useState(true);
  const [settingsExpanded, setSettingsExpanded] = useState(true);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const firstName = userProfile?.fullName?.trim()?.split(' ')?.[0] || 'Usuario';
  const avatarUrl = userProfile?.photoURL || currentUser?.photoURL || '';

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarUrl]);

  useEffect(() => {
    if (!menuVisible) {
      return undefined;
    }
    slideAnim.setValue(0);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
    return undefined;
  }, [menuVisible, slideAnim]);

  const initials = userProfile?.fullName
    ? userProfile.fullName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')
    : 'U';

  const openMenu = () => {
    setMenuVisible(true);
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setMenuVisible(false);
      }
    });
  };

  const navigateFromMenu = (target) => {
    closeMenu();
    navigation.navigate(target.name, target.params);
  };

  const showCredits = () => {
    closeMenu();
    Alert.alert(
      'Creditos de la aplicacion',
      'FITAPP fue desarrollada como una experiencia de fitness, nutricion y seguimiento personal para el proyecto fitAppUSC.'
    );
  };

  const showSupport = () => {
    closeMenu();
    Alert.alert(
      'Ayuda y soporte',
      'Desde aqui puedes revisar tus modulos principales, cambiar el tema y navegar rapidamente por la app.'
    );
  };

  const handleLogout = async () => {
    closeMenu();
    try {
      await logout();
    } catch {
      Alert.alert('Error', 'No fue posible cerrar sesion en este momento.');
    }
  };

  const handleSettingsItemPress = (action) => {
    if (action === 'settings') {
      closeMenu();
      navigation.navigate('SettingsScreen');
      return;
    }
    if (action === 'credits') {
      showCredits();
      return;
    }
    if (action === 'support') {
      showSupport();
    }
  };

  const sidebarTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-320, 0],
  });

  const backdropOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.surface, borderBottomColor: theme.borderSoft }]}>
        <View style={styles.brandRow}>
          <TouchableOpacity
            style={styles.menuButton}
            activeOpacity={0.85}
            onPress={openMenu}
          >
            <Ionicons name="menu" size={24} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.brandText, { color: theme.primary }]}>FITAPP</Text>
        </View>

        <TouchableOpacity
          style={styles.profileButton}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Main', { screen: 'Perfil' })}
        >
          <View style={styles.profileMeta}>
            <Text style={[styles.profileLabel, { color: theme.textSoft }]}>Mi perfil</Text>
            <Text style={[styles.profileName, { color: theme.text }]} numberOfLines={1}>
              {firstName}
            </Text>
          </View>
          {avatarUrl && !avatarFailed ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatar}
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: theme.primary }]}>
              <Text style={styles.initialsText}>{initials}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <Modal visible={menuVisible} transparent animationType="none" onRequestClose={closeMenu}>
        <View style={styles.modalRoot}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />
          </Animated.View>
          <Animated.View
            style={[
              styles.sidebar,
              {
                backgroundColor: theme.surface,
                borderRightColor: theme.borderSoft,
                transform: [{ translateX: sidebarTranslateX }],
              },
            ]}
          >
            <ScrollView contentContainerStyle={styles.sidebarContent} showsVerticalScrollIndicator={false}>
              <View style={styles.sidebarHeader}>
                <View>
                  <Text style={[styles.sidebarKicker, { color: theme.primary }]}>Menu lateral</Text>
                  <Text style={[styles.sidebarTitle, { color: theme.text }]}>Hola, {firstName}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                  onPress={closeMenu}
                >
                  <Ionicons name="close" size={18} color={theme.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.sectionBlock}>
                <TouchableOpacity
                  style={[styles.sectionHeader, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                  onPress={() => setMainExpanded((value) => !value)}
                  activeOpacity={0.88}
                >
                  <Text style={[styles.sectionLabel, styles.sectionLabelCompact, { color: theme.textSoft }]}>
                    Vistas principales
                  </Text>
                  <Ionicons
                    name={mainExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                    size={18}
                    color={theme.textSoft}
                  />
                </TouchableOpacity>
                {mainExpanded &&
                  MAIN_LINKS.map((item) => (
                    <TouchableOpacity
                      key={item.label}
                      style={[styles.menuItem, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                      onPress={() => navigateFromMenu(item.navigateTo)}
                      activeOpacity={0.88}
                    >
                      <Ionicons name={item.icon} size={20} color={theme.primary} />
                      <Text style={[styles.menuItemText, { color: theme.text }]}>{item.label}</Text>
                      <Ionicons name="chevron-forward-outline" size={18} color={theme.textSoft} />
                    </TouchableOpacity>
                  ))}
              </View>

              <View style={styles.sectionBlock}>
                <TouchableOpacity
                  style={[styles.sectionHeader, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                  onPress={() => setSettingsExpanded((value) => !value)}
                  activeOpacity={0.88}
                >
                  <Text style={[styles.sectionLabel, styles.sectionLabelCompact, { color: theme.textSoft }]}>
                    Configuracion
                  </Text>
                  <Ionicons
                    name={settingsExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                    size={18}
                    color={theme.textSoft}
                  />
                </TouchableOpacity>
                {settingsExpanded &&
                  SETTINGS_LINKS.map((item) => (
                    <TouchableOpacity
                      key={item.label}
                      style={[styles.menuItem, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                      onPress={() => handleSettingsItemPress(item.action)}
                      activeOpacity={0.88}
                    >
                      <Ionicons name={item.icon} size={20} color={theme.primary} />
                      <Text style={[styles.menuItemText, { color: theme.text }]}>{item.label}</Text>
                      <Ionicons name="chevron-forward-outline" size={18} color={theme.textSoft} />
                    </TouchableOpacity>
                  ))}
              </View>

              <TouchableOpacity style={[styles.logoutButton, { backgroundColor: theme.primary }]} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={18} color="#fff" />
                <Text style={styles.logoutText}>Cerrar sesion</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 68,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  brandText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#e60404',
    letterSpacing: 0.8,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 2,
  },
  profileMeta: {
    marginRight: 10,
    alignItems: 'flex-end',
    maxWidth: 112,
  },
  profileLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  profileName: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '700',
    marginTop: 2,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#e60404',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  modalRoot: {
    flex: 1,
    position: 'relative',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 7, 18, 0.45)',
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 320,
    maxWidth: '86%',
    borderRightWidth: 1,
  },
  sidebarContent: {
    paddingTop: 56,
    paddingHorizontal: 18,
    paddingBottom: 32,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  sidebarKicker: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sidebarTitle: {
    marginTop: 6,
    fontSize: 28,
    fontWeight: '900',
  },
  sectionBlock: {
    marginTop: 8,
    marginBottom: 6,
  },
  sectionHeader: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 8,
  },
  sectionLabelCompact: {
    marginBottom: 0,
    marginTop: 0,
  },
  menuItem: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  menuItemText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '800',
  },
  logoutButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  logoutText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    marginLeft: 8,
  },
});
