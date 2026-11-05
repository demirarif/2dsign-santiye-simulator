import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addWorkingMinutes, isWorkingMinute, nextWorkingMinute, workingMinutesBetween,
} from '../src/simulation/calendar.js';
import { compileSchedule } from '../src/simulation/compile-schedule.js';
import { evaluateSnapshot } from '../src/simulation/evaluate-snapshot.js';

const calendar = { workStartMinute: 480, workEndMinute: 1200 };

/** Test verisi gerçek kafe ölçüsü, süre veya personel kararı değildir. */
function fixture() {
  return {
    id: 'test-project', name: 'Test şantiyesi', calendar: { ...calendar },
    areas: [{ id: 'store', label: 'Malzeme' }, { id: 'work', label: 'Çalışma alanı' }],
    workers: [
      { id: 'w1', name: 'Bir', tradeId: 'helper', homeAreaId: 'store', appearanceId: 'stocky' },
      { id: 'w2', name: 'İki', tradeId: 'mechanical', homeAreaId: 'store', appearanceId: 'stocky' },
    ],
    objects: [
      { id: 'scaffold', kind: 'scaffold', areaId: 'work', initialState: 'parts', states: ['parts', 'frame', 'ready', 'removed'] },
      { id: 'pipe', kind: 'pipe', areaId: 'work', initialState: 'absent', states: ['absent', 'installed'] },
    ],
    tasks: [
      {
        id: 'assemble', label: 'İskele kur', areaId: 'work', workerIds: ['w1', 'w2'],
        resourceIds: ['scaffold'], dependsOn: [], clock: 'working',
        steps: [
          { id: 'frame', label: 'Çerçeve', actionId: 'carry', durationMinutes: 20, effects: [{ objectId: 'scaffold', state: 'frame' }] },
          { id: 'platform', label: 'Platform', actionId: 'fasten', durationMinutes: 40, effects: [{ objectId: 'scaffold', state: 'ready' }] },
        ],
      },
      {
        id: 'install', label: 'Boru tak', areaId: 'work', workerIds: ['w2'],
        resourceIds: ['scaffold', 'pipe'], dependsOn: ['assemble'], clock: 'working',
        steps: [{ id: 'pipe', label: 'Bağlantı', actionId: 'fasten-overhead', durationMinutes: 60, effects: [{ objectId: 'pipe', state: 'installed' }] }],
      },
      {
        id: 'remove', label: 'İskele sök', areaId: 'work', workerIds: ['w1'],
        resourceIds: ['scaffold'], dependsOn: ['install'], clock: 'working',
        steps: [{ id: 'remove', label: 'Sök', actionId: 'carry', durationMinutes: 20, effects: [{ objectId: 'scaffold', state: 'removed' }] }],
      },
    ],
  };
}

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

test('mesai sınırı ve çok günlü süre hesabı geceyi atlar', () => {
  assert.equal(isWorkingMinute(480, calendar), true);
  assert.equal(isWorkingMinute(1200, calendar), false);
  assert.equal(nextWorkingMinute(0, calendar), 480);
  assert.equal(nextWorkingMinute(1200, calendar), 1920);
  assert.equal(addWorkingMinutes(480, 720, calendar), 1200);
  assert.equal(addWorkingMinutes(480, 1440, calendar), 2640);
  assert.equal(addWorkingMinutes(1190, 20, calendar), 1930);
  assert.equal(addWorkingMinutes(1200, 0, calendar), 1200);
  assert.equal(workingMinutesBetween(1190, 1930, calendar), 20);
  assert.equal(workingMinutesBetween(0, 2880, calendar), 1440);
  assert.equal(workingMinutesBetween(1200, 1920, calendar), 0);
});

test('bağımlılık sırası girdi sırasından bağımsızdır ve gecikme sonraki işlere taşınır', () => {
  const project = fixture();
  project.tasks[0].earliestStartMinute = 960;
  project.tasks.reverse();
  const schedule = compileSchedule(project);
  const times = Object.fromEntries(schedule.tasks.map((task) => [task.id, [task.startMinute, task.endMinute]]));
  assert.deepEqual(times, { remove: [1080, 1100], install: [1020, 1080], assemble: [960, 1020] });
  assert.equal(schedule.startMinute, 960);
  assert.equal(schedule.endMinute, 1100);
  assert.equal(evaluateSnapshot(project, schedule, 1100).objects[0].state, 'removed');
});

