import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { deleteUser } from 'firebase/auth';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../../firebaseconfig';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

const createProfileForm = (profile) => ({
  fullName: profile?.fullName || '',
  age: profile?.age ? String(profile.age) : '',
  weight: profile?.weight ? String(profile.weight) : '',
  height: profile?.height ? String(profile.height) : '',
  goal: profile?.goal || 'maintain',
  isVegetarian: !!profile?.isVegetarian,
  isDiabetic: !!profile?.isDiabetic,
  isHypertensive: !!profile?.isHypertensive,
  photoURL: profile?.photoURL || '',
});

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { userProfile, userRole, isAdmin, currentUser, refreshProfile, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(createProfileForm(userProfile));

  useEffect(() => {
    setForm(createProfileForm(userProfile));
  }, [userProfile]);

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Debes permitir el acceso a la galeria.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setForm((prev) => ({ ...prev, photoURL: result.assets[0].uri }));
    }
  };

  const uploadProfilePhoto = async () => {
    if (!currentUser || !form.photoURL || form.photoURL.startsWith('https://')) {
      return form.photoURL;
    }

    const blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = () => reject(new Error('No fue posible procesar la imagen.'));
      xhr.responseType = 'blob';
      xhr.open('GET', form.photoURL, true);
      xhr.timeout = 15000;
      xhr.ontimeout = () => reject(new Error('La carga de la imagen excedio el tiempo esperado.'));
      xhr.send(null);
    });

    const storageRef = ref(storage, `profile_photos/${currentUser.uid}.jpg`);
    await uploadBytes(storageRef, blob);
    return getDownloadURL(storageRef);
  };

  const handleSave = async () => {
    if (!currentUser) return;

    if (!form.fullName.trim()) {
      Alert.alert('Perfil', 'Ingresa tu nombre antes de guardar.');
      return;
    }

    if (!form.age || !form.weight || !form.height) {
      Alert.alert('Perfil', 'Completa edad, peso y estatura antes de guardar.');
      return;
    }

    setLoading(true);
    try {
      const uploadedPhotoURL = await uploadProfilePhoto();
      await updateDoc(doc(db, 'users', currentUser.uid), {
        fullName: form.fullName.trim(),
        age: Number(form.age),
        weight: Number(form.weight),
        height: Number(form.height),
        goal: form.goal.trim(),
        isVegetarian: form.isVegetarian,
        isDiabetic: form.isDiabetic,
        isHypertensive: form.isHypertensive,
        photoURL: uploadedPhotoURL,
      });
      await refreshProfile();
      Alert.alert('Perfil actualizado', 'Tus datos fueron actualizados correctamente.');
    } catch (error) {
      const message =
        error?.message ||
        'No fue posible actualizar tu perfil.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      'Esta accion eliminara tu cuenta y tu perfil. Deseas continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (!currentUser) return;
            setLoading(true);
            try {
              await deleteDoc(doc(db, 'users', currentUser.uid));
              await deleteUser(currentUser);
            } catch (error) {
              Alert.alert(
                'Error',
                'No fue posible eliminar la cuenta. Es posible que debas iniciar sesion de nuevo antes de eliminarla.'
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      Alert.alert('Error', 'No fue posible cerrar sesion.');
    }
  };

  const toggleField = (field) => {
    setForm((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Mi perfil</Text>
      <Text style={styles.subtitle}>Actualiza tus datos, tu foto y administra tu cuenta.</Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryTextBlock}>
          <Text style={styles.summaryLabel}>Cuenta activa</Text>
          <Text style={styles.summaryValue}>{userProfile?.email || currentUser?.email || 'Sin correo'}</Text>
        </View>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{userProfile?.role || 'member'}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.photoWrapper} onPress={pickPhoto} activeOpacity={0.88}>
        {form.photoURL ? (
          <Image source={{ uri: form.photoURL }} style={styles.photo} />
        ) : (
        <View style={styles.photoFallback}>
            <Text style={styles.photoFallbackText}>
              {Platform.OS === 'web' ? 'Seleccionar imagen' : 'Agregar foto'}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Nombre completo"
        value={form.fullName}
        onChangeText={(text) => setForm((prev) => ({ ...prev, fullName: text }))}
      />
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="Edad"
          keyboardType="numeric"
          value={form.age}
          onChangeText={(text) => setForm((prev) => ({ ...prev, age: text }))}
        />
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="Peso"
          keyboardType="numeric"
          value={form.weight}
          onChangeText={(text) => setForm((prev) => ({ ...prev, weight: text }))}
        />
      </View>
      <TextInput
        style={styles.input}
        placeholder="Estatura (cm)"
        keyboardType="numeric"
        value={form.height}
        onChangeText={(text) => setForm((prev) => ({ ...prev, height: text }))}
      />
      <TextInput
        style={styles.input}
        placeholder="Objetivo"
        value={form.goal}
        onChangeText={(text) => setForm((prev) => ({ ...prev, goal: text }))}
      />

      <Text style={styles.sectionTitle}>Condiciones y preferencias</Text>
      <View style={styles.toggleGroup}>
        <TouchableOpacity
          style={[styles.toggleChip, form.isVegetarian && styles.toggleChipActive]}
          onPress={() => toggleField('isVegetarian')}
        >
          <Text style={[styles.toggleChipText, form.isVegetarian && styles.toggleChipTextActive]}>
            Vegetariano
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleChip, form.isDiabetic && styles.toggleChipActive]}
          onPress={() => toggleField('isDiabetic')}
        >
          <Text style={[styles.toggleChipText, form.isDiabetic && styles.toggleChipTextActive]}>
            Diabetico
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleChip, form.isHypertensive && styles.toggleChipActive]}
          onPress={() => toggleField('isHypertensive')}
        >
          <Text style={[styles.toggleChipText, form.isHypertensive && styles.toggleChipTextActive]}>
            Hipertenso
          </Text>
        </TouchableOpacity>
      </View>

      {isAdmin ? (
        <View style={styles.adminCard}>
          <Text style={styles.adminTitle}>Herramientas de administrador</Text>
          <Text style={styles.adminCopy}>
            Desde aqui puedes entrar al modulo de gestion para asignar roles y controlar usuarios.
          </Text>
          <TouchableOpacity
            style={styles.adminButton}
            onPress={() => navigation.navigate('ManageRolesScreen')}
          >
            <Text style={styles.adminButtonText}>Administrar usuarios y roles</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity style={styles.primaryButton} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Guardar cambios</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={handleLogout} disabled={loading}>
        <Text style={styles.secondaryButtonText}>Cerrar sesion</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteAccount} disabled={loading}>
        <Text style={styles.dangerButtonText}>Eliminar cuenta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 120 },
  title: { fontSize: 30, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 8, color: '#6b7280', lineHeight: 22, marginBottom: 20 },
  summaryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 18,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#9ca3af',
    letterSpacing: 0.4,
  },
  summaryValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '700',
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  roleBadgeText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  photoWrapper: { alignSelf: 'center', marginBottom: 22 },
  photo: { width: 108, height: 108, borderRadius: 54 },
  photoFallback: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  photoFallbackText: { color: '#b91c1c', fontWeight: '700', textAlign: 'center' },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 14,
    fontSize: 15,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { width: '48%' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 6,
    marginBottom: 12,
  },
  toggleGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  toggleChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
    marginBottom: 10,
  },
  toggleChipActive: {
    backgroundColor: '#e60404',
    borderColor: '#e60404',
  },
  toggleChipText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
  },
  toggleChipTextActive: {
    color: '#fff',
  },
  adminCard: {
    marginTop: 10,
    marginBottom: 6,
    backgroundColor: '#fff7ed',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#fed7aa',
    padding: 18,
  },
  adminTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#9a3412',
  },
  adminCopy: {
    marginTop: 8,
    fontSize: 14,
    color: '#7c2d12',
    lineHeight: 21,
  },
  adminButton: {
    marginTop: 14,
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  adminButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  primaryButton: {
    marginTop: 6,
    backgroundColor: '#e60404',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  secondaryButtonText: { color: '#374151', fontSize: 15, fontWeight: '700' },
  dangerButton: {
    marginTop: 12,
    backgroundColor: '#fff1f2',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  dangerButtonText: { color: '#be123c', fontSize: 15, fontWeight: '700' },
});
