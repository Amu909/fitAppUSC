import {
  Timestamp,
  addDoc,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../../firebaseconfig';

const ACTIVITY_COLLECTION = 'activity_logs';

const ACTIVITY_META = {
  WORK: {
    title: 'Sesion de fuerza',
    icon: 'barbell-outline',
    color: '#d9f99d',
    iconColor: '#365314',
  },
  SPIN: {
    title: 'Running guiado',
    icon: 'walk-outline',
    color: '#f5d0fe',
    iconColor: '#86198f',
  },
  RUSTIC: {
    title: 'Core y movilidad',
    icon: 'body-outline',
    color: '#bfdbfe',
    iconColor: '#1d4ed8',
  },
};

function pad(value) {
  return String(value).padStart(2, '0');
}

export function formatDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getYesterdayRange() {
  const start = new Date();
  start.setDate(start.getDate() - 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  return { start, end, dateKey: formatDateKey(start) };
}

export function formatDurationLabel(totalSeconds) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours} h ${minutes} min`;
  }

  if (minutes > 0) {
    return `${minutes} min`;
  }

  return `${seconds} s`;
}

export function getActivityMeta(type) {
  return (
    ACTIVITY_META[type] || {
      title: type || 'Actividad',
      icon: 'fitness-outline',
      color: '#e5e7eb',
      iconColor: '#374151',
    }
  );
}

export async function saveWorkoutSession({ userId, type, durationSeconds, endedAt = new Date() }) {
  if (!userId) {
    return;
  }

  const meta = getActivityMeta(type);
  const normalizedDuration = Math.max(0, Math.round(durationSeconds || 0));

  await addDoc(collection(db, 'users', userId, ACTIVITY_COLLECTION), {
    type: type || 'GENERAL',
    title: meta.title,
    durationSeconds: normalizedDuration,
    durationLabel: formatDurationLabel(normalizedDuration),
    dateKey: formatDateKey(endedAt),
    endedAt: Timestamp.fromDate(endedAt),
    createdAt: Timestamp.fromDate(new Date()),
  });
}

export async function getYesterdayActivityLogs(userId) {
  if (!userId) {
    return [];
  }

  const { dateKey } = getYesterdayRange();
  const logsQuery = query(
    collection(db, 'users', userId, ACTIVITY_COLLECTION),
    where('dateKey', '==', dateKey)
  );

  const snapshot = await getDocs(logsQuery);
  return snapshot.docs
    .map((docSnapshot) => {
      const data = docSnapshot.data();
      const meta = getActivityMeta(data.type);

      return {
        id: docSnapshot.id,
        type: data.type,
        title: data.title || meta.title,
        subtitle: data.durationLabel || formatDurationLabel(data.durationSeconds),
        durationSeconds: data.durationSeconds || 0,
        endedAt: data.endedAt?.toDate?.() || null,
        icon: meta.icon,
        color: meta.color,
        iconColor: meta.iconColor,
      };
    })
    .sort((a, b) => (b.endedAt?.getTime?.() || 0) - (a.endedAt?.getTime?.() || 0));
}