test('vardiya sonuna denk gelen adım biter; takip eden adım ertesi sabah başlar', () => {
  const project = fixture();
  project.tasks = [project.tasks[0]];
  project.tasks[0].earliestStartMinute = 1140;
  project.tasks[0].steps[0].durationMinutes = 60;
  project.tasks[0].steps[1].durationMinutes = 60;
  const schedule = compileSchedule(project);
  assert.deepEqual(schedule.tasks[0].steps, [
    { id: 'frame', startMinute: 1140, endMinute: 1200 },
    { id: 'platform', startMinute: 1920, endMinute: 1980 },
  ]);
  const overnight = evaluateSnapshot(project, schedule, 1500);
  assert.deepEqual(overnight.tasks[0], { id: 'assemble', status: 'paused', progress: 0.5 });
  assert.deepEqual(overnight.workers[0], { id: 'w1', status: 'waiting', areaId: 'work', taskId: 'assemble' });
  assert.equal(overnight.objects[0].state, 'frame');
  const resumed = evaluateSnapshot(project, schedule, 1950);
  assert.equal(resumed.tasks[0].status, 'active');
  assert.equal(resumed.tasks[0].progress, 0.75);
  assert.equal(resumed.workers[0].actionId, 'fasten');
  assert.equal(resumed.workers[0].actionProgress, 0.5);
});

test('tek uzun çalışma adımı gecede durur ve ertesi gün ilerlemeyi korur', () => {
  const project = fixture();
  project.tasks = [project.tasks[0]];
  project.tasks[0].earliestStartMinute = 1170;
  project.tasks[0].steps = [{ id: 'long', label: 'Uzun iş', actionId: 'fasten', durationMinutes: 90 }];
  const schedule = compileSchedule(project);
  assert.equal(schedule.endMinute, 1980);
  assert.equal(evaluateSnapshot(project, schedule, 1500).tasks[0].progress, 1 / 3);
  assert.equal(evaluateSnapshot(project, schedule, 1950).workers[0].actionProgress, 2 / 3);
});

test('takvim süresiyle bekleme gece ilerler ve sonraki çalışma mesaiye oturur', () => {
  const project = fixture();
  project.tasks[0].earliestStartMinute = 1140;
  const wait = {
    id: 'wait', label: 'Bekleme', areaId: 'work', workerIds: [], resourceIds: ['scaffold'],
    dependsOn: ['assemble'], clock: 'elapsed',
    steps: [{ id: 'wait', label: 'Bekle', actionId: 'wait', durationMinutes: 720 }],
  };
  project.tasks.splice(1, 0, wait);
  project.tasks[2].dependsOn = ['wait'];
  const schedule = compileSchedule(project);
  assert.deepEqual(schedule.tasks[1], { id: 'wait', startMinute: 1200, endMinute: 1920, steps: [{ id: 'wait', startMinute: 1200, endMinute: 1920 }] });
  assert.equal(schedule.tasks[2].startMinute, 1920);
  const snapshot = evaluateSnapshot(project, schedule, 1560);
  assert.deepEqual(snapshot.tasks[1], { id: 'wait', status: 'active', progress: 0.5, activeStepId: 'wait' });
  assert.ok(snapshot.workers.every((worker) => worker.status === 'idle'));
});

test('geri sarma başlangıç durumunu geri getirir ve aynı zamana dönüş aynıdır', () => {
  const project = deepFreeze(fixture());
  const schedule = deepFreeze(compileSchedule(project));
  const expected = evaluateSnapshot(project, schedule, 520);
  assert.equal(expected.objects[0].state, 'frame');
  assert.equal(expected.workers[0].actionProgress, 0.5);
  const complete = evaluateSnapshot(project, schedule, 1000);
  assert.equal(complete.objects[0].state, 'removed');
  assert.equal(complete.objects[1].state, 'installed');
  assert.ok(complete.tasks.every((task) => task.status === 'complete' && task.progress === 1));
  assert.ok(complete.workers.every((worker) => worker.status === 'idle' && worker.areaId === 'store'));
  const before = evaluateSnapshot(project, schedule, 0);
  assert.equal(before.objects[0].state, 'parts');
  assert.equal(before.objects[1].state, 'absent');
  assert.ok(before.tasks.every((task) => task.status === 'pending' && task.progress === 0));
  assert.deepEqual(evaluateSnapshot(project, schedule, 520), expected);
});

test('adım bitişinde etki uygulanır ve aynı dakikada sonraki adım seçilir', () => {
  const project = fixture();
  const schedule = compileSchedule(project);
  assert.equal(evaluateSnapshot(project, schedule, 499).objects[0].state, 'parts');
  const boundary = evaluateSnapshot(project, schedule, 500);
  assert.equal(boundary.objects[0].state, 'frame');
  assert.equal(boundary.tasks[0].activeStepId, 'platform');
  assert.equal(boundary.workers[0].actionProgress, 0);
  const taskBoundary = evaluateSnapshot(project, schedule, 540);
  assert.equal(taskBoundary.tasks[0].status, 'complete');
  assert.equal(taskBoundary.tasks[1].status, 'active');
  assert.equal(taskBoundary.workers[0].status, 'idle');
  assert.equal(taskBoundary.workers[1].taskId, 'install');
});

test('aynı ustanın çakışan işleri sessizce ötelenmez', () => {
  const project = fixture();
  project.tasks[1].dependsOn = [];
  project.tasks[1].resourceIds = ['pipe'];
  assert.throws(() => compileSchedule(project), /Usta çakışması.*w2.*assemble.*install/);
});

