import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { cafeLayout, planToWorld } from '../src/data/cafe-layout.js';
import { pilotProject } from '../src/data/pilot-project.js';
import { createCafeView } from '../src/presentation/three/cafe-view.js';
import { createScaffoldView } from '../src/presentation/three/scaffold-view.js';
import { createWorkerView, selectionFromObject } from '../src/presentation/three/worker-view.js';

// DOM/WebGL gerektirmeyen sahne sözleşmeleri. Görsel kalite testi değildir; görünüm
// ekran görüntüsüyle ayrıca incelenir.
const THREE = {};
vm.runInNewContext(
  readFileSync(new URL('../output/worker-3d-v1/three-0.160.1.min.js', import.meta.url), 'utf8'),
  { exports: THREE, module: { exports: THREE }, console },
);

function visibleBounds(root) {
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  root.traverseVisible((object) => {
    if (!object.isMesh || object.isInstancedMesh) return;
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

function wallMeshes(view) {
  const meshes = [];
  view.root.traverse((object) => {
    if (object.isMesh && object.parent && /^Duvar(Üstü)?/.test(object.parent.name)) meshes.push(object);
  });
  return meshes;
}

function openingBox(wall, opening, height) {
  const a = planToWorld(wall.from);
  const b = planToWorld(wall.to);
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  const along = (distance) => ({ x: a.x + ((b.x - a.x) * distance) / length, z: a.z + ((b.z - a.z) * distance) / length });
  const meters = 0.057;
  const start = along(opening.start * meters + 0.02);
  const end = along(opening.end * meters - 0.02);
  const pad = 0.3;
  return new THREE.Box3(
    new THREE.Vector3(Math.min(start.x, end.x) - (a.x === b.x ? pad : 0), 0.05, Math.min(start.z, end.z) - (a.z === b.z ? pad : 0)),
    new THREE.Vector3(Math.max(start.x, end.x) + (a.x === b.x ? pad : 0), height - 0.01, Math.max(start.z, end.z) + (a.z === b.z ? pad : 0)),
  );
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

test('M2 iskelesi zemine oturur, M2 içinde kalır; platformdaki usta tavana sığar', () => {
  const scaffold = createScaffoldView(THREE, cafeLayout.scaffold);
  const worker = createWorkerView(THREE, pilotProject.workers[0]);
  try {
    assert.ok(Math.abs(visibleBounds(scaffold.root).min.y) < 0.001, 'İskele tekerleri zemine oturmalı.');
    const at = planToWorld(cafeLayout.scaffold.at);
    scaffold.root.position.set(at.x, 0, at.z);
    const bounds = visibleBounds(scaffold.root);
    // M2'nin L biçiminin iskelenin durduğu dikdörtgen kısmı: pafta x 184–373, y 190–344.
    const corner = planToWorld([184, 190]);
    const opposite = planToWorld([373, 344]);
    assert.ok(bounds.min.x > corner.x && bounds.max.x < opposite.x, 'İskele M2 genişliğinde kalmalı.');
    assert.ok(bounds.min.z > corner.z && bounds.max.z < opposite.z, 'İskele M2 derinliğinde kalmalı.');
    assert.ok(bounds.max.y < cafeLayout.wallHeight);
    worker.applyMotion({
      position: { x: at.x, y: scaffold.dimensions.deckHeight, z: at.z },
      yawRadians: 0, distanceMeters: 0, speedMetersPerSecond: 0, presentationSeconds: 0,
    });
    const person = visibleBounds(worker.root);
    assert.ok(Math.abs(person.min.y - scaffold.dimensions.deckHeight) < 0.01);
    assert.ok(person.max.y < cafeLayout.wallHeight, 'Platformdaki usta tavan yüksekliğini aşmamalı.');
  } finally {
    scaffold.dispose();
    worker.dispose();
  }
});

test('kafe görünümü dokuz seçilebilir alan ve ölçekten alan hesabı üretir', () => {
  const view = createCafeView(THREE, cafeLayout);
  try {
    assert.equal(view.zones.size, 9);
    assert.equal(view.pickables.length, 9);
    for (const [id, zone] of view.zones) {
      assert.deepEqual(selectionFromObject(zone.plate), { kind: 'area', id });
      assert.equal(zone.labels, null, 'DOM yokken etiket üretilmez.');
    }
    assert.ok(Math.abs(view.zones.get('M2').areaSquareMeters - 108) < 2);
    assert.ok(view.floorAreas.interior > 380 && view.floorAreas.interior < 460);
    assert.ok(view.floorAreas.terrace > 200 && view.floorAreas.terrace < 280);
    const span = view.bounds.maxX - view.bounds.minX;
    assert.ok(span > 28 && span < 33, `Kafe genişliği ${span.toFixed(1)} m beklenen aralıkta değil.`);
  } finally {
    view.dispose();
  }
});

test('kamera yönü dış duvar kesitini değiştirir ve geri döner; iç bölmeler alçak kalır', () => {
  const view = createCafeView(THREE, cafeLayout);
  try {
    view.setCutaway(Math.PI / 4);
    const southEast = visibleMeshState(view.root);
    view.setCutaway(Math.PI * 5 / 4);
    assert.notDeepEqual(visibleMeshState(view.root), southEast);
    view.setCutaway(Math.PI / 4);
    assert.deepEqual(visibleMeshState(view.root), southEast);
    const upper = (id) => view.root.getObjectByName(`Duvar:${id}`).getObjectByName('DuvarÜstü');
    // Güneydoğudan bakınca güney/doğu cepheler kesilir, kuzey camekân ve batı kepenk görünür.
    assert.equal(upper('guney-m4').visible, false);
    assert.equal(upper('dogu-m1').visible, false);
    assert.equal(upper('kuzey-cam-2').visible, true);
    assert.equal(upper('bati-kepenk').visible, true);
    for (const id of ['m3-kuzey', 'm3-bati', 'm9-kuzey', 'bar-dogu']) {
      const bounds = visibleBounds(view.root.getObjectByName(`Duvar:${id}`));
      assert.ok(bounds.max.y <= cafeLayout.interiorWallHeight + 1e-6, `${id} iç bölmesi alçak olmalı.`);
    }
  } finally {
    view.dispose();
  }
});

test('ana giriş ve kapı açıklıkları boştur; kaynaklar temizlenir', () => {
  const view = createCafeView(THREE, cafeLayout);
  const scene = new THREE.Scene();
  scene.add(view.root);
  view.setCutaway(Math.PI * 5 / 4);
  view.root.updateMatrixWorld(true);
  const entrance = cafeLayout.walls.find((wall) => wall.id === 'ana-giris');
  const length = Math.hypot(entrance.to[0] - entrance.from[0], entrance.to[1] - entrance.from[1]);
  const checks = [
    { wall: entrance, box: openingBox(entrance, { start: 0, end: length }, entrance.headHeight) },
    ...cafeLayout.walls.flatMap((wall) => (wall.openings ?? []).map((opening) => ({ wall, box: openingBox(wall, opening, opening.height) }))),
  ];
  const meshes = wallMeshes(view);
  for (const { wall, box } of checks) {
    for (const mesh of meshes) {
      mesh.geometry.computeBoundingBox();
      const bounds = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
      assert.equal(bounds.intersectsBox(box), false, `${wall.id}: "${mesh.name}" açıklığı kapatıyor.`);
    }
  }
  let released = false;
  meshes[0].geometry.addEventListener('dispose', () => { released = true; });
  view.dispose();
  assert.equal(released, true);
  assert.equal(scene.children.length, 0);
});

test('alan seçimi yalnız seçili alanı vurgular; renkler geri alınabilir; bilinmeyen alan reddedilir', () => {
  const view = createCafeView(THREE, cafeLayout);
  try {
    const colors = () => [...view.zones.values()].map((zone) => zone.plate.material.color.getHex());
    const original = colors();
    view.setSelectedZone('M2');
    for (const [id, zone] of view.zones) assert.equal(zone.outline.visible, id === 'M2');
    view.setSelectedZone(null);
    assert.deepEqual(colors(), original);
    for (const zone of view.zones.values()) assert.equal(zone.outline.visible, false);
    view.setTint(false);
    assert.equal(new Set(colors()).size, 1, 'Renk kapalıyken bütün alanlar aynı nötr tonda olmalı.');
    view.setTint(true);
    assert.deepEqual(colors(), original);
    assert.throws(() => view.setSelectedZone('M10'), /Bilinmeyen alan/);
  } finally {
    view.dispose();
  }
});
