import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import {
  createUserWithEmailAndPassword,
  FacebookAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../../firebaseconfig';
import { useAuth } from '../context/AuthContext';
import { estimateBodyFatPercentage } from '../utils/bodyComposition';

WebBrowser.maybeCompleteAuthSession();

const GOALS = [
  { key: 'lose_weight', label: 'Perder grasa', icon: 'flame-outline' },
  { key: 'gain_muscle', label: 'Ganar musculo', icon: 'barbell-outline' },
  { key: 'maintain', label: 'Mantenerme', icon: 'fitness-outline' },
  { key: 'athletic', label: 'Rendimiento', icon: 'flash-outline' },
];

const GENDERS = [
  { key: 'male', label: 'Hombre' },
  { key: 'female', label: 'Mujer' },
];

const ACTIVITY_LEVELS = [
  { key: 'sedentary', label: 'Sedentario' },
  { key: 'light', label: 'Ligero' },
  { key: 'moderate', label: 'Moderado' },
  { key: 'active', label: 'Activo' },
];

const STEPS = [
  ['account', 'Cuenta'],
  ['body', 'Perfil fisico'],
  ['goal', 'Objetivo'],
  ['conditions', 'Condiciones'],
  ['photo', 'Foto'],
];

const initialRegister = {
  email: '',
  password: '',
  confirmPassword: '',
  fullName: '',
  age: '',
  weight: '',
  height: '',
  gender: 'male',
  activity_level: 'moderate',
  goal: 'maintain',
  allergies: '',
  preferences: '',
  waist_circumference: '',
  neck_circumference: '',
  hip_circumference: '',
  isVegetarian: false,
  isDiabetic: false,
  isHypertensive: false,
  photoUri: '',
};

const GOOGLE_IDS = {
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || 'pending-android',
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || 'pending-ios',
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'pending-web',
};

const BOOTSTRAP_ADMIN = {
  email: 'admin@fitapp.com',
  password: 'FitAppAdmin123*',
};

const withTimeout = (promise, ms, message) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);

