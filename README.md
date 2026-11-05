# Arabica şantiye simülatörü

Arabica Coffee House (CEPA) yenileme işinin 3D şantiye simülasyonu; birlikte adım adım geliştiriliyor. Bugün hazır olanlar:
- Veri/takvim çekirdeği.
- **Kafenin tamamının paftadan yaklaşık ölçülerle kurulmuş 3D yerleşimi:** M1–M9 alanları, teras, camekân, kepenk, banko, mutfak ve referans mobilya.
- Referans sitedeki 52 işlik beş günlük programın aktarımı.

Ustalar henüz programa göre hareket etmiyor; tamamlanmış bir simülasyon değildir.

Onaylı görsel yön: bodur maket ustalar, çatısı açık mekân, yaklaşık 45° kamera, döndürme/yakınlaşma ve usta/alan seçimi. İş programı ve alan mantığı referans siteden alınıyor; arayüz yeniden tasarlanıyor.

## Başlangıç

Node.js 22.14 veya üzeri yeterli; `npm install` ya da Python gerekmez.

```sh
npm start                # lokal önizleme: http://localhost:5173 (değişince kendiliğinden yenilenir)
npm test                 # çekirdek, yerleşim, program, sahne ve paketleyici testleri
npm run check            # sözdizimi kontrolü
npm run demo             # örnek iş programını terminalde çalıştırır
npm run preview:build    # önizlemeyi tek dosya olarak dist/index.html'e yazar
npm run preview:capture  # önizlemenin ekran görüntüsünü alır (Chrome veya Edge gerekir)
```

`demo`, iki usta ile iskele kurma → tavan tesisatı → iskele sökme örneğini terminalde çalıştırır. İleri gidip geri dönünce aynı nesne durumlarını üretir. Süreler örnektir; gerçek saha programı değildir. `check` yalnızca sözdizimini kontrol eder; tip kontrolü veya görsel doğrulama yapmaz.

Testler `--experimental-test-isolation=none` seçeneğiyle tek süreçte çalışır; bu, alt süreç açılamayan kısıtlı Windows ortamı için seçilmişti. Sözdizimi kontrolü de `--experimental-vm-modules` ile dosyaları çalıştırmadan ayrıştırır. Bu seçenekler Node'un deneysel özellik uyarılarını gösterebilir.

### Önizleme

`npm start` sayfayı yalnızca bu bilgisayardan erişilen `http://localhost:5173` adresinde yayınlar. `src/` altında bir dosya değişince sayfayı yeniden derler ve açık sekmeleri yeniler; derleme hatası sayfada kırmızı şeritle görünür. Yenilemede kamera açısı ve seçili alan korunur. Port doluysa sıradaki boş port seçilir.

`preview:build`, ağ bağlantısı gerektirmeyen tek dosyalık bir sayfa üretir; `dist/index.html` dosyasına çift tıklamak yeterlidir. `dist/` git'e girmez. Codex sohbetinde göstermek için belge iskeleti olmayan parça da üretilebilir: `npm run preview:build -- --fragment --out <hedef-dosya>`.

Adres satırıyla başlangıç görünümü verilebilir: `?zone=M2&yaw=30&pitch=40&zoom=150&tint=0&worker=0&stage=braced`.

`preview:capture`, sayfayı başsız Chrome/Edge'de gerçek cihaz öykünmesiyle açar ve sahne hazır olunca görüntü alır. Sayfada hata yakalanırsa komut başarısız olur.

```sh
npm run preview:capture -- --out dist/captures/genel.png
npm run preview:capture -- --query "zone=M2" --out dist/captures/m2.png
npm run preview:capture -- --dark --out dist/captures/koyu.png
npm run preview:capture -- --width 360 --height 800 --scale 2 --full --out dist/captures/mobil.png
```

Tarayıcı bulunamazsa yolu `CHROME_PATH` ortam değişkeniyle verilebilir.

## Dosyalarda nereden başlayacağız?

