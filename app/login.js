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
import * as AuthSession from 'expo-auth-session';
import {
  createUserWithEmailAndPassword,
  FacebookAuthProvider,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../firebaseconfig';
import { useAuth } from './AuthContext';

WebBrowser.maybeCompleteAuthSession();

const GOALS = [
  { key: 'lose_weight', label: 'Perder grasa', icon: 'flame-outline' },
  { key: 'gain_muscle', label: 'Ganar musculo', icon: 'barbell-outline' },
  { key: 'maintain', label: 'Mantenerme', icon: 'fitness-outline' },
  { key: 'athletic', label: 'Rendimiento', icon: 'flash-outline' },
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
  goal: 'maintain',
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

const hasGoogleConfig = Object.values(GOOGLE_IDS).some((v) => !String(v).startsWith('pending-'));

export default function Login() {
  const { refreshProfile } = useAuth();
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [register, setRegister] = useState(initialRegister);
  const [step, setStep] = useState(0);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(18)).current;
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'fitappusc',
  });
  const googleDiscovery = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
  };
  const clientId = Platform.select({
    ios: GOOGLE_IDS.iosClientId,
    android: GOOGLE_IDS.androidClientId,
    default: GOOGLE_IDS.webClientId,
  });
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.IdToken,
    },
    googleDiscovery
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
        setSocialLoading(false);
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
    const result = await fetch(uri);
    const blob = await result.blob();
    const fileRef = ref(storage, `profile_photos/${uid}.jpg`);
    await uploadBytes(fileRef, blob);
    return getDownloadURL(fileRef);
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
    } catch {
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

      Alert.alert('Acceso', 'No fue posible iniciar sesion con esas credenciales.');
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
      const created = await createUserWithEmailAndPassword(auth, register.email.trim(), register.password);
      const photoURL = await uploadPhoto(created.user.uid, register.photoUri);
      await setDoc(doc(db, 'users', created.user.uid), {
        uid: created.user.uid,
        email: created.user.email,
        fullName: register.fullName.trim(),
        role: 'member',
        age: Number(register.age),
        weight: Number(register.weight),
        height: Number(register.height),
        goal: register.goal,
        isVegetarian: register.isVegetarian,
        isDiabetic: register.isDiabetic,
        isHypertensive: register.isHypertensive,
        photoURL,
        active: true,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });
      await refreshProfile();
    } catch {
      Alert.alert('Registro', 'No fue posible crear la cuenta.');
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
      setSocialLoading(true);
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
            : 'No fue posible iniciar sesion con Google desde la web.';
        Alert.alert('Google', message);
      } finally {
        setSocialLoading(false);
      }
      return;
    }

    if (!hasGoogleConfig) {
      return Alert.alert(
        'Google pendiente',
        'Configura EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID, EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID o EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.'
      );
    }
    try {
      setSocialLoading(true);
      const result = await promptAsync();
      if (result?.type !== 'success') setSocialLoading(false);
    } catch {
      setSocialLoading(false);
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

    setSocialLoading(true);
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
          : error?.code === 'auth/account-exists-with-different-credential'
            ? 'Ya existe una cuenta con ese correo usando otro proveedor.'
            : 'No fue posible iniciar sesion con Facebook.';
      Alert.alert('Facebook', message);
    } finally {
      setSocialLoading(false);
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
                    <TouchableOpacity style={styles.socialButton} onPress={googleSignIn} disabled={socialLoading || !request}>
                      {socialLoading ? <ActivityIndicator color="#111827" /> : <Ionicons name="logo-google" size={20} color="#111827" />}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.socialButton} onPress={() => Alert.alert('Apple', 'Activa el provider Apple en Firebase para habilitarlo.')}>
                      <Ionicons name="logo-apple" size={20} color="#111827" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.socialButton} onPress={facebookSignIn} disabled={socialLoading}>
                      {socialLoading ? (
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
  photoBox: { height: 190, borderRadius: 24, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#f43f5e', backgroundColor: '#fff1f2', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  photoText: { marginTop: 10, color: '#e11d48', fontWeight: '700' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
});
