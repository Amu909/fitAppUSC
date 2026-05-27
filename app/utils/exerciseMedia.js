const EXERCISE_DB_URL =
  process.env.EXPO_PUBLIC_EXERCISEDB_API_BASE_URL || 'https://oss.exercisedb.dev/api/v1/exercises';

const BODY_PART_ALIASES = {
  Pecho: 'chest',
  Espalda: 'back',
  Hombros: 'shoulders',
  Biceps: 'upper arms',
  Triceps: 'upper arms',
  Antebrazos: 'lower arms',
  Abdominales: 'waist',
  Cuadriceps: 'upper legs',
  Isquiotibiales: 'upper legs',
  Gluteos: 'upper legs',
  Pantorrillas: 'lower legs',
  Aductores: 'upper legs',
  Abductores: 'upper legs',
  Cardio: 'cardio',
};

const EXERCISE_ALIASES = {
  'press de banca': ['barbell bench press', 'bench press'],
  'press inclinado': ['incline barbell bench press', 'incline bench press'],
  'press declinado': ['decline barbell bench press', 'decline bench press'],
  'aperturas con mancuernas': ['dumbbell fly', 'dumbbell chest fly'],
  'fondos en paralelas': ['chest dip', 'parallel bar dip'],
  'cinta de correr': ['walking on treadmill', 'run on treadmill'],
  'bicicleta estatica': ['stationary bike run v. 3', 'stationary bike walk'],
  remo: ['rowing', 'cable seated row'],
  eliptica: ['elliptical trainer', 'elliptical machine walk'],
  escaladora: ['stair climber', 'lever step machine'],
  dominadas: ['pull-up', 'wide grip pull up'],
  'jalon al pecho': ['cable pulldown', 'lat pulldown'],
  'remo con barra': ['barbell bent over row', 'barbell row'],
  'remo con mancuerna': ['dumbbell bent over row', 'one arm dumbbell row'],
  'peso muerto': ['barbell deadlift', 'deadlift'],
  'press militar': ['barbell shoulder press', 'military press'],
  'elevaciones laterales': ['dumbbell lateral raise', 'lateral raise'],
  'elevaciones frontales': ['dumbbell front raise', 'front raise'],
  pajaros: ['rear delt fly', 'dumbbell rear delt row'],
  encogimientos: ['barbell shrug', 'dumbbell shrug'],
  'curl con barra': ['barbell curl', 'ez barbell curl'],
  'curl con mancuernas': ['dumbbell biceps curl', 'dumbbell curl'],
  'curl martillo': ['hammer curl'],
  'curl concentrado': ['concentration curl'],
  'curl en banco inclinado': ['incline dumbbell curl'],
  'extension en polea': ['triceps pushdown', 'cable triceps pushdown'],
  'extension con mancuerna': ['dumbbell seated triceps extension', 'dumbbell triceps extension'],
  'extension francesa': ['lying triceps extension', 'skull crusher'],
  'press cerrado': ['close grip bench press'],
  'curl de muneca': ['barbell wrist curl'],
  'extension de muneca': ['barbell reverse wrist curl'],
  'curl inverso': ['reverse curl'],
  "farmer's walk": ['farmer walk'],
  crunch: ['crunch'],
  'elevaciones de piernas': ['lying leg raise', 'hanging leg raise'],
  plancha: ['plank'],
  'crunch en polea': ['cable crunch'],
  'russian twist': ['russian twist'],
  sentadilla: ['barbell squat', 'bodyweight squat'],
  'prensa de piernas': ['sled leg press', 'leg press'],
  zancadas: ['dumbbell lunge', 'forward lunge'],
  'extension de piernas': ['leg extension'],
  'sentadilla hack': ['hack squat'],
  'peso muerto rumano': ['romanian deadlift'],
  'curl femoral acostado': ['lying leg curl'],
  'curl femoral sentado': ['seated leg curl'],
  'buenos dias': ['good morning'],
  'hip thrust': ['barbell hip thrust', 'hip thrust'],
  'sentadilla bulgara': ['bulgarian split squat'],
  'patada de gluteo': ['cable kickback', 'glute kickback'],
  'abduccion de cadera': ['hip abduction'],
  'puente de gluteo': ['glute bridge'],
  'elevacion de talones de pie': ['standing calf raise'],
  'elevacion de talones sentado': ['seated calf raise'],
  'elevacion en prensa': ['leg press calf raise', 'calf press on leg press'],
  'elevacion a una pierna': ['single leg calf raise'],
  'aductores en maquina': ['hip adduction'],
  'aductores con polea': ['cable hip adduction'],
  'sissy squat': ['sissy squat'],
  'abduccion en maquina': ['hip abduction'],
  'abduccion con banda': ['band hip abduction'],
  'patinador lateral': ['skater', 'side skate'],
};

