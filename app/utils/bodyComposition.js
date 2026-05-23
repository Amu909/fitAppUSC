export function calculateBMI(weightKg, heightCm) {
  const weight = Number(weightKg);
  const heightMeters = Number(heightCm) / 100;

  if (!Number.isFinite(weight) || !Number.isFinite(heightMeters) || weight <= 0 || heightMeters <= 0) {
    return null;
  }

  return weight / (heightMeters * heightMeters);
}

export function estimateBodyFatPercentage({ weight, height, age, gender }) {
  const bmi = calculateBMI(weight, height);
  const numericAge = Number(age);

  if (!Number.isFinite(bmi) || !Number.isFinite(numericAge) || numericAge <= 0) {
    return null;
  }

  const sexFactor = gender === 'male' ? 1 : 0;
  const estimate = (1.2 * bmi) + (0.23 * numericAge) - (10.8 * sexFactor) - 5.4;

  if (!Number.isFinite(estimate)) {
    return null;
  }

  return Math.max(0, Number(estimate.toFixed(1)));
}
