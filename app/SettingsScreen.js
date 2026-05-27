import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from './context/AuthContext';
import { useTheme } from './ThemeContext';

const APP_VERSION = 'FITAPP 1.0.0';

export default function SettingsScreen() {
  const { theme, mode, setMode } = useTheme();
  const { logout } = useAuth();

  const showCredits = () => {
    Alert.alert(
      'Creditos de la aplicacion',
      'FITAPP fue desarrollada como una experiencia de fitness, nutricion, entrenamiento y seguimiento personal para el proyecto fitAppUSC.'
    );
  };

  const showSupport = () => {
    Alert.alert(
      'Ayuda y soporte',
      'Desde esta vista puedes ajustar la apariencia, revisar informacion clave y acceder a los apartados principales de la aplicacion.'
    );
  };

  const showPrivacy = () => {
    Alert.alert(
      'Privacidad y permisos',
      'Tus datos de perfil, rutinas y registros se usan para personalizar la experiencia. Revisa tambien los permisos del dispositivo para actividad, notificaciones y sensores.'
    );
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      Alert.alert('Error', 'No fue posible cerrar sesion en este momento.');
    }
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
        <Text style={[styles.kicker, { color: theme.primary }]}>Configuracion</Text>
        <Text style={[styles.title, { color: theme.text }]}>Ajusta tu experiencia</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Cambia la apariencia, revisa informacion de la app y accede a ayuda sin salir del flujo principal.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.textSoft }]}>Apariencia</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingCopy}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>Tema de la app</Text>
              <Text style={[styles.settingText, { color: theme.textMuted }]}>
                Elige el modo visual que mejor te funcione durante el dia.
              </Text>
            </View>
          </View>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[
                styles.modeChip,
                { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                mode === 'light' && { backgroundColor: theme.primary, borderColor: theme.primary },
              ]}
              onPress={() => setMode('light')}
              activeOpacity={0.9}
            >
              <Ionicons name="sunny-outline" size={16} color={mode === 'light' ? '#fff' : theme.text} />
              <Text style={[styles.modeChipText, { color: mode === 'light' ? '#fff' : theme.text }]}>Claro</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeChip,
                { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                mode === 'dark' && { backgroundColor: theme.primary, borderColor: theme.primary },
              ]}
              onPress={() => setMode('dark')}
              activeOpacity={0.9}
            >
              <Ionicons name="moon-outline" size={16} color={mode === 'dark' ? '#fff' : theme.text} />
              <Text style={[styles.modeChipText, { color: mode === 'dark' ? '#fff' : theme.text }]}>Oscuro</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.textSoft }]}>Informacion</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
          <ActionRow
            icon="shield-checkmark-outline"
            title="Privacidad y permisos"
            description="Consulta el uso de datos y que accesos conviene tener activos."
            theme={theme}
            onPress={showPrivacy}
          />
          <ActionRow
            icon="ribbon-outline"
            title="Creditos"
            description="Conoce el contexto y proposito de la aplicacion."
            theme={theme}
            onPress={showCredits}
          />
          <ActionRow
            icon="help-circle-outline"
            title="Ayuda y soporte"
            description="Accede a una guia rapida para navegar mejor por los modulos."
            theme={theme}
            onPress={showSupport}
          />
          <View style={styles.actionRow}>
            <View style={styles.rowIconWrap}>
              <Ionicons name="apps-outline" size={18} color={theme.primary} />
            </View>
            <View style={styles.settingCopy}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>Version</Text>
              <Text style={[styles.settingText, { color: theme.textMuted }]}>{APP_VERSION}</Text>
            </View>
          </View>
        </View>
      </View>

      <TouchableOpacity style={[styles.logoutButton, { backgroundColor: theme.primary }]} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color="#fff" />
        <Text style={styles.logoutText}>Cerrar sesion</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function ActionRow({ icon, title, description, theme, onPress }) {
  return (
    <TouchableOpacity style={styles.actionRow} onPress={onPress} activeOpacity={0.88}>
      <View style={styles.rowIconWrap}>
        <Ionicons name={icon} size={18} color={theme.primary} />
      </View>
      <View style={styles.settingCopy}>
        <Text style={[styles.settingTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.settingText, { color: theme.textMuted }]}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward-outline" size={18} color={theme.textSoft} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 36,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
  },
  section: {
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 10,
    letterSpacing: 0.6,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  settingRow: {
    marginBottom: 14,
  },
  settingCopy: {
    flex: 1,
    paddingRight: 12,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  settingText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  modeRow: {
    flexDirection: 'row',
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginRight: 10,
  },
  modeChipText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.18)',
  },
  rowIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(230, 4, 4, 0.08)',
    marginRight: 12,
  },
  logoutButton: {
    marginTop: 24,
    borderRadius: 18,
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
