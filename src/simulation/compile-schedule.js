import { addWorkingMinutes, assertCalendar, nextWorkingMinute } from './calendar.js';

function requireString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} boş olmayan metin olmalıdır.`);
}

function requireArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} bir dizi olmalıdır.`);
}

function uniqueStrings(values, label) {
  requireArray(values, label);
  const ids = new Set();
  for (const id of values) {
    requireString(id, label);
    if (ids.has(id)) throw new Error(`${label}: yinelenen kimlik "${id}".`);
    ids.add(id);
  }
  return ids;
}

function indexEntities(entities, label) {
  requireArray(entities, label);
  const index = new Map();
  for (const entity of entities) {
    if (!entity || typeof entity !== 'object') throw new Error(`${label}: kayıt nesne olmalıdır.`);
    requireString(entity.id, `${label}.id`);
    if (index.has(entity.id)) throw new Error(`${label}: yinelenen kimlik "${entity.id}".`);
    index.set(entity.id, entity);
  }
  return index;
}

function requireReference(index, id, label) {
  requireString(id, label);
  if (!index.has(id)) throw new Error(`${label}: bilinmeyen kimlik "${id}".`);
}

/** Render/animasyon kataloglarına bağlı olmadan iş verisini doğrular. */
function validateProject(project) {
  if (!project || typeof project !== 'object') throw new Error('Proje bir nesne olmalıdır.');
  requireString(project.id, 'Proje kimliği');
  requireString(project.name, 'Proje adı');
  assertCalendar(project.calendar);
  const areas = indexEntities(project.areas, 'Alanlar');
  const workers = indexEntities(project.workers, 'Ustalar');
  const objects = indexEntities(project.objects, 'Nesneler');
  const tasks = indexEntities(project.tasks, 'İşler');
  for (const area of project.areas) requireString(area.label, `Alan ${area.id} etiketi`);
  for (const worker of project.workers) {
    for (const field of ['name', 'tradeId', 'appearanceId']) {
      requireString(worker[field], `Usta ${worker.id}.${field}`);
    }
    requireReference(areas, worker.homeAreaId, `Usta ${worker.id} başlangıç alanı`);
  }
  for (const object of project.objects) {
    requireString(object.kind, `Nesne ${object.id} türü`);
    requireReference(areas, object.areaId, `Nesne ${object.id} alanı`);
    const states = uniqueStrings(object.states, `Nesne ${object.id} durumları`);
    if (!states.has(object.initialState)) throw new Error(`Nesne ${object.id}: geçersiz başlangıç durumu.`);
  }
  for (const task of project.tasks) {
    requireString(task.label, `İş ${task.id} etiketi`);
    requireReference(areas, task.areaId, `İş ${task.id} alanı`);
    for (const id of uniqueStrings(task.workerIds, `İş ${task.id} ustaları`)) {
      requireReference(workers, id, `İş ${task.id} ustası`);
    }
    const resourceIds = uniqueStrings(task.resourceIds, `İş ${task.id} kaynakları`);
    for (const id of resourceIds) requireReference(objects, id, `İş ${task.id} kaynağı`);
    for (const id of uniqueStrings(task.dependsOn, `İş ${task.id} bağımlılıkları`)) {
      requireReference(tasks, id, `İş ${task.id} bağımlılığı`);
    }
    if (task.clock !== 'working' && task.clock !== 'elapsed') {
      throw new Error(`İş ${task.id}: clock "working" veya "elapsed" olmalıdır.`);
    }
    if (task.clock === 'elapsed' && task.workerIds.length > 0) {
      throw new Error(`İş ${task.id}: elapsed bekleme işine usta atanamaz.`);
    }
    if (task.earliestStartMinute !== undefined
      && (!Number.isFinite(task.earliestStartMinute) || task.earliestStartMinute < 0)) {
      throw new Error(`İş ${task.id}: en erken başlangıç sıfır veya daha büyük sonlu bir sayı olmalıdır.`);
    }
    const steps = indexEntities(task.steps, `İş ${task.id} adımları`);
    if (steps.size === 0) throw new Error(`İş ${task.id}: en az bir adım gereklidir.`);
    for (const step of task.steps) {
      requireString(step.label, `Adım ${task.id}/${step.id} etiketi`);
      requireString(step.actionId, `Adım ${task.id}/${step.id} hareketi`);
      if (!Number.isFinite(step.durationMinutes) || step.durationMinutes <= 0) {
        throw new Error(`Adım ${task.id}/${step.id}: süre pozitif ve sonlu olmalıdır.`);
      }
      if (step.effects !== undefined) {
        requireArray(step.effects, `Adım ${task.id}/${step.id} etkileri`);
        const affectedObjects = new Set();
        for (const effect of step.effects) {
          if (!effect || typeof effect !== 'object') throw new Error(`Adım ${step.id}: etki nesne olmalıdır.`);
          requireReference(objects, effect.objectId, `Adım ${task.id}/${step.id} etkisi`);
          if (!resourceIds.has(effect.objectId)) {
            throw new Error(`İş ${task.id}: etkilenen "${effect.objectId}" nesnesi resourceIds içinde olmalıdır.`);
          }
          if (affectedObjects.has(effect.objectId)) throw new Error(`Adım ${step.id}: aynı nesneye yinelenen etki.`);
          affectedObjects.add(effect.objectId);
          if (!objects.get(effect.objectId).states.includes(effect.state)) {
            throw new Error(`Adım ${task.id}/${step.id}: "${effect.objectId}" için geçersiz durum "${effect.state}".`);
          }
        }
      }
    }
  }
  return tasks;
}

