import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { pilotLayout } from '../src/data/pilot-layout.js';
import { pilotProject } from '../src/data/pilot-project.js';
import { createScaffoldView } from '../src/presentation/three/scaffold-view.js';
import { createRoomView } from '../src/presentation/three/room-view.js';
import { createWorkerView } from '../src/presentation/three/worker-view.js';

// DOM/WebGL gerektirmeyen sahne sözleşmeleri. Görsel kalite testi değildir.
const THREE = {};
vm.runInNewContext(
  readFileSync(new URL('../output/worker-3d-v1/three-0.160.1.min.js', import.meta.url), 'utf8'),
  { exports: THREE, module: { exports: THREE }, console },
);

function visibleBounds(root) {
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  root.traverseVisible((object) => {
    if (!object.isMesh) return;
    object.geometry.computeBoundingBox();
    bounds.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));
  });
  return bounds;
}

function visibleMeshState(root) {
  root.updateMatrixWorld(true);
  const result = [];
  root.traverseVisible((object) => {
    if (object.isMesh) result.push({ name: object.name, matrix: Array.from(object.matrixWorld.elements) });
  });
  return result;
}

test('iskele aşamaları geri alınınca aynı görünür parçalara ve sınırlara döner', () => {
  const view = createScaffoldView(THREE);
  try {
    const ready = visibleMeshState(view.root);
    const readyBounds = visibleBounds(view.root);
    view.setStage('packed');
    assert.notDeepEqual(visibleMeshState(view.root), ready);
    assert.ok(visibleBounds(view.root).max.y < readyBounds.max.y);
    view.setStage('ready');
    assert.deepEqual(visibleMeshState(view.root), ready);
    assert.ok(visibleBounds(view.root).equals(readyBounds));
    assert.throws(() => view.setStage('missing-stage'), /Bilinmeyen iskele aşaması/);
    assert.deepEqual(visibleMeshState(view.root), ready);
  } finally {
    view.dispose();
  }
});

test('yerleşmiş iskele zemine oturur ve usta platform üzerinde mekân yüksekliğine sığar', () => {
  const scaffold = createScaffoldView(THREE, pilotLayout.scaffold);
  const worker = createWorkerView(THREE, pilotProject.workers[0]);
  try {
    const localBounds = visibleBounds(scaffold.root);
    assert.ok(Math.abs(localBounds.min.y) < 0.001, 'İskele tekerleri yerel zemine oturmalı.');
    const { x, y, z } = pilotLayout.scaffold.position;
    scaffold.root.position.set(x, y, z);
    const worldBounds = visibleBounds(scaffold.root);
    const { width, depth, wallHeight } = pilotLayout.room;
    assert.ok(worldBounds.min.x > -width / 2 && worldBounds.max.x < width / 2);
    assert.ok(worldBounds.min.z > -depth / 2 && worldBounds.max.z < depth / 2);
    assert.ok(worldBounds.max.y < wallHeight);
    for (const value of [...worldBounds.min.toArray(), ...worldBounds.max.toArray()]) assert.ok(Number.isFinite(value));

    worker.applyMotion({
      position: { x, y: scaffold.dimensions.deckHeight, z },
      yawRadians: 0, distanceMeters: 0, speedMetersPerSecond: 0, presentationSeconds: 0,
    });
    const personBounds = visibleBounds(worker.root);
    assert.ok(Math.abs(personBounds.min.y - scaffold.dimensions.deckHeight) < 0.01);
    assert.ok(personBounds.max.y < wallHeight, 'Platformdaki usta tavan yüksekliğini aşmamalı.');
  } finally {
    scaffold.dispose();
    worker.dispose();
  }
});

test('kamera yönü duvar kesitini değiştirir; giriş açık kalır ve kaynaklar temizlenir', () => {
  const view = createRoomView(THREE, pilotLayout);
  const scene = new THREE.Scene();
  scene.add(view.root);
  view.setCutaway(Math.PI / 4);
  const original = visibleMeshState(view.root);
  view.setCutaway(Math.PI * 5 / 4);
  assert.notDeepEqual(visibleMeshState(view.root), original);
  view.setCutaway(Math.PI / 4);
  assert.deepEqual(visibleMeshState(view.root), original);

  // Kapı boşluğunun içinde eşik üstünden açıklık tepesine kadar duvar bulunmaz.
  const { centerX, width, height } = pilotLayout.entrance;
  const z = pilotLayout.room.depth / 2;
  const opening = new THREE.Box3(
    new THREE.Vector3(centerX - width / 2 + 0.01, 0.03, z - 0.05),
    new THREE.Vector3(centerX + width / 2 - 0.01, height - 0.01, z + 0.05),
  );
  view.root.updateMatrixWorld(true);
  view.root.getObjectByName('Giriş duvarı').traverse((object) => {
    if (!object.isMesh) return;
    object.geometry.computeBoundingBox();
    const bounds = object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld);
    assert.equal(bounds.intersectsBox(opening), false, `${object.name} kapı açıklığını kapatıyor.`);
  });

  let firstGeometry;
  view.root.traverse((object) => { if (object.geometry && !firstGeometry) firstGeometry = object.geometry; });
  let released = false;
  firstGeometry.addEventListener('dispose', () => { released = true; });
  view.dispose();
  assert.equal(released, true);
  assert.equal(scene.children.length, 0);
});
