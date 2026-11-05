import { scaffoldAssemblySteps, scaffoldRemovalSteps, scaffoldStates } from '../domain/workflows/scaffold.js';
import { referenceAreas } from './reference-program.js';

/**
 * Tek alan / iki usta / bir iskele ile mimariyi sınayan ÖRNEK veri.
 * Referans sitedeki 52 işin aktarımı değildir. Süreler ve ekip atamaları varsayımdır.
 * BİRLİKTE-03: Gerçek proje aktarıldığında bu örneği ayrı tutup yeni veri oluşturacağız.
 * @type {import('../domain/types.js').Project}
 */
export const pilotProject = {
  id: 'arabica-architecture-pilot',
  name: 'M2 — İskele ve tavan tesisatı mimari örneği',
  calendar: { workStartMinute: 8 * 60, workEndMinute: 20 * 60 },
  // Alan adları referans programla aynıdır (src/data/reference-program.js).
  areas: referenceAreas.map(({ id, name }) => ({ id, label: name })),
  workers: [
    { id: 'usta-01', name: 'Mekanik ustası', tradeId: 'mechanical', homeAreaId: 'M1', appearanceId: 'stocky-worker-v3' },
    { id: 'usta-02', name: 'Yardımcı usta', tradeId: 'helper', homeAreaId: 'M1', appearanceId: 'stocky-worker-v3' },
  ],
  objects: [
    { id: 'iskele-01', kind: 'scaffold', areaId: 'M2', initialState: 'packed', states: [...scaffoldStates] },
    { id: 'boru-grubu-01', kind: 'pipe-run', areaId: 'M2', initialState: 'uninstalled', states: ['uninstalled', 'positioned', 'connected', 'checked'] },
  ],
  tasks: [
    {
      id: 'iskele-kur', label: 'İskele kurulumu', areaId: 'M2',
      workerIds: ['usta-01', 'usta-02'], resourceIds: ['iskele-01'],
      dependsOn: [], clock: 'working', steps: scaffoldAssemblySteps('iskele-01'),
    },
    {
      id: 'tavan-tesisati', label: 'Tavan tesisatı örneği', areaId: 'M2',
      workerIds: ['usta-01', 'usta-02'], resourceIds: ['iskele-01', 'boru-grubu-01'],
      dependsOn: ['iskele-kur'], clock: 'working',
      steps: [
        { id: 'climb', label: 'Çalışma platformuna çık', actionId: 'climb', durationMinutes: 5 },
        { id: 'position-pipe', label: 'Boru grubunu yerleştir', actionId: 'work-overhead', durationMinutes: 15, effects: [{ objectId: 'boru-grubu-01', state: 'positioned' }] },
        { id: 'connect', label: 'Bağlantıları tamamla', actionId: 'connect-pipe', durationMinutes: 15, effects: [{ objectId: 'boru-grubu-01', state: 'connected' }] },
        { id: 'check', label: 'Bağlantıları kontrol et', actionId: 'inspect', durationMinutes: 5, effects: [{ objectId: 'boru-grubu-01', state: 'checked' }] },
        { id: 'descend', label: 'Platformdan in', actionId: 'climb', durationMinutes: 5 },
      ],
    },
    {
      id: 'iskele-sok', label: 'İskele sökümü', areaId: 'M2',
      workerIds: ['usta-01', 'usta-02'], resourceIds: ['iskele-01'],
      dependsOn: ['tavan-tesisati'], clock: 'working', steps: scaffoldRemovalSteps('iskele-01'),
    },
  ],
};
