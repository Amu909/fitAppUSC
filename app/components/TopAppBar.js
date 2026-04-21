import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

export default function TopAppBar() {
  const navigation = useNavigation();
  const { userProfile } = useAuth();
  const firstName = userProfile?.fullName?.trim()?.split(' ')?.[0] || 'Usuario';
  const initials = userProfile?.fullName
    ? userProfile.fullName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')
    : 'U';

  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <TouchableOpacity
          style={styles.menuButton}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Main', { screen: 'Home' })}
        >
          <Ionicons name="menu" size={24} color="#4b5563" />
        </TouchableOpacity>
        <Text style={styles.brandText}>FITAPP</Text>
      </View>

      <TouchableOpacity
        style={styles.profileButton}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('Main', { screen: 'Perfil' })}
      >
        <View style={styles.profileMeta}>
          <Text style={styles.profileLabel}>Mi perfil</Text>
          <Text style={styles.profileName} numberOfLines={1}>
            {firstName}
          </Text>
        </View>
        {userProfile?.photoURL ? (
          <Image source={{ uri: userProfile.photoURL }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.initialsText}>{initials}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
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
});
