import { EXERCISE_LIBRARY } from './workoutLibrary';

const SESSION_PRESETS = {
  WORK: {
    title: 'Sesion de fuerza',
    description: 'Enfocada en cargas pesadas, patrones compuestos y progreso de fuerza util en gym.',
    coverImage: require('../../assets/images/WORKOUTS/FUERZA.png'),
    durationLabel: '45-60 min',
    emphasisLabel: 'Fuerza full body',
  },
  SPIN: {
    title: 'Running guiado',
    description: 'Bloque orientado a cardio util, mejora de capacidad aerobica y control del esfuerzo.',
    coverImage: require('../../assets/images/WORKOUTS/RUNNING.png'),
    durationLabel: '25-40 min',
    emphasisLabel: 'Cardio progresivo',
  },
  RUSTIC: {
    title: 'Core intenso',
    description: 'Sesion corta con control del core, estabilidad y apoyo para movilidad general.',
    coverImage: require('../../assets/images/WORKOUTS/HIIT.png'),
    durationLabel: '20-30 min',
    emphasisLabel: 'Core y estabilidad',
  },
};

const STRENGTH_TRACKS = {
  beginner: ['Cuadriceps', 'Pecho', 'Espalda', 'Gluteos', 'Abdominales'],
  intermediate: ['Cuadriceps', 'Pecho', 'Espalda', 'Isquiotibiales', 'Hombros'],
  advanced: ['Cuadriceps', 'Pecho', 'Espalda', 'Isquiotibiales', 'Hombros'],
};

const HEAVY_EXERCISES = ['Sentadilla', 'Press de banca', 'Remo con barra', 'Peso muerto rumano', 'Press militar'];
const ATHLETIC_SWAP = ['Peso muerto', 'Dominadas', 'Press militar', 'Sentadilla bulgara'];
const LEANER_SWAP = ['Prensa de piernas', 'Jalon al pecho', 'Press inclinado', 'Plancha'];

function normalizeGoal(goal) {
  if (goal === 'gain_muscle' || goal === 'athletic' || goal === 'lose_weight' || goal === 'maintain') {
    return goal;
  }
  return 'maintain';
}

function normalizeActivityLevel(activityLevel) {
  if (activityLevel === 'low' || activityLevel === 'sedentary') return 'low';
  if (activityLevel === 'high' || activityLevel === 'very_high') return 'high';
  return 'moderate';
}

function resolveExperience(userProfile) {
  const age = Number(userProfile?.age) || 0;
  const activityLevel = normalizeActivityLevel(userProfile?.activity_level);
  if (activityLevel === 'high' || age <= 23) return 'advanced';
  if (activityLevel === 'moderate') return 'intermediate';
  return 'beginner';
}

function parseRepMidpoint(reps) {
  const match = String(reps || '').match(/(\d+)(?:\s*-\s*(\d+))?/);
  if (!match) return 0;
  const first = Number(match[1]) || 0;
  const second = Number(match[2]) || first;
  return (first + second) / 2;
}

function findExerciseByName(groups, names) {
  for (const group of groups) {
    const exercises = EXERCISE_LIBRARY[group] || [];
    for (const name of names) {
      const match = exercises.find((item) => item.name === name);
      if (match) {
        return { ...match, group };
      }
    }
  }
  return null;
}

function buildStrengthPlan(userProfile) {
  const goal = normalizeGoal(userProfile?.goal);
  const experience = resolveExperience(userProfile);
  const groups = STRENGTH_TRACKS[experience];
  const baseExercises = [];

  groups.forEach((group) => {
    const library = EXERCISE_LIBRARY[group] || [];
    const choice =
      findExerciseByName([group], HEAVY_EXERCISES) ||
      library.find((item) => item.level !== 'Principiante') ||
      library[0];
    if (choice) {
      baseExercises.push({ ...choice, group });
    }
  });

  const preferredNames = goal === 'athletic' ? ATHLETIC_SWAP : goal === 'lose_weight' ? LEANER_SWAP : [];
  const upgraded = baseExercises.map((exercise) => {
    const alternative = findExerciseByName([exercise.group], preferredNames);
    return alternative || exercise;
  });

  const unique = [];
  const seen = new Set();
  upgraded.forEach((exercise) => {
    if (!seen.has(exercise.name) && unique.length < 5) {
      seen.add(exercise.name);
      unique.push(exercise);
    }
  });

  const recommendation =
    goal === 'gain_muscle'
      ? 'Prioriza 2 series duras finales y descansos de 90 a 120 segundos.'
      : goal === 'athletic'
        ? 'Usa cargas retadoras y enfocate en velocidad controlada y tecnica limpia.'
        : 'Manten cargas exigentes, descansos moderados y buena tecnica para estimular sin excederte.';

  return {
    focusTitle: 'Rutina sugerida de fuerza',
    planSummary: 'Hasta 5 ejercicios compuestos para un bloque full body util en gym.',
    recommendation,
    exercises: unique.map((exercise, index) => ({
      ...exercise,
      prescription: index < 3 ? '4 series efectivas' : '3 series efectivas',
    })),
  };
}

