/**
 * Referans sitedeki beş günlük programın ve alan tanımlarının birebir aktarımı.
 * Kaynak: https://arabica-santiye-simulasyon-elif.bonnydingo1.chatgpt.site/ (app.js,
 * 2026-11-05 itibarıyla). Sitedeki döngülerle üretilen işler burada açık yazıldı.
 *
 * Bu modül yalnızca veri ve sitenin zamanlama kuralını taşır; simülasyon çekirdeğine
 * (usta, kaynak, alt adım) aktarım ayrı bir adımda yapılacak. Saatler, ekipler ve
 * kişi sayıları sitedeki gibi önerilerdir; metraj veya verim hesabı değildir.
 *
 * Zaman: çalışma saati. Her gün 08:00–20:00 arası 12 çalışma saatidir; 0 = 1. gün 08:00.
 */

export const referenceSource = Object.freeze({
  url: 'https://arabica-santiye-simulasyon-elif.bonnydingo1.chatgpt.site/',
  retrievedOn: '2026-11-05',
  title: 'Arabica | Şantiye Simülasyonu — beş gün, tek koordinasyon',
});

/** Sitedeki varsayılan senaryo ayarları. cure/plaster: takvim saati bekleme. */
export const referenceSettings = Object.freeze({
  cureHours: 12,
  plasterHours: 12,
  tileDelayHours: 0,
  capacityPeople: 18,
  logisticsEntryAreaId: 'M8',
  workdayStartHour: 8,
  workdayHours: 12,
  targetDays: 5,
});

export const referenceAreas = Object.freeze([
  { id: 'M1', name: 'Bitmiş alan / geçici malzeme', before: 'Kaba işler bitmiş; iskele kaldırılmış.', after: 'Malzemeler çıkarılmış, boya ve rölyef tamamlanmış.' },
  { id: 'M2', name: 'Ana salon / zemin', before: 'Mevcut parke, fiber kolon kaplaması ve tefrişat.', after: 'Seramik, raf, boya ve sedir tamamlanmış.' },
  { id: 'M3', name: 'Giriş / servis', before: 'İnşaat malzemeleri ve seramik stoğu.', after: 'Kapı, paslanmazlar, servis ve mekanik hazır.' },
  { id: 'M4', name: 'Banko / bar', before: 'Mevcut banko ve dolu raflar.', after: 'Banko, teşhir, benmari ve bar ekipmanları hazır.' },
  { id: 'M5', name: 'Niş / dekor duvar', before: 'Niş ve duvar uygulaması yapılacak.', after: 'Niş, dekoratif duvar ve raf bitmiş.' },
  { id: 'M6', name: 'Niş / servant', before: 'Niş ve servant alanı hazırlanacak.', after: 'Dekor, raf ve servant tamamlanmış.' },
  { id: 'M7', name: 'Kepenk üstü', before: 'Ahşap yüzey boyanacak.', after: 'Boya ve mobilya teslimi tamamlanmış.' },
  { id: 'M8', name: 'Bahçe / lojistik', before: 'Mevcut masa tablaları ve siyah file sandalyeler.', after: 'Geçici depo ve kesim kalkmış, bahçe mobilyaları kurulmuş.' },
  { id: 'M9', name: 'Geçici ekipman / mutfak', before: 'M4 ekipmanları için korumalı geçici alan.', after: 'Ekipmanlar M4’e dönmüş, DDY mutfak düzeni bitmiş.' },
]);

/**
 * day/hour: sitedeki planlanan başlangıç (gün 1–5, saat). durationHours: çalışma saati.
 * kind 'move' işlerde from/to alan kimliği veya 'OUT' (dış sevk). gate: bağımlılıktan
 * sonra beklenecek ayar ('cure' | 'plaster').
 */
