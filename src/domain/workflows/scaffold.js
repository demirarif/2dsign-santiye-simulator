/**
 * İskele hareket dizisi taslağı. Bunlar gerçek saha süreleri veya kurulum talimatı
 * değildir; takvim ve sahne durumunu bağlamak için kullanılan örnek adımlardır.
 * BİRLİKTE-01: İskele tipi, parça sayısı, ölçüsü ve kurulum pozları belirlenecek.
 * BİRLİKTE-02: İki ustanın ayrı rolleri ve eşzamanlı el hareketleri hazırlanacak.
 */
export const scaffoldStates = Object.freeze([
  'packed', 'staged', 'base-set', 'frames-set', 'braced', 'platform-set', 'ready',
]);

/** @param {string} objectId @returns {import('../types.js').TaskStep[]} */
export function scaffoldAssemblySteps(objectId) {
  return [
    { id: 'carry-parts', label: 'Parçaları çalışma alanına taşı', actionId: 'carry', durationMinutes: 10, effects: [{ objectId, state: 'staged' }] },
    { id: 'place-base', label: 'Ayakları yerleştir', actionId: 'place', durationMinutes: 10, effects: [{ objectId, state: 'base-set' }] },
    { id: 'place-frames', label: 'Çerçeveleri yerleştir', actionId: 'place', durationMinutes: 15, effects: [{ objectId, state: 'frames-set' }] },
    { id: 'fasten-braces', label: 'Çaprazları bağla', actionId: 'fasten', durationMinutes: 10, effects: [{ objectId, state: 'braced' }] },
    { id: 'place-platform', label: 'Platformu yerleştir', actionId: 'place', durationMinutes: 10, effects: [{ objectId, state: 'platform-set' }] },
    { id: 'check-ready', label: 'Kullanıma hazır durumunu kontrol et', actionId: 'inspect', durationMinutes: 5, effects: [{ objectId, state: 'ready' }] },
  ];
}

/** @param {string} objectId @returns {import('../types.js').TaskStep[]} */
export function scaffoldRemovalSteps(objectId) {
  return [
    { id: 'remove-platform', label: 'Platformu sök', actionId: 'remove', durationMinutes: 5, effects: [{ objectId, state: 'braced' }] },
    { id: 'remove-braces', label: 'Çaprazları sök', actionId: 'remove', durationMinutes: 5, effects: [{ objectId, state: 'frames-set' }] },
    { id: 'remove-frames', label: 'Çerçeveleri sök', actionId: 'remove', durationMinutes: 5, effects: [{ objectId, state: 'base-set' }] },
    { id: 'pack-base', label: 'Ayakları topla ve parçaları kaldır', actionId: 'carry', durationMinutes: 5, effects: [{ objectId, state: 'packed' }] },
  ];
}