test('farklı ustaların aynı kaynağı eşzamanlı kullanması reddedilir', () => {
  const project = fixture();
  project.tasks[0].workerIds = ['w1'];
  project.tasks[1].dependsOn = [];
  assert.throws(() => compileSchedule(project), /Kaynak çakışması.*scaffold.*assemble.*install/);
});

test('kaynak uzun görev boyunca gece de rezerve kalır', () => {
  const project = fixture();
  project.tasks = [project.tasks[0]];
  project.tasks[0].earliestStartMinute = 1140;
  project.tasks[0].steps[1].durationMinutes = 100;
  project.tasks.push({
    id: 'night', label: 'Gece kaynak kullanımı', areaId: 'work', workerIds: [], resourceIds: ['scaffold'],
    dependsOn: [], earliestStartMinute: 1300, clock: 'elapsed',
    steps: [{ id: 'night', label: 'Bekleme', actionId: 'wait', durationMinutes: 30 }],
  });
  assert.throws(() => compileSchedule(project), /Kaynak çakışması/);
});

test('bağımlılık döngüsü anlaşılır hatayla reddedilir', () => {
  const project = fixture();
  project.tasks[0].dependsOn = ['remove'];
  assert.throws(() => compileSchedule(project), /döngü.*assemble.*install.*remove/);
});

const invalidCases = [
  ['yinelenen iş kimliği', (p) => { p.tasks.push(structuredClone(p.tasks[0])); }, /yinelenen kimlik/],
  ['yinelenen usta ataması', (p) => { p.tasks[0].workerIds.push('w1'); }, /yinelenen kimlik/],
  ['bilinmeyen usta', (p) => { p.tasks[0].workerIds = ['missing']; }, /bilinmeyen kimlik/],
  ['bilinmeyen kaynak', (p) => { p.tasks[0].resourceIds = ['missing']; }, /bilinmeyen kimlik/],
  ['bilinmeyen alan', (p) => { p.tasks[0].areaId = 'missing'; }, /bilinmeyen kimlik/],
  ['bilinmeyen bağımlılık', (p) => { p.tasks[0].dependsOn = ['missing']; }, /bilinmeyen kimlik/],
  ['geçersiz nesne durumu', (p) => { p.tasks[0].steps[0].effects[0].state = 'flying'; }, /geçersiz durum/],
  ['rezervasyonsuz nesne etkisi', (p) => { p.tasks[0].resourceIds = []; }, /resourceIds içinde/],
  ['geçersiz başlangıç durumu', (p) => { p.objects[0].initialState = 'missing'; }, /başlangıç durumu/],
  ['boş adım listesi', (p) => { p.tasks[0].steps = []; }, /en az bir adım/],
  ['sıfır süre', (p) => { p.tasks[0].steps[0].durationMinutes = 0; }, /pozitif ve sonlu/],
  ['negatif süre', (p) => { p.tasks[0].steps[0].durationMinutes = -1; }, /pozitif ve sonlu/],
  ['sonsuz süre', (p) => { p.tasks[0].steps[0].durationMinutes = Infinity; }, /pozitif ve sonlu/],
  ['NaN süre', (p) => { p.tasks[0].steps[0].durationMinutes = NaN; }, /pozitif ve sonlu/],
  ['geçersiz takvim', (p) => { p.calendar.workEndMinute = 400; }, /Takvim penceresi/],
  ['gün dışı takvim', (p) => { p.calendar.workEndMinute = 1500; }, /Takvim penceresi/],
  ['NaN takvim', (p) => { p.calendar.workStartMinute = NaN; }, /Takvim penceresi/],
  ['negatif başlangıç', (p) => { p.tasks[0].earliestStartMinute = -1; }, /en erken başlangıç/],
  ['geçersiz saat türü', (p) => { p.tasks[0].clock = 'frames'; }, /clock/],
  ['bekleme işine usta atama', (p) => { p.tasks[0].clock = 'elapsed'; }, /usta atanamaz/],
];

for (const [label, mutate, pattern] of invalidCases) {
  test(`geçersiz veri: ${label}`, () => {
    const project = fixture();
    mutate(project);
    assert.throws(() => compileSchedule(project), pattern);
  });
}

test('boş iş programı geçerli bir başlangıç iskeletidir', () => {
  const project = fixture();
  project.tasks = [];
  const schedule = compileSchedule(project);
  assert.deepEqual(schedule, { tasks: [], startMinute: 480, endMinute: 480 });
  assert.deepEqual(evaluateSnapshot(project, schedule, 500).tasks, []);
});

test('negatif zaman ve başka projeye ait iş programı reddedilir', () => {
  const project = fixture();
  const schedule = compileSchedule(project);
  for (const time of [-1, Infinity, NaN]) {
    assert.throws(() => evaluateSnapshot(project, schedule, time), /sonlu bir dakika/);
  }
  project.tasks[0].id = 'changed';
  assert.throws(() => evaluateSnapshot(project, schedule, 500), /eşleşmiyor/);
});
