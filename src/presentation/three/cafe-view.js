import { planLength, planToWorld } from '../../data/cafe-layout.js';

/**
 * Kafenin tamamını yerleşim verisinden kurar: döşeme, teras, M1–M9 alanları, duvarlar,
 * camekân, kepenk ve referans mobilya. Kameraya bakan dış duvarların üst kısmı gizlenir;
 * iç bölmeler alçak kesit yüksekliğindedir. Rota/navigasyon içermez.
 *
 * Mobilyalar paftadaki referans yerleşimdir; tamamlanmış imalat anlamına gelmez. Tekrar
 * eden parçalar (sandalye, masa) InstancedMesh ile çizilir.
 *
 * @param {any} THREE
 * @param {typeof import('../../data/cafe-layout.js').cafeLayout} layout
 * @param {{ createLabel?: (zoneId: string, options: { detailed: boolean }) => any }} [options]
 * Etiket üretici; DOM yoksa verilmez. Her alan için kısa (yalnız kod) ve ayrıntılı (kod + ad)
 * iki etiket istenir: genel bakışta kısa, seçili alanda ayrıntılı etiket görünür.
 */
export function createCafeView(THREE, layout, { createLabel } = {}) {
  const root = new THREE.Group();
  root.name = `Kafe:${layout.id}`;
  root.userData = { kind: 'cafe', units: 'meters', measurementStatus: layout.measurementStatus };
  const { wallHeight, wallThickness: thickness, cutawayHeight, interiorWallHeight } = layout;

  const standard = (color, roughness = 0.92, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
  const materials = {
    slab: standard(0x8e9c8e, 0.94),
    floor: standard(0xd1d0c3, 0.96),
    terrace: standard(0xcbbd9f, 0.95),
    terraceEdge: standard(0xa99b7e, 0.95),
    wall: standard(0xe3dfd1, 0.94),
    wallEdge: standard(0xc2c8b8, 0.85),
    glass: new THREE.MeshStandardMaterial({ color: 0xbfd9e2, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.26, depthWrite: false }),
    frame: standard(0x4b524e, 0.5, { metalness: 0.4 }),
    fascia: standard(0xa9825a, 0.8),
    housing: standard(0x5c635f, 0.55, { metalness: 0.35 }),
    furniture: standard(0xf0ece2, 0.9),
    chair: standard(0xe2dccd, 0.9),
    armchair: standard(0xe6d2ad, 0.9),
    wood: standard(0xc8ab7c, 0.86),
    sofa: standard(0xd5cbb8, 0.95),
    equipment: standard(0x9aa39f, 0.5, { metalness: 0.35 }),
    column: standard(0xd9d3c4, 0.9),
    pot: standard(0x7d6b58, 0.9),
    plant: standard(0x6f9a5e, 0.95),
    pergola: standard(0x5e5a50, 0.7),
  };
  const zoneMaterials = new Map();
  const ownedGeometries = new Set();
  const unitBox = own(new THREE.BoxGeometry(1, 1, 1));
  const unitCylinder = own(new THREE.CylinderGeometry(0.5, 0.5, 1, 20));

  function own(geometry) {
    ownedGeometries.add(geometry);
    return geometry;
  }
  function mesh(parent, name, geometry, material, { shadow = true } = {}) {
    const object = new THREE.Mesh(geometry, material);
    object.name = name;
    object.castShadow = shadow;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  /** Birim kutudan ölçekli kutu; konum kutunun merkezidir. */
  function box(parent, name, [sx, sy, sz], [x, y, z], material, options) {
    const object = mesh(parent, name, unitBox, material, options);
    object.scale.set(sx, sy, sz);
    object.position.set(x, y, z);
    return object;
  }
  /** Pafta çokgenini XZ düzlemine yatırılacak Shape'e çevirir (ShapeGeometry XY'de çizer). */
  function shapeOf(points) {
    const shape = new THREE.Shape();
    points.forEach((point, index) => {
      const { x, z } = planToWorld(point);
      if (index === 0) shape.moveTo(x, -z);
      else shape.lineTo(x, -z);
    });
    shape.closePath();
    return shape;
  }
  function flatGeometry(geometry, y) {
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, y, 0);
    return own(geometry);
  }
  function slab(name, points, depth, top, material) {
    const geometry = flatGeometry(new THREE.ExtrudeGeometry(shapeOf(points), { depth, bevelEnabled: false }), top - depth);
    return mesh(root, name, geometry, material, { shadow: false });
  }
  const squareMetersPerPixel = planLength(1) ** 2;
  function polygonArea(points) {
    let sum = 0;
    for (let i = 0; i < points.length; i += 1) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      sum += x1 * y2 - x2 * y1;
    }
    return (Math.abs(sum) / 2) * squareMetersPerPixel;
  }

  // --- Zemin ve teras ---
  slab('Iç mekân döşemesi', layout.outline, 0.24, 0, materials.slab);
  mesh(root, 'Ham zemin', flatGeometry(new THREE.ShapeGeometry(shapeOf(layout.outline)), 0.001), materials.floor, { shadow: false });
  slab('Teras', layout.terrace, 0.2, -0.03, materials.terrace);

  // --- M1–M9 alanları: seçilebilir zemin plakaları, çerçeve çizgisi ve etiket ---
  const zones = new Map();
  for (const zone of layout.zones) {
    const material = standard(zone.tint, 0.95, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    zoneMaterials.set(zone.id, material);
    const base = zone.id === 'M8' ? -0.028 : 0.003;
    const plate = mesh(root, `Alan:${zone.id}`, flatGeometry(new THREE.ShapeGeometry(shapeOf(zone.polygon)), base), material, { shadow: false });
    plate.userData.selection = { kind: 'area', id: zone.id };
    const outlinePoints = zone.polygon.map((point) => {
      const { x, z } = planToWorld(point);
      return new THREE.Vector3(x, base + 0.012, z);
    });
    const outlineMaterial = new THREE.LineBasicMaterial({ color: 0x2f4a3f, transparent: true, opacity: 0.9 });
    const outline = new THREE.LineLoop(own(new THREE.BufferGeometry().setFromPoints(outlinePoints)), outlineMaterial);
    outline.name = `AlanÇerçevesi:${zone.id}`;
    outline.visible = false;
    root.add(outline);
    const xs = outlinePoints.map((point) => point.x);
    const zs = outlinePoints.map((point) => point.z);
    const labelPoint = planToWorld(zone.label);
    let labels = null;
    if (createLabel) {
      labels = { compact: createLabel(zone.id, { detailed: false }), detailed: createLabel(zone.id, { detailed: true }) };
      for (const sprite of Object.values(labels)) {
        sprite.position.set(labelPoint.x, wallHeight * 0.78, labelPoint.z);
        root.add(sprite);
      }
    }
    zones.set(zone.id, {
      id: zone.id, plate, outline, labels, tint: zone.tint,
      center: labelPoint,
      bounds: { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) },
      areaSquareMeters: polygonArea(zone.polygon),
    });
  }

  // --- Duvarlar ---
  const cutawayWalls = [];
  for (const wall of layout.walls) {
    const a = planToWorld(wall.from);
    const b = planToWorld(wall.to);
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    const group = new THREE.Group();
    group.name = `Duvar:${wall.id}`;
    group.position.set((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
    group.rotation.y = -Math.atan2(dz, dx);
    root.add(group);
    const upper = new THREE.Group();
    upper.name = 'DuvarÜstü';
    group.add(upper);
    const extend = thickness / 2;
    const openings = (wall.openings ?? []).map((opening) => ({
      start: planLength(opening.start), end: planLength(opening.end), height: opening.height,
    })).sort((left, right) => left.start - right.start);
    const solidRuns = [];
    let cursor = -extend;
    for (const opening of openings) {
      if (opening.start > cursor) solidRuns.push([cursor, opening.start]);
      cursor = Math.max(cursor, opening.end);
    }
    if (cursor < length + extend) solidRuns.push([cursor, length + extend]);
    const local = (along) => along - length / 2;
    const span = ([from, to]) => ({ width: to - from, center: local((from + to) / 2) });

    if (wall.kind === 'solid' && !wall.exterior) {
      for (const run of solidRuns) {
        const { width, center } = span(run);
        box(group, 'İç bölme', [width, interiorWallHeight, thickness], [center, interiorWallHeight / 2, 0], materials.wallEdge);
      }
    } else if (wall.kind === 'solid') {
      for (const run of solidRuns) {
        const { width, center } = span(run);
        box(group, 'Kesit duvarı', [width, cutawayHeight, thickness], [center, cutawayHeight / 2, 0], materials.wallEdge);
        box(upper, 'Duvar', [width, wallHeight - cutawayHeight, thickness], [center, (wallHeight + cutawayHeight) / 2, 0], materials.wall);
        box(upper, 'Duvar bitişi', [width + 0.015, 0.035, thickness + 0.018], [center, wallHeight + 0.012, 0], materials.wallEdge);
      }
      for (const opening of openings) {
        const { width, center } = span([opening.start, opening.end]);
        box(upper, 'Kapı üstü', [width, wallHeight - opening.height, thickness], [center, (wallHeight + opening.height) / 2, 0], materials.wall);
        box(group, 'Eşik', [width, 0.012, thickness + 0.12], [center, 0.006, 0], materials.wallEdge, { shadow: false });
      }
    } else if (wall.kind === 'glass') {
      const glassTop = wallHeight - 0.42;
      box(group, 'Camekân alt kayıt', [length, 0.08, 0.09], [0, 0.04, 0], materials.frame);
      box(upper, 'Cam', [length, glassTop - 0.08, 0.025], [0, (glassTop + 0.08) / 2, 0], materials.glass, { shadow: false });
      box(upper, 'Camekân üst kayıt', [length, 0.06, 0.09], [0, glassTop, 0], materials.frame);
      box(upper, 'Cephe kaplaması', [length + extend * 2, wallHeight - glassTop, thickness], [0, (wallHeight + glassTop) / 2, 0], materials.wall);
      // Uç kayıtlar duvarın içinde kalır; komşu kapı boşluğuna taşmaz.
      const mullionWidth = 0.05;
      const usable = length - mullionWidth;
      const mullions = Math.max(1, Math.round(length / 1.4));
      for (let i = 0; i <= mullions; i += 1) {
        box(upper, 'Kayıt', [mullionWidth, glassTop - 0.08, 0.08], [-usable / 2 + (i * usable) / mullions, (glassTop + 0.08) / 2, 0], materials.frame);
      }
    } else if (wall.kind === 'doorway') {
      box(group, 'Giriş eşiği', [length, 0.012, 0.4], [0, 0.006, 0], materials.wallEdge, { shadow: false });
      box(upper, 'Giriş üstü', [length, wallHeight - wall.headHeight, thickness], [0, (wallHeight + wall.headHeight) / 2, 0], materials.wall);
    } else if (wall.kind === 'shutter') {
      // Kepenk açık; üstteki ahşap kaplama M7 işinin yüzeyidir.
      box(group, 'Kepenk eşiği', [length, 0.012, 0.3], [0, 0.006, 0], materials.wallEdge, { shadow: false });
      box(upper, 'Kepenk kutusu', [length, 0.26, 0.3], [0, wall.headHeight - 0.13, 0.07], materials.housing);
      box(upper, 'Kepenk üstü ahşap', [length + extend * 2, wallHeight - wall.headHeight, thickness], [0, (wallHeight + wall.headHeight) / 2, 0], materials.fascia);
    } else {
      throw new Error(`Bilinmeyen duvar türü: ${wall.kind}`);
    }
    if (wall.exterior) {
      const [px, py] = [wall.to[0] - wall.from[0], wall.to[1] - wall.from[1]];
      const planLengthPixels = Math.hypot(px, py);
      cutawayWalls.push({ id: wall.id, upper, normal: [py / planLengthPixels, -px / planLengthPixels] });
    }
  }

  // --- Mobilya (referans yerleşim) ---
  const furniture = new THREE.Group();
  furniture.name = 'Referans mobilya';
  root.add(furniture);
  const yawOf = (facing) => ({ n: Math.PI, s: 0, e: Math.PI / 2, w: -Math.PI / 2 })[facing];
  function instanced(name, geometry, material, transforms) {
    if (transforms.length === 0) return null;
    const object = new THREE.InstancedMesh(geometry, material, transforms.length);
    object.name = name;
    object.castShadow = true;
    object.receiveShadow = true;
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    transforms.forEach(({ position, scale, yaw = 0 }, index) => {
      quaternion.setFromAxisAngle(up, yaw);
      matrix.compose(new THREE.Vector3(...position), quaternion, new THREE.Vector3(...scale));
      object.setMatrixAt(index, matrix);
    });
    object.instanceMatrix.needsUpdate = true;
    furniture.add(object);
    return object;
  }
  /** Yerel ofseti (sağ, yukarı, ön) dünya konumuna çevirir; ön = +Z yerel. */
  function placed(at, yaw, [right, height, forward]) {
    const { x, z } = planToWorld(at);
    return [x + Math.cos(yaw) * right + Math.sin(yaw) * forward, height, z - Math.sin(yaw) * right + Math.cos(yaw) * forward];
  }

  const seats = { chair: [], armchair: [], stoolSeat: [], stoolLeg: [], backs: [], armBacks: [] };
  for (const item of layout.furniture.chairs) {
    let yaw = item.facing ? yawOf(item.facing) : 0;
    if (item.facingToward) {
      const from = planToWorld(item.at);
      const to = planToWorld(item.facingToward);
      yaw = Math.atan2(to.x - from.x, to.z - from.z);
    }
    if (item.kind === 'stool') {
      seats.stoolSeat.push({ position: placed(item.at, yaw, [0, 0.74, 0]), scale: [0.36, 0.05, 0.36] });
      seats.stoolLeg.push({ position: placed(item.at, yaw, [0, 0.36, 0]), scale: [0.08, 0.72, 0.08] });
    } else if (item.kind === 'armchair') {
      seats.armchair.push({ position: placed(item.at, yaw, [0, 0.21, 0]), scale: [0.6, 0.42, 0.56], yaw });
      seats.armBacks.push({ position: placed(item.at, yaw, [0, 0.5, -0.23]), scale: [0.6, 0.38, 0.12], yaw });
    } else {
      seats.chair.push({ position: placed(item.at, yaw, [0, 0.23, 0]), scale: [0.42, 0.46, 0.42], yaw });
      seats.backs.push({ position: placed(item.at, yaw, [0, 0.66, -0.18]), scale: [0.42, 0.42, 0.06], yaw });
    }
  }
  instanced('Sandalyeler', unitBox, materials.chair, seats.chair);
  instanced('Sandalye sırtları', unitBox, materials.chair, seats.backs);
  instanced('Koltuklar', unitBox, materials.armchair, seats.armchair);
  instanced('Koltuk sırtları', unitBox, materials.armchair, seats.armBacks);
  instanced('Tabure oturakları', unitCylinder, materials.wood, seats.stoolSeat);
  instanced('Tabure ayakları', unitCylinder, materials.frame, seats.stoolLeg);

  const tableTops = [];
  const tableBases = [];
  for (const item of [...layout.furniture.tables, ...layout.furniture.lowTables.map((low) => ({ ...low, height: 0.42 }))]) {
    const { x, z } = planToWorld(item.at);
    const [w, d] = item.size.map(planLength);
    tableTops.push({ position: [x, item.height - 0.02, z], scale: [w, 0.04, d] });
    tableBases.push({ position: [x, (item.height - 0.04) / 2, z], scale: [Math.min(0.12, w * 0.3), item.height - 0.04, Math.min(0.12, d * 0.3)] });
  }
  instanced('Masa tablaları', unitBox, materials.furniture, tableTops);
  instanced('Masa ayakları', unitBox, materials.frame, tableBases);

  for (const sofa of layout.furniture.sofas) {
    const yaw = yawOf(sofa.facing);
    const sideways = sofa.facing === 'e' || sofa.facing === 'w';
    const [w, d] = sofa.size.map(planLength);
    const width = sideways ? d : w;
    const depth = sideways ? w : d;
    const seat = box(furniture, 'Sedir', [width, 0.42, depth], placed(sofa.at, yaw, [0, 0.21, 0]), materials.sofa);
    seat.rotation.y = yaw;
    const back = box(furniture, 'Sedir sırtı', [width, 0.36, 0.16], placed(sofa.at, yaw, [0, 0.6, -depth / 2 + 0.08]), materials.sofa);
    back.rotation.y = yaw;
  }

  for (const counter of layout.furniture.counters) {
    const a = planToWorld(counter.from);
    const b = planToWorld(counter.to);
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const yaw = -Math.atan2(b.z - a.z, b.x - a.x);
    const depth = planLength(counter.depth);
    const center = [(a.x + b.x) / 2, counter.height / 2, (a.z + b.z) / 2];
    const body = box(furniture, `Tezgâh:${counter.id}`, [length, counter.height - 0.04, depth], [center[0], (counter.height - 0.04) / 2, center[2]], materials.furniture);
    body.rotation.y = yaw;
    const top = box(furniture, `Tezgâh üstü:${counter.id}`, [length + 0.04, 0.04, depth + 0.04], [center[0], counter.height - 0.02, center[2]], materials.wood);
    top.rotation.y = yaw;
  }
  for (const item of layout.furniture.equipment) {
    const { x, z } = planToWorld(item.at);
    const [w, d] = item.size.map(planLength);
    box(furniture, 'Ekipman', [w, item.height, d], [x, item.base + item.height / 2, z], materials.equipment);
  }
  for (const column of layout.furniture.columns) {
    const { x, z } = planToWorld(column.at);
    const [w, d] = column.size.map(planLength);
    box(furniture, 'Kolon (fiber kaplama)', [w, wallHeight, d], [x, wallHeight / 2, z], materials.column);
  }
  for (const ring of layout.furniture.ringTables) {
    const { x, z } = planToWorld(ring.at);
    const outer = planLength(ring.outer);
    const inner = planLength(ring.inner);
    const shape = new THREE.Shape();
    shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, inner, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const top = mesh(furniture, 'Halka masa', flatGeometry(new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false, curveSegments: 48 }), ring.height - 0.05), materials.furniture);
    top.position.set(x, 0, z);
    const skirt = mesh(furniture, 'Halka masa gövdesi', own(new THREE.CylinderGeometry(inner + 0.2, inner + 0.2, ring.height - 0.05, 40, 1, true)), materials.wood);
    skirt.position.set(x, (ring.height - 0.05) / 2, z);
  }
  for (const planter of layout.furniture.planters) {
    const { x, z } = planToWorld(planter.at);
    const radius = planLength(planter.radius);
    const pot = mesh(furniture, 'Saksı', unitCylinder, materials.pot);
    // Birim silindirin yarıçapı 0,5'tir: saksı yarıçapı = 0,8 × bitki yarıçapı.
    pot.scale.set(radius * 1.6, 0.5, radius * 1.6);
    pot.position.set(x, 0.25, z);
    const crown = mesh(furniture, 'Bitki', own(new THREE.IcosahedronGeometry(radius, 1)), materials.plant);
    crown.position.set(x, 0.5 + radius * 0.85, z);
  }
  for (const pergola of layout.furniture.pergolas) {
    const a = planToWorld(pergola.from);
    const b = planToWorld(pergola.to);
    const height = 2.7;
    for (const x of [a.x + 0.1, b.x - 0.1]) {
      for (const z of [a.z + 0.1, b.z - 0.1]) box(furniture, 'Pergola dikmesi', [0.12, height, 0.12], [x, height / 2, z], materials.pergola);
    }
    const width = b.x - a.x;
    const depth = b.z - a.z;
    for (const z of [a.z + 0.1, b.z - 0.1]) box(furniture, 'Pergola kirişi', [width, 0.14, 0.1], [(a.x + b.x) / 2, height, z], materials.pergola);
    for (let i = 0; i < 9; i += 1) {
      box(furniture, 'Pergola çıtası', [0.06, 0.08, depth], [a.x + 0.3 + (i * (width - 0.6)) / 8, height + 0.1, (a.z + b.z) / 2], materials.pergola);
    }
  }

  const allPoints = [...layout.outline, ...layout.terrace].map(planToWorld);
  const bounds = {
    minX: Math.min(...allPoints.map((point) => point.x)), maxX: Math.max(...allPoints.map((point) => point.x)),
    minZ: Math.min(...allPoints.map((point) => point.z)), maxZ: Math.max(...allPoints.map((point) => point.z)),
  };

  let tintEnabled = true;
  let selectedId = null;
  let dark = false;
  const neutralZone = new THREE.Color();
  function refreshZones() {
    neutralZone.setHex(dark ? 0x7a7e73 : 0xd6d4c8);
    for (const zone of zones.values()) {
      const material = zoneMaterials.get(zone.id);
      const color = tintEnabled ? new THREE.Color(zone.tint) : neutralZone.clone();
      if (dark) color.multiplyScalar(0.78);
      if (selectedId && zone.id !== selectedId) color.lerp(neutralZone, 0.55);
      material.color.copy(color);
      material.emissive.setHex(zone.id === selectedId ? 0x1c2a24 : 0x000000);
      zone.outline.visible = zone.id === selectedId;
      zone.outline.material.color.setHex(dark ? 0xe8efe6 : 0x2f4a3f);
      if (zone.labels) {
        zone.labels.compact.visible = zone.id !== selectedId;
        zone.labels.detailed.visible = zone.id === selectedId;
      }
    }
  }

  function setTheme(isDark) {
    dark = isDark;
    const colors = isDark
      ? { slab: 0x454d45, floor: 0x777b70, terrace: 0x6c665a, wall: 0x979b8e, wallEdge: 0x767f71 }
      : { slab: 0x8e9c8e, floor: 0xd1d0c3, terrace: 0xcbbd9f, wall: 0xe3dfd1, wallEdge: 0xc2c8b8 };
    for (const [name, value] of Object.entries(colors)) materials[name].color.setHex(value);
    refreshZones();
  }
  function setCutaway(yaw) {
    const view = [Math.sin(yaw), Math.cos(yaw)];
    for (const wall of cutawayWalls) wall.upper.visible = wall.normal[0] * view[0] + wall.normal[1] * view[1] < 0.1;
  }
  function setTint(enabled) {
    tintEnabled = Boolean(enabled);
    refreshZones();
  }
  function setSelectedZone(id) {
    if (id !== null && !zones.has(id)) throw new Error(`Bilinmeyen alan: ${id}`);
    selectedId = id;
    refreshZones();
  }
  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    root.traverse((object) => {
      if (object.geometry) ownedGeometries.add(object.geometry);
      if (object.isInstancedMesh) object.dispose();
      if (object.isLine) object.material.dispose();
      if (object.isSprite) {
        object.material.map?.dispose();
        object.material.dispose();
      }
    });
    for (const geometry of ownedGeometries) geometry.dispose();
    for (const material of [...Object.values(materials), ...zoneMaterials.values()]) material.dispose();
    root.removeFromParent();
  }

  setTheme(false);
  setCutaway(layout.camera.yaw);
  return {
    root, zones, bounds, cutawayWalls,
    floorAreas: { interior: polygonArea(layout.outline), terrace: polygonArea(layout.terrace) },
    pickables: [...zones.values()].map((zone) => zone.plate),
    setTheme, setCutaway, setTint, setSelectedZone, dispose,
  };
}