export const referenceTasks = Object.freeze([
  { id: 'pre', areaId: 'M1', day: 1, hour: 8, durationHours: 1, label: 'İskele / kaba iş teslim kontrolü', team: 'Saha sorumlusu', people: 1, dependsOn: [], kind: 'work' },
  { id: 'm4empty', areaId: 'M4', day: 1, hour: 8, durationHours: 2, label: 'Rafları boşalt; ekipmanları ayır', team: 'Operasyon', people: 2, dependsOn: [], kind: 'work' },
  { id: 'm9in', areaId: 'M9', day: 1, hour: 10, durationHours: 3, label: 'Makine ve raf içlerini M4’ten taşı; korumalı yerleştir', team: 'Operasyon + taşıma', people: 3, dependsOn: ['m4empty'], kind: 'move', from: 'M4', to: 'M9' },
  { id: 'm8out', areaId: 'M8', day: 1, hour: 8, durationHours: 3, label: 'Tablaları demonte et; tablalar ve siyah file sandalyeleri yatırımcıya teslim et', team: 'Mobilya + yatırımcı', people: 3, dependsOn: [], kind: 'move', from: 'M8', to: 'OUT' },
  { id: 'm2out', areaId: 'M2', day: 1, hour: 11, durationHours: 2, label: 'Korunacak tefrişatı M8’e taşı; diğerlerini yatırımcıya teslim et', team: 'Taşıma', people: 3, dependsOn: ['m8out'], kind: 'move', from: 'M2', to: 'M8' },
  { id: 'm3clear', areaId: 'M3', day: 1, hour: 9, durationHours: 2, label: 'İnşaat malzemeleri ve seramikleri M1’e taşı', team: 'İnşaat', people: 2, dependsOn: ['pre'], kind: 'move', from: 'M3', to: 'M1' },
  { id: 'm2strip', areaId: 'M2', day: 1, hour: 13, durationHours: 5, label: 'Fiber kolon kaplaması / profil sökümü; parke söküm başlangıcı', team: 'Söküm', people: 3, dependsOn: ['m2out'], kind: 'work' },
  { id: 'M5n', areaId: 'M5', day: 1, hour: 8, durationHours: 5, label: 'Alçıpan niş ve raf / servant taşıyıcı takviyeleri', team: 'Alçıpan M5', people: 2, dependsOn: [], kind: 'work' },
  { id: 'M6n', areaId: 'M6', day: 1, hour: 8, durationHours: 5, label: 'Alçıpan niş ve raf / servant taşıyıcı takviyeleri', team: 'Alçıpan M6', people: 2, dependsOn: [], kind: 'work' },
  { id: 'm7paint1', areaId: 'M7', day: 1, hour: 8, durationHours: 4, label: 'Kepenk üstü ahşap hazırlık ve ilk kat boya', team: 'Boya', people: 1, dependsOn: [], kind: 'work' },
  { id: 'waste', areaId: 'M2', day: 1, hour: 18, durationHours: 2, label: 'Söküm atıkları paketleme ve dışarı sevk', team: 'Taşıma', people: 2, dependsOn: ['m2strip'], kind: 'move', from: 'M2', to: 'OUT' },
  { id: 'm2base', areaId: 'M2', day: 2, hour: 8, durationHours: 3, label: 'Kalan parke sökümü; alt zemin ve kot kontrolü / lokal hazırlık', team: 'Zemin', people: 3, dependsOn: ['waste'], kind: 'work' },
  { id: 'tilein', areaId: 'M2', day: 2, hour: 11, durationHours: 1, label: 'M1’deki seramiği çalışma cephesine aktar', team: 'Taşıma', people: 2, dependsOn: ['m2base', 'm3clear'], kind: 'move', from: 'M1', to: 'M2' },
  { id: 'tiles', areaId: 'M2', day: 2, hour: 12, durationHours: 16, label: 'Seramik döşeme ve kolon çevresi bitişleri', team: 'Seramik', people: 3, dependsOn: ['tilein'], kind: 'work' },
  { id: 'm3clean', areaId: 'M3', day: 2, hour: 8, durationHours: 2, label: 'Alan temizliği ve teslim', team: 'İnşaat', people: 2, dependsOn: ['m3clear'], kind: 'work' },
  { id: 'steel', areaId: 'M3', day: 2, hour: 10, durationHours: 2, label: 'Paslanmaz grupları kabul et / koru', team: 'Sevk + montaj', people: 2, dependsOn: ['m3clean'], kind: 'move', from: 'OUT', to: 'M3' },
  { id: 'm4strip', areaId: 'M4', day: 2, hour: 8, durationHours: 3, label: 'Banko sökümü; bağlantıları güvenli ayır', team: 'Mobilya + tesisat', people: 3, dependsOn: ['m9in'], kind: 'work' },
  { id: 'm8cut', areaId: 'M8', day: 2, hour: 11, durationHours: 5, label: 'M4 tablasını revize et; ahşap kesim ve alıştırma', team: 'Mobilya', people: 2, dependsOn: ['m4strip', 'm8out'], kind: 'work' },
  { id: 'agt', areaId: 'M4', day: 2, hour: 11, durationHours: 5, label: 'Banko arkası AGT uygulaması', team: 'Mobilya M4', people: 2, dependsOn: ['m4strip'], kind: 'work' },
  { id: 'M5p', areaId: 'M5', day: 2, hour: 8, durationHours: 4, label: 'Alçı sıva / yüzey düzeltme', team: 'Alçı M5', people: 1, dependsOn: ['M5n'], kind: 'work' },
  { id: 'M6p', areaId: 'M6', day: 2, hour: 8, durationHours: 4, label: 'Alçı sıva / yüzey düzeltme', team: 'Alçı M6', people: 1, dependsOn: ['M6n'], kind: 'work' },
  { id: 'm7paint2', areaId: 'M7', day: 2, hour: 8, durationHours: 4, label: 'Kepenk üstü ahşap son kat', team: 'Boya', people: 1, dependsOn: ['m7paint1'], kind: 'work' },
  { id: 'm3door', areaId: 'M3', day: 3, hour: 8, durationHours: 2, label: 'Giriş kapısı montajı; sevk geçişini kontrollü kapat', team: 'Kapı', people: 2, dependsOn: ['steel'], kind: 'work' },
  { id: 'm3install', areaId: 'M3', day: 3, hour: 10, durationHours: 7, label: 'Paslanmaz / servis kurulumu ve mekanik montaj', team: 'Mekanik + montaj', people: 3, dependsOn: ['m3door'], kind: 'work' },
  { id: 'display', areaId: 'M4', day: 3, hour: 8, durationHours: 2, label: 'Teşhir dolabı ve benmari kabul / sevk', team: 'Sevk', people: 2, dependsOn: ['agt'], kind: 'move', from: 'OUT', to: 'M4' },
  { id: 'counter', areaId: 'M4', day: 3, hour: 10, durationHours: 14, label: 'Banko kurulum ve sabitleme', team: 'Mobilya', people: 3, dependsOn: ['m8cut', 'display'], kind: 'work' },
  { id: 'M5decor', areaId: 'M5', day: 3, hour: 8, durationHours: 6, label: 'Dekoratif duvar uygulaması', team: 'Dekor M5', people: 1, dependsOn: ['M5p'], kind: 'work', gate: 'plaster' },
  { id: 'M6decor', areaId: 'M6', day: 3, hour: 8, durationHours: 6, label: 'Dekoratif duvar uygulaması', team: 'Dekor M6', people: 1, dependsOn: ['M6p'], kind: 'work', gate: 'plaster' },
  { id: 'm9door', areaId: 'M9', day: 3, hour: 8, durationHours: 2, label: 'Kapı montajı; ekipmanları tozdan koru', team: 'Kapı M9', people: 2, dependsOn: ['m9in'], kind: 'work' },
  { id: 'grout', areaId: 'M2', day: 3, hour: 16, durationHours: 3, label: 'Uygun ürün sistemiyle derz, temizlik ve zemin koruma', team: 'Seramik', people: 2, dependsOn: ['tiles'], kind: 'work' },
  { id: 'm1empty', areaId: 'M1', day: 4, hour: 8, durationHours: 1, label: 'Kalan malzemeleri dışarı çıkar; boya için boşalt', team: 'Taşıma', people: 2, dependsOn: ['grout'], kind: 'move', from: 'M1', to: 'OUT' },
  { id: 'm1finish', areaId: 'M1', day: 4, hour: 9, durationHours: 5, label: 'Son kat boya ve rölyef montajı', team: 'Boya + dekor', people: 2, dependsOn: ['m1empty'], kind: 'work' },
  { id: 'm2finish', areaId: 'M2', day: 4, hour: 8, durationHours: 6, label: 'Zemine erişim kontrolü; raf montajı ve son kat boya', team: 'Mobilya + boya', people: 2, dependsOn: ['grout'], kind: 'work', gate: 'cure' },
  { id: 'ddy', areaId: 'M3', day: 4, hour: 9, durationHours: 2, label: 'DDY sevkiyat ve kabul', team: 'Sevk', people: 2, dependsOn: ['m3install'], kind: 'move', from: 'OUT', to: 'M3' },
  { id: 'M5finish', areaId: 'M5', day: 4, hour: 8, durationHours: 4, label: 'Raf montajı ve son kat boya', team: 'Montaj M5', people: 2, dependsOn: ['M5decor'], kind: 'work' },
  { id: 'M6finish', areaId: 'M6', day: 4, hour: 8, durationHours: 6, label: 'Raf, servant montajı ve son kat boya', team: 'Montaj M6', people: 2, dependsOn: ['M6decor'], kind: 'work' },
  { id: 'm7deliver', areaId: 'M7', day: 4, hour: 11, durationHours: 2, label: 'Döşeme ve masa gruplarının kabulü', team: 'Sevk', people: 2, dependsOn: ['m7paint2'], kind: 'move', from: 'OUT', to: 'M7' },
  { id: 'm8clear', areaId: 'M8', day: 4, hour: 14, durationHours: 2, label: 'Tefrişatı korunmuş M2’ye aktar; kesim artıklarını temizle', team: 'Taşıma', people: 2, dependsOn: ['m8cut', 'm2finish'], kind: 'move', from: 'M8', to: 'M2' },
  { id: 'garden', areaId: 'M8', day: 4, hour: 16, durationHours: 3, label: 'Bahçe mobilyası sevkiyatı ve kurulum', team: 'Bahçe montaj', people: 3, dependsOn: ['m8clear', 'm7deliver'], kind: 'move', from: 'OUT', to: 'M8' },
  { id: 'connections', areaId: 'M4', day: 4, hour: 12, durationHours: 2, label: 'Banko elektrik, su / gider bağlantı kontrolü', team: 'Elektrik + mekanik', people: 2, dependsOn: ['counter'], kind: 'work' },
  { id: 'm9return', areaId: 'M9', day: 4, hour: 14, durationHours: 4, label: 'M9’dan M4’e makine taşıma, yerleşim ve bağlantı', team: 'Ekipman + operasyon', people: 3, dependsOn: ['connections', 'm9door'], kind: 'move', from: 'M9', to: 'M4' },
  { id: 'seat', areaId: 'M2', day: 5, hour: 8, durationHours: 4, label: 'Sedir ve sedir arkası montajı', team: 'Mobilya', people: 3, dependsOn: ['m2finish', 'm8clear'], kind: 'work' },
  { id: 'M1clean', areaId: 'M1', day: 5, hour: 8, durationHours: 2, label: 'İnce temizlik', team: 'Temizlik M1', people: 1, dependsOn: ['m1finish'], kind: 'work' },
  { id: 'M2clean', areaId: 'M2', day: 5, hour: 12, durationHours: 2, label: 'İnce temizlik', team: 'Temizlik M2', people: 1, dependsOn: ['seat'], kind: 'work' },
  { id: 'M3clean', areaId: 'M3', day: 5, hour: 8, durationHours: 2, label: 'Şube yerleşimi ve ince temizlik', team: 'Temizlik M3', people: 1, dependsOn: ['ddy'], kind: 'work' },
  { id: 'M4clean', areaId: 'M4', day: 5, hour: 8, durationHours: 2, label: 'Bar düzeni ve ince temizlik', team: 'Temizlik M4', people: 1, dependsOn: ['m9return'], kind: 'work' },
  { id: 'M5clean', areaId: 'M5', day: 5, hour: 8, durationHours: 2, label: 'İnce temizlik', team: 'Temizlik M5', people: 1, dependsOn: ['M5finish'], kind: 'work' },
  { id: 'M6clean', areaId: 'M6', day: 5, hour: 8, durationHours: 2, label: 'İnce temizlik', team: 'Temizlik M6', people: 1, dependsOn: ['M6finish'], kind: 'work' },
  { id: 'M7clean', areaId: 'M7', day: 5, hour: 8, durationHours: 2, label: 'İnce temizlik', team: 'Temizlik M7', people: 1, dependsOn: ['m7deliver'], kind: 'work' },
  { id: 'M8clean', areaId: 'M8', day: 5, hour: 8, durationHours: 2, label: 'İnce temizlik', team: 'Temizlik M8', people: 1, dependsOn: ['garden'], kind: 'work' },
  { id: 'M9clean', areaId: 'M9', day: 5, hour: 8, durationHours: 2, label: 'DDY mutfak düzeni ve temizlik', team: 'Temizlik M9', people: 1, dependsOn: ['m9return'], kind: 'work' },
  { id: 'handover', areaId: 'M4', day: 5, hour: 15, durationHours: 3, label: 'Ekipman testi, kaçak / elektrik kontrolleri, operasyon teslimi', team: 'Operasyon + teknik', people: 3, dependsOn: ['M1clean', 'M2clean', 'M3clean', 'M4clean', 'M5clean', 'M6clean', 'M7clean', 'M8clean', 'M9clean'], kind: 'work' },
]);

