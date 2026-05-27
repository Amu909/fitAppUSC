import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from './context/AuthContext';
import { useNotifications } from './NotificationContext';
import { useTheme } from './ThemeContext';

function NotificationCard({ item, onPress, theme }) {
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${item.color}18` }]}>
        <Ionicons name={item.icon} size={22} color={item.color} />
      </View>

      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
          {item.unread ? <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} /> : null}
        </View>
        <Text style={[styles.message, { color: theme.textMuted }]}>{item.message}</Text>
        <View style={styles.metaRow}>
          <Text style={[styles.date, { color: theme.textSoft }]}>{item.dateLabel}</Text>
          <Text style={[styles.action, { color: theme.primary }]}>{item.actionLabel}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const { userProfile, currentUser } = useAuth();
  const { theme } = useTheme();
  const { notifications, markAllAsRead } = useNotifications();

  const firstName =
    userProfile?.fullName?.trim()?.split(' ')?.[0] ||
    currentUser?.displayName?.trim()?.split(' ')?.[0] ||
    'Usuario';

  useFocusEffect(
    React.useCallback(() => {
      markAllAsRead();
    }, [markAllAsRead])
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.kicker, { color: theme.primary }]}>Centro de notificaciones</Text>
      <Text style={[styles.title, { color: theme.text }]}>Hola, {firstName}</Text>

      <View style={styles.list}>
        {notifications.map((item) => (
          <NotificationCard
            key={item.id}
            item={item}
            theme={theme}
            onPress={() => navigation.navigate('Main', item.navigateTo)}
          />
        ))}
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
    padding: 20,
    paddingTop: 56,
    paddingBottom: 32,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    marginTop: 8,
    fontSize: 31,
    fontWeight: '900',
  },
  list: {
    marginTop: 20,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
  },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  copy: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    marginLeft: 8,
  },
  message: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  metaRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  date: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  action: {
    fontSize: 12,
    fontWeight: '900',
  },
});
