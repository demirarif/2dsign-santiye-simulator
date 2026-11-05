import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation } from '../src/app/create-simulation.js';
import { pilotProject } from '../src/data/pilot-project.js';
import { trades, actions, appearances } from '../src/domain/catalogs.js';

test('pilot verisi kayıtlı meslek, hareket ve görünümlere bağlanır', () => {
  for (const worker of pilotProject.workers) {
    assert.ok(trades.some((trade) => trade.id === worker.tradeId));
    assert.ok(appearances.some((appearance) => appearance.id === worker.appearanceId));
  }
  for (const task of pilotProject.tasks) {
    for (const step of task.steps) assert.ok(actions.some((action) => action.id === step.actionId));
  }
});

test('pilot ileri ve geri sarılır; tesisat tamamlanması önceki iskeleyi bozmaz', () => {
  const app = createSimulation(pilotProject);
  const before = app.seek(505);
  const finished = app.seek(605);
  assert.equal(finished.objects.find((object) => object.id === 'boru-grubu-01').state, 'checked');
  assert.equal(finished.objects.find((object) => object.id === 'iskele-01').state, 'packed');
  assert.ok(finished.tasks.every((task) => task.status === 'complete'));
  assert.deepEqual(app.seek(505), before);
});

test('hatalı program değişikliği mevcut uygulama durumunu bozmaz', () => {
  const app = createSimulation(pilotProject);
  app.seek(550);
  const before = app.getSnapshot();
  const invalid = app.getProject();
  invalid.tasks[0].dependsOn = ['iskele-sok'];
  assert.throws(() => app.rebuild(invalid));
  assert.deepEqual(app.getSnapshot(), before);
});

test('dışarı verilen veri içteki programı değiştiremez; gecikme yeniden hesaplanır', () => {
  const app = createSimulation(pilotProject);
  const detached = app.getSchedule();
  detached.tasks[0].endMinute = 1;
  assert.equal(app.getSchedule().tasks[0].endMinute, 540);
  const updated = app.getProject();
  updated.tasks[0].earliestStartMinute = 600;
  app.rebuild(updated);
  assert.equal(app.getSchedule().endMinute, 725);
});
