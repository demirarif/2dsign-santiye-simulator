import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatWorkHour, referenceAreas, referenceSettings, referenceTasks, scheduleReferenceProgram,
} from '../src/data/reference-program.js';

// Referans sitedeki programın aktarımını doğrular: iş sayısı, bağımlılıklar ve sitenin
// zamanlama kuralıyla çıkan saatler. Beklenen değerler sitenin hesabından elle türetildi.

test('referans programın 52 işi eksiksiz ve tutarlı aktarılmıştır', () => {
  assert.equal(referenceTasks.length, 52);
  const ids = new Set();
  const areaIds = new Set(referenceAreas.map((area) => area.id));
  for (const task of referenceTasks) {
    assert.ok(!ids.has(task.id), `Yinelenen iş: ${task.id}`);
    for (const dependency of task.dependsOn) assert.ok(ids.has(dependency), `${task.id}: "${dependency}" önce tanımlanmalı.`);
    ids.add(task.id);
    assert.ok(areaIds.has(task.areaId), `${task.id}: bilinmeyen alan ${task.areaId}`);
    assert.ok(task.day >= 1 && task.day <= referenceSettings.targetDays && task.hour >= 8 && task.hour < 20);
    assert.ok(task.durationHours > 0 && task.people > 0 && task.team && task.label);
    if (task.kind === 'move') {
      for (const place of [task.from, task.to]) assert.ok(place === 'OUT' || areaIds.has(place), `${task.id}: taşıma ucu ${place}`);
    } else {
      assert.equal(task.kind, 'work');
    }
  }
  const perArea = Object.fromEntries(referenceAreas.map((area) => [area.id, referenceTasks.filter((task) => task.areaId === area.id).length]));
  assert.deepEqual(perArea, { M1: 4, M2: 10, M3: 7, M4: 8, M5: 5, M6: 5, M7: 4, M8: 5, M9: 4 });
});

test('sitenin zamanlama kuralı: bağımlılık, kür ve alçı beklemesi; beş günlük hedef korunur', () => {
  const schedule = new Map(scheduleReferenceProgram().map((entry) => [entry.id, entry]));
  const hours = (id) => [schedule.get(id).startHour, schedule.get(id).endHour];
  assert.deepEqual(hours('tilein'), [15, 16]);
  assert.deepEqual(hours('tiles'), [16, 32]);
  assert.deepEqual(hours('grout'), [32, 35]);
  // Derz 3. gün 19:00'da biter; 12 saat kür 4. gün 07:00'ye, ilk mesai 08:00'e denk gelir.
  assert.deepEqual(hours('m2finish'), [36, 42]);
  // Alçı 2. gün 12:00'de biter; 12 saat bekleme gece yarısı biter, dekor 3. gün 08:00'de başlar.
  assert.deepEqual(hours('M5decor'), [24, 30]);
  assert.deepEqual(hours('counter'), [26, 40]);
  assert.deepEqual(hours('handover'), [55, 58]);
  const end = Math.max(...[...schedule.values()].map((entry) => entry.endHour));
  assert.ok(end <= referenceSettings.targetDays * referenceSettings.workdayHours);
  assert.equal(formatWorkHour(end, { end: true }), '5. gün 18:00');
});

test('kür süresi uzayınca bağlı işler kayar; ayar verisi değişmez', () => {
  const slower = scheduleReferenceProgram(referenceTasks, { ...referenceSettings, cureHours: 30 });
  const finish = slower.find((entry) => entry.id === 'm2finish');
  assert.ok(finish.startHour > 36, 'Uzun kür başlangıcı ertelemeli.');
  assert.equal(referenceSettings.cureHours, 12);
});

test('çalışma saati gün ve saat olarak yazılır', () => {
  assert.equal(formatWorkHour(0), '1. gün 08:00');
  assert.equal(formatWorkHour(12), '2. gün 08:00');
  assert.equal(formatWorkHour(12, { end: true }), '1. gün 20:00');
  assert.equal(formatWorkHour(15.5), '2. gün 11:30');
});
