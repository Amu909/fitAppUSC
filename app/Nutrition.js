import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import AIAssistantPanel from './AIAssistantPanel';
import { requestModuleInsight, requestNutritionFoods, requestNutritionPlan } from './utils/aiClient';

const screenWidth = Dimensions.get('window').width;
const mealOrder = ['desayuno', 'almuerzo', 'merienda', 'cena'];

const mealLabels = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  merienda: 'Snack',
  cena: 'Cena',
};

const goalLabels = {
  lose_weight: 'Perder grasa',
  gain_muscle: 'Ganar musculo',
  maintain: 'Mantener',
  athletic: 'Rendimiento',
};

const activityLabels = {
  sedentary: 'Sedentario',
  light: 'Ligero',
  moderate: 'Moderado',
  active: 'Activo',
  very_active: 'Muy activo',
};

const categoryImages = {
  Meat: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
  Fruits: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=800&q=80',
  Vegetables: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
  Dairy: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=800&q=80',
  Grains: 'https://images.unsplash.com/photo-1516684669134-de6f7c473a2a?auto=format&fit=crop&w=800&q=80',
  Snacks: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
};

const fallbackFoodImage = 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80';

const buildMedicalConditions = (profile) => {
  const conditions = [];
  if (profile?.isDiabetic) conditions.push('diabetes');
  if (profile?.isHypertensive) conditions.push('hipertension');
  return conditions;
};

const buildPreferences = (profile) => {
  const preferences = [];
  if (profile?.isVegetarian) preferences.push('vegetariano');
  if (profile?.preferences) {
    if (Array.isArray(profile.preferences)) preferences.push(...profile.preferences);
    else preferences.push(...String(profile.preferences).split(',').map((item) => item.trim()).filter(Boolean));
  }
  return preferences;
};

const buildAllergies = (profile) => {
  if (!profile?.allergies) return [];
  if (Array.isArray(profile.allergies)) return profile.allergies;
  return String(profile.allergies).split(',').map((item) => item.trim()).filter(Boolean);
};

const hasRequiredProfile = (profile) => (
  Number(profile?.weight) > 0 &&
  Number(profile?.height) > 0 &&
  Number(profile?.age) > 0
);

const buildPlanRequest = (profile) => ({
  weight: Number(profile.weight),
  height: Number(profile.height),
  age: Number(profile.age),
  gender: profile.gender || 'male',
  activity_level: profile.activity_level || profile.activityLevel || 'moderate',
  goal: profile.goal || 'maintain',
  allergies: buildAllergies(profile),
  preferences: buildPreferences(profile),
  medical_conditions: buildMedicalConditions(profile),
  body_fat_percentage: profile.body_fat_percentage || null,
  waist_circumference: profile.waist_circumference || null,
  neck_circumference: profile.neck_circumference || null,
  hip_circumference: profile.hip_circumference || null,
});

const mealCalories = (foods) =>
  foods.reduce((total, food) => total + Number(food.calories_per_100g || 0), 0);

function CalorieRing({ consumed, target }) {
  const { theme } = useTheme();
  const size = 172;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, consumed / Math.max(target, 1));
  const offset = circumference - progress * circumference;

  return (
    <View style={styles.ringWrap}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#eef2f7" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e60404"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={[styles.ringKicker, { color: theme.textSoft }]}>Calorias</Text>
        <Text style={[styles.ringValue, { color: theme.text }]}>{Math.round(consumed)}</Text>
        <Text style={[styles.ringTarget, { color: theme.textMuted }]}>de {Math.round(target)} kcal</Text>
      </View>
    </View>
  );
}

function MacroPill({ label, value, color }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.macroPill, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <Text style={[styles.macroValue, { color: theme.text }]}>{value}g</Text>
      <Text style={[styles.macroLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

function InsightStat({ label, value, tone = 'default' }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.insightStat, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }, tone === 'alert' && styles.insightStatAlert]}>
      <Text style={[styles.insightStatLabel, { color: theme.textSoft }]}>{label}</Text>
      <Text style={[styles.insightStatValue, { color: theme.text }, tone === 'alert' && styles.insightStatValueAlert]}>{value}</Text>
    </View>
  );
}