function buildCardioPlan(userProfile) {
  const goal = normalizeGoal(userProfile?.goal);
  const activityLevel = normalizeActivityLevel(userProfile?.activity_level);
  const base = [
    { ...EXERCISE_LIBRARY.Cardio[0], group: 'Cardio', prescription: activityLevel === 'high' ? '8 min progresivos' : '10 min suaves' },
    { ...EXERCISE_LIBRARY.Cardio[2], group: 'Cardio', prescription: '4 bloques de 2 min intensos' },
    { ...EXERCISE_LIBRARY.Cardio[1], group: 'Cardio', prescription: goal === 'lose_weight' ? '12 min sostenidos' : '8 min de recuperacion' },
    { ...EXERCISE_LIBRARY.Abdominales[2], group: 'Abdominales', prescription: '3 series de estabilidad' },
  ];

  return {
    focusTitle: 'Sesion cardio guiada',
    planSummary: 'Mezcla resistencia, un pico de intensidad y un cierre de estabilidad para no quedar en cardio monotono.',
    recommendation: goal === 'lose_weight'
      ? 'Trabaja por sensacion de esfuerzo 7/10 en los bloques fuertes.'
      : 'Usa la sesion para elevar pulso sin perder tecnica ni respiracion.',
    exercises: base,
  };
}

function buildCorePlan(userProfile) {
  const goal = normalizeGoal(userProfile?.goal);
  const coreExercises = [
    { ...EXERCISE_LIBRARY.Abdominales[2], group: 'Abdominales', prescription: '4 rondas de 35 a 45 s' },
    { ...EXERCISE_LIBRARY.Abdominales[1], group: 'Abdominales', prescription: '3 series controladas' },
    { ...EXERCISE_LIBRARY.Abdominales[4], group: 'Abdominales', prescription: '3 series por lado' },
    { ...EXERCISE_LIBRARY.Gluteos[4], group: 'Gluteos', prescription: '3 series de activacion' },
    { ...EXERCISE_LIBRARY.Abductores[1], group: 'Abductores', prescription: '2 a 3 series de control' },
  ];

  return {
    focusTitle: 'Sesion de core y estabilidad',
    planSummary: 'Bloque corto para abdomen, cadera y control postural, util como complemento o dia ligero.',
    recommendation: goal === 'athletic'
      ? 'Busca tension real en cada repeticion y evita hacerla por velocidad.'
      : 'Prioriza respiracion, control de la pelvis y ejecucion limpia.',
    exercises: coreExercises,
  };
}

export function getSessionPreset(type) {
  return SESSION_PRESETS[type] || SESSION_PRESETS.WORK;
}

export function buildSessionPlan(type, userProfile = {}) {
  const preset = getSessionPreset(type);

  if (type === 'SPIN') {
    return { ...preset, ...buildCardioPlan(userProfile) };
  }
  if (type === 'RUSTIC') {
    return { ...preset, ...buildCorePlan(userProfile) };
  }
  return { ...preset, ...buildStrengthPlan(userProfile) };
}

export function buildSessionHighlights(exercises = []) {
  const averageRepTarget = exercises.length
    ? Math.round(exercises.reduce((sum, exercise) => sum + parseRepMidpoint(exercise.reps), 0) / exercises.length)
    : 0;

  return {
    totalExercises: exercises.length,
    averageRepTarget,
    primaryGroups: [...new Set(exercises.map((exercise) => exercise.group))].slice(0, 3),
  };
}
