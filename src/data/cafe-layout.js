/**
 * Arabica Coffee House (CEPA) — kafenin tamamı için YAKLAŞIK yerleşim.
 *
 * Kaynak: 2D'SIGN Mimarlık "01 Yerleşim Planı" paftasının referans sitedeki görseli
 * (layout-plan.png, 812 × 658 px). Bütün koordinatlar bu paftanın pikselidir; böylece her
 * nokta paftayla karşılaştırılabilir. Metreye çevirme `planToWorld` ile yapılır.
 *
 * Ölçek: Paftada "108 m² M2 tavan" notu var. Aşağıdaki M2 çokgeni 33 492 px² tutar;
 * 1 px ≈ 0,057 m alınınca M2 ≈ 108,8 m² olur. Kapı (≈1,0 m) ve masa ölçüleri bu ölçekle
 * ±%10 içinde tutarlıdır. Kesin ölçüler AutoCAD dosyasından alınacak; o zaman yalnızca
 * bu dosya değişir, sahne kodu değişmez.
 *
 * Dünya: 1 birim = 1 m, Y yukarı. Pafta x → dünya +X, pafta y (aşağı) → dünya +Z.
 * Pafta kuzeyi (teras / M8) dünyada −Z tarafındadır.
 */
export const PLAN_METERS_PER_PIXEL = 0.057;
export const PLAN_ORIGIN = Object.freeze({ x: 310, y: 330 });

/** @param {[number, number]} point pafta pikseli @returns {{ x: number, z: number }} metre */
export function planToWorld([px, py]) {
  return { x: (px - PLAN_ORIGIN.x) * PLAN_METERS_PER_PIXEL, z: (py - PLAN_ORIGIN.y) * PLAN_METERS_PER_PIXEL };
}

/** Pafta pikselindeki uzunluğu metreye çevirir. */
export const planLength = (pixels) => pixels * PLAN_METERS_PER_PIXEL;

// --- Mobilya yardımcıları: referans yerleşim; tamamlanmış imalat anlamına gelmez. ---
const chair = (at, facing, kind = 'chair') => ({ at, facing, kind });
const table = (at, size, kind = 'rect', height = 0.75) => ({ at, size, kind, height });

/** Bir masanın iki yanına karşılıklı sandalye: axis 'x' → doğu/batı, 'z' → kuzey/güney. */
function tableWithChairs(at, size, axis, kind = 'chair', reach = 4) {
  const [w, d] = size;
  const chairs = axis === 'x'
    ? [chair([at[0] - w / 2 - reach, at[1]], 'e', kind), chair([at[0] + w / 2 + reach, at[1]], 'w', kind)]
    : [chair([at[0], at[1] - d / 2 - reach], 's', kind), chair([at[0], at[1] + d / 2 + reach], 'n', kind)];
  return { tables: [table(at, size)], chairs };
}

function mergeSets(...sets) {
  return { tables: sets.flatMap((set) => set.tables), chairs: sets.flatMap((set) => set.chairs) };
}

// M8 üst sıra: paftada otomatik bulunan 9 masa grubunun merkezleri (koltuk çiftlerinin ortası).
const terraceTopRow = [116, 175, 233, 292, 350, 406, 461, 515, 574]
  .map((x) => tableWithChairs([x, 58], [20, 12], 'x', 'armchair', 7));