| Konu | Dosya / klasör | Bugünkü durum |
| --- | --- | --- |
| Mimari ve kararlar | `docs/architecture.md` | Katman sınırları ve veri akışı |
| Birlikte ilerleme planı | `docs/roadmap.md` | Sıralı işler, tamamlanma ölçütleri ve verilen kararlar |
| Referans kaynaklar | `docs/referans/README.md` | Referans site, pafta, ölçek çıkarımı ve sınırlar |
| Kafe yerleşimi | `src/data/cafe-layout.js` | Pafta pikseli + ölçek; alanlar, duvarlar, açıklıklar, mobilya |
| Referans program | `src/data/reference-program.js` | 52 iş, ekipler, bağımlılıklar ve sitenin zamanlama kuralı |
| 3D kafe | `src/presentation/three/cafe-view.js` | Döşeme, alanlar, kesitli duvarlar, camekân, kepenk, mobilya |
| Sahne | `src/presentation/cafe-scene.js` | 45° kamera, alana odaklanma, alan kartı, klavye kontrolü |
| Önizleme sayfası | `src/presentation/cafe-scene.page.html` | Tarayıcı kabuğu; açık/koyu tema ve dar ekran düzeni |
| Önizleme paketleme | `scripts/lib/preview-bundle.js` | Girişten bağımlılıkları izler; modülleri ayrı kapsamda paketler |
| Lokal sunucu | `scripts/serve-preview.js` | Derle, yayınla, değişince yenile |
| Veri sözleşmeleri | `src/domain/types.js` | Proje, alan, usta, iş, nesne ve anlık durum |
| Meslek / hareket kataloğu | `src/domain/catalogs.js` | Sekiz meslek; hazır ve planlanan hareket ayrımı |
| İskele iş dizisi | `src/domain/workflows/scaffold.js` | Kurulum/söküm adımları ve durum değişimleri |
| Örnek proje | `src/data/pilot-project.js` | Çekirdeği sınayan iskele + tavan örneği; gerçek program değil |
| Takvim çekirdeği | `src/simulation/` | Bağımlılık, vardiya, anlık durum ve çakışma kontrolü |
| Uygulama girişi | `src/app/create-simulation.js` | `seek`, `getSnapshot`, `rebuild` |
| Onaylı model bağlantısı | `src/presentation/three/worker-view.js` | Bekleme/yürüme adaptörü, el bağlantı noktaları |
| Parçalı iskele | `src/presentation/three/scaffold-view.js` | Yedi aşama; kurulum animasyonu henüz yok |
| Sonraki 3D / arayüz işleri | `src/presentation/README.md` | Uygulama sırası ve eksik parçalar |
| Gerçek rota / kapalı alanlar | `src/navigation/contracts.js` | Sözleşme hazır; rota motoru henüz yok |

Kaynakta `BİRLİKTE-` araması, karar vereceğimiz yerleri gösterir. `output/` içindeki önceki görseller, GLB ve hareket denemeleri referans olarak korunuyor.

## Depo ve çalışma düzeni

Depo: <https://github.com/demirarif/2dsign-santiye-simulator>. Her adım ayrı bir dalda geliştirilir ve pull request ile `main`'e alınır. PR açıklaması adımın özetini, nasıl doğrulandığını ve ekran görüntülerini içerir; görseller `docs/gorseller/` altında saklanır. Verilen kararlar `docs/roadmap.md` içindeki listede tutulur.

## Bu aşamanın sınırı

Yerleşim, ölçeksiz pafta görselinden çıkarıldı. Paftadaki "108 m² M2 tavan" notu ölçek çapası olarak kullanıldı (1 px ≈ 5,7 cm). Kapı ve masa ölçüleri bununla ±%10 tutarlı; yine de kesin ölçü değildir. Hangi çizginin duvar, hangisinin alan sınırı olduğu paftadan yorumlandı; ayrıntısı `docs/referans/README.md` içinde. Mobilyalar referans yerleşimdir, imalat anlamına gelmez. M2'deki iskele ve usta ölçek içindir; iskele aşaması seçimi takvimde zaman ilerletmez.

52 iş veri olarak aktarıldı ve alan kartlarında sitedeki saatlerle görünüyor. Bunlar henüz simülasyon çekirdeğine (usta, kaynak, alt adım) bağlanmadı; ustalar programa göre hareket etmiyor.

Sıradaki çalışma: **ilk iş hareketi.** Programdaki "M1'deki seramiği çalışma cephesine aktar" işinde usta seramik kutusunu M1'den alıp M2'ye taşıyacak ve bırakacak.
