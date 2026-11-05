# 3D ve arayüz için uygulama notları

Bu klasörde kafenin tamamını gösteren WebGL inceleme sahnesi ve onaylı karakter adaptörü bulunur.
- `cafe-scene.js` sahneyi kurar: kamera, alana odaklanma, alan kartı, klavye ve görünüm kaydı.
- `cafe-scene.fragment.html` sahnenin kontrollerini taşır.
- `cafe-scene.page.html` bu parçayı tarayıcıda doğrudan açılan bağımsız sayfaya yerleştirir. Aynı parça Codex sohbetinin önizleme alanında da kullanılabilir.

Takvim zamanı ve çalışma hareketleri bu ekrana henüz bağlanmadı.

## Sahne parçaları

- `three/cafe-view.js`: `src/data/cafe-layout.js` verisinden şunları kurar:
  - döşeme, teras ve seçilebilir M1–M9 plakaları,
  - dış duvarlar (kameraya bakanların üstü kesilir) ve alçak iç bölmeler,
  - camekân, giriş boşluğu, kepenk ve üstündeki ahşap kaplama (M7'nin iş yüzeyi),
  - referans mobilya. Tekrar eden sandalye ve masalar `InstancedMesh` ile çizilir.
- `three/label-sprite.js`: tarayıcıda alan etiketi. Genel bakışta yalnız kod, seçili alanda kod ve ad görünür. Ekrandaki boyutu yakınlıktan bağımsızdır.
- `three/scaffold-view.js`: yedi iskele durumunu model parçalarına çevirir. M2'de tavan işi örneği ve ölçek için durur.
- `three/worker-view.js`: onaylı bodur ustanın bağlantısı (konum/yön, yürüme fazı, el bağlantı noktaları, seçim).

Bütün konumlar pafta pikseli olarak `src/data/cafe-layout.js` içinde tutulur ve `planToWorld` ile metreye çevrilir. AutoCAD ölçüleri geldiğinde değişecek dosya budur.

## Ekleyeceğimiz parçalar

- `characters`: ekipman takma/çıkarma, iş hareketi klipleri ve iki ustanın koordinasyonu. İlk iş: seramik kutusunu taşıma.
- `objects`: Parçalı iskele hazır. Seramik kutuları, döşenmiş zemin, banko gibi imalat durumları eklenecek ve snapshot'a bağlanacak.
- `ui`: altta zaman kontrolü, usta seçimi, takvim ve uyarı gösterimi. Alan kartı hazır.
- `world`: çalışma noktaları ve geçiş yolları (navigasyon sözleşmesiyle birlikte).

Bu adlarla boş dosyalar oluşturulmadı. Somut sorumluluğu olan modül, ilgili aşamada eklenecek.

## Entegrasyon sırası

1. `createSimulation(project)` ile uygulamayı oluştur.
2. Onaylı modele `createWorkerView(THREE, worker)` üzerinden eriş; `root` nesnesini sahneye ekle.
3. Kullanıcı zamanı değiştirdiğinde `simulation.seek(minute)` çağır.
4. Dönen snapshot ile nesne durumlarını ve görev bilgisini güncelle.
5. Her render karesinde ayrı görsel zamanı ve fiziksel hareket verisini `applyMotion` üzerinden uygula.
6. Raycast sonucunda `selectionFromObject(hit.object)` ile usta veya alan kimliğini bul.
7. Sahne kapanırken adaptörleri ve renderer kaynaklarını temizle.

`applyMotion` yalnızca mevcut bekleme/yürüme prototipidir. `carry`, `paint-roll`, `lay-tile` gibi hareketler için henüz uygulama yok; görev durumu tek başına bir 3D çalışma hareketi üretmez.

## Önceki prototipler

`three/legacy/` dosyaları onaylı `output/worker-3d-v2/create-worker.js` ve `output/worker-walking-v1/worker-animator.js` dosyalarının kopyalarıdır; yalnızca modül export'u eklenmiştir. Önceki görselleri yeniden üretebilmek için `output/` dosyaları korunuyor. Bundan sonraki geliştirmede bu klasördeki sürümler esas alınacak.

Three.js 0.160.1, `output/worker-3d-v1/three-0.160.1.min.js` dosyasındadır; bu, global `THREE` tanımlayan son UMD sürümüdür. Node testleri de bu dosyayı kullanır. Kütüphaneyi bir pakete bağlama ve sürüm yükseltme kararı, tam uygulama paketlemesine geçilirken verilecek.

Önizleme, bu Three.js dosyasını ve kaynak modülleri tek dosyada birleştirir. `scripts/lib/preview-bundle.js`:
- girişten (`cafe-scene.js`) başlayıp göreli importları izler, sırayı kendisi çıkarır;
- her modülü ayrı kapsamda çalıştırır;
- yalnızca tek satırlık named import ile `export function|const|let|class` ve `export { … };` biçimlerini destekler;
- başka bir biçimde, olmayan bir adı içe aktarmada veya döngüde hata verir;
- dış kaynak yüklemez.
