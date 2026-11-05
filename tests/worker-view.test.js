import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createWorkerView, selectionFromObject } from '../src/presentation/three/worker-view.js';
import { pilotProject } from '../src/data/pilot-project.js';

// Yerel, önceden kullanılan Three.js UMD dosyası. WebGL/DOM açılmaz; yalnızca
// model ağacı ve dönüşümleri kontrol edilir. Görsel kalite testi değildir.
const THREE = {};
const library = readFileSync(new URL('../output/worker-3d-v1/three-0.160.1.min.js', import.meta.url), 'utf8');
vm.runInNewContext(library, { exports: THREE, module: { exports: THREE }, console });

test('onaylı model, hareket ve tıklama sınırına bağlanır; sahneden temizlenir', () => {
  const view = createWorkerView(THREE, pilotProject.workers[0]);
  const scene = new THREE.Scene();
  scene.add(view.root);
  assert.ok(view.equipmentSlots.rightHand);
  assert.ok(view.equipmentSlots.leftHand);
  assert.deepEqual(selectionFromObject(view.equipmentSlots.rightHand), { kind: 'worker', id: 'usta-01' });

  const original = { position: { x: 2, y: 0, z: 3 }, yawRadians: 0.5, distanceMeters: 0, speedMetersPerSecond: 0, presentationSeconds: 0 };
  view.applyMotion(original);
  view.root.updateMatrixWorld(true);
  const head = view.root.getObjectByName('Bas');
  const initialHead = head.getWorldPosition(new THREE.Vector3()).clone();
  view.applyMotion({ ...original, distanceMeters: 1, speedMetersPerSecond: 0.5, presentationSeconds: 2 });
  view.applyMotion(original);
  view.root.updateMatrixWorld(true);
  assert.ok(head.getWorldPosition(new THREE.Vector3()).distanceTo(initialHead) < 1e-10);
  // Three.js ayrı VM bağlamında yüklendiğinden diziyi mevcut bağlama al.
  assert.deepEqual(Array.from(view.root.position.toArray()), [2, 0, 3]);

  let mesh;
  view.root.traverse((object) => { if (object.isMesh && !mesh) mesh = object; });
  let disposed = false;
  mesh.geometry.addEventListener('dispose', () => { disposed = true; });
  view.dispose();
  assert.equal(disposed, true);
  assert.equal(scene.children.length, 0);
});