const TOKEN_TRANSLATIONS = {
  press: 'press',
  banca: 'bench',
  inclinado: 'incline',
  declinado: 'decline',
  aperturas: 'fly',
  mancuerna: 'dumbbell',
  mancuernas: 'dumbbell',
  fondos: 'dip',
  paralelas: 'parallel',
  cinta: 'treadmill',
  correr: 'run',
  bicicleta: 'bike',
  estatica: 'stationary',
  remo: 'row',
  jalon: 'pulldown',
  pecho: 'chest',
  dominadas: 'pullup',
  peso: 'deadlift',
  muerto: 'deadlift',
  militar: 'military',
  elevaciones: 'raise',
  laterales: 'lateral',
  frontales: 'front',
  pajaros: 'rear',
  encogimientos: 'shrug',
  curl: 'curl',
  martillo: 'hammer',
  concentrado: 'concentration',
  banco: 'bench',
  polea: 'cable',
  extension: 'extension',
  francesa: 'skullcrusher',
  cerrado: 'close',
  muneca: 'wrist',
  inverso: 'reverse',
  crunch: 'crunch',
  piernas: 'leg',
  plancha: 'plank',
  russian: 'russian',
  twist: 'twist',
  sentadilla: 'squat',
  prensa: 'press',
  zancadas: 'lunge',
  hack: 'hack',
  rumano: 'romanian',
  femoral: 'hamstring',
  acostado: 'lying',
  sentado: 'seated',
  gluteo: 'glute',
  gluteos: 'glute',
  thrust: 'thrust',
  bulgara: 'bulgarian',
  patada: 'kickback',
  abduccion: 'abduction',
  puente: 'bridge',
  talones: 'calf',
  pie: 'standing',
  una: 'single',
  pierna: 'leg',
  aductores: 'adduction',
  abductores: 'abduction',
  banda: 'band',
  patinador: 'skater',
  lateral: 'side',
};

const STOPWORDS = new Set(['de', 'con', 'en', 'al', 'a', 'y', 'por', 'para', 'del']);

let exerciseDbPromise = null;
const exerciseMatchCache = new Map();

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toTokens(value) {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token && !STOPWORDS.has(token));
}

function translateTokens(tokens) {
  return tokens.map((token) => TOKEN_TRANSLATIONS[token] || token);
}

function buildCanonicalName(value) {
  return translateTokens(toTokens(value)).join(' ').trim();
}

function buildTokenSet(value) {
  return new Set(translateTokens(toTokens(value)));
}

function calculateTokenOverlap(leftSet, rightSet) {
  if (!leftSet.size || !rightSet.size) {
    return 0;
  }

  let intersection = 0;
  leftSet.forEach((token) => {
    if (rightSet.has(token)) {
      intersection += 1;
    }
  });

  return intersection / Math.max(leftSet.size, rightSet.size);
}

async function loadExerciseDb() {
  if (!exerciseDbPromise) {
    exerciseDbPromise = fetch(EXERCISE_DB_URL)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`ExerciseDB respondio ${response.status}`);
        }
        const payload = await response.json();
        const rawItems = Array.isArray(payload) ? payload : payload?.data || [];
        return rawItems.map((item) => ({
          ...item,
          _normalizedName: normalizeText(item.name),
          _canonicalName: buildCanonicalName(item.name),
          _tokenSet: buildTokenSet(item.name),
          _bodyParts: (item.bodyParts || []).map((part) => normalizeText(part)),
          _equipments: (item.equipments || []).map((equipment) => normalizeText(equipment)),
          _targetMuscles: (item.targetMuscles || []).map((muscle) => normalizeText(muscle)),
        }));
      })
      .catch((error) => {
        exerciseDbPromise = null;
        throw error;
      });
  }

  return exerciseDbPromise;
}