const { workdayStartHour, workdayHours } = referenceSettings;

/** Çalışma saatini takvim saatine çevirir (sitedeki `real`). Gün sonu 20:00'de kalır. */
function toCalendarHour(workHour) {
  if (workHour > 0 && workHour % workdayHours === 0) return (workHour / workdayHours - 1) * 24 + workdayStartHour + workdayHours;
  return Math.floor(workHour / workdayHours) * 24 + workdayStartHour + (workHour % workdayHours);
}

/** Takvim saatini bir sonraki çalışma saatine çevirir (sitedeki `work`). */
function toWorkHour(calendarHour) {
  const day = Math.floor(calendarHour / 24);
  const hour = calendarHour % 24;
  if (hour < workdayStartHour) return day * workdayHours;
  if (hour >= workdayStartHour + workdayHours) return (day + 1) * workdayHours;
  return day * workdayHours + hour - workdayStartHour;
}

/**
 * Sitedeki hesap kuralıyla programı çıkarır: başlangıç = planlanan saat, bağımlılık
 * bitişleri ve (varsa) kür/alçı beklemesinin en geç olanı. Sıra sitedeki gibi girdi
 * sırasıdır; bağımlılık her zaman önce tanımlanır.
 * @returns {{ id: string, startHour: number, endHour: number, plannedHour: number }[]}
 */
