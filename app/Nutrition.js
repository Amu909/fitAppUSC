import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions, 
  TextInput,
  Alert,
  ActivityIndicator 
} from 'react-native';
import axios from 'axios';

const screenWidth = Dimensions.get('window').width;

const NutricionScreen = () => {
  const [plan, setPlan] = useState(null);
  const [form, setForm] = useState({
    weight: '',
    height: '',
    age: '',
    gender: 'male',
    activity_level: 'moderate',
    goal: 'maintain',
    allergies: '',
    preferences: '',
    medical_conditions: '',
    body_fat_percentage: '',
    waist_circumference: ''
  });
  const [loading, setLoading] = useState(false);

  const activityLevels = [
    { key: 'sedentary', label: 'Sedentario' },
    { key: 'light', label: 'Ligero' },
    { key: 'moderate', label: 'Moderado' },
    { key: 'active', label: 'Activo' },
    { key: 'very_active', label: 'Muy Activo' }
  ];

  const goals = [
    { key: 'lose_weight', label: 'Perder Peso' },
    { key: 'maintain', label: 'Mantener' },
    { key: 'gain_muscle', label: 'Ganar Músculo' },
    { key: 'athletic', label: 'Atlético' }
  ];

  const validateForm = () => {
    if (!form.weight || !form.height || !form.age) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return false;
    }
    
    const weight = parseFloat(form.weight);
    const height = parseFloat(form.height);
    const age = parseInt(form.age);
    
    if (weight < 30 || weight > 300) {
      Alert.alert('Error', 'El peso debe estar entre 30 y 300 kg');
      return false;
    }
    
    if (height < 100 || height > 250) {
      Alert.alert('Error', 'La altura debe estar entre 100 y 250 cm');
      return false;
    }
    
    if (age < 15 || age > 100) {
      Alert.alert('Error', 'La edad debe estar entre 15 y 100 años');
      return false;
    }
    
    return true;
  };

  const generatePlan = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    const requestData = {
      weight: parseFloat(form.weight),
      height: parseFloat(form.height),
      age: parseInt(form.age),
      gender: form.gender,
      activity_level: form.activity_level,
      goal: form.goal,
      allergies: form.allergies ? form.allergies.split(',').map(a => a.trim()).filter(a => a) : [],
      preferences: form.preferences ? form.preferences.split(',').map(p => p.trim()).filter(p => p) : [],
      medical_conditions: form.medical_conditions ? form.medical_conditions.split(',').map(m => m.trim()).filter(m => m) : [],
      body_fat_percentage: form.body_fat_percentage ? parseFloat(form.body_fat_percentage) : null,
      waist_circumference: form.waist_circumference ? parseFloat(form.waist_circumference) : null
    };

    try {
      const response = await axios.post('http://10.10.39.18:8000/generate-comprehensive-plan', requestData);
      setPlan(response.data);
    } catch (error) {
      console.error("Error al generar plan:", error);
      Alert.alert('Error', 'No se pudo generar el plan. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const getBMIColor = (bmi) => {
    if (bmi < 18.5) return '#3498db';
    if (bmi < 25) return '#27ae60';
    if (bmi < 30) return '#f39c12';
    return '#e74c3c';
  };

  const getRiskColor = (risk) => {
    switch(risk) {
      case 'bajo': return '#27ae60';
      case 'medio': return '#f39c12';
      case 'alto': return '#e67e22';
      case 'muy alto': return '#e74c3c';
      case 'extremo': return '#8e44ad';
      default: return '#95a5a6';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ANÁLISIS NUTRICIONAL AVANZADO</Text>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Formulario Expandido */}
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>📊 DATOS CORPORALES</Text>
          
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Peso (kg)*"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={form.weight}
              onChangeText={text => setForm({...form, weight: text})}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Altura (cm)*"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={form.height}
              onChangeText={text => setForm({...form, height: text})}
            />
          </View>
          
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Edad*"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={form.age}
              onChangeText={text => setForm({...form, age: text})}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Cintura (cm)"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={form.waist_circumference}
              onChangeText={text => setForm({...form, waist_circumference: text})}
            />
          </View>

          <TextInput
            style={styles.input}
            placeholder="% Grasa corporal (opcional)"
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={form.body_fat_percentage}
            onChangeText={text => setForm({...form, body_fat_percentage: text})}
          />

          <Text style={styles.sectionTitle}>👤 PERFIL</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity 
              style={[styles.radioButton, form.gender === 'male' && styles.radioButtonActive]}
              onPress={() => setForm({...form, gender: 'male'})}
            >
              <Text style={[styles.radioText, form.gender === 'male' && styles.radioTextActive]}>Hombre</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.radioButton, form.gender === 'female' && styles.radioButtonActive]}
              onPress={() => setForm({...form, gender: 'female'})}
            >
              <Text style={[styles.radioText, form.gender === 'female' && styles.radioTextActive]}>Mujer</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>🏃‍♂️ NIVEL DE ACTIVIDAD</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activityScroll}>
            {activityLevels.map((level) => (
              <TouchableOpacity 
                key={level.key}
                style={[styles.activityButton, form.activity_level === level.key && styles.activityButtonActive]}
                onPress={() => setForm({...form, activity_level: level.key})}
              >
                <Text style={[styles.activityText, form.activity_level === level.key && styles.activityTextActive]}>
                  {level.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.sectionTitle}>🎯 OBJETIVO</Text>
          <View style={styles.goalContainer}>
            {goals.map((goal) => (
              <TouchableOpacity 
                key={goal.key}
                style={[styles.goalButton, form.goal === goal.key && styles.goalButtonActive]}
                onPress={() => setForm({...form, goal: goal.key})}
              >
                <Text style={[styles.goalText, form.goal === goal.key && styles.goalTextActive]}>
                  {goal.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>🔍 INFORMACIÓN ADICIONAL</Text>
          <TextInput
            style={styles.input}
            placeholder="Alergias (separadas por comas)"
            placeholderTextColor="#999"
            value={form.allergies}
            onChangeText={text => setForm({...form, allergies: text})}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Preferencias alimenticias"
            placeholderTextColor="#999"
            value={form.preferences}
            onChangeText={text => setForm({...form, preferences: text})}
          />

          <TextInput
            style={styles.input}
            placeholder="Condiciones médicas (diabetes, hipertensión, etc.)"
            placeholderTextColor="#999"
            value={form.medical_conditions}
            onChangeText={text => setForm({...form, medical_conditions: text})}
          />

          <TouchableOpacity 
            style={[styles.mainButton, loading && styles.mainButtonDisabled]}
            onPress={generatePlan}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.mainButtonText}>GENERAR ANÁLISIS COMPLETO</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Resultados Mejorados */}
        {plan && (
          <View style={styles.resultsContainer}>
            {/* Análisis Corporal */}
            <Text style={styles.mainSectionTitle}>📊 ANÁLISIS CORPORAL</Text>
            
            <View style={styles.analysisGrid}>
              <View style={[styles.metricCard, { backgroundColor: getBMIColor(plan.analisis_corporal.bmi) }]}>
                <Text style={styles.metricValue}>{plan.analisis_corporal.bmi}</Text>
                <Text style={styles.metricLabel}>IMC</Text>
                <Text style={styles.metricSubtitle}>{plan.analisis_corporal.categoria_bmi}</Text>
              </View>

              {plan.analisis_corporal.grasa_corporal_estimada && (
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{plan.analisis_corporal.grasa_corporal_estimada}%</Text>
                  <Text style={styles.metricLabel}>Grasa Corporal</Text>
                </View>
              )}

              <View style={[styles.metricCard, { backgroundColor: getRiskColor(plan.analisis_corporal.riesgo_salud) }]}>
                <Text style={styles.metricLabel}>Riesgo</Text>
                <Text style={styles.metricSubtitle}>{plan.analisis_corporal.riesgo_salud.toUpperCase()}</Text>
              </View>
            </View>

            {/* Metabolismo */}
            <Text style={styles.mainSectionTitle}>🔥 ANÁLISIS METABÓLICO</Text>
            
            <View style={styles.metabolismContainer}>
              <View style={styles.metabolismCard}>
                <Text style={styles.metabolismValue}>{plan.metabolismo.calorias_objetivo}</Text>
                <Text style={styles.metabolismLabel}>Calorías Objetivo</Text>
              </View>
              
              <View style={styles.metabolismDetails}>
                <Text style={styles.metabolismDetail}>TMB: {plan.metabolismo.bmr} kcal</Text>
                <Text style={styles.metabolismDetail}>TDEE: {plan.metabolismo.tdee} kcal</Text>
                <Text style={styles.metabolismDetail}>
                  Cambio estimado: {plan.metabolismo.cambio_peso_semanal_estimado} kg/semana
                </Text>
              </View>
            </View>

            {/* Macronutrientes */}
            <Text style={styles.mainSectionTitle}>⚖️ DISTRIBUCIÓN DE MACROS</Text>
            
            <View style={styles.macrosContainer}>
              <View style={styles.macroCard}>
                <Text style={styles.macroValue}>{plan.macronutrientes.proteinas_g}g</Text>
                <Text style={styles.macroLabel}>Proteínas</Text>
                <Text style={styles.macroCalories}>{plan.macronutrientes.distribucion_calorica.proteinas} kcal</Text>
              </View>
              
              <View style={styles.macroCard}>
                <Text style={styles.macroValue}>{plan.macronutrientes.carbohidratos_g}g</Text>
                <Text style={styles.macroLabel}>Carbohidratos</Text>
                <Text style={styles.macroCalories}>{plan.macronutrientes.distribucion_calorica.carbohidratos} kcal</Text>
              </View>
              
              <View style={styles.macroCard}>
                <Text style={styles.macroValue}>{plan.macronutrientes.grasas_g}g</Text>
                <Text style={styles.macroLabel}>Grasas</Text>
                <Text style={styles.macroCalories}>{plan.macronutrientes.distribucion_calorica.grasas} kcal</Text>
              </View>
            </View>

            {/* Plan Alimentario */}
            <Text style={styles.mainSectionTitle}>🍽️ PLAN ALIMENTARIO</Text>
            
            {Object.entries(plan.plan_alimentario).map(([meal, foods]) => (
              <View key={meal} style={styles.mealCard}>
                <Text style={styles.mealTitle}>{meal.toUpperCase()}</Text>
                {foods.map((food, index) => (
                  <View key={index} style={styles.foodRow}>
                    <Text style={styles.foodName}>• {food.food}</Text>
                    <Text style={styles.foodDetails}>
                      {food.calories_per_100g} kcal/100g | P:{food.protein}g C:{food.carbs}g G:{food.fat}g
                    </Text>
                  </View>
                ))}
              </View>
            ))}

            {/* Recomendaciones */}
            <Text style={styles.mainSectionTitle}>💡 RECOMENDACIONES</Text>
            
            <View style={styles.recommendationsContainer}>
              {plan.evaluacion_salud.recomendaciones_generales.map((rec, index) => (
                <Text key={index} style={styles.recommendation}>• {rec}</Text>
              ))}
              
              {plan.evaluacion_salud.recomendaciones_especificas.map((rec, index) => (
                <Text key={index} style={styles.recommendationSpecific}>⭐ {rec}</Text>
              ))}
            </View>

            {/* Predicciones */}
            <Text style={styles.mainSectionTitle}>🔮 PREDICCIONES</Text>
            
            <View style={styles.predictionsContainer}>
              <View style={styles.predictionCard}>
                <Text style={styles.predictionLabel}>Progreso Estimado</Text>
                <Text style={styles.predictionValue}>{plan.predicciones.tiempo_objetivo_estimado}</Text>
              </View>
              
              <View style={styles.predictionCard}>
                <Text style={styles.predictionLabel}>Adherencia Requerida</Text>
                <Text style={styles.predictionValue}>{plan.predicciones.adherencia_requerida}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingTop: 40,
  },
  title: {
    fontSize: 18,
    color: '#e60404',
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  formContainer: {
    width: screenWidth - 40,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    color: '#e60404',
    fontWeight: 'bold',
    marginVertical: 15,
    alignSelf: 'flex-start',
  },
  mainSectionTitle: {
    fontSize: 18,
    color: '#e60404',
    fontWeight: 'bold',
    marginVertical: 20,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  halfInput: {
    width: '48%',
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
  },
  radioButton: {
    flex: 1,
    padding: 12,
    marginHorizontal: 5,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#f5f5f5',
    alignItems: 'center',
  },
  radioButtonActive: {
    backgroundColor: '#e60404',
    borderColor: '#e60404',
  },
  radioText: {
    color: '#333',
    fontWeight: 'bold',
  },
  radioTextActive: {
    color: '#fff',
  },
  activityScroll: {
    marginBottom: 15,
  },
  activityButton: {
    padding: 10,
    marginRight: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#f5f5f5',
    minWidth: 80,
  },
  activityButtonActive: {
    backgroundColor: '#e60404',
    borderColor: '#e60404',
  },
  activityText: {
    color: '#333',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  activityTextActive: {
    color: '#fff',
  },
  goalContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
  },
  goalButton: {
    width: '48%',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#f5f5f5',
    alignItems: 'center',
  },
  goalButtonActive: {
    backgroundColor: '#e60404',
    borderColor: '#e60404',
  },
  goalText: {
    color: '#333',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  goalTextActive: {
    color: '#fff',
  },
  mainButton: {
    backgroundColor: '#e60404',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginTop: 20,
    marginBottom: 30,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  mainButtonDisabled: {
    backgroundColor: '#ccc',
  },
  mainButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  resultsContainer: {
    width: screenWidth - 40,
    marginTop: 20,
  },
  analysisGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    minWidth: '30%',
    alignItems: 'center',
    elevation: 2,
  },
  metricValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  metricLabel: {
    color: '#fff',
    fontSize: 12,
    marginTop: 5,
  },
  metricSubtitle: {
    color: '#fff',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  metabolismContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
  },
  metabolismCard: {
    alignItems: 'center',
    marginBottom: 15,
  },
  metabolismValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#e60404',
  },
  metabolismLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  metabolismDetails: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  metabolismDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  macroCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    width: '30%',
    alignItems: 'center',
    elevation: 2,
  },
  macroValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e60404',
  },
  macroLabel: {
    fontSize: 12,
    color: '#666',
    marginVertical: 5,
  },
  macroCalories: {
    fontSize: 10,
    color: '#999',
  },
  mealCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
  },
  mealTitle: {
    color: '#e60404',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  foodRow: {
    marginBottom: 8,
  },
  foodName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  foodDetails: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
    marginTop: 2,
  },
  recommendationsContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
  },
  recommendation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  recommendationSpecific: {
    fontSize: 14,
    color: '#e60404',
    marginBottom: 8,
    lineHeight: 20,
    fontWeight: '600',
  },
  predictionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  predictionCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    width: '48%',
    alignItems: 'center',
    elevation: 2,
  },
  predictionLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
  predictionValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e60404',
    textAlign: 'center',
  },
});

export default NutricionScreen;