function buildSearchCandidates(exerciseName) {
  const normalizedName = normalizeText(exerciseName);
  const canonicalName = buildCanonicalName(exerciseName);
  const aliases = EXERCISE_ALIASES[normalizedName] || [];
  return [...new Set([normalizedName, canonicalName, ...aliases.map((alias) => normalizeText(alias)), ...aliases.map((alias) => buildCanonicalName(alias))])];
}

function scoreRemoteExercise(remoteExercise, exerciseName, group) {
  const searchCandidates = buildSearchCandidates(exerciseName);
  const normalizedGroup = normalizeText(BODY_PART_ALIASES[group] || group);

  const exactAliasIndex = searchCandidates.findIndex(
    (candidate) => remoteExercise._normalizedName === candidate || remoteExercise._canonicalName === candidate
  );
  const localTokenSet = buildTokenSet(exerciseName);
  const tokenOverlap = calculateTokenOverlap(localTokenSet, remoteExercise._tokenSet);

  const bodyPartBonus = remoteExercise._bodyParts.includes(normalizedGroup) ? 0 : 1;

  return [
    exactAliasIndex === -1 ? 99 : exactAliasIndex,
    -tokenOverlap,
    bodyPartBonus,
    remoteExercise._normalizedName.length,
  ];
}

function compareScores(left, right) {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    if (leftValue < rightValue) return -1;
    if (leftValue > rightValue) return 1;
  }
  return 0;
}

function pickBestExerciseMatch(exercises, exerciseName, group) {
  const searchCandidates = buildSearchCandidates(exerciseName);
  const normalizedGroup = normalizeText(BODY_PART_ALIASES[group] || group);
  const localTokenSet = buildTokenSet(exerciseName);

  const filtered = exercises.filter((item) => {
    const exactAliasHit = searchCandidates.some(
      (candidate) =>
        item._normalizedName === candidate ||
        item._canonicalName === candidate
    );
    const tokenOverlap = calculateTokenOverlap(localTokenSet, item._tokenSet);
    const bodyPartHit = normalizedGroup && item._bodyParts.includes(normalizedGroup);
    return exactAliasHit || (bodyPartHit && tokenOverlap >= 0.85);
  });

  if (!filtered.length) {
    return null;
  }

  const sorted = [...filtered].sort((left, right) =>
    compareScores(
      scoreRemoteExercise(left, exerciseName, group),
      scoreRemoteExercise(right, exerciseName, group)
    )
  );

  const best = sorted[0];
  const bestScore = scoreRemoteExercise(best, exerciseName, group);
  const strictEnough =
    bestScore[0] !== 99 ||
    (-bestScore[1]) >= 0.85;

  return strictEnough ? best : null;
}

export async function enrichExercisesWithRemoteMedia(exercises, group) {
  try {
    const database = await loadExerciseDb();

    return exercises.map((exercise) => {
      const cacheKey = `${group}::${exercise.name}`;
      const cached = exerciseMatchCache.get(cacheKey);
      if (cached) {
        return { ...exercise, remoteMedia: cached };
      }

      const match = pickBestExerciseMatch(database, exercise.name, group);
      const remoteMedia = match
        ? {
            exerciseId: match.exerciseId,
            name: match.name,
            gifUrl: match.gifUrl || match.gifUrls?.['360p'] || match.gifUrls?.['480p'] || null,
            imageUrl: match.imageUrl || match.imageUrls?.['360p'] || match.imageUrls?.['480p'] || null,
            instructions: match.instructions || [],
            bodyParts: match.bodyParts || [],
            targetMuscles: match.targetMuscles || [],
            secondaryMuscles: match.secondaryMuscles || [],
            equipments: match.equipments || [],
          }
        : null;

      exerciseMatchCache.set(cacheKey, remoteMedia);
      return { ...exercise, remoteMedia };
    });
  } catch {
    return exercises.map((exercise) => ({ ...exercise, remoteMedia: null }));
  }
}