// M8 orta sıra: kuzeye bakan koltuklar ve önlerindeki 5 masa.
const terraceMiddle = [377, 399, 421, 444, 466].map((x) => ({
  tables: [table([x, 155], [13, 13])],
  chairs: [chair([x, 135], 's', 'armchair')],
}));
// M8 sol kolon ve pergola grubu.
const terraceLeft = [tableWithChairs([103, 108], [12, 16], 'z', 'armchair', 6), tableWithChairs([104, 161], [12, 16], 'z', 'armchair', 6)];
const pergola = [
  tableWithChairs([519, 104], [12, 14], 'z', 'armchair', 6),
  tableWithChairs([581, 106], [24, 14], 'z', 'armchair', 6),
  tableWithChairs([527, 167], [22, 12], 'z', 'armchair', 4),
  tableWithChairs([581, 158], [24, 14], 'z', 'armchair', 6),
];
// M8'deki mevcut tablalar ve siyah file sandalyeler (1. gün söküm / teslim edilecek).
const terraceExisting = [
  ...[215, 268, 321].map((x) => tableWithChairs([x, 116], [15, 12], 'x', 'chair', 3)),
  ...[205, 258, 311].map((x) => tableWithChairs([x, 145], [15, 12], 'x', 'chair', 3)),
  ...[205, 258, 311, 364, 417].map((x) => tableWithChairs([x, 176], [15, 12], 'x', 'chair', 3)),
];

// M2: kolonu saran halka masa, sol tarafta dört ikili masa, camekân önünde yüksek tezgâh.
const ringCenter = [282, 259];
const ringChairs = Array.from({ length: 12 }, (_, index) => {
  const angle = (index + 0.5) * (Math.PI * 2 / 12);
  return { at: [ringCenter[0] + Math.cos(angle) * 37, ringCenter[1] + Math.sin(angle) * 37], facingToward: ringCenter, kind: 'chair' };
});
const hallTables = [231, 251, 281, 301].map((y) => tableWithChairs([200, y], [16, 15], 'x', 'chair', 4));
const hallStools = [252, 268, 284, 300, 316].map((x) => chair([x, 208], 'n', 'stool'));
const hallSide = tableWithChairs([390, 201], [16, 12], 'x', 'chair', 4);
const m1Table = {
  tables: [table([520, 228], [76, 18])],
  chairs: [492, 510, 528, 546].flatMap((x) => [chair([x, 215], 's'), chair([x, 241], 'n')]),
};
const m6Tables = [tableWithChairs([118, 205], [12, 12], 'x', 'chair', 5), tableWithChairs([118, 228], [12, 12], 'x', 'chair', 5)];
const furnitureSets = mergeSets(
  ...terraceTopRow, ...terraceMiddle, ...terraceLeft, ...pergola, ...terraceExisting,
  ...hallTables, hallSide, m1Table, ...m6Tables,
);

