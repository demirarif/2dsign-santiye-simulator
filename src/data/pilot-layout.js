/**
 * ADIM 1 — Tek alanın görsel yerleşimi.
 * Bütün ölçüler METRE ve geçici varsayımdır; gönderilen planın ölçülü kopyası değil.
 * Dünya koordinatı: Y yukarı, +Z giriş tarafı. Alan kimlikleri proje verisiyle aynı.
 * BİRLİKTE-04: Ölçülü plan geldiğinde önce bu veri değişecek, model kodu değil.
 */
export const pilotLayout = {
  id: 'm2-blockout-v1',
  areaId: 'M2',
  label: 'Ana salon · çalışma alanı',
  measurementStatus: 'assumed',
  room: { width: 8.4, depth: 6.6, wallHeight: 3.3, wallThickness: 0.16, cutawayHeight: 0.28 },
  entrance: { wall: 'south', centerX: 2.15, width: 1.7, height: 2.45 },
  storage: { id: 'material-staging', position: { x: -2.75, y: 0, z: 1.6 }, width: 1.7, depth: 1.8 },
  scaffold: {
    id: 'iskele-01', position: { x: 0.25, y: 0, z: -0.75 },
    width: 2.2, depth: 1.35, deckHeight: 1.22,
  },
  workPoint: { id: 'overhead-work', position: { x: 0.25, y: 3.05, z: -0.75 } },
  worker: { id: 'usta-01', position: { x: 2.15, y: 0, z: 0.75 }, yawRadians: 0.35 },
  camera: { yaw: Math.PI / 4, pitch: Math.PI / 4, zoom: 1, target: { x: 0, y: 0.85, z: 0 } },
};
