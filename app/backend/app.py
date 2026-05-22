from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pydantic import Field
from typing import List, Optional, Dict, Any
import csv
import httpx
import importlib.util
import json
import os
from pathlib import Path
from datetime import datetime

def load_local_env():
    candidates = [
        Path(__file__).resolve().parents[2] / ".env",
        Path(__file__).resolve().parent / ".env",
    ]

    for env_path in candidates:
        if not env_path.exists():
            continue

        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value
        break

load_local_env()

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
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
FOOD_DATASET_PATH = Path(__file__).resolve().parent / "Food_and_Nutrition.csv"
RECETAS_API_PATH = Path(__file__).resolve().parents[2] / "recetas_api.py"

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    conversation_history: List[Message] = []
    user_profile: Optional[Dict[str, Any]] = None

class ModuleAIRequest(BaseModel):
    module: str
    intent: str
    user_profile: Optional[Dict[str, Any]] = None
    module_data: Optional[Dict[str, Any]] = None

class NutritionPlanRequest(BaseModel):
    weight: float = Field(..., ge=30, le=300)
    height: float = Field(..., ge=100, le=250)
    age: int = Field(..., ge=15, le=100)
    gender: str = "male"
    activity_level: str = "moderate"
    goal: str = "maintain"
    allergies: List[str] = []
    preferences: List[str] = []
    medical_conditions: List[str] = []
    body_fat_percentage: Optional[float] = None
    waist_circumference: Optional[float] = None
    neck_circumference: Optional[float] = None
    hip_circumference: Optional[float] = None

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
        if not self.api_key:
            raise HTTPException(
                status_code=503,
                detail="La IA no esta configurada en el backend. Define GROQ_API_KEY para habilitar FitBot.",
            )

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
            if user_profile.get('isVegetarian'):
                context_message += "- Preferencia: vegetariano\n"
            if user_profile.get('isDiabetic'):
                context_message += "- Condición: diabetes\n"
            if user_profile.get('isHypertensive'):
                context_message += "- Condición: hipertensión\n"
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
                        "model": GROQ_MODEL,
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