export const cafeLayout = Object.freeze({
  id: 'arabica-cepa-v1',
  label: 'Arabica Coffee House · CEPA',
  measurementStatus: 'approximate-from-sketch',
  source: 'docs/referans/README.md',
  wallHeight: 3.3,
  wallThickness: 0.16,
  /** Kameraya bakan dış duvarlar bu yüksekliğe kadar kesilir. */
  cutawayHeight: 0.28,
  /** İç bölmeler her yönden içeri bakılabilsin diye bu yüksekliktedir. */
  interiorWallHeight: 1.2,
  /** İç mekân döşemesi; saat yönünde (pafta görünümünde). */
  outline: [[86, 189], [568, 189], [568, 255], [471, 255], [471, 415], [374, 415], [374, 606], [285, 606], [285, 582], [256, 582], [256, 459], [77, 459], [77, 466], [51, 466], [51, 276], [99, 276], [99, 254], [86, 254]],
  /** Teras zemini (M8 ve dış oturma sırası). */
  terrace: [[86, 47], [602, 47], [602, 189], [86, 189]],
  zones: [
    { id: 'M1', polygon: [[424, 190], [568, 190], [568, 255], [471, 255], [471, 274], [424, 274]], label: [505, 247], tint: 0xd49a6c },
    { id: 'M2', polygon: [[184, 190], [424, 190], [424, 276], [373, 276], [373, 344], [184, 344]], label: [340, 235], tint: 0x8eb0cd },
    { id: 'M3', polygon: [[373, 276], [471, 276], [471, 373], [373, 373]], label: [418, 330], tint: 0xc8a6c6 },
    { id: 'M4', polygon: [[134, 369], [326, 369], [326, 459], [134, 459]], label: [200, 418], tint: 0xe3d48b },
    { id: 'M5', polygon: [[72, 420], [134, 420], [134, 459], [72, 459]], label: [103, 440], tint: 0xb895bc },
    { id: 'M6', polygon: [[86, 190], [137, 190], [137, 278], [99, 278], [99, 254], [86, 254]], label: [112, 248], tint: 0xc29cc8 },
    { id: 'M7', polygon: [[51, 276], [72, 276], [72, 466], [51, 466]], label: [61, 375], tint: 0xa88baf },
    { id: 'M8', polygon: [[86, 104], [568, 104], [568, 186], [86, 186]], label: [250, 128], tint: 0x9fc290 },
    { id: 'M9', polygon: [[256, 459], [374, 459], [374, 606], [285, 606], [285, 582], [256, 582]], label: [318, 525], tint: 0xd98e8b },
  ],
  /**
   * Duvarlar: exterior duvarların normali dışarı bakar (pafta saat yönü sırası).
   * kind: solid | glass (camekân) | doorway (yalnız üst kiriş) | shutter (kepenk + üst kaplama).
   * openings: duvar başından itibaren pafta pikseli [start, end] ve yükseklik.
   */
  walls: [
    { id: 'kuzey-cam-1', from: [86, 189], to: [142, 189], kind: 'glass', exterior: true },
    { id: 'ana-giris', from: [142, 189], to: [188, 189], kind: 'doorway', exterior: true, headHeight: 2.45 },
    { id: 'kuzey-cam-2', from: [188, 189], to: [493, 189], kind: 'glass', exterior: true },
    { id: 'kuzey-m1', from: [493, 189], to: [568, 189], kind: 'solid', exterior: true },
    { id: 'dogu-m1', from: [568, 189], to: [568, 255], kind: 'solid', exterior: true },
    { id: 'guney-m1', from: [568, 255], to: [471, 255], kind: 'solid', exterior: true },
    { id: 'dogu-m3', from: [471, 255], to: [471, 415], kind: 'solid', exterior: true, openings: [{ start: 38, end: 62, height: 2.2, kind: 'servis-kapisi' }] },
    { id: 'guney-servis', from: [471, 415], to: [374, 415], kind: 'solid', exterior: true, openings: [{ start: 68, end: 93, height: 2.2, kind: 'kapi' }] },
    { id: 'dogu-m9', from: [374, 415], to: [374, 606], kind: 'solid', exterior: true },
    { id: 'guney-m9', from: [374, 606], to: [285, 606], kind: 'solid', exterior: true },
    { id: 'bati-m9-alt', from: [285, 606], to: [285, 582], kind: 'solid', exterior: true },
    { id: 'guney-m9-kose', from: [285, 582], to: [256, 582], kind: 'solid', exterior: true },
    { id: 'bati-m9', from: [256, 582], to: [256, 459], kind: 'solid', exterior: true },
    { id: 'guney-m4', from: [256, 459], to: [77, 459], kind: 'solid', exterior: true },
    { id: 'guney-kose-1', from: [77, 459], to: [77, 466], kind: 'solid', exterior: true },
    { id: 'guney-kose-2', from: [77, 466], to: [51, 466], kind: 'solid', exterior: true },
    { id: 'bati-kepenk', from: [51, 466], to: [51, 276], kind: 'shutter', exterior: true, headHeight: 2.6 },
    { id: 'kuzey-salon', from: [51, 276], to: [99, 276], kind: 'solid', exterior: true },
    { id: 'bati-nis-1', from: [99, 276], to: [99, 254], kind: 'solid', exterior: true },
    { id: 'kuzey-nis', from: [99, 254], to: [86, 254], kind: 'solid', exterior: true },
    { id: 'bati-cam', from: [86, 254], to: [86, 189], kind: 'glass', exterior: true },
    { id: 'm3-kuzey', from: [373, 276], to: [471, 276], kind: 'solid' },
    { id: 'm3-bati', from: [373, 276], to: [373, 373], kind: 'solid', openings: [{ start: 69, end: 86, height: 2.1, kind: 'kapi' }] },
    { id: 'm3-guney', from: [373, 373], to: [471, 373], kind: 'solid', openings: [{ start: 67, end: 85, height: 2.1, kind: 'kapi' }] },
    { id: 'm9-kuzey', from: [256, 459], to: [374, 459], kind: 'solid', openings: [{ start: 70, end: 90, height: 2.1, kind: 'kapi' }] },
    { id: 'bar-dogu', from: [326, 402], to: [326, 445], kind: 'solid' },
  ],
  furniture: {
    tables: furnitureSets.tables,
    chairs: [...furnitureSets.chairs, ...ringChairs, ...hallStools],
    ringTables: [{ at: ringCenter, inner: 15, outer: 31, height: 0.75 }],
    columns: [{ at: ringCenter, size: [20, 20] }],
    sofas: [
      { at: [100, 295], size: [64, 20], facing: 's' },
      { at: [221, 333], size: [12, 18], facing: 'e' }, { at: [252, 333], size: [12, 18], facing: 'w' },
      { at: [279, 333], size: [12, 18], facing: 'e' }, { at: [310, 333], size: [12, 18], facing: 'w' },
      { at: [63, 321], size: [16, 14], facing: 'e' }, { at: [131, 321], size: [16, 14], facing: 'w' },
    ],
    lowTables: [{ at: [236, 333], size: [16, 14] }, { at: [294, 333], size: [16, 14] }, { at: [97, 319], size: [30, 9] }],
    counters: [
      { id: 'cam-onu-tezgah', from: [246, 199], to: [331, 199], depth: 7, height: 1.05 },
      { id: 'teshir-tezgahi', from: [230, 392], to: [324, 392], depth: 14, height: 1.1 },
      { id: 'arka-tezgah', from: [145, 447], to: [324, 447], depth: 12, height: 0.9 },
      { id: 'mutfak-bati', from: [292, 472], to: [292, 548], depth: 10, height: 0.9 },
      { id: 'mutfak-guney', from: [298, 556], to: [340, 556], depth: 9, height: 0.9 },
      { id: 'mutfak-dogu', from: [364, 470], to: [364, 545], depth: 10, height: 0.9 },
      { id: 'mutfak-alt', from: [325, 598], to: [370, 598], depth: 8, height: 0.9 },
    ],
    /** Tezgâh üstündeki makineler; base = üstünde durduğu tezgâhın yüksekliği. */
    equipment: [
      { at: [178, 447], size: [16, 10], height: 0.42, base: 0.9 }, { at: [204, 447], size: [12, 10], height: 0.32, base: 0.9 },
      { at: [262, 447], size: [18, 10], height: 0.5, base: 0.9 }, { at: [300, 392], size: [20, 12], height: 0.35, base: 1.1 },
    ],
    planters: [{ at: [205, 196], radius: 6 }, { at: [352, 196], radius: 6 }, { at: [150, 112], radius: 7 }],
    pergolas: [{ from: [500, 75], to: [602, 188] }],
  },
  /** M2'deki tavan işi için tekerlekli iskele (pilot nesnesi) ve ölçek ustası. */
  scaffold: { id: 'iskele-01', at: [345, 305], width: 2.2, depth: 1.35, deckHeight: 1.22 },
  worker: { id: 'usta-01', at: [322, 296], yawRadians: 1.2 },
  /** Onaylı yön: yaklaşık 45° kamera. Güneydoğudan bakılır; pafta kuzeyi ekranın üstüne yakındır. */
  camera: { yaw: Math.PI / 4, pitch: Math.PI / 4 },
});
