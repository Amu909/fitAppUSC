import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';

export default function AIAssistantPanel({
  title,
  subtitle,
  buttonLabel,
  loading,
  insight,
  onPress,
}) {
  const { theme, isDark } = useTheme();

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: theme.surface,
          borderColor: isDark ? theme.border : '#fee2e2',
          shadowOpacity: isDark ? 0 : 0.06,
          elevation: isDark ? 0 : 4,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name="sparkles-outline" size={20} color={theme.primary} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>
        </View>
      </View>

      {insight ? <Text style={[styles.insight, { color: theme.textMuted }]}>{insight}</Text> : null}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.primary }, loading && styles.buttonDisabled]}
        onPress={onPress}
        disabled={loading}
        activeOpacity={0.86}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="flash-outline" size={18} color="#fff" />
            <Text style={styles.buttonText}>{buttonLabel}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#fee2e2',
    padding: 16,
    marginBottom: 18,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  copy: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  insight: {
    marginTop: 14,
    color: '#374151',
    fontSize: 14,
    lineHeight: 21,
  },
  button: {
    marginTop: 14,
    backgroundColor: '#e60404',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonDisabled: {
    backgroundColor: '#fca5a5',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },
});
