const FALLBACK_MONTHS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

const FALLBACK_WEEKDAYS = [
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
];

export function safeFormatDate(date, options = {}) {
  const value = date instanceof Date ? date : new Date(date);

  try {
    return new Intl.DateTimeFormat('es-CO', options).format(value);
  } catch {
    const weekday = FALLBACK_WEEKDAYS[value.getDay()];
    const day = value.getDate();
    const month = FALLBACK_MONTHS[value.getMonth()];
    const year = value.getFullYear();
    const hour = String(value.getHours()).padStart(2, '0');
    const minute = String(value.getMinutes()).padStart(2, '0');

    if (options.hour && options.minute) {
      return `${weekday}, ${day} ${month} ${hour}:${minute}`;
    }

    if (options.year) {
      return `${weekday}, ${day} de ${month} de ${year}`;
    }

    return `${weekday}, ${day} de ${month}`;
  }
}
