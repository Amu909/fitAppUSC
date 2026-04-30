[README.md](https://github.com/user-attachments/files/27149657/README.md)
# 🏋️ fitAppUSC

**fitAppUSC** es una aplicación móvil de fitness y nutrición desarrollada con **React Native + Expo**, orientada a estudiantes y usuarios de la **Universidad Santiago de Cali (USC)**. Permite hacer seguimiento de actividad física, consultar información nutricional y gestionar rutinas de ejercicio, todo con autenticación y almacenamiento en la nube a través de **Firebase**.

---

## 📱 Características principales

- **Seguimiento de actividad física** — Integración con los sensores del dispositivo (`expo-sensors`) para registrar pasos y movimiento.
- **Información nutricional** — Consulta de alimentos y sus valores nutricionales a través de una API REST construida con FastAPI y un dataset CSV (`Food_and_Nutrition.csv`).
- **Autenticación** — Inicio de sesión con Firebase Authentication (soporte para sesiones con `expo-auth-session`).
- **Gráficas de progreso** — Visualización del progreso del usuario con `react-native-chart-kit` y `react-native-svg`.
- **Navegación** — Navegación por pestañas y en pila con `@react-navigation/bottom-tabs` y `@react-navigation/native-stack`.
- **Soporte multiplataforma** — Compatible con Android, iOS y Web.

---

## 🛠️ Tecnologías utilizadas

| Capa | Tecnología |
|------|-----------|
| Framework móvil | React Native 0.76 + Expo 52 |
| Lenguaje | JavaScript (75.9%) / Python (23.7%) |
| Backend / API | FastAPI (Python) |
| Base de datos | Firebase Firestore |
| Autenticación | Firebase Auth |
| Navegación | React Navigation v7 |
| Gráficas | react-native-chart-kit |
| Sensores | expo-sensors |
| Fuentes | @expo-google-fonts/inter |

---

## 📁 Estructura del proyecto

```
fitAppUSC/
├── app/                    # Pantallas y componentes principales
├── assets/                 # Imágenes, íconos y splash screen
├── App.js                  # Componente raíz y configuración de navegación
├── index.js                # Punto de entrada de la app
├── firebaseconfig.js       # Configuración de Firebase
├── recetas_api.py          # API REST con FastAPI (nutrición)
├── Food_and_Nutrition.csv  # Dataset de alimentos y nutrición
├── app.json                # Configuración de Expo
└── package.json            # Dependencias del proyecto
```

---

## 🚀 Instalación y ejecución

### Prerrequisitos

- [Node.js](https://nodejs.org/) v18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Python](https://www.python.org/) 3.9+ (para la API de recetas)
- Cuenta de Firebase configurada

### 1. Clonar el repositorio

```bash
git clone https://github.com/Amu909/fitAppUSC.git
cd fitAppUSC
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Firebase

Crea o edita el archivo `firebaseconfig.js` con las credenciales de tu proyecto Firebase:

```js
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};

export const app = initializeApp(firebaseConfig);
```

### 4. Ejecutar la app

```bash
# Expo (menú general)
npm start

# Android
npm run android

# iOS
npm run ios

# Web
npm run web
```

---

## 🍽️ API de Nutrición (FastAPI)

La API está construida en Python con FastAPI y sirve los datos del archivo `Food_and_Nutrition.csv`.

### Instalación

```bash
pip install fastapi uvicorn pandas
```

### Ejecución

```bash
uvicorn recetas_api:app --reload
```

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/recetas` | Retorna todos los alimentos con información nutricional |

---

## 📦 Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm start` | Inicia la app con Expo |
| `npm run android` | Lanza en emulador/dispositivo Android |
| `npm run ios` | Lanza en simulador iOS |
| `npm run web` | Lanza versión web |
| `npm run stress` | Ejecuta pruebas de estrés (JS + Python) |
| `npm run user:set-role` | Asigna roles a usuarios de Firebase |

---

## 🔒 Variables de entorno y seguridad

> ⚠️ **No subas tu `firebaseconfig.js` con credenciales reales al repositorio.** Usa variables de entorno o archivos `.env` ignorados en `.gitignore`.

---

## 👤 Autores

**Luis Molina** — [@Amu909](https://github.com/Amu909)  
Universidad Santiago de Cali (USC)

**Juan Felipe Collazos** — [@Amu909](https://github.com/Collazos96)  
Universidad Santiago de Cali (USC)

---

## 📄 Licencia

Este proyecto es privado y de uso académico. Todos los derechos reservados.
