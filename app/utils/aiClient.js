import { Platform } from 'react-native';
import axios from 'axios';

const explicitBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

function resolveApiBaseUrl() {
  if (explicitBaseUrl) {
    return explicitBaseUrl;
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:8000`;
  }

  return 'http://10.10.39.18:8000';
}

export const AI_API_BASE_URL = resolveApiBaseUrl();

const api = axios.create({
  baseURL: AI_API_BASE_URL,
  timeout: 12000,
});

function buildApiError(error, fallbackMessage) {
  const detail = error?.response?.data?.detail;

  if (detail) {
    return new Error(detail);
  }

  if (error?.code === 'ECONNABORTED') {
    return new Error(`El backend de IA no respondio a tiempo en ${AI_API_BASE_URL}.`);
  }

  if (error?.message === 'Network Error') {
    return new Error(`No fue posible conectar con el backend de IA en ${AI_API_BASE_URL}.`);
  }

  return new Error(fallbackMessage);
}

export async function getAiHealth() {
  try {
    const response = await api.get('/health', { timeout: 5000 });
    return response.data;
  } catch (error) {
    throw buildApiError(error, 'No fue posible validar el estado del backend de IA.');
  }
}

export async function getAiStatus() {
  try {
    const response = await api.get('/ai/status', { timeout: 5000 });
    return response.data;
  } catch (error) {
    throw buildApiError(error, 'No fue posible consultar la configuracion de la IA.');
  }
}

export async function requestChatSuggestions(userProfile) {
  try {
    const response = await api.get('/chat/suggestions', {
      params: {
        goal: userProfile?.goal || undefined,
        activity_level: userProfile?.activity_level || userProfile?.activityLevel || undefined,
      },
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    throw buildApiError(error, 'No fue posible cargar las sugerencias de FitBot.');
  }
}

export async function requestChatMessage({ message, conversationHistory, userProfile }) {
  try {
    const response = await api.post('/chat', {
      message,
      conversation_history: conversationHistory || [],
      user_profile: userProfile || null,
    });
    return response.data;
  } catch (error) {
    throw buildApiError(error, 'No fue posible obtener respuesta de FitBot.');
  }
}

export async function requestModuleInsight({ module, intent, userProfile, moduleData }) {
  try {
    const response = await api.post('/ai/module-assistant', {
      module,
      intent,
      user_profile: userProfile || null,
      module_data: moduleData || {},
    });
    return response.data;
  } catch (error) {
    throw buildApiError(error, `No fue posible generar el analisis de IA para ${module}.`);
  }
}

export async function requestNutritionPlan(payload) {
  try {
    const response = await api.post('/generate-comprehensive-plan', payload, {
      timeout: 15000,
    });
    return response.data;
  } catch (error) {
    throw buildApiError(error, 'No fue posible generar el plan nutricional.');
  }
}

export async function requestNutritionFoods(params = {}) {
  try {
    const response = await api.get('/nutrition/foods', {
      params,
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    throw buildApiError(error, 'No fue posible cargar el catalogo de alimentos.');
  }
}

export { api as aiApi };
