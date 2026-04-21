import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

const ROLE_COPY = {
  admin: {
    title: 'Panel administrativo',
    subtitle: 'Gestion global del gimnasio, usuarios y configuracion.',
    items: [
      'Asignar o modificar roles de usuario',
      'Supervisar entrenadores y miembros',
      'Gestionar configuraciones globales del sistema',
    ],
  },
  trainer: {
    title: 'Panel del entrenador',
    subtitle: 'Seguimiento de clientes y planificacion de rutinas.',
    items: [
      'Consultar progreso de usuarios asignados',
      'Crear y ajustar rutinas personalizadas',
      'Dar recomendaciones de entrenamiento',
    ],
  },
  member: {
    title: 'Mi perfil de entrenamiento',
    subtitle: 'Acceso a tus datos, rutinas y seguimiento personal.',
    items: [
      'Consultar tus rutinas y progreso',
      'Registrar actividad diaria',
      'Revisar recomendaciones nutricionales',
    ],
  },
};

export default function RoleHubScreen({ navigation }) {
  const { userRole, userProfile, logout } = useAuth();
  const content = ROLE_COPY[userRole] || ROLE_COPY.member;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      Alert.alert('Error', 'No fue posible cerrar la sesion.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.roleTag}>Rol actual: {userRole}</Text>
      <Text style={styles.title}>{content.title}</Text>
      <Text style={styles.subtitle}>{content.subtitle}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Datos de la cuenta</Text>
        <Text style={styles.cardText}>Correo: {userProfile?.email || 'No disponible'}</Text>
        <Text style={styles.cardText}>UID: {userProfile?.uid || 'No disponible'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Permisos principales</Text>
        {content.items.map((item) => (
          <Text key={item} style={styles.permissionText}>- {item}</Text>
        ))}
      </View>

      {userRole === 'admin' ? (
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('ManageRolesScreen')}
        >
          <Text style={styles.secondaryButtonText}>Administrar roles</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Cerrar sesion</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingTop: 56 },
  roleTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    fontWeight: '700',
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 15, color: '#6b7280', marginTop: 8, lineHeight: 22 },
  card: {
    marginTop: 18,
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 },
  cardText: { fontSize: 14, color: '#374151', marginBottom: 6 },
  permissionText: { fontSize: 14, color: '#374151', marginBottom: 8, lineHeight: 20 },
  secondaryButton: {
    marginTop: 22,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e60404',
  },
  secondaryButtonText: { color: '#e60404', fontSize: 16, fontWeight: '700' },
  button: {
    marginTop: 22,
    backgroundColor: '#e60404',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