export default function Login() {
  const { refreshProfile } = useAuth();
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [register, setRegister] = useState(initialRegister);
  const [step, setStep] = useState(0);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(18)).current;
  const clientId = Platform.select({
    ios: GOOGLE_IDS.iosClientId,
    android: GOOGLE_IDS.androidClientId,
    default: GOOGLE_IDS.webClientId,
  });
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    {
      androidClientId: GOOGLE_IDS.androidClientId,
      iosClientId: GOOGLE_IDS.iosClientId,
      webClientId: GOOGLE_IDS.webClientId,
      selectAccount: true,
    }
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: false }),
      Animated.spring(rise, { toValue: 0, useNativeDriver: false }),
    ]).start();
  }, [fade, rise]);

  useEffect(() => {
    if (response?.type !== 'success') return;
    const run = async () => {
      const credential = GoogleAuthProvider.credential(
        response.params?.id_token,
        response.params?.access_token
      );
      if (!credential) return;
      setSocialLoading(true);
      try {
        const signed = await signInWithCredential(auth, credential);
        await ensureUserDoc(signed.user, {
          fullName: signed.user.displayName || '',
          photoURL: signed.user.photoURL || '',
        });
        await refreshProfile();
      } catch {
        Alert.alert('Google', 'No fue posible autenticar con Google.');
      } finally {
        setSocialLoading(null);
      }
    };
    run();
  }, [response, refreshProfile]);

  const progress = useMemo(() => `${step + 1}/${STEPS.length}`, [step]);

  const updateRegister = (field, value) => setRegister((prev) => ({ ...prev, [field]: value }));

  const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const validPassword = (value) => value.length >= 6;

  const ensureUserDoc = async (user, extra = {}) => {
    const refUser = doc(db, 'users', user.uid);
    const snapshot = await getDoc(refUser);
    const isBootstrapAdmin = user.email?.toLowerCase() === BOOTSTRAP_ADMIN.email;
    if (!snapshot.exists()) {
      const baseProfile = {
        uid: user.uid,
        email: user.email || extra.email || '',
        fullName: extra.fullName || user.displayName || '',
        role: isBootstrapAdmin ? 'admin' : 'member',
        goal: extra.goal || 'maintain',
        age: extra.age ?? null,
        weight: extra.weight ?? null,
        height: extra.height ?? null,
        gender: extra.gender || 'male',
        activity_level: extra.activity_level || 'moderate',
        allergies: extra.allergies || '',
        preferences: extra.preferences || '',
        body_fat_percentage: extra.body_fat_percentage ?? null,
        waist_circumference: extra.waist_circumference ?? null,
        neck_circumference: extra.neck_circumference ?? null,
        hip_circumference: extra.hip_circumference ?? null,
        isVegetarian: extra.isVegetarian ?? false,
        isDiabetic: extra.isDiabetic ?? false,
        isHypertensive: extra.isHypertensive ?? false,
        photoURL: extra.photoURL || user.photoURL || '',
        active: true,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      };
      try {
        await setDoc(refUser, baseProfile);
      } catch {
        await setDoc(refUser, {
          ...baseProfile,
          role: 'member',
        });
      }
      return;
    }
    const mergeProfile = {
      email: user.email || snapshot.data().email || '',
      fullName: snapshot.data().fullName || user.displayName || extra.fullName || '',
      photoURL: snapshot.data().photoURL || user.photoURL || extra.photoURL || '',
      role: isBootstrapAdmin ? 'admin' : (snapshot.data().role || 'member'),
      lastLoginAt: serverTimestamp(),
    };
    try {
      await setDoc(refUser, mergeProfile, { merge: true });
    } catch {
      await setDoc(
        refUser,
        {
          ...mergeProfile,
          role: snapshot.data().role || 'member',
        },
        { merge: true }
      );
    }
  };

  const uploadPhoto = async (uid, uri) => {
    if (!uri) return '';
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      throw new Error('La subida de fotos desde localhost requiere configurar CORS en Firebase Storage.');
    }
    const result = await withTimeout(
      fetch(uri),
      12000,
      'No fue posible procesar la foto a tiempo.'
    );
    const blob = await result.blob();
    const fileRef = ref(storage, `profile_photos/${uid}.jpg`);
    await withTimeout(
      uploadBytes(fileRef, blob),
      15000,
      'La foto no pudo subirse a tiempo.'
    );
    return withTimeout(
      getDownloadURL(fileRef),
      10000,
      'No fue posible obtener la URL de la foto.'
    );
  };

  const loginWithEmail = async () => {
    if (!validEmail(email) || !validPassword(password)) {
      Alert.alert('Acceso', 'Verifica el correo y la contrasena.');
      return;
    }
    setLoading(true);
    try {
      const signed = await signInWithEmailAndPassword(auth, email.trim(), password);
      await ensureUserDoc(signed.user);
      await refreshProfile();
    } catch (error) {
      const isBootstrapLogin =
        email.trim().toLowerCase() === BOOTSTRAP_ADMIN.email &&
        password === BOOTSTRAP_ADMIN.password;

      if (isBootstrapLogin) {
        try {
          const created = await createUserWithEmailAndPassword(auth, BOOTSTRAP_ADMIN.email, BOOTSTRAP_ADMIN.password);
          await ensureUserDoc(created.user, {
            fullName: 'Administrador FITAPP',
          });
          await refreshProfile();
          return;
        } catch {
          Alert.alert('Acceso', 'No fue posible inicializar el usuario administrador por defecto.');
          return;
        } finally {
          setLoading(false);
        }
      }

      const authCode = error?.code || '';
      const authMessage =
        authCode === 'auth/invalid-credential'
          ? 'Correo o contrasena incorrectos.'
          : authCode === 'auth/user-not-found'
            ? 'No existe una cuenta con ese correo.'
            : authCode === 'auth/wrong-password'
              ? 'La contrasena no coincide.'
              : authCode === 'auth/invalid-email'
                ? 'El correo no tiene un formato valido.'
                : authCode === 'auth/too-many-requests'
                  ? 'Demasiados intentos. Espera un momento antes de volver a intentar.'
                  : authCode === 'auth/network-request-failed'
                    ? 'No hubo conexion con Firebase. Revisa internet y vuelve a intentar.'
                    : authCode === 'auth/configuration-not-found'
                      ? 'Email/Password no esta habilitado en Firebase Authentication.'
                      : `No fue posible iniciar sesion (${authCode || 'error-desconocido'}).`;

      Alert.alert('Acceso', authMessage);
    } finally {
      setLoading(false);
    }
  };

  const registerUser = async () => {
    if (!validEmail(register.email) || !validPassword(register.password)) {
      Alert.alert('Registro', 'Completa correctamente tu correo y contrasena.');
      return;
    }
    if (register.password !== register.confirmPassword) {
      Alert.alert('Registro', 'Las contrasenas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      const estimatedBodyFat = estimateBodyFatPercentage({
        weight: register.weight,
        height: register.height,
        age: register.age,
        gender: register.gender,
      });

      const created = await createUserWithEmailAndPassword(auth, register.email.trim(), register.password);
      const profilePayload = {
        uid: created.user.uid,
        email: created.user.email,
        fullName: register.fullName.trim(),
        role: 'member',
        age: Number(register.age),
        weight: Number(register.weight),
        height: Number(register.height),
        gender: register.gender,
        activity_level: register.activity_level,
        goal: register.goal,
        allergies: register.allergies.trim(),
        preferences: register.preferences.trim(),
        body_fat_percentage: estimatedBodyFat,
        waist_circumference: register.waist_circumference ? Number(register.waist_circumference) : null,
        neck_circumference: register.neck_circumference ? Number(register.neck_circumference) : null,
        hip_circumference: register.hip_circumference ? Number(register.hip_circumference) : null,
        isVegetarian: register.isVegetarian,
        isDiabetic: register.isDiabetic,
        isHypertensive: register.isHypertensive,
        photoURL: '',
        active: true,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', created.user.uid), profilePayload);

      if (register.photoUri) {
        try {
          const photoURL = await uploadPhoto(created.user.uid, register.photoUri);
          await setDoc(doc(db, 'users', created.user.uid), { photoURL }, { merge: true });
        } catch {
          Alert.alert(
            'Foto pendiente',
            'Tu cuenta y datos se guardaron. Puedes subir la foto despues desde Perfil.'
          );
        }
      }

      await refreshProfile();
    } catch (error) {
      const authCode = error?.code || '';
      const authMessage =
        authCode === 'auth/email-already-in-use'
          ? 'Ese correo ya esta registrado.'
          : authCode === 'auth/invalid-email'
            ? 'El correo no tiene un formato valido.'
            : authCode === 'auth/weak-password'
              ? 'La contrasena es demasiado debil.'
              : authCode === 'auth/configuration-not-found'
                ? 'Email/Password no esta habilitado en Firebase Authentication.'
                : `No fue posible crear la cuenta (${authCode || 'error-desconocido'}).`;
      Alert.alert('Registro', authMessage);
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async () => {
    if (!validEmail(email)) {
      Alert.alert('Recuperacion', 'Ingresa un correo valido.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert('Recuperacion', 'Te enviamos un enlace para restablecer la contrasena.');
    } catch {
      Alert.alert('Recuperacion', 'No fue posible enviar el correo.');
    } finally {
      setLoading(false);
    }
  };

  const pickProfileImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Permiso requerido', 'Debes permitir acceso a la galeria.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) updateRegister('photoUri', result.assets[0].uri);
  };

  const nextStep = () => {
    if (
      step === 0 &&
      (
        !register.fullName.trim() ||
        !validEmail(register.email) ||
        !validPassword(register.password) ||
        register.password !== register.confirmPassword
      )
    ) {
      return Alert.alert('Registro', 'Completa tus datos de acceso para continuar.');
    }
    if (step === 1 && (!register.age || !register.weight || !register.height)) {
      return Alert.alert('Registro', 'Completa tus datos fisicos.');
    }
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const googleSignIn = async () => {
    if (Platform.OS === 'web') {
      setSocialLoading('google');
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const signed = await signInWithPopup(auth, provider);
        await ensureUserDoc(signed.user, {
          fullName: signed.user.displayName || '',
          photoURL: signed.user.photoURL || '',
        });
        await refreshProfile();
      } catch (error) {
        const message =
          error?.code === 'auth/unauthorized-domain'
            ? 'Este dominio no esta autorizado en Firebase Authentication.'
            : error?.code === 'auth/operation-not-allowed'
              ? 'Google no esta habilitado en Firebase Authentication.'
              : error?.code === 'auth/popup-closed-by-user'
                ? 'Cerraste la ventana antes de completar el acceso.'
            : 'No fue posible iniciar sesion con Google desde la web.';
        Alert.alert('Google', message);
      } finally {
        setSocialLoading(null);
      }
      return;
    }

    if (!clientId || String(clientId).startsWith('pending-')) {
      return Alert.alert(
        'Google pendiente',
        `Configura ${Platform.OS === 'ios' ? 'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID' : 'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID'} en .env.`
      );
    }
    if (!request) {
      return Alert.alert('Google', 'El proveedor aun se esta preparando. Intenta de nuevo en unos segundos.');
    }
    try {
      setSocialLoading('google');
      const result = await promptAsync();
      if (result?.type !== 'success') setSocialLoading(null);
    } catch {
      setSocialLoading(null);
      Alert.alert('Google', 'No fue posible abrir el proveedor.');
    }
  };

  const facebookSignIn = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert(
        'Facebook',
        'El acceso con Facebook quedo habilitado para web. Si quieres, en el siguiente paso te monto tambien el flujo movil.'
      );
      return;
    }

    setSocialLoading('facebook');
    try {
      const provider = new FacebookAuthProvider();
      provider.setCustomParameters({ display: 'popup' });
      const signed = await signInWithPopup(auth, provider);
      await ensureUserDoc(signed.user, {
        fullName: signed.user.displayName || '',
        photoURL: signed.user.photoURL || '',
      });
      await refreshProfile();
    } catch (error) {
      const message =
        error?.code === 'auth/unauthorized-domain'
          ? 'Este dominio no esta autorizado en Firebase Authentication.'
          : error?.code === 'auth/operation-not-allowed'
            ? 'Facebook no esta habilitado en Firebase Authentication.'
            : error?.code === 'auth/popup-closed-by-user'
              ? 'Cerraste la ventana antes de completar el acceso.'
          : error?.code === 'auth/account-exists-with-different-credential'
            ? 'Ya existe una cuenta con ese correo usando otro proveedor.'
            : 'No fue posible iniciar sesion con Facebook.';
      Alert.alert('Facebook', message);
    } finally {
      setSocialLoading(null);
    }
  };

  const appleSignIn = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert(
        'Apple',
        'El acceso con Apple requiere compilar iOS con Sign in with Apple habilitado. En web ya queda preparado con Firebase.'
      );
      return;
    }

    setSocialLoading('apple');
    try {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      const signed = await signInWithPopup(auth, provider);
      await ensureUserDoc(signed.user, {
        fullName: signed.user.displayName || '',
        photoURL: signed.user.photoURL || '',
      });
      await refreshProfile();
    } catch (error) {
      const message =
        error?.code === 'auth/unauthorized-domain'
          ? 'Este dominio no esta autorizado en Firebase Authentication.'
          : error?.code === 'auth/operation-not-allowed'
            ? 'Apple no esta habilitado en Firebase Authentication.'
            : error?.code === 'auth/popup-closed-by-user'
              ? 'Cerraste la ventana antes de completar el acceso.'
              : error?.code === 'auth/account-exists-with-different-credential'
                ? 'Ya existe una cuenta con ese correo usando otro proveedor.'
                : 'No fue posible iniciar sesion con Apple.';
      Alert.alert('Apple', message);
    } finally {
      setSocialLoading(null);
    }
  };

  const renderInput = (icon, placeholder, value, onChangeText, secureTextEntry, toggleSecure) => (
    <View style={styles.inputWrap}>
      <Ionicons name={icon} size={18} color="#9ca3af" />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
      />
      {toggleSecure ? (
        <TouchableOpacity onPress={toggleSecure}>
          <Ionicons name={secureTextEntry ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9ca3af" />
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const renderRegisterStep = () => {
    const key = STEPS[step][0];
    if (key === 'account') {
      return (
        <>
          {renderInput('person-outline', 'Nombre completo', register.fullName, (v) => updateRegister('fullName', v))}
          {renderInput('mail-outline', 'Correo electronico', register.email, (v) => updateRegister('email', v))}
          {renderInput('lock-closed-outline', 'Contrasena', register.password, (v) => updateRegister('password', v), !showRegisterPassword, () => setShowRegisterPassword((p) => !p))}
          {renderInput('shield-checkmark-outline', 'Confirmar contrasena', register.confirmPassword, (v) => updateRegister('confirmPassword', v), !showConfirmPassword, () => setShowConfirmPassword((p) => !p))}
        </>
      );
    }
    if (key === 'body') {
      return (
        <>
          {renderInput('calendar-outline', 'Edad', register.age, (v) => updateRegister('age', v))}
          {renderInput('barbell-outline', 'Peso en kg', register.weight, (v) => updateRegister('weight', v))}
          {renderInput('resize-outline', 'Estatura en cm', register.height, (v) => updateRegister('height', v))}
          <Text style={styles.inlineLabel}>Genero</Text>
          <View style={styles.inlineOptions}>
            {GENDERS.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[styles.inlineOption, register.gender === item.key && styles.inlineOptionActive]}
                onPress={() => updateRegister('gender', item.key)}
              >
                <Text style={[styles.inlineOptionText, register.gender === item.key && styles.inlineOptionTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.inlineLabel}>Actividad diaria</Text>
          <View style={styles.inlineOptions}>
            {ACTIVITY_LEVELS.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[styles.inlineOption, register.activity_level === item.key && styles.inlineOptionActive]}
                onPress={() => updateRegister('activity_level', item.key)}
              >
                <Text style={[styles.inlineOptionText, register.activity_level === item.key && styles.inlineOptionTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      );
    }
    if (key === 'goal') {
      return GOALS.map((goal) => (
        <TouchableOpacity key={goal.key} style={[styles.optionCard, register.goal === goal.key && styles.optionCardActive]} onPress={() => updateRegister('goal', goal.key)}>
          <Ionicons name={goal.icon} size={18} color={register.goal === goal.key ? '#fff' : '#7c3aed'} />
          <Text style={[styles.optionText, register.goal === goal.key && styles.optionTextActive]}>{goal.label}</Text>
        </TouchableOpacity>
      ));
    }
    if (key === 'conditions') {
      return (
        <>
          <View style={styles.chips}>
            {[
              ['isVegetarian', 'Vegetariano'],
              ['isDiabetic', 'Diabetico'],
              ['isHypertensive', 'Hipertenso'],
            ].map(([field, label]) => (
              <TouchableOpacity key={field} style={[styles.chip, register[field] && styles.chipActive]} onPress={() => updateRegister(field, !register[field])}>
                <Text style={[styles.chipText, register[field] && styles.chipTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {renderInput('warning-outline', 'Alergias separadas por coma', register.allergies, (v) => updateRegister('allergies', v))}
          {renderInput('restaurant-outline', 'Preferencias alimentarias', register.preferences, (v) => updateRegister('preferences', v))}
          <Text style={styles.inlineLabel}>Medidas avanzadas opcionales</Text>
          {renderInput('resize-outline', 'Cintura en cm', register.waist_circumference, (v) => updateRegister('waist_circumference', v))}
          {renderInput('remove-outline', 'Cuello en cm', register.neck_circumference, (v) => updateRegister('neck_circumference', v))}
          {register.gender === 'female'
            ? renderInput('git-compare-outline', 'Cadera en cm', register.hip_circumference, (v) => updateRegister('hip_circumference', v))
            : null}
        </>
      );
    }
    return (
      <TouchableOpacity style={styles.photoBox} onPress={pickProfileImage}>
        {register.photoUri ? <Image source={{ uri: register.photoUri }} style={styles.photo} /> : <>
          <Ionicons name="camera-outline" size={28} color="#e11d48" />
          <Text style={styles.photoText}>Agregar foto de perfil</Text>
        </>}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
            <Animated.View style={[styles.hero, { opacity: fade, transform: [{ translateY: rise }] }]}>
              <View style={styles.logoShell}>
                <Ionicons name="barbell" size={66} color="#ffffff" />
              </View>
              <Text style={styles.brand}>FITAPP</Text>
              <Text style={styles.title}>{mode === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta fitness'}</Text>
              {mode === 'register' ? <Text style={styles.subtitle}>{STEPS[step][1]}</Text> : null}
            </Animated.View>

            <Animated.View style={[styles.card, { opacity: fade, transform: [{ translateY: rise }] }]}>
              <View style={styles.segment}>
                <TouchableOpacity style={[styles.segmentButton, mode === 'login' && styles.segmentButtonActive]} onPress={() => setMode('login')}>
                  <Text style={[styles.segmentText, mode === 'login' && styles.segmentTextActive]}>Iniciar sesion</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.segmentButton, mode === 'register' && styles.segmentButtonActive]} onPress={() => setMode('register')}>
                  <Text style={[styles.segmentText, mode === 'register' && styles.segmentTextActive]}>Registro</Text>
                </TouchableOpacity>
              </View>

              {mode === 'login' ? (
                <>
                  {renderInput('mail-outline', 'Correo electronico', email, setEmail)}
                  {renderInput('lock-closed-outline', 'Contrasena', password, setPassword, !showLoginPassword, () => setShowLoginPassword((p) => !p))}
                  <TouchableOpacity style={styles.primaryButton} onPress={loginWithEmail} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Entrar</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.linkButton} onPress={forgotPassword}>
                    <Text style={styles.linkText}>Olvide mi contrasena</Text>
                  </TouchableOpacity>
                  <View style={styles.divider}><View style={styles.line} /><Text style={styles.dividerText}>o continua con</Text><View style={styles.line} /></View>
                  <View style={styles.socials}>
                    <TouchableOpacity
                      style={[styles.socialButton, socialLoading && styles.socialButtonDisabled]}
                      onPress={googleSignIn}
                      disabled={Boolean(socialLoading)}
                    >
                      {socialLoading === 'google' ? <ActivityIndicator color="#111827" /> : <Ionicons name="logo-google" size={20} color="#111827" />}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.socialButton, socialLoading && styles.socialButtonDisabled]}
                      onPress={appleSignIn}
                      disabled={Boolean(socialLoading)}
                    >
                      {socialLoading === 'apple' ? <ActivityIndicator color="#111827" /> : <Ionicons name="logo-apple" size={20} color="#111827" />}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.socialButton, socialLoading && styles.socialButtonDisabled]}
                      onPress={facebookSignIn}
                      disabled={Boolean(socialLoading)}
                    >
                      {socialLoading === 'facebook' ? (
                        <ActivityIndicator color="#111827" />
                      ) : (
                        <Ionicons name="logo-facebook" size={20} color="#111827" />
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Paso {progress}</Text>
                    <Text style={styles.progressTitle}>{STEPS[step][1]}</Text>
                  </View>
                  <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} /></View>
                  {renderRegisterStep()}
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.secondaryButton} onPress={step === 0 ? () => setMode('login') : () => setStep((prev) => prev - 1)}>
                      <Text style={styles.secondaryText}>{step === 0 ? 'Volver' : 'Anterior'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.primaryButtonHalf} onPress={step === STEPS.length - 1 ? registerUser : nextStep} disabled={loading}>
                      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{step === STEPS.length - 1 ? 'Finalizar' : 'Continuar'}</Text>}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#f4f6fb' },
  scroll: { flexGrow: 1, padding: 20, paddingTop: 62, paddingBottom: 28 },
  blobTop: { position: 'absolute', right: -70, top: -110, width: 280, height: 280, borderRadius: 140, backgroundColor: '#e11d48', opacity: 0.14 },
  blobBottom: { position: 'absolute', left: -90, bottom: -140, width: 280, height: 280, borderRadius: 140, backgroundColor: '#7c3aed', opacity: 0.12 },
  hero: { marginBottom: 22, alignItems: 'center' },
  logoShell: {
    width: 118,
    height: 118,
    borderRadius: 32,
    backgroundColor: '#e11d48',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 10,
  },
  brand: { color: '#e11d48', fontSize: 24, fontWeight: '800', letterSpacing: 0.6 },
  title: { marginTop: 6, color: '#111827', fontSize: 30, fontWeight: '800', lineHeight: 36, maxWidth: 320, textAlign: 'center' },
  subtitle: { marginTop: 10, color: '#6b7280', fontSize: 15, lineHeight: 22, maxWidth: 350, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 28, padding: 22, borderWidth: 1, borderColor: '#eef2f7', shadowColor: '#111827', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 8 },
  segment: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 16, padding: 5, marginBottom: 22 },
  segmentButton: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12 },
  segmentButtonActive: { backgroundColor: '#111827' },
  segmentText: { color: '#6b7280', fontWeight: '700' },
  segmentTextActive: { color: '#fff' },
  inputWrap: { minHeight: 58, borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fcfdff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginBottom: 14 },
  input: { flex: 1, color: '#111827', fontSize: 15, paddingVertical: 14, marginLeft: 10 },
  primaryButton: { minHeight: 56, borderRadius: 18, backgroundColor: '#e11d48', alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  primaryButtonHalf: { width: '48%', minHeight: 56, borderRadius: 18, backgroundColor: '#e11d48', alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  secondaryButton: { width: '48%', minHeight: 56, borderRadius: 18, borderWidth: 1, borderColor: '#dbe1ea', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  secondaryText: { color: '#111827', fontWeight: '700', fontSize: 15 },
  linkButton: { alignSelf: 'center', marginTop: 16 },
  linkText: { color: '#6b7280', fontWeight: '600', fontSize: 13 },
  divider: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 16 },
  line: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { marginHorizontal: 10, color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  socials: { flexDirection: 'row', justifyContent: 'center' },
  socialButton: { width: 54, height: 54, borderRadius: 27, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', marginHorizontal: 8 },
  socialButtonDisabled: { opacity: 0.65 },
  progressHeader: { marginBottom: 10 },
  progressLabel: { color: '#6b7280', fontSize: 13, fontWeight: '700' },
  progressTitle: { color: '#111827', fontSize: 18, fontWeight: '800', marginTop: 2 },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: '#eef2f7', overflow: 'hidden', marginBottom: 18 },
  progressFill: { height: '100%', backgroundColor: '#e11d48', borderRadius: 999 },
  optionCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, borderColor: '#ece7ff', backgroundColor: '#faf5ff', padding: 16, marginBottom: 12 },
  optionCardActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  optionText: { marginLeft: 12, color: '#4c1d95', fontWeight: '700', fontSize: 15 },
  optionTextActive: { color: '#fff' },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: '#dbe1ea', paddingHorizontal: 14, paddingVertical: 10, marginRight: 10, marginBottom: 10 },
  chipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  chipText: { color: '#374151', fontWeight: '700', fontSize: 13 },
  chipTextActive: { color: '#fff' },
  inlineLabel: { color: '#111827', fontWeight: '800', fontSize: 13, marginTop: 4, marginBottom: 10 },
  inlineOptions: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  inlineOption: { borderRadius: 14, borderWidth: 1, borderColor: '#dbe1ea', paddingHorizontal: 13, paddingVertical: 10, marginRight: 8, marginBottom: 8, backgroundColor: '#fff' },
  inlineOptionActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  inlineOptionText: { color: '#374151', fontSize: 13, fontWeight: '800' },
  inlineOptionTextActive: { color: '#fff' },
  photoBox: { height: 190, borderRadius: 24, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#f43f5e', backgroundColor: '#fff1f2', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  photoText: { marginTop: 10, color: '#e11d48', fontWeight: '700' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
});
