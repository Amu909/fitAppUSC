import {
    Text,
    StyleSheet,
    View,
    Image,
    TouchableOpacity,
    Alert,
    ImageBackground,
    TextInput,
    ActivityIndicator,
  } from 'react-native';
  import React, { useState } from 'react';
  import { auth } from '../firebaseconfig';
  import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
  } from 'firebase/auth';
  import { useAuth } from '../app/AuthContext';
  
  export default function Login() {
    const { setIsLoggedIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
  
    const handleLogin = async () => {
      if (!email || !password) {
        Alert.alert('Error', 'Por favor completa todos los campos');
        return;
      }
  
      setLoading(true);
      try {
        await signInWithEmailAndPassword(auth, email, password);
        Alert.alert('¡Bienvenido!', 'Iniciando tu sesión de entrenamiento...');
        setIsLoggedIn(true);
      } catch (error) {
        let errorMessage = 'Credenciales inválidas';
        if (error.code === 'auth/invalid-email') {
          errorMessage = 'Correo electrónico inválido';
        } else if (error.code === 'auth/user-not-found') {
          errorMessage = 'Usuario no registrado';
        } else if (error.code === 'auth/wrong-password') {
          errorMessage = 'Contraseña incorrecta';
        }
        Alert.alert('Error', errorMessage);
      } finally {
        setLoading(false);
      }
    };
  
    const handleRegister = async () => {
      if (!email || !password) {
        Alert.alert('Error', 'Por favor completa todos los campos');
        return;
      }
  
      setLoading(true);
      try {
        await createUserWithEmailAndPassword(auth, email, password);
        Alert.alert('¡Registro exitoso!', 'Comienza tu viaje fitness ahora');
        setIsLoggedIn(true);
      } catch (error) {
        let errorMessage = 'Error al registrar';
        if (error.code === 'auth/email-already-in-use') {
          errorMessage = 'El correo ya está registrado';
        } else if (error.code === 'auth/weak-password') {
          errorMessage = 'La contraseña debe tener al menos 6 caracteres';
        }
        Alert.alert('Error', errorMessage);
      } finally {
        setLoading(false);
      }
    };
  
    return (
      <ImageBackground
        source={require('../assets/images/back.jpg')}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <View style={styles.container}>
            <Image
              source={require('../assets/images/logo.png')}
              style={styles.logo}
              accessibilityLabel="Logo de la aplicación"
            />
  
            <View style={styles.card}>
              <Text style={styles.title}>ENTRENA CON NOSOTROS</Text>
              <Text style={styles.subtitle}>Inicia sesión para comenzar tu rutina</Text>
  
              <View style={styles.inputGroup}>
                <TextInput
                  placeholder="Correo electrónico"
                  placeholderTextColor="#aaa"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                  onChangeText={setEmail}
                  value={email}
                  editable={!loading}
                />
              </View>
  
              <View style={styles.inputGroup}>
                <TextInput
                  placeholder="Contraseña"
                  placeholderTextColor="#aaa"
                  secureTextEntry
                  style={styles.input}
                  onChangeText={setPassword}
                  value={password}
                  editable={!loading}
                />
              </View>
  
              <TouchableOpacity
                style={[styles.loginButton, loading && styles.disabledButton]}
                onPress={handleLogin}
                disabled={loading}
                accessibilityLabel="Botón para iniciar sesión"
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>INICIAR SESIÓN</Text>
                )}
              </TouchableOpacity>
  
              <TouchableOpacity
                style={[styles.registerButton, loading && styles.disabledButton]}
                onPress={handleRegister}
                disabled={loading}
                accessibilityLabel="Botón para registrarse"
              >
                {loading ? (
                  <ActivityIndicator color="#e60404" />
                ) : (
                  <Text style={styles.registerButtonText}>REGISTRARME</Text>
                )}
              </TouchableOpacity>
  
              <TouchableOpacity disabled={loading}>
                <Text style={styles.forgotPassword}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ImageBackground>
    );
  }
  
  const styles = StyleSheet.create({
    background: {
      flex: 1,
      width: '100%',
      height: '100%',
    },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      padding: 20,
    },
    container: {
      alignItems: 'center',
    },
    logo: {
      width: 150,
      height: 120,
      marginBottom: 10,
      borderRadius: 35,
    },
    card: {
      width: '100%',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderRadius: 15,
      padding: 25,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 10,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 5,
      color: '#1a1a1a',
      fontFamily: 'Inter-Bold',
    },
    subtitle: {
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 25,
      color: '#666',
      fontFamily: 'Inter-Regular',
    },
    inputGroup: {
      marginBottom: 20,
    },
    input: {
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderRadius: 10,
      paddingVertical: 14,
      paddingHorizontal: 20,
      fontSize: 16,
      color: '#333',
      borderWidth: 1,
      borderColor: '#ddd',
      fontFamily: 'Inter-Regular',
    },
    loginButton: {
      backgroundColor: '#e60404',
      paddingVertical: 16,
      borderRadius: 10,
      marginTop: 10,
      alignItems: 'center',
      shadowColor: '#e60404',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
    },
    registerButton: {
      backgroundColor: 'transparent',
      paddingVertical: 16,
      borderRadius: 10,
      marginTop: 15,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#e60404',
    },
    disabledButton: {
      opacity: 0.6,
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
      letterSpacing: 1,
      fontFamily: 'Inter-Bold',
    },
    registerButtonText: {
      color: '#e60404',
      fontSize: 16,
      fontWeight: 'bold',
      letterSpacing: 1,
      fontFamily: 'Inter-Bold',
    },
    forgotPassword: {
      color: '#666',
      textAlign: 'center',
      marginTop: 20,
      fontSize: 14,
      fontFamily: 'Inter-Regular',
    },
  });
  