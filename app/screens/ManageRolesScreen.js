import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseconfig';
import { useAuth } from '../context/AuthContext';

const AVAILABLE_ROLES = ['member', 'trainer', 'admin'];

export default function ManageRolesScreen() {
  const { userRole, isAdmin, currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const loadUsers = useCallback(async () => {
    setErrorMessage('');
    const usersQuery = query(collection(db, 'users'), orderBy('email'));
    const snapshot = await getDocs(usersQuery);
    setUsers(
      snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }))
    );
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await loadUsers();
      } catch (error) {
        setErrorMessage(error?.message || 'No fue posible cargar los usuarios.');
        Alert.alert('Error', 'No fue posible cargar los usuarios.');
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [loadUsers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadUsers();
    } catch (error) {
      setErrorMessage(error?.message || 'No fue posible actualizar la lista.');
      Alert.alert('Error', 'No fue posible actualizar la lista.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRoleChange = async (targetUser, nextRole) => {
    if (!isAdmin) {
      Alert.alert('Acceso denegado', 'Solo un administrador puede modificar roles.');
      return;
    }

    if ((targetUser.role || 'member') === nextRole) return;

    if (targetUser.uid === currentUser?.uid && nextRole !== 'admin') {
      Alert.alert('Acción no permitida', 'No puedes quitarte a ti mismo el rol de administrador.');
      return;
    }

    setUpdatingUserId(targetUser.id);
    try {
      await updateDoc(doc(db, 'users', targetUser.id), { role: nextRole });
      await loadUsers();
    } catch (error) {
      Alert.alert('Error', 'No fue posible actualizar el rol del usuario.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleActiveToggle = async (targetUser) => {
    if (!isAdmin) {
      Alert.alert('Acceso denegado', 'Solo un administrador puede modificar usuarios.');
      return;
    }

    if (targetUser.uid === currentUser?.uid) {
      Alert.alert('Acción no permitida', 'No puedes suspender tu propio usuario administrador.');
      return;
    }

    setUpdatingUserId(targetUser.id);
    try {
      await updateDoc(doc(db, 'users', targetUser.id), {
        active: !(targetUser.active ?? true),
      });
      await loadUsers();
    } catch (error) {
      setErrorMessage(error?.message || 'No fue posible actualizar el estado del usuario.');
      Alert.alert('Error', 'No fue posible actualizar el estado del usuario.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteProfile = (targetUser) => {
    if (!isAdmin) {
      Alert.alert('Acceso denegado', 'Solo un administrador puede eliminar perfiles.');
      return;
    }

    if (targetUser.uid === currentUser?.uid) {
      Alert.alert('Acción no permitida', 'No puedes eliminar tu propio perfil administrador.');
      return;
    }

    Alert.alert(
      'Eliminar perfil',
      'Esto elimina el perfil de Firestore usado por la app, pero no borra la cuenta de Firebase Authentication.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setUpdatingUserId(targetUser.id);
            try {
              await deleteDoc(doc(db, 'users', targetUser.id));
              await loadUsers();
            } catch (error) {
              setErrorMessage(error?.message || 'No fue posible eliminar el perfil.');
              Alert.alert('Error', 'No fue posible eliminar el perfil.');
            } finally {
              setUpdatingUserId(null);
            }
          },
        },
      ]
    );
  };

  if (!isAdmin) {
    return (
      <View style={styles.centered}>
        <Text style={styles.deniedTitle}>Acceso restringido</Text>
        <Text style={styles.deniedText}>Esta pantalla solo está disponible para administradores.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e60404" />
        <Text style={styles.loadingText}>Cargando usuarios...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <Text style={styles.kicker}>Administración</Text>
      <Text style={styles.title}>Gestión de roles</Text>
      <Text style={styles.subtitle}>
        Solo el administrador puede asignar los roles de miembro, entrenador o administrador.
      </Text>
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      <Text style={styles.totalText}>{users.length} usuarios sincronizados</Text>

      {users.map((userItem) => (
        <View key={userItem.id} style={styles.userCard}>
          <Text style={styles.userEmail}>{userItem.email || 'Sin correo'}</Text>
          <Text style={styles.userMeta}>UID: {userItem.uid || userItem.id}</Text>
          <Text style={styles.userMeta}>Rol actual: {userItem.role || 'member'}</Text>
          <Text style={styles.userMeta}>Estado: {(userItem.active ?? true) ? 'activo' : 'suspendido'}</Text>

          <View style={styles.roleRow}>
            {AVAILABLE_ROLES.map((roleOption) => {
              const selected = (userItem.role || 'member') === roleOption;
              const disabled = updatingUserId === userItem.id;

              return (
                <TouchableOpacity
                  key={`${userItem.id}-${roleOption}`}
                  style={[
                    styles.roleButton,
                    selected && styles.roleButtonSelected,
                    disabled && styles.roleButtonDisabled,
                  ]}
                  disabled={disabled}
                  onPress={() => handleRoleChange(userItem, roleOption)}
                >
                  <Text
                    style={[
                      styles.roleButtonText,
                      selected && styles.roleButtonTextSelected,
                    ]}
                  >
                    {roleOption}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                !(userItem.active ?? true) && styles.actionButtonSuccess,
                updatingUserId === userItem.id && styles.roleButtonDisabled,
              ]}
              disabled={updatingUserId === userItem.id}
              onPress={() => handleActiveToggle(userItem)}
            >
              <Text style={styles.actionButtonText}>
                {(userItem.active ?? true) ? 'Suspender' : 'Activar'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.deleteButton,
                updatingUserId === userItem.id && styles.roleButtonDisabled,
              ]}
              disabled={updatingUserId === userItem.id}
              onPress={() => handleDeleteProfile(userItem)}
            >
              <Text style={styles.deleteButtonText}>Eliminar perfil</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingTop: 56, paddingBottom: 32 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  loadingText: { marginTop: 12, color: '#4b5563', fontSize: 15 },
  deniedTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  deniedText: { marginTop: 10, color: '#6b7280', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  kicker: {
    color: '#e60404',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: { marginTop: 8, fontSize: 30, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 8, fontSize: 15, color: '#6b7280', lineHeight: 22 },
  errorText: { marginTop: 12, color: '#b91c1c', fontSize: 13, fontWeight: '700', lineHeight: 19 },
  totalText: { marginTop: 12, color: '#111827', fontSize: 13, fontWeight: '800' },
  userCard: {
    marginTop: 18,
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  userEmail: { fontSize: 16, fontWeight: '700', color: '#111827' },
  userMeta: { marginTop: 6, fontSize: 13, color: '#6b7280' },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  roleButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  roleButtonSelected: {
    backgroundColor: '#e60404',
    borderColor: '#e60404',
  },
  roleButtonDisabled: {
    opacity: 0.6,
  },
  roleButtonText: { color: '#374151', fontWeight: '600', fontSize: 13 },
  roleButtonTextSelected: { color: '#fff' },
  actionButton: {
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#fffbeb',
  },
  actionButtonSuccess: {
    borderColor: '#16a34a',
    backgroundColor: '#f0fdf4',
  },
  actionButtonText: { color: '#92400e', fontWeight: '700', fontSize: 13 },
  deleteButton: {
    borderColor: '#fecaca',
    backgroundColor: '#fff1f2',
  },
  deleteButtonText: { color: '#be123c', fontWeight: '800', fontSize: 13 },
});
