/**
 * BİRLİKTE-04: Ölçülü plan, kapılar, sabit engeller ve çalışma noktaları alınacak.
 * Navigasyon henüz uygulanmadı. Mantıksal areaId, fiziksel bir konum değildir.
 * Rota bulunamazsa duvar içinden düz çizgi veya rastgele hareket üretmeyeceğiz.
 *
 * @typedef {object} RouteRequest
 * @property {string} workerId
 * @property {import('../domain/types.js').Point3} from
 * @property {import('../domain/types.js').Point3} to
 * @property {number} clearanceMeters Karakter/taşınan parçanın geçiş açıklığı.
 * @property {number} timelineMinute Geçici kapalı bölgeleri değerlendirmek için.
 *
 * @typedef {object} NavigationContext
 * @property {string} geometryRevision
 * @property {string[]} closedAreaIds Kuruma/imalat nedeniyle kapalı alanlar.
 *
 * @typedef {{ status: 'ready', points: import('../domain/types.js').Point3[] } |
 * { status: 'blocked'|'unavailable', reason: string }} RouteResult
 *
 * @typedef {(request: RouteRequest, context: NavigationContext) => RouteResult} PlanRoute
 */
export {};
