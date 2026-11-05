import { isWorkingMinute, workingMinutesBetween } from './calendar.js';

const clamp01 = (value) => Math.min(1, Math.max(0, value));

/**
 * Sahnenin seçilen andaki iş/usta/nesne durumunu sıfırdan hesaplar.
 * Girdi: aynı Project için compileSchedule ile üretilmiş Schedule.
 * Rastgelelik, önceki kare, Date.now veya 3D nesne referansı kullanmaz.
 * actionProgress iş adımı ilerlemesidir; görsel hareket döngüsünün fazı değildir.
 * TODO: Rota/hareket planı eklendiğinde usta konumu da mutlak zamandan türetilmeli.
 * @param {import('../domain/types.js').Project} project
 * @param {import('../domain/types.js').Schedule} schedule
 * @param {number} timelineMinute
 * @returns {import('../domain/types.js').Snapshot}
 */
export function evaluateSnapshot(project, schedule, timelineMinute) {
  if (!Number.isFinite(timelineMinute) || timelineMinute < 0) {
    throw new Error('Zaman, sıfır veya daha büyük sonlu bir dakika olmalıdır.');
  }
  const scheduleById = new Map(schedule.tasks.map((task) => [task.id, task]));
  if (scheduleById.size !== project.tasks.length || schedule.tasks.length !== project.tasks.length) {
    throw new Error('Program ile proje iş listesi eşleşmiyor; programı yeniden derleyin.');
  }
  const workers = project.workers.map((worker) => ({ id: worker.id, status: 'idle', areaId: worker.homeAreaId }));
  const workersById = new Map(workers.map((worker) => [worker.id, worker]));
  const objects = project.objects.map((object) => ({ id: object.id, areaId: object.areaId, state: object.initialState }));
  const objectsById = new Map(objects.map((object) => [object.id, object]));
  const completedEffects = [];

  const tasks = project.tasks.map((task, taskIndex) => {
    const entry = scheduleById.get(task.id);
    if (!entry || entry.steps.length !== task.steps.length
      || entry.steps.some((step, i) => step.id !== task.steps[i].id)) {
      throw new Error(`İş ${task.id}: program proje ile eşleşmiyor; programı yeniden derleyin.`);
    }
    const duration = task.steps.reduce((total, step) => total + step.durationMinutes, 0);
    const elapsedAt = (start, end) => task.clock === 'working'
      ? workingMinutesBetween(start, end, project.calendar) : end - start;
    let status = 'pending';
    let progress = 0;
    if (timelineMinute >= entry.endMinute) {
      status = 'complete';
      progress = 1;
    } else if (timelineMinute >= entry.startMinute) {
      status = task.clock === 'working' && !isWorkingMinute(timelineMinute, project.calendar) ? 'paused' : 'active';
      progress = clamp01(elapsedAt(entry.startMinute, timelineMinute) / duration);
    }
    const result = { id: task.id, status, progress };
    const activeStepIndex = status === 'active'
      ? entry.steps.findIndex((step) => timelineMinute >= step.startMinute && timelineMinute < step.endMinute)
      : -1;
    if (activeStepIndex >= 0) result.activeStepId = task.steps[activeStepIndex].id;

    if (status === 'active' || status === 'paused') {
      for (const workerId of task.workerIds) {
        const worker = workersById.get(workerId);
        worker.status = status === 'paused' ? 'waiting' : 'working';
        worker.taskId = task.id;
        worker.areaId = task.areaId;
        if (activeStepIndex >= 0) {
          const step = task.steps[activeStepIndex];
          worker.actionId = step.actionId;
          worker.actionProgress = clamp01(elapsedAt(entry.steps[activeStepIndex].startMinute, timelineMinute) / step.durationMinutes);
        }
      }
    }
    task.steps.forEach((step, stepIndex) => {
      if (entry.steps[stepIndex].endMinute <= timelineMinute) {
        for (const effect of step.effects ?? []) {
          completedEffects.push({ ...effect, endMinute: entry.steps[stepIndex].endMinute, taskIndex, stepIndex });
        }
      }
    });
    return result;
  });
  completedEffects.sort((a, b) => a.endMinute - b.endMinute || a.taskIndex - b.taskIndex || a.stepIndex - b.stepIndex);
  for (const effect of completedEffects) objectsById.get(effect.objectId).state = effect.state;
  return { timelineMinute, tasks, workers, objects };
}
