from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import httpx
import json
import os
from datetime import datetime

app = FastAPI(title="Chatbot Nutricional Inteligente", version="1.0")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuración de Groq
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    conversation_history: List[Message] = []
    user_profile: Optional[Dict[str, Any]] = None

class ChatbotService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.system_prompt = self._create_system_prompt()
    
    def _create_system_prompt(self) -> str:
        return """Eres un asistente virtual experto en nutrición, fitness y salud cardiovascular. Tu nombre es NutriBot.

## TU ESPECIALIZACIÓN:
- 🥗 **Nutrición**: Planes alimenticios, macronutrientes, micronutrientes, hidratación
- 💪 **Ejercicio**: Rutinas de entrenamiento, cardio, fuerza, flexibilidad, HIIT
- ❤️ **Salud Cardiovascular**: Ejercicios cardio, presión arterial, colesterol, salud del corazón
- 📊 **Análisis**: Interpretación de IMC, composición corporal, metabolismo
- 🎯 **Objetivos**: Pérdida de peso, ganancia muscular, rendimiento atlético, salud general

## TUS CAPACIDADES:
1. **Recomendaciones Personalizadas**: Basadas en el perfil del usuario (edad, peso, altura, objetivo)
2. **Planes de Comidas**: Desayuno, almuerzo, merienda, cena con macros balanceados
3. **Rutinas de Ejercicio**: Adaptadas al nivel de fitness y objetivos
4. **Educación Nutricional**: Explicar conceptos de manera clara y accesible
5. **Motivación**: Mantener al usuario comprometido con sus metas

## TU ESTILO DE COMUNICACIÓN:
- Amigable, motivador y profesional
- Respuestas concisas pero informativas (máximo 200 palabras)
- Usa emojis apropiadamente para hacer la conversación más amena
- Pregunta sobre el contexto cuando sea necesario
- Da recomendaciones específicas y accionables

## IMPORTANTES RECORDATORIOS:
- Siempre aconseja consultar con profesionales de salud para condiciones médicas
- No diagnostiques enfermedades
- Enfócate en hábitos saludables sostenibles
- Promueve una relación saludable con la comida y el ejercicio
- Considera restricciones alimentarias y condiciones médicas

## EJEMPLOS DE CONSULTAS QUE MANEJAS:
- "¿Qué debo desayunar para ganar músculo?"
- "Dame una rutina de ejercicios para principiantes"
- "¿Cómo mejoro mi salud cardiovascular?"
- "¿Cuánta proteína necesito al día?"
- "¿Qué ejercicios de cardio me recomiendas?"

Responde de manera profesional, empática y siempre con base científica."""

    async def send_message(self, user_message: str, conversation_history: List[Dict], user_profile: Optional[Dict] = None) -> str:
        """Enviar mensaje a Groq y obtener respuesta"""
        # Construir el contexto del usuario si existe
        context_message = ""
        if user_profile:
            context_message = f"\n\n**PERFIL DEL USUARIO:**\n"
            context_message += f"- Peso: {user_profile.get('weight', 'N/A')} kg\n"
            context_message += f"- Altura: {user_profile.get('height', 'N/A')} cm\n"
            context_message += f"- Edad: {user_profile.get('age', 'N/A')} años\n"
            context_message += f"- Género: {user_profile.get('gender', 'N/A')}\n"
            context_message += f"- Objetivo: {user_profile.get('goal', 'N/A')}\n"
            context_message += f"- Nivel de actividad: {user_profile.get('activity_level', 'N/A')}\n"
            if user_profile.get('allergies'):
                context_message += f"- Alergias: {', '.join(user_profile.get('allergies', []))}\n"
            if user_profile.get('medical_conditions'):
                context_message += f"- Condiciones médicas: {', '.join(user_profile.get('medical_conditions', []))}\n"
        
        # Preparar mensajes para la API
        messages = [
            {"role": "system", "content": self.system_prompt + context_message}
        ]
        
        # Agregar historial de conversación
        for msg in conversation_history[-10:]:  # Últimos 10 mensajes
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        # Agregar mensaje actual
        messages.append({
            "role": "user",
            "content": user_message
        })
        
        # Llamar a la API de Groq
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    GROQ_API_URL,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "llama-3.3-70b-versatile",  # Modelo más potente de Groq
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 1000,
                        "top_p": 0.9
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"Error en API de Groq: {response.text}"
                    )
                    
            except httpx.TimeoutException:
                raise HTTPException(status_code=504, detail="Timeout al conectar con Groq")
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

    def get_quick_suggestions(self, user_profile: Optional[Dict] = None) -> List[str]:
        """Generar sugerencias rápidas basadas en el perfil del usuario"""
        suggestions = [
            "💪 Dame una rutina de ejercicios",
            "🥗 ¿Qué debo comer hoy?",
            "❤️ Ejercicios para mejorar mi cardio",
            "📊 ¿Cuántas calorías necesito?",
            "🏃‍♂️ Plan de entrenamiento semanal"
        ]
        
        if user_profile:
            goal = user_profile.get('goal', '')
            if goal == 'lose_weight':
                suggestions = [
                    "🔥 Ejercicios para quemar grasa",
                    "🥗 Recetas bajas en calorías",
                    "🏃‍♀️ Mejor cardio para perder peso",
                    "💧 Importancia de la hidratación",
                    "📉 Tips para acelerar el metabolismo"
                ]
            elif goal == 'gain_muscle':
                suggestions = [
                    "💪 Rutina de hipertrofia",
                    "🥩 Alimentos ricos en proteína",
                    "🏋️ Ejercicios compuestos efectivos",
                    "⚡ Pre y post entreno ideales",
                    "📈 Cómo medir mi progreso"
                ]
            elif goal == 'athletic':
                suggestions = [
                    "⚡ Entrenamiento HIIT avanzado",
                    "🏃 Mejorar resistencia cardiovascular",
                    "🥇 Nutrición para rendimiento",
                    "🔄 Rutina de recuperación activa",
                    "💯 Optimizar mi entrenamiento"
                ]
        
        return suggestions

