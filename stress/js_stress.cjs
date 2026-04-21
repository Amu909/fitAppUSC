const { performance } = require('perf_hooks');
const {
  buildNutritionRequestData,
  getBMIColor,
  getRiskColor,
  validateNutritionForm,
} = require('../app/utils/nutritionHelpers');
const {
  buildChatPayload,
  sanitizeSuggestionText,
} = require('../app/utils/chatbotHelpers');
const {
  validateEmailFormat,
  validatePasswordRules,
} = require('../app/utils/authHelpers');

function formatMs(ms) {
  return `${ms.toFixed(2)} ms`;
}

function runCase(name, iterations, fn) {
  let failures = 0;
  const started = performance.now();

  for (let index = 0; index < iterations; index += 1) {
    try {
      fn(index);
    } catch (error) {
      failures += 1;
    }
  }

  const elapsed = performance.now() - started;
  const opsPerSecond = iterations / (elapsed / 1000);

  return {
    name,
    iterations,
    failures,
    elapsed,
    opsPerSecond,
  };
}

function printResult(result) {
  const status = result.failures === 0 ? 'PASS' : 'FAIL';
  console.log(`${status} ${result.name}`);
  console.log(`  iteraciones ${result.iterations}`);
  console.log(`  errores ${result.failures}`);
  console.log(`  tiempo total ${formatMs(result.elapsed)}`);
  console.log(`  throughput ${result.opsPerSecond.toFixed(0)} ops/s`);
}

const nutritionForm = {
  weight: '82.5',
  height: '178',
  age: '31',
  gender: 'male',
  activity_level: 'active',
  goal: 'gain_muscle',
  allergies: 'gluten, soy',
  preferences: 'pollo, arroz, avena',
  medical_conditions: 'none',
  body_fat_percentage: '16.4',
  waist_circumference: '86',
};

const messages = Array.from({ length: 20 }, (_, index) => ({
  role: index % 2 === 0 ? 'user' : 'assistant',
  content: `mensaje-${index}`,
}));

const suggestions = [
  '💪 Dame una rutina de ejercicios',
  '🥗 ¿Qué debo comer hoy?',
  '❤️ Ejercicios para mejorar mi cardio',
];

const results = [
  runCase('stress/js nutrition validation', 50000, () => {
    const validation = validateNutritionForm(nutritionForm);
    if (!validation.valid) {
      throw new Error('validation failed');
    }
  }),
  runCase('stress/js nutrition payload builder', 50000, () => {
    const payload = buildNutritionRequestData(nutritionForm);
    if (payload.allergies.length !== 2 || payload.weight !== 82.5) {
      throw new Error('invalid payload');
    }
  }),
  runCase('stress/js chatbot payload builder', 40000, () => {
    const payload = buildChatPayload('Necesito ayuda', messages, { goal: 'athletic' });
    if (payload.conversation_history.length !== messages.length) {
      throw new Error('invalid chat payload');
    }
  }),
  runCase('stress/js suggestion sanitizer', 80000, (index) => {
    const text = sanitizeSuggestionText(suggestions[index % suggestions.length]);
    if (text.includes('💪') || text.includes('🥗') || text.includes('❤️')) {
      throw new Error('emoji remained');
    }
  }),
  runCase('stress/js auth validators', 60000, (index) => {
    const email = validateEmailFormat(`user${index}@mail.com`);
    const password = validatePasswordRules('Abcd1234', true);
    if (!email.valid || !password.valid) {
      throw new Error('auth invalid');
    }
  }),
  runCase('stress/js color mapping', 100000, (index) => {
    const bmiColor = getBMIColor((index % 25) + 15);
    const riskColor = getRiskColor(['bajo', 'medio', 'alto', 'muy alto', 'extremo'][index % 5]);
    if (!bmiColor || !riskColor) {
      throw new Error('missing color');
    }
  }),
];

results.forEach(printResult);

const totalIterations = results.reduce((sum, item) => sum + item.iterations, 0);
const totalFailures = results.reduce((sum, item) => sum + item.failures, 0);
const totalElapsed = results.reduce((sum, item) => sum + item.elapsed, 0);
const passedSuites = results.filter((item) => item.failures === 0).length;

console.log('');
console.log(`Stress Suites: ${passedSuites} passed, ${results.length} total`);
console.log(`Checks: ${totalIterations - totalFailures} passed, ${totalIterations} total`);
console.log(`Tiempo agregado: ${formatMs(totalElapsed)}`);