function FoodCard({ food, compact = false }) {
  const { theme } = useTheme();
  const image = categoryImages[food.category] || fallbackFoodImage;

  return (
    <View style={[styles.foodCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }, compact && styles.foodCardCompact]}>
      <Image source={{ uri: image }} style={styles.foodImage} />
      <View style={styles.foodBody}>
        <Text style={[styles.foodName, { color: theme.text }]} numberOfLines={1}>{food.food}</Text>
        <Text style={styles.foodMeta}>{food.category} • {food.calories_per_100g} kcal</Text>
        <View style={styles.foodStats}>
          <Text style={styles.foodStat}>P {food.protein}g</Text>
          <Text style={styles.foodStat}>C {food.carbs}g</Text>
          <Text style={styles.foodStat}>G {food.fat}g</Text>
        </View>
      </View>
    </View>
  );
}

export default function NutricionScreen() {
  const navigation = useNavigation();
  const { userProfile } = useAuth();
  const { theme, isDark } = useTheme();
  const [plan, setPlan] = useState(null);
  const [foods, setFoods] = useState([]);
  const [selectedMeal, setSelectedMeal] = useState('almuerzo');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState('');

  const profileReady = hasRequiredProfile(userProfile);
  const firstName = userProfile?.fullName?.trim()?.split(' ')?.[0] || 'Usuario';

  const selectedFoods = plan?.plan_alimentario?.[selectedMeal] || [];
  const allPlanFoods = useMemo(
    () => mealOrder.flatMap((meal) => plan?.plan_alimentario?.[meal] || []),
    [plan]
  );
  const consumedCalories = useMemo(() => mealCalories(allPlanFoods), [allPlanFoods]);
  const targetCalories = plan?.metabolismo?.calorias_objetivo || 0;

  const loadNutritionData = async () => {
    if (!profileReady) return;

    setLoading(true);
    try {
      const payload = buildPlanRequest(userProfile);
      const [planResponse, foodsResponse] = await Promise.all([
        requestNutritionPlan(payload),
        requestNutritionFoods({ limit: 24 }),
      ]);

      setPlan(planResponse);
      setFoods(foodsResponse.foods || []);
    } catch (error) {
      Alert.alert('Nutricion', error.message || 'No fue posible cargar el plan con el dataset nutricional.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNutritionData();
  }, [userProfile?.uid, userProfile?.weight, userProfile?.height, userProfile?.age, userProfile?.goal]);

  const handleNutritionAI = async () => {
    if (!plan) return;

    setAiLoading(true);
    try {
      const result = await requestModuleInsight({
        module: 'Nutricion',
        intent: 'Analiza mi tracker nutricional, explica el plan alimentario y sugiere ajustes usando los alimentos del dataset.',
        userProfile,
        moduleData: {
          plan,
          comida_seleccionada: selectedMeal,
          alimentos_destacados: foods.slice(0, 12),
        },
      });
      setAiInsight(result.insight);
    } catch (error) {
      Alert.alert('IA no disponible', 'No fue posible analizar tu tracker nutricional.');
    } finally {
      setAiLoading(false);
    }
  };

  if (!profileReady) {
    return (
      <View style={[styles.emptyScreen, { backgroundColor: theme.background }]}>
        <View style={[styles.emptyIcon, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name="person-circle-outline" size={48} color="#e60404" />
        </View>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>Completa tu perfil</Text>
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>
          Nutricion usa edad, peso, estatura, objetivo y condiciones guardadas desde el registro para crear el plan.
        </Text>
        <TouchableOpacity
          style={[styles.emptyButton, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate('Main', { screen: 'Perfil' })}
        >
          <Text style={styles.emptyButtonText}>Completar perfil</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.kicker, { color: theme.primary }]}>Calorie Tracker</Text>
          <Text style={[styles.title, { color: theme.text }]}>Hola, {firstName}</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {goalLabels[userProfile?.goal] || 'Plan diario'} • {activityLabels[userProfile?.activity_level || userProfile?.activityLevel] || 'Actividad moderada'}
          </Text>
        </View>
        <TouchableOpacity style={[styles.refreshButton, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]} onPress={loadNutritionData} disabled={loading}>
          {loading ? <ActivityIndicator color={theme.primary} size="small" /> : <Ionicons name="refresh" size={20} color={theme.primary} />}
        </TouchableOpacity>
      </View>

      <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft, shadowOpacity: isDark ? 0 : 0.07, elevation: isDark ? 0 : 5 }]}>
        <CalorieRing consumed={consumedCalories} target={targetCalories} />
        <View style={styles.heroMetrics}>
          <View style={[styles.metricLine, { backgroundColor: theme.surfaceAlt }]}>
            <Text style={[styles.metricLabel, { color: theme.textSoft }]}>IMC</Text>
            <Text style={[styles.metricValue, { color: theme.text }]}>{plan?.analisis_corporal?.bmi || '--'}</Text>
          </View>
          <View style={[styles.metricLine, { backgroundColor: theme.surfaceAlt }]}>
            <Text style={[styles.metricLabel, { color: theme.textSoft }]}>Riesgo</Text>
            <Text style={[styles.metricValue, { color: theme.text }]}>{plan?.analisis_corporal?.riesgo_salud || '--'}</Text>
          </View>
          <View style={[styles.metricLine, { backgroundColor: theme.surfaceAlt }]}>
            <Text style={[styles.metricLabel, { color: theme.textSoft }]}>Dataset</Text>
            <Text style={[styles.metricValue, { color: theme.text }]}>{plan?.dataset?.alimentos_filtrados || foods.length}</Text>
          </View>
        </View>
      </View>

      {plan ? (
        <>
          <View style={[styles.analysisCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Analisis metabolico</Text>
              <Text style={[styles.sectionMeta, { color: theme.primary }]}>recetas_api.py</Text>
            </View>
            <View style={styles.insightGrid}>
              <InsightStat label="BMR" value={`${plan.metabolismo.bmr} kcal`} />
              <InsightStat label="TDEE" value={`${plan.metabolismo.tdee} kcal`} />
              <InsightStat
                label="Grasa corporal"
                value={plan.analisis_corporal.grasa_corporal_estimada ? `${plan.analisis_corporal.grasa_corporal_estimada}%` : 'Sin dato'}
              />
              <InsightStat label="Cambio semanal" value={`${plan.metabolismo.cambio_peso_semanal_estimado} kg`} />
            </View>
          </View>

          <View style={styles.macroRow}>
            <MacroPill label="Proteina" value={plan.macronutrientes.proteinas_g} color="#22c55e" />
            <MacroPill label="Carbos" value={plan.macronutrientes.carbohidratos_g} color="#8b5cf6" />
            <MacroPill label="Grasas" value={plan.macronutrientes.grasas_g} color="#f59e0b" />
          </View>

          <View style={[styles.analysisCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Enfoque del plan</Text>
              <Text style={[styles.sectionMeta, { color: theme.primary }]}>{plan.contexto_dieta?.condicion_prioritaria || 'General'}</Text>
            </View>
            <Text style={[styles.analysisCopy, { color: theme.textMuted }]}>
              {plan.contexto_dieta?.enfoque_principal || 'Plan equilibrado segun tu objetivo y actividad.'}
            </Text>
            <View style={styles.insightGrid}>
              <InsightStat
                label="Azucar promedio"
                value={`${plan.contexto_dieta?.azucar_promedio_plan_g ?? 0} g`}
                tone={userProfile?.isDiabetic ? 'alert' : 'default'}
              />
              <InsightStat label="Fibra promedio" value={`${plan.contexto_dieta?.fibra_promedio_plan_g ?? 0} g`} />
              <InsightStat label="Sodio promedio" value={`${plan.contexto_dieta?.sodio_promedio_plan_mg ?? 0} mg`} />
              <InsightStat
                label="Harinas refinadas"
                value={plan.contexto_dieta?.harinas_refinadas_restringidas ? 'Restringidas' : 'Moderadas'}
                tone={userProfile?.isDiabetic ? 'alert' : 'default'}
              />
            </View>
          </View>

          <View style={styles.mealTabs}>
            {mealOrder.map((meal) => (
              <TouchableOpacity
                key={meal}
                style={[styles.mealTab, selectedMeal === meal && styles.mealTabActive]}
                onPress={() => setSelectedMeal(meal)}
              >
                <Text style={[styles.mealTabText, selectedMeal === meal && styles.mealTabTextActive]}>
                  {mealLabels[meal]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.featureCard}>
            <Image
              source={{ uri: categoryImages[selectedFoods[0]?.category] || fallbackFoodImage }}
              style={styles.featureImage}
            />
            <View style={styles.featureOverlay}>
              <Text style={styles.featureTitle}>{mealLabels[selectedMeal]}</Text>
              <Text style={styles.featureMeta}>{Math.round(mealCalories(selectedFoods))} kcal estimadas</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Alimentos sugeridos</Text>
            <Text style={[styles.sectionMeta, { color: theme.primary }]}>Food_and_Nutrition.csv</Text>
          </View>

          {selectedFoods.map((food, index) => (
            <FoodCard key={`${food.food}-${index}`} food={food} />
          ))}

          <AIAssistantPanel
            title="Analisis nutricional con IA"
            subtitle="Evalua tu objetivo, perfil y alimentos reales del dataset."
            buttonLabel="Analizar mi plan"
            loading={aiLoading}
            insight={aiInsight}
            onPress={handleNutritionAI}
          />

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Base de alimentos</Text>
            <Text style={[styles.sectionMeta, { color: theme.primary }]}>{foods.length} opciones</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.foodRail}>
            {foods.slice(0, 12).map((food, index) => (
              <FoodCard key={`${food.food}-rail-${index}`} food={food} compact />
            ))}
          </ScrollView>

          <View style={[styles.recommendations, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
            <Text style={[styles.recommendTitle, { color: theme.text }]}>Recomendaciones</Text>
            {[...(plan.evaluacion_salud.recomendaciones_generales || []), ...(plan.evaluacion_salud.recomendaciones_especificas || [])].map((item, index) => (
              <View key={`${item}-${index}`} style={styles.recommendRow}>
                <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                <Text style={[styles.recommendText, { color: theme.textMuted }]}>{item}</Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <View style={[styles.loadingCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
          <ActivityIndicator color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Preparando tu tracker nutricional...</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7fb',
  },
  content: {
    padding: 18,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  kicker: {
    color: '#e60404',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 4,
    color: '#111827',
    fontSize: 30,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 4,
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '600',
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#eef2f7',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 5,
  },
  ringWrap: {
    width: 172,
    height: 172,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringKicker: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '800',
  },
  ringValue: {
    color: '#111827',
    fontSize: 31,
    fontWeight: '900',
  },
  ringTarget: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
  },
  heroMetrics: {
    flex: 1,
    marginLeft: 14,
  },
  metricLine: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  metricLabel: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metricValue: {
    marginTop: 4,
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 14,
  },
  analysisCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 16,
    marginTop: 14,
    marginBottom: 14,
  },
  analysisCopy: {
    marginTop: 2,
    marginBottom: 14,
    color: '#4b5563',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  insightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  insightStat: {
    width: '48%',
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 12,
    marginBottom: 12,
  },
  insightStatAlert: {
    backgroundColor: '#fff5f5',
    borderColor: '#fecaca',
  },
  insightStatLabel: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  insightStatValue: {
    marginTop: 6,
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  insightStatValueAlert: {
    color: '#b91c1c',
  },
  macroPill: {
    width: '31.5%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#eef2f7',
  },
  macroDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  macroValue: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  macroLabel: {
    marginTop: 2,
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
  },
  mealTabs: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 5,
    marginBottom: 14,
  },
  mealTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
  },
  mealTabActive: {
    backgroundColor: '#ffffff',
  },
  mealTabText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '800',
  },
  mealTabTextActive: {
    color: '#111827',
  },
  featureCard: {
    height: 210,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#111827',
    marginBottom: 18,
  },
  featureImage: {
    width: '100%',
    height: '100%',
  },
  featureOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 18,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  featureTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
  },
  featureMeta: {
    marginTop: 4,
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '900',
  },
  sectionMeta: {
    color: '#e60404',
    fontSize: 12,
    fontWeight: '800',
  },
  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eef2f7',
  },
  foodCardCompact: {
    width: screenWidth * 0.68,
    marginRight: 12,
  },
  foodImage: {
    width: 64,
    height: 64,
    borderRadius: 15,
    backgroundColor: '#f1f5f9',
  },
  foodBody: {
    flex: 1,
    marginLeft: 12,
  },
  foodName: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  foodMeta: {
    marginTop: 3,
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '600',
  },
  foodStats: {
    flexDirection: 'row',
    marginTop: 8,
  },
  foodStat: {
    marginRight: 8,
    color: '#e60404',
    fontSize: 11,
    fontWeight: '900',
  },
  foodRail: {
    paddingBottom: 8,
  },
  recommendations: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eef2f7',
    marginTop: 8,
  },
  recommendTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 10,
  },
  recommendRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recommendText: {
    flex: 1,
    marginLeft: 8,
    color: '#374151',
    fontSize: 14,
    lineHeight: 20,
  },
  loadingCard: {
    minHeight: 160,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#eef2f7',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontWeight: '700',
  },
  emptyScreen: {
    flex: 1,
    backgroundColor: '#f7f7fb',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  emptyIcon: {
    width: 86,
    height: 86,
    borderRadius: 24,
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 26,
    fontWeight: '900',
  },
  emptyText: {
    marginTop: 10,
    color: '#6b7280',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 22,
    backgroundColor: '#e60404',
    borderRadius: 16,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
});
