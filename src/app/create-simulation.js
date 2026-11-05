import { compileSchedule } from '../simulation/compile-schedule.js';
import { evaluateSnapshot } from '../simulation/evaluate-snapshot.js';

/**
 * Uygulamanın tek giriş noktası. Kamera veya render döngüsü burada bulunmaz.
 * Arayüz seek() çağırır, renderer dönen snapshot'ı okur.
 * Veri değişikliklerinde rebuild() kullanılır; başarısız değişiklik eski projeyi bozmaz.
 * @param {import('../domain/types.js').Project} initialProject
 */
export function createSimulation(initialProject) {
  let project = structuredClone(initialProject);
  let schedule = compileSchedule(project);
  let timelineMinute = schedule.startMinute;

  return {
    getProject: () => structuredClone(project),
    getSchedule: () => structuredClone(schedule),
    getSnapshot: () => evaluateSnapshot(project, schedule, timelineMinute),
    /** @param {number} minute */
    seek(minute) {
      const snapshot = evaluateSnapshot(project, schedule, minute);
      timelineMinute = minute;
      return snapshot;
    },
    /** @param {import('../domain/types.js').Project} nextProject */
    rebuild(nextProject) {
      const candidate = structuredClone(nextProject);
      const nextSchedule = compileSchedule(candidate);
      const snapshot = evaluateSnapshot(candidate, nextSchedule, timelineMinute);
      project = candidate;
      schedule = nextSchedule;
      return snapshot;
    },
  };
}
