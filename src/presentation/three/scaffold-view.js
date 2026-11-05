/**
 * Parçalı mobil iskele — ilk mekân denemesi için görsel model.
 * BİRLİKTE-01: Ölçüler ve parça yerleşimi varsayımdır; kullanılacak gerçek iskele
 * seçildiğinde bu kayıt güncellenecek. Model teknik/taşıyıcı uygunluk iddiası taşımaz.
 *
 * Yerel zemin Y=0; merkez XZ=0. Parçalar aşama gruplarıyla açılır/kapanır.
 * setStage() geçmiş kareye bağlı değildir; ileri/geri sarma için doğrudan atanır.
 * @param {any} THREE
 * @param {{ width?: number, depth?: number, deckHeight?: number, height?: number,
 * overallHeight?: number, stage?: string, id?: string }} [options]
 */
export function createScaffoldView(THREE, options = {}) {
  const dimensions = Object.freeze({
    width: options.width ?? 2.2,
    depth: options.depth ?? 1.35,
    deckHeight: options.deckHeight ?? 1.22,
    height: options.overallHeight ?? options.height ?? 2.35,
  });
  const { width, depth, deckHeight, height } = dimensions;
  if (![width, depth, deckHeight, height].every(Number.isFinite)
    || width < 1.4 || depth < 0.9 || deckHeight < 0.8 || height < deckHeight + 0.7) {
    throw new Error('İskele görsel ölçüleri geçersiz.');
  }
  const root = new THREE.Group();
  root.name = 'MobilIskele';
  root.userData = {
    kind: 'scaffold', units: 'meters', assumption: 'illustrative-dimensions',
    selection: { kind: 'object', id: options.id ?? 'iskele-01' },
  };
  const materials = {
    frame: new THREE.MeshStandardMaterial({ color: 0x426d5d, roughness: 0.53, metalness: 0.46 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xaab8b3, roughness: 0.37, metalness: 0.72 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x30433d, roughness: 0.57, metalness: 0.35 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x333b39, roughness: 0.92 }),
    wood: new THREE.MeshStandardMaterial({ color: 0xc3a174, roughness: 0.89 }),
    woodLight: new THREE.MeshStandardMaterial({ color: 0xd0b58b, roughness: 0.91 }),
    lock: new THREE.MeshStandardMaterial({ color: 0xd4a54c, roughness: 0.61, metalness: 0.27 }),
  };
  const geometryCache = new Map();
  const groups = {};
  for (const name of ['packed', 'base', 'frames', 'braces', 'platform', 'guard']) {
    const group = new THREE.Group();
    group.name = `Iskele:${name}`;
    root.add(group);
    groups[name] = group;
  }
  function geometry(key, build) {
    if (!geometryCache.has(key)) geometryCache.set(key, build());
    return geometryCache.get(key);
  }
  function mesh(parent, name, shape, material, x, y, z) {
    const object = new THREE.Mesh(shape, materials[material]);
    object.name = name;
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(parent, name, size, material, position) {
    const shape = geometry(`box:${size.join(',')}`, () => new THREE.BoxGeometry(...size));
    return mesh(parent, name, shape, material, ...position);
  }
  function cylinder(parent, name, radius, length, material, position, segments = 12) {
    const shape = geometry(`cylinder:${radius},${length},${segments}`, () => new THREE.CylinderGeometry(radius, radius, length, segments));
    return mesh(parent, name, shape, material, ...position);
  }
  const yAxis = new THREE.Vector3(0, 1, 0);
  function bar(parent, name, a, b, material = 'frame', radius = 0.027) {
    const from = new THREE.Vector3(...a);
    const to = new THREE.Vector3(...b);
    const direction = to.clone().sub(from);
    const center = from.clone().add(to).multiplyScalar(0.5);
    const part = cylinder(parent, name, radius, direction.length(), material, center.toArray());
    part.quaternion.setFromUnitVectors(yAxis, direction.normalize());
    return part;
  }

  const halfX = width / 2 - 0.12;
  const halfZ = depth / 2 - 0.12;
  const deckLength = halfX * 2 + 0.085;
  const deckDepth = halfZ * 2 + 0.085;
  const lowerY = 0.38;
  const deckSupportY = deckHeight - 0.083;

  // Ayaklar: temas eden teker, çatal, kriko ve kilit kolu ayrı okunur parçalar.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * halfX;
      const z = sz * halfZ;
      const key = `${sx}:${sz}`;
      const wheel = cylinder(groups.base, `Teker:${key}`, 0.088, 0.078, 'rubber', [x, 0.088, z], 20);
      wheel.rotation.z = Math.PI / 2;
      const hub = cylinder(groups.base, `Porya:${key}`, 0.045, 0.084, 'steel', [x, 0.088, z], 16);
      hub.rotation.z = Math.PI / 2;
      for (const side of [-1, 1]) box(groups.base, `Catal:${key}:${side}`, [0.017, 0.12, 0.052], 'steel', [x + side * 0.052, 0.141, z]);
      box(groups.base, `CatalTabla:${key}`, [0.126, 0.024, 0.08], 'steel', [x, 0.206, z]);
      cylinder(groups.base, `Kriko:${key}`, 0.019, 0.21, 'steel', [x, 0.315, z]);
      cylinder(groups.base, `KrikoBilesik:${key}`, 0.045, 0.027, 'dark', [x, 0.274, z]);
      box(groups.base, `Fren:${key}`, [0.07, 0.018, 0.075], 'lock', [x, 0.199, z + sz * 0.067]);
    }
  }
  for (const sz of [-1, 1]) bar(groups.base, `AltBag:${sz}`, [-halfX, lowerY, sz * halfZ], [halfX, lowerY, sz * halfZ]);

  // Sağ ve sol ana çerçeve. Düşeyler platform taşıyıcı yüksekliğine kadar uzanır.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * halfX;
      const z = sz * halfZ;
      bar(groups.frames, `Dusey:${sx}:${sz}`, [x, lowerY - 0.028, z], [x, deckHeight + 0.055, z], 'frame', 0.031);
      for (const y of [lowerY + 0.027, deckSupportY]) {
        cylinder(groups.frames, `Manşon:${sx}:${sz}:${y}`, 0.039, 0.064, 'steel', [x, y, z]);
      }
    }
    for (const y of [lowerY + 0.01, deckSupportY]) {
      bar(groups.frames, `YanBag:${sx}:${y}`, [sx * halfX, y, -halfZ], [sx * halfX, y, halfZ]);
    }
  }

  // İnce galvaniz çaprazlar yeşil ana çerçeveden ayrışır.
  for (const sz of [-1, 1]) {
    const z = sz * (halfZ + 0.022);
    bar(groups.braces, `CaprazA:${sz}`, [-halfX, lowerY + 0.055, z], [halfX, deckSupportY - 0.07, z], 'steel', 0.017);
    bar(groups.braces, `CaprazB:${sz}`, [-halfX, deckSupportY - 0.07, z], [halfX, lowerY + 0.055, z], 'steel', 0.017);
    for (const sx of [-1, 1]) {
      for (const y of [lowerY + 0.055, deckSupportY - 0.07]) {
        const pin = cylinder(groups.braces, `Pim:${sx}:${sz}:${y}`, 0.027, 0.02, 'lock', [sx * halfX, y, z + sz * 0.02]);
        pin.rotation.x = Math.PI / 2;
      }
    }
  }

  // Gerçek platform üst düzeyi deckHeight'tır. Tek renk kutu yerine ayrı tahtalar.
  for (const sz of [-1, 1]) {
    box(groups.platform, `PlatformKiris:${sz}`, [deckLength, 0.09, 0.043], 'steel', [0, deckHeight - 0.085, sz * halfZ]);
    box(groups.platform, `UzunEteklik:${sz}`, [deckLength, 0.14, 0.023], 'wood', [0, deckHeight + 0.07, sz * (deckDepth / 2)]);
  }
  for (const sx of [-1, 1]) {
    box(groups.platform, `KisaEteklik:${sx}`, [0.023, 0.14, deckDepth], 'wood', [sx * (deckLength / 2), deckHeight + 0.07, 0]);
  }
  const plankCount = 7;
  for (let i = 0; i < plankCount; i += 1) {
    const z = -deckDepth / 2 + (i + 0.5) * deckDepth / plankCount;
    box(groups.platform, `PlatformTahta:${i}`, [deckLength - 0.035, 0.052, deckDepth / plankCount - 0.006], i % 3 === 0 ? 'woodLight' : 'wood', [0, deckHeight - 0.026, z]);
  }

  // Çift korkuluk; platform adımından ayrı kontrol edilir.
  const topY = height - 0.026;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      bar(groups.guard, `KorkulukDikme:${sx}:${sz}`, [sx * halfX, deckHeight + 0.04, sz * halfZ], [sx * halfX, topY, sz * halfZ], 'frame', 0.026);
    }
  }
  for (const y of [deckHeight + 0.56, topY]) {
    for (const sz of [-1, 1]) {
      bar(groups.guard, `UzunKorkuluk:${sz}:${y}`, [-halfX, y, sz * halfZ], [halfX, y, sz * halfZ], 'frame', 0.025);
    }
    for (const sx of [-1, 1]) {
      bar(groups.guard, `KisaKorkuluk:${sx}:${y}`, [sx * halfX, y, -halfZ], [sx * halfX, y, halfZ], 'frame', 0.025);
    }
  }
  const ladderBottomX = -halfX - 0.12;
  const ladderTopX = -halfX - 0.042;
  const ladderBottomY = 0.25;
  const ladderTopY = deckHeight + 0.13;
  for (const sz of [-1, 1]) {
    bar(groups.guard, `MerdivenDikme:${sz}`, [ladderBottomX, ladderBottomY, sz * 0.235], [ladderTopX, ladderTopY, sz * 0.235], 'steel', 0.021);
  }
  for (let i = 0; i < 5; i += 1) {
    const t = (i + 0.35) / 5;
    const x = ladderBottomX + (ladderTopX - ladderBottomX) * t;
    const y = ladderBottomY + (ladderTopY - ladderBottomY) * t;
    bar(groups.guard, `MerdivenBasamak:${i}`, [x, y, -0.235], [x, y, 0.235], 'steel', 0.022);
  }

  // Paketli/geçici serilmiş görünüm: aynı parçaların temsili, düşük ayrıntılı hali.
  const packing = new THREE.Group();
  packing.name = 'ParcaPaketi';
  groups.packed.add(packing);
  for (const x of [-0.7, 0, 0.7]) box(packing, `PaletAlt:${x}`, [0.12, 0.08, 0.8], 'wood', [x, 0.04, 0]);
  for (let i = 0; i < 6; i += 1) box(packing, `PaletUst:${i}`, [1.85, 0.035, 0.115], 'woodLight', [0, 0.098, -0.34 + i * 0.136]);
  for (let i = 0; i < 6; i += 1) bar(packing, `PaketBoru:${i}`, [-halfX, 0.16 + (i % 2) * 0.06, -0.26 + i * 0.09], [halfX, 0.16 + (i % 2) * 0.06, -0.26 + i * 0.09], 'frame', 0.029);
  box(packing, 'PaketPlatform', [deckLength - 0.04, 0.065, 0.43], 'wood', [0, 0.255, 0]);
  for (const x of [-0.64, 0.64]) box(packing, `PaketSeridi:${x}`, [0.04, 0.012, 0.45], 'dark', [x, 0.294, 0]);

  const stages = ['packed', 'staged', 'base-set', 'frames-set', 'braced', 'platform-set', 'ready'];
  function setStage(state) {
    const index = stages.indexOf(state);
    if (index < 0) throw new Error(`Bilinmeyen iskele aşaması: ${state}`);
    groups.packed.visible = index < 2;
    groups.base.visible = index >= 2;
    groups.frames.visible = index >= 3;
    groups.braces.visible = index >= 4;
    groups.platform.visible = index >= 5;
    groups.guard.visible = index >= 6;
    packing.rotation.y = state === 'staged' ? Math.PI / 2 : 0;
    root.userData.stage = state;
  }
  setStage(options.stage ?? 'ready');

  let disposed = false;
  return {
    root, dimensions, setStage,
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const shape of geometryCache.values()) shape.dispose();
      for (const material of Object.values(materials)) material.dispose();
      root.removeFromParent();
    },
  };
}
