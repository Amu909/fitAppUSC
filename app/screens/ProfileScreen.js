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
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../../firebaseconfig';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';

const createProfileForm = (profile) => ({
  fullName: profile?.fullName || '',
  age: profile?.age ? String(profile.age) : '',
  weight: profile?.weight ? String(profile.weight) : '',
  height: profile?.height ? String(profile.height) : '',
  gender: profile?.gender || 'male',
  activity_level: profile?.activity_level || 'moderate',
  goal: profile?.goal || 'maintain',
  allergies: profile?.allergies || '',
  preferences: profile?.preferences || '',
  body_fat_percentage: profile?.body_fat_percentage ? String(profile.body_fat_percentage) : '',
  waist_circumference: profile?.waist_circumference ? String(profile.waist_circumference) : '',
  neck_circumference: profile?.neck_circumference ? String(profile.neck_circumference) : '',
  hip_circumference: profile?.hip_circumference ? String(profile.hip_circumference) : '',
  isVegetarian: !!profile?.isVegetarian,
  isDiabetic: !!profile?.isDiabetic,
  isHypertensive: !!profile?.isHypertensive,
  photoURL: profile?.photoURL || '',
});

const withTimeout = (promise, ms, message) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { userProfile, isAdmin, currentUser, refreshProfile, logout, updateLocalProfile } = useAuth();
  const { theme, mode, setMode, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(createProfileForm(userProfile));

  useEffect(() => {
    const nextForm = createProfileForm(userProfile);
    if (!nextForm.photoURL && currentUser?.photoURL) {
      nextForm.photoURL = currentUser.photoURL;
    }
    setForm(nextForm);
  }, [currentUser?.photoURL, userProfile]);

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
    if (
      !currentUser ||
      !form.photoURL ||
      form.photoURL === userProfile?.photoURL ||
      form.photoURL.startsWith('https://')
    ) {
      return form.photoURL;
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      throw new Error('La subida de fotos desde localhost requiere configurar CORS en Firebase Storage.');
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
    await withTimeout(
      uploadBytes(storageRef, blob),
      15000,
      'La subida de la foto tardo demasiado. Intenta guardar sin cambiar la foto.'
    );
    return withTimeout(
      getDownloadURL(storageRef),
      10000,
      'No fue posible obtener la URL de la foto.'
    );
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
      let uploadedPhotoURL = userProfile?.photoURL || currentUser?.photoURL || '';
      let photoUploadFailed = false;

      if (form.photoURL && form.photoURL !== userProfile?.photoURL && !form.photoURL.startsWith('https://')) {
        try {
          uploadedPhotoURL = await withTimeout(
            uploadProfilePhoto(),
            20000,
            'La foto no termino de procesarse. Intenta de nuevo o cambia la imagen.'
          );
        } catch {
          photoUploadFailed = true;
        }
      } else if (form.photoURL) {
        uploadedPhotoURL = form.photoURL;
      }

      const profilePayload = {
        fullName: form.fullName.trim(),
        age: Number(form.age),
        weight: Number(form.weight),
        height: Number(form.height),
        gender: form.gender,
        activity_level: form.activity_level,
        goal: form.goal.trim(),
        allergies: form.allergies.trim(),
        preferences: form.preferences.trim(),
        body_fat_percentage: form.body_fat_percentage ? Number(form.body_fat_percentage) : null,
        waist_circumference: form.waist_circumference ? Number(form.waist_circumference) : null,
        neck_circumference: form.neck_circumference ? Number(form.neck_circumference) : null,
        hip_circumference: form.hip_circumference ? Number(form.hip_circumference) : null,
        isVegetarian: form.isVegetarian,
        isDiabetic: form.isDiabetic,
        isHypertensive: form.isHypertensive,
        photoURL: uploadedPhotoURL || '',
        active: userProfile?.active ?? true,
      };

      updateLocalProfile(profilePayload);

      if (!userProfile?.uid) {
        profilePayload.uid = currentUser.uid;
        profilePayload.email = currentUser.email || '';
        profilePayload.role = 'member';
      }

      await withTimeout(
        setDoc(doc(db, 'users', currentUser.uid), profilePayload, { merge: true }),
        15000,
        'Firebase tardo demasiado guardando el perfil. Revisa tu conexion e intenta de nuevo.'
      );

      try {
        await withTimeout(refreshProfile(), 8000, 'No se pudo refrescar el perfil a tiempo.');
      } catch {
        // El guardado ya fue exitoso; la proxima lectura sincronizara los datos.
      }

      Alert.alert(
        'Perfil actualizado',
        photoUploadFailed
          ? 'Tus datos se guardaron. La foto no pudo subirse por permisos/CORS de Firebase Storage.'
          : 'Tus datos fueron actualizados correctamente.'
      );
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
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.text }]}>Mi perfil</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>Actualiza tus datos, tu foto y administra tu cuenta.</Text>

      <View style={[styles.summaryCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
        <View style={styles.summaryTextBlock}>
          <Text style={[styles.summaryLabel, { color: theme.textSoft }]}>Cuenta activa</Text>
          <Text style={[styles.summaryValue, { color: theme.text }]}>{userProfile?.email || currentUser?.email || 'Sin correo'}</Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: theme.primarySoft }]}>
          <Text style={styles.roleBadgeText}>{userProfile?.role || 'member'}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.photoWrapper} onPress={pickPhoto} activeOpacity={0.88}>
        {form.photoURL ? (
          <Image source={{ uri: form.photoURL }} style={styles.photo} />
        ) : (
        <View style={[styles.photoFallback, { backgroundColor: theme.primarySoft }]}>
            <Text style={[styles.photoFallbackText, { color: theme.primary }]}>
              {Platform.OS === 'web' ? 'Seleccionar imagen' : 'Agregar foto'}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.summaryTextBlock}>
          <Text style={[styles.summaryLabel, { color: theme.textSoft }]}>Tema de la app</Text>
          <Text style={[styles.summaryValue, { color: theme.text }]}>
            {isDark ? 'Oscuro tipo FitBot' : 'Claro clasico FITAPP'}
          </Text>
        </View>
        <View style={styles.themeToggleRow}>
          <TouchableOpacity
            style={[
              styles.modeChip,
              { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
              mode === 'light' && { backgroundColor: theme.primary, borderColor: theme.primary },
            ]}
            onPress={() => setMode('light')}
          >
            <Text style={[styles.modeChipText, { color: mode === 'light' ? '#fff' : theme.text }]}>Claro</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeChip,
              { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
              mode === 'dark' && { backgroundColor: theme.primary, borderColor: theme.primary },
            ]}
            onPress={() => setMode('dark')}
          >
            <Text style={[styles.modeChipText, { color: mode === 'dark' ? '#fff' : theme.text }]}>Oscuro</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TextInput
        style={[styles.input, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.text }]}
        placeholder="Nombre completo"
        placeholderTextColor={theme.textSoft}
        value={form.fullName}
        onChangeText={(text) => setForm((prev) => ({ ...prev, fullName: text }))}
      />
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.halfInput, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.text }]}
          placeholder="Edad"
          placeholderTextColor={theme.textSoft}
          keyboardType="numeric"
          value={form.age}
          onChangeText={(text) => setForm((prev) => ({ ...prev, age: text }))}
        />
        <TextInput
          style={[styles.input, styles.halfInput, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.text }]}
          placeholder="Peso"
          placeholderTextColor={theme.textSoft}
          keyboardType="numeric"
          value={form.weight}
          onChangeText={(text) => setForm((prev) => ({ ...prev, weight: text }))}
        />
      </View>
      <TextInput
        style={[styles.input, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.text }]}
        placeholder="Estatura (cm)"
        placeholderTextColor={theme.textSoft}
        keyboardType="numeric"
        value={form.height}
        onChangeText={(text) => setForm((prev) => ({ ...prev, height: text }))}
      />
      <TextInput
        style={[styles.input, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.text }]}
        placeholder="Objetivo"
        placeholderTextColor={theme.textSoft}
        value={form.goal}
        onChangeText={(text) => setForm((prev) => ({ ...prev, goal: text }))}
      />

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Perfil nutricional</Text>
      <View style={styles.toggleGroup}>
        {[ 
          ['male', 'Hombre'],
          ['female', 'Mujer'],
        ].map(([value, label]) => (
          <TouchableOpacity
            key={value}
            style={[
              styles.toggleChip,
              { backgroundColor: theme.surface, borderColor: theme.border },
              form.gender === value && styles.toggleChipActive,
            ]}
            onPress={() => setForm((prev) => ({ ...prev, gender: value }))}
          >
              <Text style={[styles.toggleChipText, { color: theme.text }, form.gender === value && styles.toggleChipTextActive]}>
                {label}
              </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.toggleGroup}>
        {[
          ['sedentary', 'Sedentario'],
          ['light', 'Ligero'],
          ['moderate', 'Moderado'],
          ['active', 'Activo'],
        ].map(([value, label]) => (
          <TouchableOpacity
            key={value}
            style={[
              styles.toggleChip,
              { backgroundColor: theme.surface, borderColor: theme.border },
              form.activity_level === value && styles.toggleChipActive,
            ]}
            onPress={() => setForm((prev) => ({ ...prev, activity_level: value }))}
          >
              <Text style={[styles.toggleChipText, { color: theme.text }, form.activity_level === value && styles.toggleChipTextActive]}>
                {label}
              </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={[styles.input, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.text }]}
        placeholder="Alergias separadas por coma"
        placeholderTextColor={theme.textSoft}
        value={form.allergies}
        onChangeText={(text) => setForm((prev) => ({ ...prev, allergies: text }))}
      />
      <TextInput
        style={[styles.input, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.text }]}
        placeholder="Preferencias alimentarias"
        placeholderTextColor={theme.textSoft}
        value={form.preferences}
        onChangeText={(text) => setForm((prev) => ({ ...prev, preferences: text }))}
      />
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Medidas avanzadas</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.halfInput, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.text }]}
          placeholder="Grasa corporal %"
          placeholderTextColor={theme.textSoft}
          keyboardType="numeric"
          value={form.body_fat_percentage}
          onChangeText={(text) => setForm((prev) => ({ ...prev, body_fat_percentage: text }))}
        />
        <TextInput
          style={[styles.input, styles.halfInput, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.text }]}
          placeholder="Cintura (cm)"
          placeholderTextColor={theme.textSoft}
          keyboardType="numeric"
          value={form.waist_circumference}
          onChangeText={(text) => setForm((prev) => ({ ...prev, waist_circumference: text }))}
        />
      </View>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.halfInput, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.text }]}
          placeholder="Cuello (cm)"
          placeholderTextColor={theme.textSoft}
          keyboardType="numeric"
          value={form.neck_circumference}
          onChangeText={(text) => setForm((prev) => ({ ...prev, neck_circumference: text }))}
        />
        {form.gender === 'female' ? (
          <TextInput
            style={[styles.input, styles.halfInput, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.text }]}
            placeholder="Cadera (cm)"
            placeholderTextColor={theme.textSoft}
            keyboardType="numeric"
            value={form.hip_circumference}
            onChangeText={(text) => setForm((prev) => ({ ...prev, hip_circumference: text }))}
          />
        ) : (
          <View style={styles.halfInput} />
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Condiciones y preferencias</Text>
      <View style={styles.toggleGroup}>
        <TouchableOpacity
          style={[styles.toggleChip, { backgroundColor: theme.surface, borderColor: theme.border }, form.isVegetarian && styles.toggleChipActive]}
          onPress={() => toggleField('isVegetarian')}
        >
          <Text style={[styles.toggleChipText, { color: theme.text }, form.isVegetarian && styles.toggleChipTextActive]}>
            Vegetariano
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleChip, { backgroundColor: theme.surface, borderColor: theme.border }, form.isDiabetic && styles.toggleChipActive]}
          onPress={() => toggleField('isDiabetic')}
        >
          <Text style={[styles.toggleChipText, { color: theme.text }, form.isDiabetic && styles.toggleChipTextActive]}>
            Diabetico
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleChip, { backgroundColor: theme.surface, borderColor: theme.border }, form.isHypertensive && styles.toggleChipActive]}
          onPress={() => toggleField('isHypertensive')}
        >
          <Text style={[styles.toggleChipText, { color: theme.text }, form.isHypertensive && styles.toggleChipTextActive]}>
            Hipertenso
          </Text>
        </TouchableOpacity>
      </View>

      {isAdmin ? (
        <View style={[styles.adminCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
          <Text style={[styles.adminTitle, { color: theme.text }]}>Herramientas de administrador</Text>
          <Text style={[styles.adminCopy, { color: theme.textMuted }]}>
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

      <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.primary }]} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Guardar cambios</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={[styles.secondaryButton, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={handleLogout} disabled={loading}>
        <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Cerrar sesion</Text>
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
  themeToggleRow: {
    flexDirection: 'row',
  },
  modeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginLeft: 8,
  },
  modeChipText: {
    fontSize: 13,
    fontWeight: '800',
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
