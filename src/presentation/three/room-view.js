/**
 * Veriden üretilen kaba mekân. Kamera tarafındaki duvarların üst kısmı gizlenir;
 * böylece her yönden içine bakılabilir. Gerçek dolaşım/navigasyon motoru içermez.
 */
export function createRoomView(THREE, layout) {
  const root = new THREE.Group();
  root.name = `Area:${layout.areaId}`;
  root.userData.selection = { kind: 'area', id: layout.areaId };
  const materials = {
    floor: new THREE.MeshStandardMaterial({ roughness: 0.96 }),
    slab: new THREE.MeshStandardMaterial({ roughness: 0.94 }),
    wall: new THREE.MeshStandardMaterial({ roughness: 0.94 }),
    wallEdge: new THREE.MeshStandardMaterial({ roughness: 0.85 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x9d805a, roughness: 0.9 }),
    woodLight: new THREE.MeshStandardMaterial({ color: 0xc8ab7c, roughness: 0.88 }),
    cardboard: new THREE.MeshStandardMaterial({ color: 0xbfa97f, roughness: 1 }),
    tape: new THREE.MeshStandardMaterial({ color: 0xead9b6, roughness: 0.9 }),
    green: new THREE.MeshStandardMaterial({ color: 0x456456, roughness: 0.75 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x989f9b, metalness: 0.55, roughness: 0.4 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x3c443f, roughness: 0.85 }),
    board: new THREE.MeshStandardMaterial({ color: 0xe4dfd1, roughness: 0.96 }),
  };
  function box(parent, name, size, position, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), materials[material]);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function cylinder(parent, name, radius, height, position, material, segments = 20) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), materials[material]);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  const { width: w, depth: d, wallHeight: h, wallThickness: t, cutawayHeight: cut } = layout.room;
  box(root, 'Kesit tabanı', [w + 0.18, 0.24, d + 0.18], [0, -0.14, 0], 'slab');
  box(root, 'Ham zemin', [w, 0.04, d], [0, -0.02, 0], 'floor');

  // İnce referans çizgileri; bunlar seramik veya gerçek döşeme modülü değildir.
  const lineVertices = [];
  for (let x = -Math.floor(w / 2); x <= w / 2; x += 1) lineVertices.push(x, 0.002, -d / 2, x, 0.002, d / 2);
  for (let z = -Math.floor(d / 2); z <= d / 2; z += 1) lineVertices.push(-w / 2, 0.002, z, w / 2, 0.002, z);
  const gridGeometry = new THREE.BufferGeometry();
  gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lineVertices, 3));
  const gridMaterial = new THREE.LineBasicMaterial({ color: 0x666b64, opacity: 0.13, transparent: true, depthWrite: false });
  const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
  root.add(grid);

  const walls = [];
  function wall(name, span, center, orientation, normal, door = null) {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(center[0], 0, center[1]);
    group.rotation.y = orientation;
    root.add(group);
    const upper = new THREE.Group();
    group.add(upper);
    function segment(a, b) {
      box(group, 'Kesit duvarı', [b - a, cut, t], [(a + b) / 2, cut / 2, 0], 'wallEdge');
      box(upper, 'Duvar üstü', [b - a, h - cut, t], [(a + b) / 2, (h + cut) / 2, 0], 'wall');
      box(upper, 'Duvar bitişi', [b - a + 0.015, 0.035, t + 0.018], [(a + b) / 2, h + 0.012, 0], 'wallEdge');
    }
    if (door) {
      segment(-span / 2, door.centerX - door.width / 2);
      segment(door.centerX + door.width / 2, span / 2);
      box(upper, 'Giriş üstü', [door.width, h - door.height, t], [door.centerX, (h + door.height) / 2, 0], 'wall');
      box(group, 'Giriş eşiği', [door.width, 0.012, 0.34], [door.centerX, 0.006, 0], 'wallEdge');
    } else segment(-span / 2, span / 2);
    walls.push({ upper, normal });
  }
  wall('Kuzey duvarı', w, [0, -d / 2], 0, [0, -1]);
  wall('Batı duvarı', d, [-w / 2, 0], Math.PI / 2, [-1, 0]);
  wall('Doğu duvarı', d, [w / 2, 0], Math.PI / 2, [1, 0]);
  wall('Giriş duvarı', w, [0, d / 2], 0, [0, 1], layout.entrance);

  // Çalışma alanının dört köşesi: kesik çizgili fiziksel rota anlamına gelmez.
  const workMark = new THREE.Group();
  workMark.position.set(layout.scaffold.position.x, 0.005, layout.scaffold.position.z);
  const zoneWidth = layout.scaffold.width + 0.72;
  const zoneDepth = layout.scaffold.depth + 0.68;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box(workMark, 'Çalışma alanı işareti', [0.35, 0.006, 0.035], [sx * (zoneWidth / 2 - 0.175), 0, sz * zoneDepth / 2], 'green');
    box(workMark, 'Çalışma alanı işareti', [0.035, 0.006, 0.35], [sx * zoneWidth / 2, 0, sz * (zoneDepth / 2 - 0.175)], 'green');
  }
  root.add(workMark);

  const storage = new THREE.Group();
  storage.name = 'Malzeme köşesi';
  storage.position.set(layout.storage.position.x, 0, layout.storage.position.z);
  storage.userData.selection = { kind: 'object', id: layout.storage.id };
  root.add(storage);
  // Palet ve üç ayrı kutu: ufak ayrıntılar ölçeği okunur kılar.
  for (const z of [-0.4, 0, 0.4]) box(storage, 'Palet ayağı', [1.15, 0.095, 0.12], [0, 0.0475, z], 'wood');
  for (let i = 0; i < 6; i++) box(storage, 'Palet tahtası', [0.16, 0.045, 1.0], [-0.48 + i * 0.192, 0.1175, 0], 'woodLight');
  const crates = [[-0.27, 0.36, -0.22, 0.5, 0.44, 0.44], [0.28, 0.32, -0.19, 0.5, 0.36, 0.5], [-0.24, 0.67, -0.2, 0.43, 0.18, 0.41]];
  for (let i = 0; i < crates.length; i++) {
    const [x, y, z, cw, ch, cd] = crates[i];
    box(storage, `Malzeme kutusu ${i}`, [cw, ch, cd], [x, y, z], 'cardboard');
    box(storage, 'Koli bandı', [0.055, 0.004, cd + 0.005], [x, y + ch / 2 + 0.002, z], 'tape');
    box(storage, 'Kutu etiketi', [cw * 0.42, ch * 0.36, 0.003], [x, y, z + cd / 2 + 0.002], 'board');
  }
  for (let i = 0; i < 3; i++) {
    const board = box(storage, 'Levha', [0.06, 1.9, 0.9], [-0.69 - i * 0.07, 0.96, -0.15], 'board');
    board.rotation.z = -0.08;
  }
  const bucket = cylinder(storage, 'Malzeme kovası', 0.19, 0.32, [0.44, 0.3, 0.28], 'green');
  cylinder(storage, 'Kova kapağı', 0.2, 0.025, [0.44, 0.4725, 0.28], 'metal');
  const spool = new THREE.Group();
  spool.position.set(0.05, 0.37, 0.36);
  spool.rotation.z = Math.PI / 2;
  cylinder(spool, 'Kablo sargısı', 0.23, 0.25, [0, 0, 0], 'dark');
  for (const side of [-1, 1]) cylinder(spool, 'Makara diski', 0.28, 0.035, [0, side * 0.14, 0], 'woodLight');
  storage.add(spool);
  bucket.userData.referenceOnly = true;

  // Öndeki kısa eşik çizgileri ölçü ipucu verir; bitmiş cephe tasarımı değildir.
  const entry = new THREE.Group();
  entry.position.set(layout.entrance.centerX, 0.008, d / 2 - 0.45);
  for (const x of [-layout.entrance.width / 2 + 0.1, layout.entrance.width / 2 - 0.1]) {
    box(entry, 'Giriş sınırı', [0.035, 0.006, 0.32], [x, 0, 0], 'green');
  }
  root.add(entry);

  function setTheme(dark) {
    const colors = dark
      ? { floor: 0x777b70, slab: 0x454d45, wall: 0x979b8e, wallEdge: 0x767f71 }
      : { floor: 0xd1d0c3, slab: 0x8e9c8e, wall: 0xe3dfd1, wallEdge: 0xc2c8b8 };
    for (const [name, value] of Object.entries(colors)) materials[name].color.setHex(value);
    gridMaterial.color.setHex(dark ? 0xc9d0c3 : 0x666b64);
  }
  function setCutaway(yaw) {
    for (const wall of walls) wall.upper.visible = wall.normal[0] * Math.sin(yaw) + wall.normal[1] * Math.cos(yaw) < 0.1;
  }
  function dispose() {
    const geometries = new Set();
    root.traverse((object) => { if (object.geometry) geometries.add(object.geometry); });
    for (const geometry of geometries) geometry.dispose();
    for (const material of Object.values(materials)) material.dispose();
    gridMaterial.dispose();
    root.removeFromParent();
  }
  setTheme(false);
  setCutaway(Math.PI / 4);
  return { root, setTheme, setCutaway, dispose };
}
