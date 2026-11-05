# Arabica şantiye simülatörü

Bu klasör, birlikte adım adım geliştireceğimiz 3D şantiye simülasyonudur. Veri/takvim temeli ve **tek alanın 3D inceleme önizlemesi** hazırdır; tamamlanmış bir kafe simülasyonu değildir.

Onaylı görsel yön: bodur maket ustalar, çatısı açık mekân, yaklaşık 45° kamera, döndürme/yakınlaşma ve usta/alan seçimi. Referans siteden iş programı ve alan mantığı alınacak; arayüz yeniden tasarlanacak.

## Başlangıç

Node.js 22.14 veya üzeri yeterli. Bu aşamada `npm install` gerekmez.

```sh
npm run demo
npm test
npm run check
npm run preview:build
```

`demo`, iki usta ile iskele kurma → tavan tesisatı → iskele sökme örneğini terminalde çalıştırır. İleri gidip geri dönünce aynı nesne durumlarını üretir. Süreler örnektir; gerçek saha programı değildir. `check`, sözdizimini kontrol eder; tip kontrolü veya görsel doğrulama değildir.

Testler, kısıtlı Windows ortamında alt süreç gerektirmemesi için Node'un `--experimental-test-isolation=none` seçeneğiyle tek süreçte çalışır. Sözdizimi kontrolü de `--experimental-vm-modules` ile dosyaları çalıştırmadan ayrıştırır. Bu seçenekler Node'un deneysel özellik uyarılarını gösterebilir.

`preview:build` Python ile mevcut kaynaklardan konuşma içindeki 3D önizlemeyi yeniden üretir. Ağ erişimi veya paket kurulumu kullanmaz. Hedef dosya `m2-calisma-alani.html`; farklı konum için `python scripts/build-pilot-preview.py <hedef-dosya>` kullanılabilir.

## Dosyalarda nereden başlayacağız?

| Konu | Dosya / klasör | Bugünkü durum |
| --- | --- | --- |
| Mimari ve kararlar | `docs/architecture.md` | Katman sınırları ve veri akışı yazıldı |
| Birlikte ilerleme planı | `docs/roadmap.md` | Sıralı işler ve tamamlanma ölçütleri yazıldı |
| Veri sözleşmeleri | `src/domain/types.js` | Proje, alan, usta, iş, nesne ve anlık durum |
| Meslek / hareket kataloğu | `src/domain/catalogs.js` | Sekiz meslek; hazır ve planlanan hareket ayrımı |
| İskele iş dizisi | `src/domain/workflows/scaffold.js` | Kurulum/söküm adımları ve durum değişimleri |
| Örnek proje | `src/data/pilot-project.js` | M1–M9 kimlikleri, tek alanda iki usta |
| Takvim çekirdeği | `src/simulation/` | Bağımlılık, vardiya, anlık durum ve çakışma kontrolü |
| Uygulama girişi | `src/app/create-simulation.js` | `seek`, `getSnapshot`, `rebuild` |
| Onaylı model bağlantısı | `src/presentation/three/worker-view.js` | Mevcut bekleme/yürüme adaptörü |
| Tek alan yerleşimi | `src/data/pilot-layout.js` | Örnek ölçüler, giriş, malzeme ve iskele konumları |
| 3D önizleme | `src/presentation/pilot-scene.js` | 45° kamera, döndürme/yakınlaşma, otomatik duvar kesiti |
| Parçalı iskele | `src/presentation/three/scaffold-view.js` | Parçalar → kurulu model; işçi kurulum animasyonu henüz yok |
| Sonraki 3D / arayüz işleri | `src/presentation/README.md` | Uygulama sırası ve eksik parçalar |
| Gerçek rota / kapalı alanlar | `src/navigation/contracts.js` | Sözleşme hazır; rota motoru henüz yok |

Kaynakta `BİRLİKTE-` araması, karar vereceğimiz yerleri gösterir. `output/` içindeki önceki görseller, GLB ve hareket denemeleri referans olarak korunmuştur.

## Bu aşamanın sınırı

Referans sitedeki 52 iş henüz aktarılmadı. İlk M2 görünümü 8,4 × 6,6 m varsayımsal alandır; gerçek planın yeniden çizimi değildir. Mobil iskele 2,2 × 1,35 m, platform yüksekliği 1,22 m olarak modellenmiştir. Usta bu adımda sabit ölçek referansıdır. Model aşaması seçimi takvimde zaman ilerletmez.

Gerçek ölçülü kafe geometrisi, mesleklere özgü ekipman/hareketler, engelleri izleyen yürüyüş, iş takvimi arayüzü ve çoklu karakter performans çalışması sonraki adımlardır. Mevcut kapalı yürüyüş rotası yeni çekirdeğe gerçek navigasyon olarak taşınmadı.

Sıradaki çalışma: **ustanın eline parça alması, taşıması ve bırakması**. İlk iş hareketini bu alanda doğruladıktan sonra iki ustanın iskele kurulumuna geçeceğiz.
