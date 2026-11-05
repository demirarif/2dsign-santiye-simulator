/**
 * Uygulamanın ortak veri sözleşmeleri. Burada DOM veya Three.js nesnesi bulunmaz.
 * JSDoc sayesinde editör tamamlaması elde ediyoruz; başlangıç için derleyici veya
 * paket kurulumu gerekmiyor. İleride TypeScript'e geçiş bu sınırları değiştirmez.
 *
 * Bütün kimlikler kalıcıdır. Etiketler değişebilir; M1–M9 gibi kimlikler değişmez.
 * Zaman: proje başlangıç gününün 00:00 anından itibaren dakika.
 * Konum: metre; Y yukarı, zemin XZ düzlemi; karakterin önü yerel +Z.
 */

/** @typedef {{ workStartMinute: number, workEndMinute: number }} Calendar */
/** @typedef {{ id: string, label: string }} Area */

/**
 * @typedef {object} Worker
 * @property {string} id
 * @property {string} name
 * @property {string} tradeId Meslek; animasyon klibinin adı değildir.
 * @property {string} homeAreaId Görev dışındaki varsayılan alan.
 * @property {string} appearanceId Onaylı görsel model kaydı.
 */

/**
 * İskele, boru grubu, duvar gibi kalıcı şantiye nesnesi.
 * Model dosyaları ve geometriler bu kayıtta tutulmaz.
 * @typedef {object} SiteObject
 * @property {string} id
 * @property {string} kind
 * @property {string} areaId
 * @property {string} initialState
 * @property {string[]} states İzin verilen anlamsal durumlar.
 */

/** @typedef {{ objectId: string, state: string }} ObjectEffect */

/**
 * Bir işin sıralı alt adımı. Süreleri görev süresini oluşturur; ikinci bir toplam yok.
 * Efektler adım tamamlandığında uygulanır. Ara hareketi sunum katmanı gösterir.
 * @typedef {object} TaskStep
 * @property {string} id Görev içinde benzersiz.
 * @property {string} label
 * @property {string} actionId Hareket kataloğuna bağlanır; klip henüz hazır olmayabilir.
 * @property {number} durationMinutes
 * @property {ObjectEffect[]} [effects]
 */

/**
 * @typedef {object} Task
 * @property {string} id
 * @property {string} label
 * @property {string} areaId
 * @property {string[]} workerIds İlk sürümde ekipler açıkça atanır.
 * @property {string[]} resourceIds Proje nesnesi kimlikleri; görev boyunca rezerve edilir.
 * @property {string[]} dependsOn Tamamlanmadan başlayamayacak görevlerin kimlikleri.
 * @property {number} [earliestStartMinute]
 * @property {'working'|'elapsed'} clock Vardiya süresi / kesintisiz takvim süresi.
 * @property {TaskStep[]} steps
 */

/**
 * @typedef {object} Project
 * @property {string} id
 * @property {string} name
 * @property {Calendar} calendar İlk sürümde her gün aynı vardiya; tatil takvimi sonraki adım.
 * @property {Area[]} areas
 * @property {Worker[]} workers
 * @property {SiteObject[]} objects
 * @property {Task[]} tasks
 */

/** @typedef {{ id: string, startMinute: number, endMinute: number }} ScheduledStep */
/** @typedef {{ id: string, startMinute: number, endMinute: number, steps: ScheduledStep[] }} ScheduledTask */
/** @typedef {{ tasks: ScheduledTask[], startMinute: number, endMinute: number }} Schedule */

/**
 * @typedef {object} TaskSnapshot
 * @property {string} id
 * @property {'pending'|'active'|'paused'|'complete'} status
 * @property {number} progress 0..1; animasyon karesinden bağımsızdır.
 * @property {string} [activeStepId]
 */

/**
 * @typedef {object} WorkerSnapshot
 * @property {string} id
 * @property {'idle'|'working'|'waiting'} status
 * @property {string} areaId Mantıksal görev alanı; fiziksel rota veya konum değildir.
 * @property {string} [taskId]
 * @property {string} [actionId]
 * @property {number} [actionProgress]
 */

/**
 * @typedef {object} Snapshot
 * @property {number} timelineMinute
 * @property {TaskSnapshot[]} tasks
 * @property {WorkerSnapshot[]} workers
 * @property {{ id: string, areaId: string, state: string }[]} objects
 */

/** @typedef {{ x: number, y: number, z: number }} Point3 */
/** @typedef {{ kind: 'worker'|'area'|'object', id: string } | null} Selection */

// Bu dosya yalnızca sözleşmeleri dışa açar; uygulama durumu saklamaz.
export {};