/**
 * Bağımlılıklar ve vardiya penceresinden deterministik bir program üretir.
 * Kaynak/usta çakışmasını reddeder; işi kendiliğinden başka zamana taşımaz.
 * Kaynaklar görev başlangıcından bitişine kadar, gece dahil rezerve edilir.
 * TODO: Teslimat, alan kapasitesi ve ayrı erişim koşullarını bu sözleşmeye ekle.
 * @param {import('../domain/types.js').Project} project
 * @returns {import('../domain/types.js').Schedule}
 */
export function compileSchedule(project) {
  const tasksById = validateProject(project);
  const inputOrder = new Map(project.tasks.map((task, index) => [task.id, index]));
  const remainingDependencies = new Map(project.tasks.map((task) => [task.id, task.dependsOn.length]));
  const dependents = new Map(project.tasks.map((task) => [task.id, []]));
  for (const task of project.tasks) {
    for (const dependency of task.dependsOn) dependents.get(dependency).push(task.id);
  }
  const ready = project.tasks.filter((task) => task.dependsOn.length === 0).map((task) => task.id);
  const compiled = new Map();
  while (ready.length > 0) {
    const task = tasksById.get(ready.shift());
    let cursor = Math.max(task.earliestStartMinute ?? project.calendar.workStartMinute,
      ...task.dependsOn.map((id) => compiled.get(id).endMinute));
    if (task.clock === 'working') cursor = nextWorkingMinute(cursor, project.calendar);
    const startMinute = cursor;
    const steps = task.steps.map((step) => {
      if (task.clock === 'working') cursor = nextWorkingMinute(cursor, project.calendar);
      const stepStart = cursor;
      cursor = task.clock === 'working'
        ? addWorkingMinutes(cursor, step.durationMinutes, project.calendar)
        : cursor + step.durationMinutes;
      if (!Number.isFinite(cursor) || cursor <= stepStart) {
        throw new Error(`İş ${task.id}: hesaplanan adım süresi sayı sınırlarını aşıyor.`);
      }
      return { id: step.id, startMinute: stepStart, endMinute: cursor };
    });
    compiled.set(task.id, { id: task.id, startMinute, endMinute: cursor, steps });
    for (const dependentId of dependents.get(task.id)) {
      const count = remainingDependencies.get(dependentId) - 1;
      remainingDependencies.set(dependentId, count);
      if (count === 0) ready.push(dependentId);
    }
    ready.sort((a, b) => inputOrder.get(a) - inputOrder.get(b));
  }
  if (compiled.size !== project.tasks.length) {
    const blocked = project.tasks.filter((task) => !compiled.has(task.id)).map((task) => task.id);
    throw new Error(`İş bağımlılıklarında döngü var; planlanamayan işler: ${blocked.join(', ')}.`);
  }

  const tasks = project.tasks.map((task) => compiled.get(task.id));
  for (let i = 0; i < tasks.length; i += 1) {
    for (let j = i + 1; j < tasks.length; j += 1) {
      const left = tasks[i];
      const right = tasks[j];
      if (left.startMinute >= right.endMinute || right.startMinute >= left.endMinute) continue;
      const leftSource = tasksById.get(left.id);
      const rightSource = tasksById.get(right.id);
      const worker = leftSource.workerIds.find((id) => rightSource.workerIds.includes(id));
      if (worker) throw new Error(`Usta çakışması: "${worker}", "${left.id}" ve "${right.id}" işlerine aynı anda atanmış.`);
      const resource = leftSource.resourceIds.find((id) => rightSource.resourceIds.includes(id));
      if (resource) throw new Error(`Kaynak çakışması: "${resource}", "${left.id}" ve "${right.id}" işlerinde aynı anda kullanılıyor.`);
    }
  }
  return {
    tasks,
    startMinute: tasks.length ? Math.min(...tasks.map((task) => task.startMinute)) : project.calendar.workStartMinute,
    endMinute: tasks.length ? Math.max(...tasks.map((task) => task.endMinute)) : project.calendar.workStartMinute,
  };
}
