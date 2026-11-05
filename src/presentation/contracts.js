/**
 * Sunum portları: Three.js, HTML arayüzü ve ilerideki farklı gösterimler aynı
 * Snapshot'ı tüketir. Bu dosya bir renderer veya animasyon uygulaması değildir.
 *
 * @typedef {object} ScenePresenter
 * @property {(snapshot: import('../domain/types.js').Snapshot) => void} applySnapshot
 * @property {(seconds: number) => void} animate Yerel görsel hareket zamanı.
 * @property {() => void} dispose
 *
 * @typedef {object} MotionFrame
 * @property {import('../domain/types.js').Point3} position
 * @property {number} yawRadians
 * @property {number} distanceMeters Yürüme fazı mesafeden türetilir.
 * @property {number} speedMetersPerSecond
 * @property {number} presentationSeconds Takvim dakikası DEĞİL.
 *
 * BİRLİKTE-05: Seçili görev adımını, işin çalışma noktasına ve role özgü pozu
 * seçen koreografiye bağlayacağız. İki usta aynı adımda farklı roller oynayabilir.
 * BİRLİKTE-06: İleri/geri sarınca devam eden klipleri sıfırlayıp nesne pozlarını
 * snapshot'tan kuracağız; önceki karedeki sahneye güvenmeyeceğiz.
 */
export {};