def _number(value: Any, default: float = 0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default

def load_food_dataset() -> List[Dict[str, Any]]:
    foods = []
    if not FOOD_DATASET_PATH.exists():
        return foods

    with FOOD_DATASET_PATH.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        for row in reader:
            name = (row.get("Food_Item") or "").strip()
            if not name:
                continue
            foods.append({
                "food": name,
                "category": (row.get("Category") or "Otros").strip(),
                "meal_type": (row.get("Meal_Type") or "Snack").strip(),
                "calories_per_100g": round(_number(row.get("Calories (kcal)"))),
                "protein": round(_number(row.get("Protein (g)")), 1),
                "carbs": round(_number(row.get("Carbohydrates (g)")), 1),
                "fat": round(_number(row.get("Fat (g)")), 1),
                "fiber": round(_number(row.get("Fiber (g)")), 1),
                "sugars": round(_number(row.get("Sugars (g)")), 1),
                "sodium": round(_number(row.get("Sodium (mg)"))),
                "cholesterol": round(_number(row.get("Cholesterol (mg)"))),
                "water_intake": round(_number(row.get("Water_Intake (ml)"))),
            })
    return foods

_nutrition_analyzer = None

def get_nutrition_analyzer():
    global _nutrition_analyzer
    if _nutrition_analyzer is not None:
        return _nutrition_analyzer

    if RECETAS_API_PATH.exists():
        spec = importlib.util.spec_from_file_location("fitapp_recetas_api", RECETAS_API_PATH)
        if spec and spec.loader:
            recetas_api = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(recetas_api)
            _nutrition_analyzer = recetas_api.NutritionAnalyzer()
            return _nutrition_analyzer

    raise RuntimeError("No fue posible cargar NutritionAnalyzer desde recetas_api.py")

def calculate_bmi(weight: float, height: float) -> float:
    return weight / ((height / 100) ** 2)

def calculate_bmr(weight: float, height: float, age: int, gender: str) -> float:
    if gender == "female":
        return 10 * weight + 6.25 * height - 5 * age - 161
    return 10 * weight + 6.25 * height - 5 * age + 5

def activity_multiplier(activity_level: str) -> float:
    return {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "active": 1.725,
        "very_active": 1.9,
    }.get(activity_level, 1.55)

def target_calories(tdee: float, goal: str) -> float:
    if goal == "lose_weight":
        return tdee - min(650, tdee * 0.22)
    if goal == "gain_muscle":
        return tdee + 350
    if goal == "athletic":
        return tdee + 200
    return tdee

def macro_targets(calories: float, goal: str) -> Dict[str, float]:
    ratios = {
        "lose_weight": (0.30, 0.35, 0.35),
        "maintain": (0.25, 0.45, 0.30),
        "gain_muscle": (0.30, 0.40, 0.30),
        "athletic": (0.25, 0.50, 0.25),
    }.get(goal, (0.25, 0.45, 0.30))

    protein, carbs, fat = ratios
    return {
        "proteinas_g": round((calories * protein) / 4),
        "carbohidratos_g": round((calories * carbs) / 4),
        "grasas_g": round((calories * fat) / 9),
        "distribucion_calorica": {
            "proteinas": round(calories * protein),
            "carbohidratos": round(calories * carbs),
            "grasas": round(calories * fat),
        }
    }

def bmi_category_and_risk(bmi: float) -> Dict[str, str]:
    if bmi < 18.5:
        return {"categoria_bmi": "Bajo peso", "riesgo_salud": "medio"}
    if bmi < 25:
        return {"categoria_bmi": "Peso normal", "riesgo_salud": "bajo"}
    if bmi < 30:
        return {"categoria_bmi": "Sobrepeso", "riesgo_salud": "medio"}
    if bmi < 35:
        return {"categoria_bmi": "Obesidad grado I", "riesgo_salud": "alto"}
    return {"categoria_bmi": "Obesidad grado II", "riesgo_salud": "muy alto"}

def filter_foods_for_profile(foods: List[Dict[str, Any]], request: NutritionPlanRequest) -> List[Dict[str, Any]]:
    allergies = [item.lower() for item in request.allergies]
    preferences = [item.lower() for item in request.preferences]
    conditions = [item.lower() for item in request.medical_conditions]
    filtered = [
        food for food in foods
        if not any(allergy in food["food"].lower() or allergy in food["category"].lower() for allergy in allergies)
    ]

    if "vegetariano" in preferences or "vegetarian" in preferences:
        filtered = [food for food in filtered if food["category"].lower() != "meat"]

    if "diabetes" in conditions:
        strict_diabetes = [
            food for food in filtered
            if food["sugars"] <= 12
            and food["fiber"] >= 2
            and food["category"].lower() not in {"grains", "snacks"}
            and not any(
                token in food["food"].lower()
                for token in ["cookie", "bread", "cake", "pasta", "flour", "soda", "juice", "cereal"]
            )
        ]
        moderate_diabetes = [
            food for food in filtered
            if food["sugars"] <= 18
            and food["carbs"] <= 35
            and not any(
                token in food["food"].lower()
                for token in ["cookie", "cake", "soda", "juice", "flour"]
            )
        ]
        filtered = strict_diabetes or moderate_diabetes or filtered

    if any(condition in ["hipertension", "hypertension"] for condition in conditions):
        filtered = [food for food in filtered if food["sodium"] <= 550]

    return filtered or foods

def food_matches_role(food: Dict[str, Any], role: str) -> bool:
    category = food["category"].lower()

    if role == "protein":
        return category in {"meat", "dairy"} or food["protein"] >= 18
    if role == "complex_carb":
        return category in {"grains", "vegetables"} or (food["carbs"] >= 18 and food["fiber"] >= 2)
    if role == "produce":
        return category in {"fruits", "vegetables"}
    if role == "healthy_fat":
        return food["fat"] >= 10 and food["sugars"] <= 18
    return False

def _preferred_index(category: str, preferred_categories: Optional[List[str]]) -> int:
    if not preferred_categories:
        return 99
    try:
        return preferred_categories.index(category)
    except ValueError:
        return len(preferred_categories) + 1

def _food_name_penalty(food_name: str, discouraged_tokens: Optional[List[str]]) -> int:
    if not discouraged_tokens:
        return 0
    lowered = food_name.lower()
    return sum(token in lowered for token in discouraged_tokens)

def score_food_for_role(
    food: Dict[str, Any],
    role: str,
    target_calories: float,
    preferred_categories: Optional[List[str]] = None,
    discouraged_tokens: Optional[List[str]] = None,
) -> tuple:
    calorie_gap = abs(food["calories_per_100g"] - target_calories)
    category = food["category"].lower()
    preferred_category = _preferred_index(category, preferred_categories)
    name_penalty = _food_name_penalty(food["food"], discouraged_tokens)

    if role == "protein":
        return (
            preferred_category,
            name_penalty,
            -food["protein"],
            food["sugars"],
            calorie_gap,
        )

    if role == "complex_carb":
        return (
            preferred_category,
            name_penalty,
            -food["fiber"],
            -food["carbs"],
            food["sugars"],
            calorie_gap,
        )

    if role == "produce":
        return (
            preferred_category,
            name_penalty,
            food["sugars"],
            -food["fiber"],
            calorie_gap,
        )

    if role == "healthy_fat":
        return (
            preferred_category,
            name_penalty,
            food["sugars"],
            -food["fat"],
            -food["fiber"],
            calorie_gap,
        )

    return (calorie_gap,)

def pick_food_by_role(
    meal_foods: List[Dict[str, Any]],
    selected_names: set,
    selected_categories: set,
    role: str,
    target_calories: float,
    excluded_categories: Optional[set] = None,
    preferred_categories: Optional[List[str]] = None,
    discouraged_tokens: Optional[List[str]] = None,
) -> Optional[Dict[str, Any]]:
    candidates = [
        food for food in meal_foods
        if food["food"] not in selected_names
        and food_matches_role(food, role)
        and food["category"].lower() not in (excluded_categories or set())
    ]
    if not candidates:
        return None

    def candidate_key(food: Dict[str, Any]) -> tuple:
        return (
            food["category"].lower() in selected_categories,
            score_food_for_role(
                food,
                role,
                target_calories,
                preferred_categories=preferred_categories,
                discouraged_tokens=discouraged_tokens,
            ),
        )

    return min(candidates, key=candidate_key)

def fallback_meal_foods(
    meal_foods: List[Dict[str, Any]],
    count: int,
    target_calories: float,
    discouraged_tokens: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    ranked = sorted(
        meal_foods,
        key=lambda food: (
            food["category"].lower() in {"beverages", "snacks"},
            _food_name_penalty(food["food"], discouraged_tokens),
            abs(food["calories_per_100g"] - target_calories),
            food["sugars"],
            -food["protein"],
            -food["fiber"],
        )
    )
    selected = []
    seen_names = set()
    for food in ranked:
        if food["food"] in seen_names:
            continue
        selected.append(food)
        seen_names.add(food["food"])
        if len(selected) == count:
            break
    return selected

def build_balanced_meal(
    meal_foods: List[Dict[str, Any]],
    target_calories: float,
    roles: List[str],
    excluded_categories: Optional[set] = None,
    role_preferences: Optional[Dict[str, List[str]]] = None,
    discouraged_tokens: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    selected = []
    selected_names = set()
    selected_categories = set()

    for role in roles:
        choice = pick_food_by_role(
            meal_foods,
            selected_names,
            selected_categories,
            role,
            target_calories,
            excluded_categories=excluded_categories,
            preferred_categories=(role_preferences or {}).get(role),
            discouraged_tokens=discouraged_tokens,
        )
        if choice:
            selected.append(choice)
            selected_names.add(choice["food"])
            selected_categories.add(choice["category"].lower())

    if len(selected) < 3:
        for food in fallback_meal_foods(meal_foods, 6, target_calories, discouraged_tokens=discouraged_tokens):
            if food["food"] in selected_names:
                continue
            if excluded_categories and food["category"].lower() in excluded_categories and len(selected) < 2:
                continue
            if food["category"].lower() in selected_categories and len(selected_categories) < 3:
                continue
            selected.append(food)
            selected_names.add(food["food"])
            selected_categories.add(food["category"].lower())
            if len(selected) == 3:
                break

    return selected[:3]

def build_meal_plan(foods: List[Dict[str, Any]], calories: float) -> Dict[str, List[Dict[str, Any]]]:
    meal_config = {
        "desayuno": ("Breakfast", 0.25),
        "almuerzo": ("Lunch", 0.35),
        "merienda": ("Snack", 0.15),
        "cena": ("Dinner", 0.25),
    }
    meal_templates = {
        "desayuno": {
            "roles": ["protein", "complex_carb", "produce"],
            "excluded_categories": {"beverages"},
            "role_preferences": {
                "protein": ["dairy", "meat"],
                "complex_carb": ["grains", "fruits"],
                "produce": ["fruits", "vegetables"],
            },
            "discouraged_tokens": ["soda"],
        },
        "almuerzo": {
            "roles": ["protein", "complex_carb", "produce"],
            "excluded_categories": {"beverages", "snacks"},
            "role_preferences": {
                "protein": ["meat", "vegetables", "dairy"],
                "complex_carb": ["grains", "vegetables"],
                "produce": ["vegetables", "fruits"],
            },
            "discouraged_tokens": ["bread", "cookie", "cake", "juice", "soda", "cereal", "butter", "yogurt"],
        },
        "merienda": {
            "roles": ["protein", "produce", "healthy_fat"],
            "excluded_categories": {"beverages"},
            "role_preferences": {
                "protein": ["dairy", "meat"],
                "produce": ["fruits", "vegetables"],
                "healthy_fat": ["dairy", "grains", "fruits"],
            },
            "discouraged_tokens": ["soda"],
        },
        "cena": {
            "roles": ["protein", "complex_carb", "produce"],
            "excluded_categories": {"beverages", "snacks"},
            "role_preferences": {
                "protein": ["meat", "vegetables", "dairy"],
                "complex_carb": ["vegetables", "grains"],
                "produce": ["vegetables", "fruits"],
            },
            "discouraged_tokens": ["bread", "cookie", "cake", "juice", "soda", "cereal", "butter", "yogurt"],
        },
    }
    by_meal = {}

    for meal_name, (dataset_meal, ratio) in meal_config.items():
        meal_foods = [food for food in foods if food["meal_type"].lower() == dataset_meal.lower()]
        if not meal_foods:
            meal_foods = foods
        target_calories = calories * ratio / 3
        template = meal_templates[meal_name]

        selected = build_balanced_meal(
            meal_foods,
            target_calories,
            template["roles"],
            excluded_categories=template["excluded_categories"],
            role_preferences=template["role_preferences"],
            discouraged_tokens=template["discouraged_tokens"],
        )
        if len(selected) < 3:
            selected = fallback_meal_foods(
                meal_foods,
                3,
                target_calories,
                discouraged_tokens=template["discouraged_tokens"],
            )

        by_meal[meal_name] = selected

    return by_meal

def nutrition_recommendations(request: NutritionPlanRequest, bmi: float) -> Dict[str, List[str]]:
    general = []
    specific = []

    if bmi > 25:
        general.append("Prioriza alimentos con fibra y porciones moderadas para mejorar saciedad.")
    else:
        general.append("Mantén una distribucion constante de proteina, carbohidratos y grasas saludables.")

    if request.goal == "gain_muscle":
        specific.append("Incluye una fuente de proteina en cada comida y un snack post-entreno.")
    if request.goal == "lose_weight":
        specific.append("Usa verduras, frutas enteras y agua para sostener el deficit sin bajar energia.")
    if "diabetes" in [c.lower() for c in request.medical_conditions]:
        specific.append("Controla glucosa: reparte carbohidratos y evita comidas altas en azucares.")
    if "hipertension" in [c.lower() for c in request.medical_conditions]:
        specific.append("Reduce sodio y prioriza alimentos frescos ricos en potasio.")

    return {"recomendaciones_generales": general, "recomendaciones_especificas": specific}

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

@app.post("/ai/module-assistant")
async def module_assistant(request: ModuleAIRequest):
    """Generar recomendaciones de IA contextualizadas para cualquier módulo principal."""

    prompt = f"""Actúa como una capa de IA integrada dentro del módulo "{request.module}" de FitAppUSC.

Intención solicitada:
{request.intent}

Datos actuales del módulo:
{json.dumps(request.module_data or {}, ensure_ascii=False, indent=2)}

Responde en español con recomendaciones accionables, personalizadas y breves. Si generas una rutina o rutina alimentaria, usa estructura clara por días o comidas. Si faltan datos, trabaja con supuestos razonables y menciona qué dato convendría completar. No diagnostiques condiciones médicas."""

    try:
        response = await chatbot.send_message(
            user_message=prompt,
            conversation_history=[],
            user_profile=request.user_profile
        )

        return {
            "module": request.module,
            "intent": request.intent,
            "insight": response,
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/nutrition/foods")
async def get_foods(limit: int = 60, category: Optional[str] = None, meal_type: Optional[str] = None):
    foods = load_food_dataset()
    if category:
        foods = [food for food in foods if food["category"].lower() == category.lower()]
    if meal_type:
        foods = [food for food in foods if food["meal_type"].lower() == meal_type.lower()]

    foods = sorted(foods, key=lambda food: (-food["protein"], food["calories_per_100g"]))
    categories = sorted({food["category"] for food in foods})
    meal_types = sorted({food["meal_type"] for food in foods})

    return {
        "foods": foods[:limit],
        "categories": categories,
        "meal_types": meal_types,
        "total": len(foods),
    }

@app.post("/generate-comprehensive-plan")
async def generate_comprehensive_plan(request: NutritionPlanRequest):
    foods = load_food_dataset()
    if not foods:
        raise HTTPException(status_code=500, detail="Dataset nutricional no disponible")

    analyzer = get_nutrition_analyzer()

    bmi = analyzer.calculate_bmi(request.weight, request.height)
    estimated_body_fat = request.body_fat_percentage
    if estimated_body_fat is None and request.waist_circumference and request.neck_circumference:
        try:
            estimated_body_fat = analyzer.calculate_body_fat_navy(
                request.gender,
                request.waist_circumference,
                request.neck_circumference,
                request.height,
                request.hip_circumference,
            )
        except (ValueError, ZeroDivisionError):
            estimated_body_fat = None
    if estimated_body_fat is None and request.waist_circumference:
        estimated_body_fat = (1.2 * bmi) + (0.23 * request.age) - (16.2 if request.gender == "male" else 5.4)

    bmr = analyzer.calculate_bmr_advanced(
        request.weight,
        request.height,
        request.age,
        request.gender,
        estimated_body_fat,
    )
    tdee = analyzer.calculate_tdee(bmr, request.activity_level)
    calories = analyzer.adjust_calories_for_goal(tdee, request.goal, request.weight)
    filtered_foods = filter_foods_for_profile(foods, request)
    meals = build_meal_plan(filtered_foods, calories)
    health_assessment = analyzer.assess_health_risk(
        bmi,
        request.waist_circumference,
        request.age,
    )
    macros = analyzer.calculate_macros(calories, request.goal)

    weekly_change = 0
    if request.goal == "lose_weight":
        weekly_change = -((tdee - calories) * 7) / 7700
    elif request.goal == "gain_muscle":
        weekly_change = ((calories - tdee) * 7) / 7700

    conditions = [condition.lower() for condition in request.medical_conditions]
    diabetic_focus = "diabetes" in conditions
    flour_restricted = diabetic_focus
    selected_foods = [food for meal in meals.values() for food in meal]
    average_sugars = round(sum(food["sugars"] for food in selected_foods) / max(len(selected_foods), 1), 1)
    average_fiber = round(sum(food["fiber"] for food in selected_foods) / max(len(selected_foods), 1), 1)
    average_sodium = round(sum(food["sodium"] for food in selected_foods) / max(len(selected_foods), 1))

    return {
        "analisis_corporal": {
            "bmi": round(bmi, 2),
            "categoria_bmi": health_assessment["bmi_category"],
            "grasa_corporal_estimada": round(estimated_body_fat, 1) if estimated_body_fat else None,
            "riesgo_salud": health_assessment["health_risk"],
            "cintura_cm": request.waist_circumference,
        },
        "metabolismo": {
            "bmr": round(bmr),
            "tdee": round(tdee),
            "calorias_objetivo": round(calories),
            "cambio_peso_semanal_estimado": round(weekly_change, 2),
        },
        "macronutrientes": {
            "proteinas_g": round(macros["protein_g"]),
            "carbohidratos_g": round(macros["carbs_g"]),
            "grasas_g": round(macros["fat_g"]),
            "distribucion_calorica": {
                "proteinas": round(macros["protein_calories"]),
                "carbohidratos": round(macros["carb_calories"]),
                "grasas": round(macros["fat_calories"]),
            },
        },
        "plan_alimentario": meals,
        "dataset": {
            "alimentos_evaluados": len(foods),
            "alimentos_filtrados": len(filtered_foods),
            "fuente": "Food_and_Nutrition.csv",
        },
        "evaluacion_salud": {
            **nutrition_recommendations(request, bmi),
            "recomendaciones_generales": [
                *health_assessment["recommendations"],
                *nutrition_recommendations(request, bmi)["recomendaciones_generales"],
            ],
        },
        "contexto_dieta": {
            "enfoque_principal": (
                "Plan bajo en azucar, con carbohidratos controlados y sin harinas refinadas"
                if diabetic_focus else
                "Plan equilibrado con distribucion de macronutrientes segun tu objetivo"
            ),
            "condicion_prioritaria": "Diabetes" if diabetic_focus else "Ninguna",
            "harinas_refinadas_restringidas": flour_restricted,
            "azucar_promedio_plan_g": average_sugars,
            "fibra_promedio_plan_g": average_fiber,
            "sodio_promedio_plan_mg": average_sodium,
        },
        "predicciones": {
            "tiempo_objetivo_estimado": f"{abs(weekly_change * 4):.1f} kg/mes" if weekly_change else "Mantenimiento",
            "adherencia_requerida": "Alta" if abs(weekly_change) > 0.5 or "diabetes" in conditions else "Moderada",
        },
    }

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
        "model": GROQ_MODEL,
        "provider": "Groq",
        "ai_configured": bool(GROQ_API_KEY),
        "capabilities": [
            "Recomendaciones nutricionales",
            "Rutinas de ejercicio",
            "Salud cardiovascular",
            "Análisis de planes alimenticios",
            "Motivación y consejos"
        ]
    }

@app.get("/ai/status")
async def ai_status():
    return {
        "provider": "Groq",
        "model": GROQ_MODEL,
        "configured": bool(GROQ_API_KEY),
        "available_endpoints": [
            "/chat",
            "/chat/suggestions",
            "/ai/module-assistant",
            "/generate-comprehensive-plan",
            "/chat/analyze-routine",
            "/chat/meal-plan-review",
        ],
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
