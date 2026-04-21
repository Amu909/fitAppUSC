from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from typing import List, Optional, Dict, Any
import pandas as pd
import numpy as np
import math
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor
from sklearn.cluster import KMeans
import warnings
warnings.filterwarnings('ignore')

app = FastAPI(title="Sistema Analítico de Nutrición Personalizada", version="2.0")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class NutritionRequest(BaseModel):
    weight: float
    height: float
    age: int
    gender: str
    activity_level: str = "sedentary"  # sedentary, light, moderate, active, very_active
    goal: str
    allergies: List[str] = []
    preferences: List[str] = []
    medical_conditions: List[str] = []
    body_fat_percentage: Optional[float] = None
    waist_circumference: Optional[float] = None
    
    @validator('weight')
    def validate_weight(cls, v):
        if v < 30 or v > 300:
            raise ValueError('Peso debe estar entre 30 y 300 kg')
        return v
    
    @validator('height')
    def validate_height(cls, v):
        if v < 100 or v > 250:
            raise ValueError('Altura debe estar entre 100 y 250 cm')
        return v
    
    @validator('age')
    def validate_age(cls, v):
        if v < 15 or v > 100:
            raise ValueError('Edad debe estar entre 15 y 100 años')
        return v

class NutritionAnalyzer:
    def __init__(self):
        self.activity_multipliers = {
            "sedentary": 1.2,
            "light": 1.375,
            "moderate": 1.55,
            "active": 1.725,
            "very_active": 1.9
        }
        
        self.macro_ratios = {
            "lose_weight": {"protein": 0.30, "carbs": 0.35, "fat": 0.35},
            "maintain": {"protein": 0.25, "carbs": 0.45, "fat": 0.30},
            "gain_muscle": {"protein": 0.30, "carbs": 0.40, "fat": 0.30},
            "athletic": {"protein": 0.25, "carbs": 0.50, "fat": 0.25}
        }
        
    def calculate_bmi(self, weight: float, height: float) -> float:
        """Calcular Índice de Masa Corporal"""
        height_m = height / 100
        return weight / (height_m ** 2)
    
    def calculate_body_fat_navy(self, gender: str, waist: float, neck: float, height: float, hip: float = None) -> float:
        """Calcular porcentaje de grasa corporal usando método Navy"""
        if gender == "male":
            return 495 / (1.0324 - 0.19077 * math.log10(waist - neck) + 0.15456 * math.log10(height)) - 450
        else:
            if hip is None:
                return None
            return 495 / (1.29579 - 0.35004 * math.log10(waist + hip - neck) + 0.22100 * math.log10(height)) - 450
    
    def calculate_bmr_advanced(self, weight: float, height: float, age: int, gender: str, body_fat: float = None) -> float:
        """Calcular Tasa Metabólica Basal usando múltiples fórmulas"""
        
        # Fórmula Harris-Benedict Revisada
        if gender == "male":
            bmr_hb = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
        else:
            bmr_hb = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)
        
        # Fórmula Mifflin-St Jeor (más precisa)
        if gender == "male":
            bmr_msj = (10 * weight) + (6.25 * height) - (5 * age) + 5
        else:
            bmr_msj = (10 * weight) + (6.25 * height) - (5 * age) - 161
        
        # Fórmula Katch-McArdle (si tenemos % grasa corporal)
        if body_fat is not None:
            lean_mass = weight * (1 - body_fat / 100)
            bmr_km = 370 + (21.6 * lean_mass)
            return bmr_km
        
        # Promedio de Harris-Benedict y Mifflin-St Jeor
        return (bmr_hb + bmr_msj) / 2
    
    def calculate_tdee(self, bmr: float, activity_level: str) -> float:
        """Calcular Gasto Energético Total Diario"""
        return bmr * self.activity_multipliers.get(activity_level, 1.2)
    
    def adjust_calories_for_goal(self, tdee: float, goal: str, current_weight: float) -> float:
        """Ajustar calorías según objetivo"""
        if goal == "lose_weight":
            # Déficit de 500-750 kcal para perder 0.5-0.75 kg/semana
            deficit = min(750, tdee * 0.25)  # No más del 25% de déficit
            return tdee - deficit
        elif goal == "gain_muscle":
            # Superávit de 300-500 kcal
            surplus = 400 if current_weight < 70 else 300
            return tdee + surplus
        elif goal == "athletic":
            return tdee + 200
        else:  # maintain
            return tdee
    
    def calculate_macros(self, calories: float, goal: str) -> Dict[str, float]:
        """Calcular distribución de macronutrientes"""
        ratios = self.macro_ratios.get(goal, self.macro_ratios["maintain"])
        
        protein_calories = calories * ratios["protein"]
        carb_calories = calories * ratios["carbs"]
        fat_calories = calories * ratios["fat"]
        
        return {
            "protein_g": protein_calories / 4,
            "carbs_g": carb_calories / 4,
            "fat_g": fat_calories / 9,
            "protein_calories": protein_calories,
            "carb_calories": carb_calories,
            "fat_calories": fat_calories
        }
    
    def assess_health_risk(self, bmi: float, waist_circumference: float = None, age: int = None) -> Dict[str, Any]:
        """Evaluar riesgos de salud"""
        risk_assessment = {
            "bmi_category": "",
            "health_risk": "bajo",
            "recommendations": []
        }
        
        # Clasificación BMI
        if bmi < 18.5:
            risk_assessment["bmi_category"] = "Bajo peso"
            risk_assessment["health_risk"] = "medio"
            risk_assessment["recommendations"].append("Considerar aumento de peso saludable")
        elif 18.5 <= bmi < 25:
            risk_assessment["bmi_category"] = "Peso normal"
        elif 25 <= bmi < 30:
            risk_assessment["bmi_category"] = "Sobrepeso"
            risk_assessment["health_risk"] = "medio"
            risk_assessment["recommendations"].append("Reducción de peso recomendada")
        elif 30 <= bmi < 35:
            risk_assessment["bmi_category"] = "Obesidad Grado I"
            risk_assessment["health_risk"] = "alto"
            risk_assessment["recommendations"].append("Pérdida de peso necesaria")
        elif 35 <= bmi < 40:
            risk_assessment["bmi_category"] = "Obesidad Grado II"
            risk_assessment["health_risk"] = "muy alto"
            risk_assessment["recommendations"].append("Pérdida de peso urgente - consultar médico")
        else:
            risk_assessment["bmi_category"] = "Obesidad Grado III"
            risk_assessment["health_risk"] = "extremo"
            risk_assessment["recommendations"].append("Intervención médica inmediata")
        
        # Evaluación de circunferencia de cintura
        if waist_circumference:
            if waist_circumference > 102:  # hombres
                risk_assessment["recommendations"].append("Circunferencia de cintura elevada - riesgo cardiovascular")
            elif waist_circumference > 88:  # mujeres
                risk_assessment["recommendations"].append("Circunferencia de cintura elevada - riesgo cardiovascular")
        
        return risk_assessment
    
    def generate_food_recommendations(self, df: pd.DataFrame, calories: float, macros: Dict[str, float], 
                                    allergies: List[str], preferences: List[str]) -> Dict[str, List[Dict]]:
        """Generar recomendaciones de alimentos basadas en análisis nutricional"""
        
        # Filtrar alimentos por alergias
        filtered_df = df.copy()
        for allergy in allergies:
            filtered_df = filtered_df[~filtered_df['Food'].str.contains(allergy, case=False, na=False)]
        
        # Categorizar alimentos por macronutrientes predominantes
        protein_foods = filtered_df[filtered_df['Protein'] > 15].sort_values('Protein', ascending=False)
        carb_foods = filtered_df[filtered_df['Carbs'] > 20].sort_values('Carbs', ascending=False)
        healthy_fat_foods = filtered_df[(filtered_df['Fat'] > 10) & (filtered_df['Saturated Fat'] < filtered_df['Fat'] * 0.5)]
        
        # Alimentos ricos en fibra
        fiber_foods = filtered_df[filtered_df['Fiber'] > 5].sort_values('Fiber', ascending=False)
        
        # Alimentos bajos en calorías para pérdida de peso
        low_cal_foods = filtered_df[filtered_df['Calories'] < 100].sort_values('Calories')
        
        meal_plan = {
            "desayuno": self._select_meal_foods(protein_foods, carb_foods, healthy_fat_foods, 0.25),
            "almuerzo": self._select_meal_foods(protein_foods, carb_foods, healthy_fat_foods, 0.35),
            "merienda": self._select_meal_foods(protein_foods, fiber_foods, healthy_fat_foods, 0.15),
            "cena": self._select_meal_foods(protein_foods, fiber_foods, healthy_fat_foods, 0.25)
        }
        
        return meal_plan
    
    def _select_meal_foods(self, protein_df: pd.DataFrame, carb_df: pd.DataFrame, 
                          fat_df: pd.DataFrame, meal_ratio: float) -> List[Dict]:
        """Seleccionar alimentos para una comida específica"""
        meal_foods = []
        
        # Seleccionar 1-2 fuentes de proteína
        if not protein_df.empty:
            protein_selection = protein_df.head(2).to_dict('records')
            meal_foods.extend([{
                'food': food['Food'],
                'calories_per_100g': food['Calories'],
                'protein': food['Protein'],
                'carbs': food['Carbs'],
                'fat': food['Fat'],
                'type': 'protein'
            } for food in protein_selection])
        
        # Seleccionar 1-2 fuentes de carbohidratos
        if not carb_df.empty:
            carb_selection = carb_df.head(2).to_dict('records')
            meal_foods.extend([{
                'food': food['Food'],
                'calories_per_100g': food['Calories'],
                'protein': food['Protein'],
                'carbs': food['Carbs'],
                'fat': food['Fat'],
                'type': 'carbohydrate'
            } for food in carb_selection])
        
        # Seleccionar 1 fuente de grasa saludable
        if not fat_df.empty:
            fat_selection = fat_df.head(1).to_dict('records')
            meal_foods.extend([{
                'food': food['Food'],
                'calories_per_100g': food['Calories'],
                'protein': food['Protein'],
                'carbs': food['Carbs'],
                'fat': food['Fat'],
                'type': 'healthy_fat'
            } for food in fat_selection])
        
        return meal_foods