# Instancia global del chatbot
chatbot = ChatbotService(GROQ_API_KEY)

@app.post("/chat")
async def chat(request: ChatRequest):
    """Endpoint principal del chat"""
    try:
        # Obtener respuesta del chatbot
        response = await chatbot.send_message(
            user_message=request.message,
            conversation_history=[msg.model_dump() for msg in request.conversation_history],
            user_profile=request.user_profile
        )
        
        # Obtener sugerencias rápidas
        suggestions = chatbot.get_quick_suggestions(request.user_profile)
        
        return {
            "response": response,
            "suggestions": suggestions,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/chat/suggestions")
async def get_suggestions(
    goal: Optional[str] = None,
    activity_level: Optional[str] = None
):
    """Obtener sugerencias de preguntas"""
    user_profile = {}
    if goal:
        user_profile['goal'] = goal
    if activity_level:
        user_profile['activity_level'] = activity_level
    
    suggestions = chatbot.get_quick_suggestions(user_profile if user_profile else None)
    return {"suggestions": suggestions}

@app.post("/chat/analyze-routine")
async def analyze_routine(routine_data: Dict[str, Any]):
    """Analizar una rutina de ejercicio y dar recomendaciones"""
    
    prompt = f"""Analiza esta rutina de ejercicio y proporciona feedback:

**Rutina:**
{json.dumps(routine_data, indent=2)}

Proporciona:
1. Evaluación general de la rutina
2. Puntos fuertes
3. Áreas de mejora
4. Recomendaciones específicas
5. Ejercicios complementarios que podrían añadirse

Sé específico y práctico en tus recomendaciones."""

    try:
        response = await chatbot.send_message(
            user_message=prompt,
            conversation_history=[],
            user_profile=None
        )
        
        return {
            "analysis": response,
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/meal-plan-review")
async def review_meal_plan(meal_data: Dict[str, Any]):
    """Revisar un plan de comidas y dar recomendaciones nutricionales"""
    
    prompt = f"""Revisa este plan de comidas y proporciona recomendaciones nutricionales:

**Plan de Comidas:**
{json.dumps(meal_data, indent=2)}

Analiza:
1. Balance de macronutrientes
2. Calidad nutricional de los alimentos
3. Distribución de comidas durante el día
4. Sugerencias de mejora
5. Alimentos que podrían añadirse o sustituirse

Proporciona feedback constructivo y específico."""

    try:
        response = await chatbot.send_message(
            user_message=prompt,
            conversation_history=[],
            user_profile=meal_data.get('user_profile')
        )
        
        return {
            "review": response,
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {
        "status": "Chatbot Nutricional funcionando",
        "model": "llama-3.3-70b-versatile",
        "capabilities": [
            "Recomendaciones nutricionales",
            "Rutinas de ejercicio",
            "Salud cardiovascular",
            "Análisis de planes alimenticios",
            "Motivación y consejos"
        ]
    }
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