export function scheduleReferenceProgram(tasks = referenceTasks, settings = referenceSettings) {
  const byId = new Map();
  return tasks.map((task) => {
    const plannedHour = (task.day - 1) * workdayHours + task.hour - workdayStartHour;
    let startHour = plannedHour + (task.id === 'tiles' ? settings.tileDelayHours : 0);
    for (const dependencyId of task.dependsOn) {
      const dependency = byId.get(dependencyId);
      if (!dependency) throw new Error(`Referans iş ${task.id}: "${dependencyId}" kendisinden önce tanımlanmalı.`);
      startHour = Math.max(startHour, dependency.endHour);
      if (task.gate) {
        const wait = task.gate === 'cure' ? settings.cureHours : settings.plasterHours;
        startHour = Math.max(startHour, toWorkHour(toCalendarHour(dependency.endHour) + wait));
      }
    }
    const entry = { id: task.id, plannedHour, startHour, endHour: startHour + task.durationHours };
    byId.set(task.id, entry);
    return entry;
  });
}

/** "2. gün 11:00" biçimi. end=true iken gün sonu bir önceki günün 20:00'si yazılır. */
export function formatWorkHour(workHour, { end = false } = {}) {
  let day = Math.floor(workHour / workdayHours);
  let hour = workdayStartHour + (workHour % workdayHours);
  if (end && workHour > 0 && workHour % workdayHours === 0) {
    day -= 1;
    hour = workdayStartHour + workdayHours;
  }
  const whole = Math.floor(hour);
  const minutes = Math.round((hour - whole) * 60);
  return `${day + 1}. gün ${String(whole).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