# Instancia global del analizador
analyzer = NutritionAnalyzer()

@app.post("/generate-comprehensive-plan")
async def generate_comprehensive_plan(request: NutritionRequest):
    try:
        # Cargar datos nutricionales
        try:
            df = pd.read_csv("Food_and_Nutrition.csv").dropna()
        except FileNotFoundError:
            # Dataset de ejemplo en caso de que no exista el archivo
            df = pd.DataFrame({
                'Food': ['Pollo', 'Salmón', 'Quinoa', 'Espinacas', 'Aguacate', 'Almendras'],
                'Calories': [165, 208, 120, 23, 160, 579],
                'Protein': [31, 25, 4.4, 2.9, 2, 21],
                'Carbs': [0, 0, 22, 3.6, 9, 22],
                'Fat': [3.6, 12, 1.9, 0.4, 15, 50],
                'Fiber': [0, 0, 2.8, 2.2, 7, 12],
                'Saturated Fat': [1, 3, 0.3, 0.1, 2.1, 3.8]
            })
        
        # 1. Análisis corporal completo
        bmi = analyzer.calculate_bmi(request.weight, request.height)
        
        # Estimar grasa corporal si no se proporciona
        body_fat = request.body_fat_percentage
        if body_fat is None and request.waist_circumference:
            # Estimación aproximada basada en BMI y circunferencia de cintura
            if request.gender == "male":
                body_fat = (1.20 * bmi) + (0.23 * request.age) - 16.2
            else:
                body_fat = (1.20 * bmi) + (0.23 * request.age) - 5.4
        
        # 2. Cálculos metabólicos avanzados
        bmr = analyzer.calculate_bmr_advanced(
            request.weight, request.height, request.age, 
            request.gender, body_fat
        )
        
        tdee = analyzer.calculate_tdee(bmr, request.activity_level)
        target_calories = analyzer.adjust_calories_for_goal(tdee, request.goal, request.weight)
        macros = analyzer.calculate_macros(target_calories, request.goal)
        
        # 3. Evaluación de riesgos de salud
        health_assessment = analyzer.assess_health_risk(
            bmi, request.waist_circumference, request.age
        )
        
        # 4. Generación de plan de comidas personalizado
        meal_recommendations = analyzer.generate_food_recommendations(
            df, target_calories, macros, request.allergies, request.preferences
        )
        
        # 5. Análisis predictivo y recomendaciones
        weekly_weight_change = 0
        if request.goal == "lose_weight":
            calorie_deficit = tdee - target_calories
            weekly_weight_change = -(calorie_deficit * 7) / 7700  # 1 kg = 7700 kcal aprox
        elif request.goal == "gain_muscle":
            calorie_surplus = target_calories - tdee
            weekly_weight_change = (calorie_surplus * 7) / 7700
        
        # 6. Recomendaciones específicas
        specific_recommendations = []
        
        if bmi < 18.5:
            specific_recommendations.append("Priorizar alimentos densos en calorías y proteínas")
        elif bmi > 25:
            specific_recommendations.append("Enfocarse en alimentos bajos en calorías y ricos en fibra")
        
        if request.age > 50:
            specific_recommendations.append("Aumentar ingesta de calcio y vitamina D")
            specific_recommendations.append("Considerar suplementación de B12")
        
        if "diabetes" in request.medical_conditions:
            specific_recommendations.append("Controlar índice glucémico de carbohidratos")
            specific_recommendations.append("Distribuir carbohidratos a lo largo del día")
        
        # Respuesta completa
        return {
            "analisis_corporal": {
                "bmi": round(bmi, 2),
                "categoria_bmi": health_assessment["bmi_category"],
                "grasa_corporal_estimada": round(body_fat, 1) if body_fat else None,
                "riesgo_salud": health_assessment["health_risk"]
            },
            "metabolismo": {
                "bmr": round(bmr),
                "tdee": round(tdee),
                "calorias_objetivo": round(target_calories),
                "cambio_peso_semanal_estimado": round(weekly_weight_change, 2)
            },
            "macronutrientes": {
                "proteinas_g": round(macros["protein_g"]),
                "carbohidratos_g": round(macros["carbs_g"]),
                "grasas_g": round(macros["fat_g"]),
                "distribucion_calorica": {
                    "proteinas": round(macros["protein_calories"]),
                    "carbohidratos": round(macros["carb_calories"]),
                    "grasas": round(macros["fat_calories"])
                }
            },
            "plan_alimentario": meal_recommendations,
            "evaluacion_salud": {
                "recomendaciones_generales": health_assessment["recommendations"],
                "recomendaciones_especificas": specific_recommendations
            },
            "predicciones": {
                "tiempo_objetivo_estimado": f"{abs(weekly_weight_change * 4):.1f} kg/mes" if weekly_weight_change != 0 else "Mantenimiento",
                "adherencia_requerida": "Alta" if abs(weekly_weight_change) > 0.5 else "Moderada"
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en el análisis: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "Sistema de Nutrición Analítica funcionando correctamente"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)