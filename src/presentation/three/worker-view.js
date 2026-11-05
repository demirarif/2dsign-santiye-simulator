import { createMaketWorker } from './legacy/create-stocky-worker.js';
import { createWorkerAnimator } from './legacy/create-worker-animator.js';

/**
 * Onaylı modeli, simülasyondan bağımsız bir görünüm olarak sarar.
 * THREE parametresi ilk prototipteki 0.160.1 API'sini bekler. Paket/bundler seçimi
 * 3D ekranı kuracağımız adımda yapılacak; takvim çekirdeği bundan etkilenmez.
 * @param {any} THREE Three.js namespace; kütüphane bağımlılığı bu sınırda tutulur.
 * @param {import('../../domain/types.js').Worker} definition
 */
export function createWorkerView(THREE, definition) {
  if (definition.appearanceId !== 'stocky-worker-v3') {
    throw new Error(`Usta görünümü hazır değil: ${definition.appearanceId}`);
  }
  const built = createMaketWorker(THREE);
  const animator = createWorkerAnimator(THREE, built);
  const root = new THREE.Group();
  root.name = `Worker:${definition.id}`;
  root.userData.selection = { kind: 'worker', id: definition.id };
  root.add(built.worker);

  return {
    root,
    // Anatomik sağ/sol, model +Z'ye bakarken tanımlıdır.
    equipmentSlots: {
      rightHand: built.worker.getObjectByName('El-1'),
      leftHand: built.worker.getObjectByName('El1'),
    },
    capabilities: Object.freeze(['idle', 'walk']),
    /** @param {import('../contracts.js').MotionFrame} frame */
    applyMotion(frame) {
      root.position.set(frame.position.x, frame.position.y, frame.position.z);
      root.rotation.y = frame.yawRadians;
      const phase = ((frame.distanceMeters / animator.cycleDistance) % 1 + 1) % 1;
      animator.pose(phase, frame.speedMetersPerSecond, frame.presentationSeconds);
    },
    dispose() {
      const geometries = new Set();
      const materials = new Set();
      root.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) {
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
        }
      });
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      root.removeFromParent();
    },
  };
}

/** Raycast'in vurduğu el/baret gibi alt nesneden seçilebilir üst kayda çık. */
export function selectionFromObject(object) {
  for (let current = object; current; current = current.parent) {
    if (current.userData?.selection) return { ...current.userData.selection };
  }
  return null;
}
