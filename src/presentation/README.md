# 3D ve arayüz için uygulama notları

Bu klasörde onaylı karakter adaptörü ve tek alanın WebGL inceleme sahnesi çalışır. `pilot-scene.js` sahneyi kurar; `pilot-scene.fragment.html` sahnenin kontrollerini taşır. `pilot-scene.page.html` bu parçayı tarayıcıda doğrudan açılan bağımsız sayfaya yerleştirir; aynı parça Codex sohbetinin önizleme alanında da kullanılabilir. Takvim ile çalışma hareketleri bu ekrana henüz bağlanmadı.

`three/room-view.js` örnek alanı veriden üretir, kamera tarafındaki duvarları keser. `three/scaffold-view.js` yedi iskele durumunu model parçalarına çevirir. Konumlar ve örnek ölçüler `src/data/pilot-layout.js` içindedir.

## Ekleyeceğimiz parçalar

- `scene`: Mevcut `pilot-scene.js` içinden genel sahne yaşam döngüsü, tam uygulama gerektiğinde ayrılacak.
- `world`: Mevcut M2 örneği, ölçülü M1–M9 verisine genişleyecek; kapılar ve çalışma noktaları belirlenecek.
- `objects`: Parçalı iskele hazır. Boru, kablo, duvar/zemin imalatları eklenecek; snapshot bağlantısı kurulacak.
- `characters`: Ekipman takma/çıkarma, iş hareketi klipleri ve iki ustanın koordinasyonu.
- `ui`: Altta zaman kontrolü; tıklanan usta/alan için bilgi paneli; takvim ve uyarı gösterimi.

Bu adlarla boş dosyalar oluşturulmadı. İlgili aşamada somut sorumluluğu olan modül eklenecek.

## Entegrasyon sırası

1. `createSimulation(project)` ile uygulamayı oluştur.
2. Onaylı modele `createWorkerView(THREE, worker)` üzerinden eriş; `root` nesnesini sahneye ekle.
3. Kullanıcı zamanı değiştirdiğinde `simulation.seek(minute)` çağır.
4. Dönen snapshot ile nesne durumlarını ve görev bilgisini güncelle.
5. Her render karesinde ayrı görsel zamanı ve fiziksel hareket verisini `applyMotion` üzerinden uygula.
6. Raycast sonucunda `selectionFromObject(hit.object)` ile usta kimliğini bul.
7. Sahne kapanırken adaptörleri ve renderer kaynaklarını temizle.

`applyMotion` yalnızca mevcut bekleme/yürüme prototipidir. `paint-roll`, `connect-pipe`, `climb` gibi hareketler için henüz uygulama yoktur. İlk pilotta bile görev anlık durumu, tek başına bir 3D çalışma hareketi üretmez.

## Önceki prototipler

`three/legacy/` dosyaları onaylı `output/worker-3d-v2/create-worker.js` ve `output/worker-walking-v1/worker-animator.js` kopyalarıdır; yalnızca modül export'u eklenmiştir. Önceki görselleri yeniden üretmek için `output/` dosyaları korunur. Uygulama geliştirmesinde bundan sonra bu klasördeki sürümler esas alınacak.

Three.js 0.160.1 prototip dosyası `output/worker-3d-v1/three-0.160.1.min.js` içindedir. Node adaptör testi bu yerel dosyayı kullanır. Kütüphaneyi 3D ekranın paketine bağlama ve sürüm yükseltme kararı sahne aşamasındadır.

Önizleme, aynı yerel Three.js sürümünü ve kaynak modülleri tek dosyada birleştirir. `scripts/lib/preview-bundle.js` girişten (`pilot-scene.js`) başlayarak göreli importları izler, sırayı kendisi çıkarır ve her modülü ayrı kapsamda çalıştırır. Yalnızca tek satırlık named import ile `export function|const|let|class` ve `export { … };` biçimlerini destekler; başka bir biçimde, olmayan bir adı içe aktarmada veya döngüde hata verir. Dış kaynak yüklemez. Tam uygulama paketlemesine geçerken bu araç değiştirilebilir.
