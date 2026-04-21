function validateNutritionForm(form) {
  if (!form.weight || !form.height || !form.age) {
    return {
      valid: false,
      message: 'Por favor completa todos los campos obligatorios',
    };
  }

  const weight = parseFloat(form.weight);
  const height = parseFloat(form.height);
  const age = parseInt(form.age, 10);

  if (Number.isNaN(weight) || weight < 30 || weight > 300) {
    return {
      valid: false,
      message: 'El peso debe estar entre 30 y 300 kg',
    };
  }

  if (Number.isNaN(height) || height < 100 || height > 250) {
    return {
      valid: false,
      message: 'La altura debe estar entre 100 y 250 cm',
    };
  }

  if (Number.isNaN(age) || age < 15 || age > 100) {
    return {
      valid: false,
      message: 'La edad debe estar entre 15 y 100 años',
    };
  }

  return { valid: true };
}

function splitCsvField(value) {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildNutritionRequestData(form) {
  return {
    weight: parseFloat(form.weight),
    height: parseFloat(form.height),
    age: parseInt(form.age, 10),
    gender: form.gender,
    activity_level: form.activity_level,
    goal: form.goal,
    allergies: splitCsvField(form.allergies),
    preferences: splitCsvField(form.preferences),
    medical_conditions: splitCsvField(form.medical_conditions),
    body_fat_percentage: form.body_fat_percentage ? parseFloat(form.body_fat_percentage) : null,
    waist_circumference: form.waist_circumference ? parseFloat(form.waist_circumference) : null,
  };
}

function getBMIColor(bmi) {
  if (bmi < 18.5) return '#3498db';
  if (bmi < 25) return '#27ae60';
  if (bmi < 30) return '#f39c12';
  return '#e74c3c';
}

function getRiskColor(risk) {
  switch (risk) {
    case 'bajo':
      return '#27ae60';
    case 'medio':
      return '#f39c12';
    case 'alto':
      return '#e67e22';
    case 'muy alto':
      return '#e74c3c';
    case 'extremo':
      return '#8e44ad';
    default:
      return '#95a5a6';
  }
}

module.exports = {
  buildNutritionRequestData,
  getBMIColor,
  getRiskColor,
  splitCsvField,
  validateNutritionForm,
};
