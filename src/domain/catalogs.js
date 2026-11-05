/**
 * Meslek, ekipman ve hareket ayrı kayıtlar: aynı taşıma hareketini tüm ekipler kullanır.
 * planned = veri taslağı; ortada hazır bir 3D ekipman veya animasyon olduğu anlamına gelmez.
 */
export const trades = Object.freeze([
  { id: 'helper', label: 'Yardımcı usta', tools: ['carry-box'] },
  { id: 'painter', label: 'Boyacı', tools: ['roller', 'paint-tray'] },
  { id: 'electrician', label: 'Elektrik ustası', tools: ['cable-reel', 'pliers', 'drill'] },
  { id: 'mechanical', label: 'Mekanik tesisat ustası', tools: ['pipe', 'wrench', 'drill'] },
  { id: 'tiler', label: 'Seramik ustası', tools: ['tile', 'trowel'] },
  { id: 'carpenter', label: 'Mobilya ustası', tools: ['panel', 'drill'] },
  { id: 'drywall', label: 'Alçıpan ustası', tools: ['panel', 'drill', 'trowel'] },
  { id: 'demolition', label: 'Kırım ve söküm ustası', tools: ['demolition-hammer'] },
]);

export const actions = Object.freeze([
  { id: 'idle', label: 'Bekleme', readiness: 'prototype' },
  { id: 'walk', label: 'Yürüme', readiness: 'prototype' },
  { id: 'carry', label: 'Malzeme taşıma', readiness: 'planned' },
  { id: 'place', label: 'Parça yerleştirme', readiness: 'planned' },
  { id: 'fasten', label: 'Bağlantı sıkma', readiness: 'planned' },
  { id: 'inspect', label: 'Kontrol etme', readiness: 'planned' },
  { id: 'climb', label: 'İskeleye çıkma / inme', readiness: 'planned' },
  { id: 'work-overhead', label: 'Baş üstünde çalışma', readiness: 'planned' },
  { id: 'connect-pipe', label: 'Boru bağlantısı', readiness: 'planned' },
  { id: 'pull-cable', label: 'Kablo çekme', readiness: 'planned' },
  { id: 'paint-roll', label: 'Rulo ile boyama', readiness: 'planned' },
  { id: 'lay-tile', label: 'Seramik döşeme', readiness: 'planned' },
  { id: 'remove', label: 'Sökme', readiness: 'planned' },
  { id: 'wait', label: 'Kuruma / bekleme süresi', readiness: 'planned' },
]);

export const appearances = Object.freeze([
  {
    id: 'stocky-worker-v3',
    label: 'Onaylı bodur usta — düzeltilmiş baş ve baret',
    readiness: 'prototype',
    // NOT: Henüz bütün mesleklerde değişebilen kıyafet/alet sistemi yok.
    variantSupport: 'single-approved-appearance',
  },
]);
