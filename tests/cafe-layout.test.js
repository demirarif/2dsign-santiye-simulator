import test from 'node:test';
import assert from 'node:assert/strict';
import { cafeLayout, planLength, planToWorld } from '../src/data/cafe-layout.js';
import { referenceAreas } from '../src/data/reference-program.js';

// Paftadan aktarılan koordinatların iç tutarlılığı. Paftaya benzerlik ekran görüntüsüyle,
// gerçek ölçü ise AutoCAD dosyasıyla doğrulanacak; bu testler aktarım hatalarını yakalar.

const area = (points) => Math.abs(points.reduce((sum, [x1, y1], index) => {
  const [x2, y2] = points[(index + 1) % points.length];
  return sum + x1 * y2 - x2 * y1;
}, 0)) / 2 * planLength(1) ** 2;

function inside([x, y], polygon) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) result = !result;
  }
  return result;
}

const onFloor = (point) => inside(point, cafeLayout.outline) || inside(point, cafeLayout.terrace);

test('M1–M9 alanlarının hepsi referans programdaki kimliklerle bir kez tanımlanır', () => {
  assert.deepEqual(cafeLayout.zones.map((zone) => zone.id), referenceAreas.map((zoneArea) => zoneArea.id));
  for (const zone of cafeLayout.zones) {
    assert.ok(zone.polygon.length >= 4, `${zone.id} en az dört köşeli olmalı.`);
    zone.polygon.forEach(([x1, y1], index) => {
      const [x2, y2] = zone.polygon[(index + 1) % zone.polygon.length];
      assert.ok(x1 === x2 || y1 === y2, `${zone.id}: paftadaki alanlar dik açılı; ${index}. kenar eğik.`);
    });
    assert.ok(inside(zone.label, zone.polygon), `${zone.id} etiketi kendi alanında olmalı.`);
  }
});

test('ölçek çapası: M2 alanı paftadaki 108 m² tavan notuyla uyuşur', () => {
  const m2 = area(cafeLayout.zones.find((zone) => zone.id === 'M2').polygon);
  assert.ok(Math.abs(m2 - 108) / 108 < 0.02, `M2 ≈ ${m2.toFixed(1)} m²`);
  const outline = area(cafeLayout.outline);
  assert.ok(outline > 380 && outline < 460, `İç mekân ${outline.toFixed(0)} m² beklenen aralıkta değil.`);
});

test('alanlar üst üste binmez; iç alanlar binada, M8 terastadır', () => {
  for (let x = 40; x <= 610; x += 2) {
    for (let y = 40; y <= 615; y += 2) {
      const point = [x + 0.5, y + 0.5];
      const owners = cafeLayout.zones.filter((zone) => inside(point, zone.polygon));
      assert.ok(owners.length <= 1, `${point} noktası ${owners.map((zone) => zone.id).join(', ')} alanlarında.`);
      if (owners.length === 1) {
        const shell = owners[0].id === 'M8' ? cafeLayout.terrace : cafeLayout.outline;
        assert.ok(inside(point, shell), `${owners[0].id} alanı ${point} noktasında zeminin dışına taşıyor.`);
      }
    }
  }
});

test('dış duvarlar bina çevresini eksiksiz ve sırasıyla kapatır; açıklıklar duvar içindedir', () => {
  const exterior = cafeLayout.walls.filter((wall) => wall.exterior);
  const corners = [exterior[0].from, ...exterior.map((wall) => wall.to)];
  assert.deepEqual(corners.at(-1), corners[0], 'Dış duvar zinciri kapanmalı.');
  // Aynı doğrultudaki ardışık parçaları birleştirince çevre köşeleri elde edilmeli.
  const merged = corners.slice(0, -1).filter((point, index, all) => {
    const previous = all[(index - 1 + all.length) % all.length];
    const next = all[(index + 1) % all.length];
    return (previous[0] - point[0]) * (next[1] - point[1]) !== (previous[1] - point[1]) * (next[0] - point[0]);
  });
  assert.deepEqual(merged, cafeLayout.outline);
  for (const wall of cafeLayout.walls) {
    const length = Math.hypot(wall.to[0] - wall.from[0], wall.to[1] - wall.from[1]);
    for (const opening of wall.openings ?? []) {
      assert.ok(opening.start > 0 && opening.end < length && opening.start < opening.end, `${wall.id} açıklığı duvar dışında.`);
      assert.ok(opening.height > 1.9 && opening.height < cafeLayout.wallHeight, `${wall.id} kapı yüksekliği geçersiz.`);
    }
  }
});

test('referans mobilyanın her parçası zeminde durur', () => {
  const { tables, chairs, sofas, lowTables, counters, equipment, planters, columns, ringTables } = cafeLayout.furniture;
  const points = [
    ...[...tables, ...chairs, ...sofas, ...lowTables, ...equipment, ...planters, ...columns, ...ringTables].map((item) => item.at),
    ...counters.flatMap((counter) => [counter.from, counter.to]),
  ];
  for (const point of points) assert.ok(onFloor(point), `${point} zeminin dışında.`);
  for (const chair of chairs) assert.ok(chair.facing || chair.facingToward, 'Sandalye yönü tanımlı olmalı.');
});

test('M2 iskelesi ve ölçek ustası M2 içinde, mobilyaya çarpmadan durur', () => {
  const m2 = cafeLayout.zones.find((zone) => zone.id === 'M2').polygon;
  const { at, width, depth } = cafeLayout.scaffold;
  const halfX = width / 2 / planLength(1);
  const halfY = depth / 2 / planLength(1);
  const footprint = [[at[0] - halfX, at[1] - halfY], [at[0] + halfX, at[1] - halfY], [at[0] + halfX, at[1] + halfY], [at[0] - halfX, at[1] + halfY]];
  for (const corner of footprint) assert.ok(inside(corner, m2), `İskele köşesi ${corner} M2 dışında.`);
  assert.ok(inside(cafeLayout.worker.at, m2), 'Usta M2 içinde olmalı.');
  const clearance = 0.25 / planLength(1);
  const { tables, chairs, sofas, ringTables, columns } = cafeLayout.furniture;
  for (const item of [...tables, ...chairs, ...sofas, ...columns]) {
    const [x, y] = item.at;
    const [w, d] = item.size ?? [8, 8];
    const separated = x + w / 2 + clearance < at[0] - halfX || x - w / 2 - clearance > at[0] + halfX
      || y + d / 2 + clearance < at[1] - halfY || y - d / 2 - clearance > at[1] + halfY;
    assert.ok(separated, `İskele ${item.at} konumundaki mobilyaya çok yakın.`);
  }
  for (const ring of ringTables) {
    const nearestX = Math.max(at[0] - halfX, Math.min(ring.at[0], at[0] + halfX));
    const nearestY = Math.max(at[1] - halfY, Math.min(ring.at[1], at[1] + halfY));
    assert.ok(Math.hypot(nearestX - ring.at[0], nearestY - ring.at[1]) > ring.outer + 8 + clearance, 'İskele halka masanın sandalyelerine çok yakın.');
  }
});

test('pafta pikseli metreye tutarlı çevrilir', () => {
  const origin = planToWorld([310, 330]);
  assert.deepEqual([origin.x, origin.z], [0, 0]);
  const oneMeterEast = planToWorld([310 + 1 / planLength(1), 330]);
  assert.ok(Math.abs(oneMeterEast.x - 1) < 1e-9 && oneMeterEast.z === 0);
});
