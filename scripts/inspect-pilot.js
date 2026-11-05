import { createSimulation } from '../src/app/create-simulation.js';
import { pilotProject } from '../src/data/pilot-project.js';

const simulation = createSimulation(pilotProject);
const schedule = simulation.getSchedule();
function time(minute) {
  const day = Math.floor(minute / 1440) + 1;
  const inDay = minute % 1440;
  return `${day}. gün ${String(Math.floor(inDay / 60)).padStart(2, '0')}:${String(inDay % 60).padStart(2, '0')}`;
}

console.log('Mimari örneği — süreler varsayımdır; bu komut 3D ekran açmaz.');
console.table(schedule.tasks.map((task) => ({
  iş: task.id, başlangıç: time(task.startMinute), bitiş: time(task.endMinute),
})));
for (const minute of [480, 505, 540, 565, 605, 505]) {
  const snapshot = simulation.seek(minute);
  console.log(time(minute), JSON.stringify({
    işler: snapshot.tasks.map((task) => `${task.id}:${task.status}`),
    nesneler: snapshot.objects.map((object) => `${object.id}:${object.state}`),
  }));
}
