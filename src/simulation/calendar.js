/** Bir günün dakika sayısı. Proje zamanı ilk gün 00:00'dan başlar. */
export const MINUTES_PER_DAY = 1440;

/** @param {import('../domain/types.js').Calendar} calendar */
export function assertCalendar(calendar) {
  if (!calendar || !Number.isFinite(calendar.workStartMinute)
    || !Number.isFinite(calendar.workEndMinute)
    || calendar.workStartMinute < 0
    || calendar.workEndMinute > MINUTES_PER_DAY
    || calendar.workStartMinute >= calendar.workEndMinute) {
    throw new Error('Takvim penceresi 0 ≤ başlangıç < bitiş ≤ 1440 olmalıdır.');
  }
}

/** @param {number} minute */
function assertMinute(minute) {
  if (!Number.isFinite(minute) || minute < 0) {
    throw new Error('Zaman, sıfır veya daha büyük sonlu bir dakika olmalıdır.');
  }
}

/**
 * Başlangıç dahil, bitiş hariç: 08:00–20:00 penceresinde 20:00 mesai dışıdır.
 * TODO: Haftanın günleri ve tatiller onaylandığında pencere sorgusunu genişlet.
 * @param {number} minute
 * @param {import('../domain/types.js').Calendar} calendar
 */
export function isWorkingMinute(minute, calendar) {
  assertCalendar(calendar);
  assertMinute(minute);
  const timeOfDay = minute % MINUTES_PER_DAY;
  return timeOfDay >= calendar.workStartMinute && timeOfDay < calendar.workEndMinute;
}

/** @param {number} minute @param {import('../domain/types.js').Calendar} calendar */
export function nextWorkingMinute(minute, calendar) {
  assertCalendar(calendar);
  assertMinute(minute);
  const dayStart = Math.floor(minute / MINUTES_PER_DAY) * MINUTES_PER_DAY;
  const timeOfDay = minute - dayStart;
  if (timeOfDay < calendar.workStartMinute) return dayStart + calendar.workStartMinute;
  if (timeOfDay >= calendar.workEndMinute) {
    return dayStart + MINUTES_PER_DAY + calendar.workStartMinute;
  }
  return minute;
}

/**
 * Yalnızca mesai içindeki dakikaları ekler. Tam vardiya sonunda bir sonraki
 * sabaha atlamaz; sıfır süre başlangıcı aynen döndürür.
 * @param {number} startMinute
 * @param {number} durationMinutes
 * @param {import('../domain/types.js').Calendar} calendar
 */
export function addWorkingMinutes(startMinute, durationMinutes, calendar) {
  assertCalendar(calendar);
  assertMinute(startMinute);
  if (!Number.isFinite(durationMinutes) || durationMinutes < 0) {
    throw new Error('Çalışma süresi sıfır veya daha büyük sonlu bir sayı olmalıdır.');
  }
  if (durationMinutes === 0) return startMinute;
  const start = nextWorkingMinute(startMinute, calendar);
  const dayStart = Math.floor(start / MINUTES_PER_DAY) * MINUTES_PER_DAY;
  const available = dayStart + calendar.workEndMinute - start;
  if (durationMinutes <= available) return start + durationMinutes;
  const remaining = durationMinutes - available;
  const shiftLength = calendar.workEndMinute - calendar.workStartMinute;
  const fullDaysBeforeLast = Math.ceil(remaining / shiftLength) - 1;
  const result = dayStart + MINUTES_PER_DAY * (fullDaysBeforeLast + 1)
    + calendar.workStartMinute + remaining - fullDaysBeforeLast * shiftLength;
  if (!Number.isFinite(result)) throw new Error('Hesaplanan bitiş zamanı sonlu olmalıdır.');
  return result;
}

/**
 * [startMinute, endMinute) aralığının toplam mesai dakikası.
 * @param {number} startMinute
 * @param {number} endMinute
 * @param {import('../domain/types.js').Calendar} calendar
 */
export function workingMinutesBetween(startMinute, endMinute, calendar) {
  assertCalendar(calendar);
  assertMinute(startMinute);
  assertMinute(endMinute);
  if (endMinute < startMinute) throw new Error('Bitiş başlangıçtan önce olamaz.');
  const shiftLength = calendar.workEndMinute - calendar.workStartMinute;
  const cumulative = (minute) => Math.floor(minute / MINUTES_PER_DAY) * shiftLength
    + Math.min(shiftLength, Math.max(0, minute % MINUTES_PER_DAY - calendar.workStartMinute));
  return cumulative(endMinute) - cumulative(startMinute);
}
