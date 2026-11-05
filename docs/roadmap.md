# Birlikte ilerleme planı

Her adım küçük, gösterilebilir bir sonuç üretir. Bir sonraki iş türüne geçmeden önce ilk işin görünümü ve davranışı üzerinde anlaşacağız.

## Mevcut durum

Adım 0 ve Adım 1 tamamlandı. Kafenin tamamı paftadan yaklaşık ölçülerle 3D'de kuruldu:
- M1–M9, teras, camekân ve ana giriş, kepenk.
- Banko, mutfak ve referans mobilya.

Kullanıcı bir alana tıklayınca kamera o alana odaklanıyor. Alan kartı referans programdan geliyor ve o alandaki işleri sitedeki saatlerle listeliyor (52 iş). Ölçek, M2'nin "108 m² tavan" notundan çıkarıldı; AutoCAD dosyasıyla kesinleşecek. Ayrıntı: `docs/referans/README.md`.

Doğrulama: 59 otomatik test geçiyor. Bunlar yerleşimin iç tutarlılığını, program saatlerini, duvar ve açıklıkları, alan seçimini ve paketleyiciyi kapsıyor. Görünüm masaüstü, koyu tema ve 360 px telefon genişliğinde ekran görüntüsüyle incelendi. Sıradaki adım 2: seramik kutusu taşıma.

Çalışma ortamı (5 Kasım 2026): Proje GitHub deposunda. `npm start` önizlemeyi `http://localhost:5173` adresinde yayınlıyor ve kaynak değişince sayfayı kendiliğinden yeniliyor. Ekran görüntüleri `npm run preview:capture` ile cihaz öykünmesi altında alınıyor.

Yol haritası referans programa göre 5 Kasım'da yeniden sıralandı. Önceki sıradaki iskele kurulumu ve tavan tesisatı adımları gerçek programda yok; parçalı iskele modeli M2'de tavan işi örneği olarak duruyor.

| Adım | Üreteceğimiz sonuç | Tamam sayma ölçütü |
| --- | --- | --- |
| 0 — Temel ✓ | Veri sözleşmeleri, takvim, örnek iş dizisi, model adaptörü | Çekirdek testler ve örnek program çalışıyor |
| 1 — Kafe yerleşimi ✓ | Paftadan M1–M9, teras, duvar/camekân/kepenk, referans mobilya; alan seçimi ve alan kartı | 45° kamera, döndürme/yakınlaşma; paftayla örtüşüyor; AutoCAD ile kesinleşecek |
| 2 — İlk iş hareketi | "M1'deki seramiği çalışma cephesine aktar": usta kutuyu M1'den alır, M2'ye taşır, bırakır | Kutu elde kaymıyor; yürüme, durma ve eğilme geçişleri okunuyor; ileri/geri sarınca aynı poz |
| 3 — Program 3D'de | 52 iş simülasyon çekirdeğinde; beş günlük zaman çizelgesi, oynat/duraklat; alan durumları (bekliyor, çalışma, taşıma, kür, tamamlandı); "şu an sahada" listesi | Zaman, 3D ve panel aynı durumu gösteriyor; saatler referans siteyle birebir |
| 4 — Rota ve sevkiyat | Kapı ve koridor ağı, M8 lojistik girişi; taşıma işlerinde ustalar geçilebilir yollardan yürür | Ustalar duvarlardan geçmiyor; kapanan geçiş (ör. M3 kapı montajı) anlaşılır |
| 5 — Meslek hareketleri | Söküm, seramik döşeme, boya, mobilya montajı ve sevk kabulü için ilk temsilî hareketler | Her iş türünün ekipmanı ve anlaşılır hareketi var |
| 6 — İmalat durumları | Parkeden seramiğe geçiş, banko söküm ve kurulumu, teras mobilyasının çıkışı ve yenisinin girişi gibi görünür değişimler | Seçili zamanda görünen imalat programla uyuşuyor; geri sarma doğru |
| 7 — Çoklu ekip | Eşzamanlı çalışan ustalar (sitedeki kapasite sınırı 18 kişi) | Hedef cihazlarda akıcı; usta sayısı kararı verilmiş |

## Henüz karara bağlanmayanlar

- Kesin ölçüler: AutoCAD dosyası kullanıcıda, gerektiğinde istenecek. Doğrulanacak yorumlar `docs/referans/README.md` içinde.
- M2'deki 108 m² tavan işinin programa girip girmeyeceği; girerse hangi iskele tipiyle yapılacağı.
- Gün/saat hızlandırılırken hareketlerin ne kadar ayrıntılı gösterileceği.
- Usta sayısının programdaki kişi sayısını birebir mi temsil edeceği.
- Aynı alandaki işler için fiziksel çalışma kapasitesi ve geçiş kapanmaları.
- Sedirli mor oturma nişinin hangi alana ait olduğu.
- İleride projeyi kaydetme/paylaşma gereksinimi; buna göre kalıcı kayıt ve yayınlama.

Bunları sırayla ele alacağız; kod iskeletini kullanmak için tümüne bugün cevap vermek gerekmiyor.

## Verilen kararlar

Geçici kararlar gerçek veri gelince yeniden değerlendirilir.

| Tarih | Karar | Gerekçe |
| --- | --- | --- |
| 2026-11-05 | Ölçek paftadan çıkarıldı: 1 px ≈ 0,057 m. Bu, önceki 8,4 × 6,6 m varsayımlı odanın yerini aldı. *Geçici.* | Paftadaki "108 m² M2 tavan" notu tek ölçek çapası; kapı ve masa ölçüleri ±%10 tutarlı. AutoCAD gelince yalnızca `src/data/cafe-layout.js` değişir. |
| 2026-11-05 | İlk taşıma hareketi seramik kutuları: M1'den M2'ye (programdaki `tilein`). Bu, "iskele yan çerçevesi" kararının yerini aldı. | Referans programda M2'de iskele işi yok; M1'deki iskele 1. günden önce bitmiş sayılıyor. Taşıma programdaki en sık iş türü (52 işin 14'ü). |
| 2026-11-05 | Çekiç kemer askısında durur; yalnızca çakma/sabitleme hareketlerinde ele alınır. | Taşıma ve iki elle yapılan işlerde eller boş olmalı; ustanın onaylı görünümü korunur. |
| 2026-11-05 | Yol haritası referans programa göre yeniden sıralandı (yukarıdaki tablo). | Programın omurgası taşıma, söküm, seramik, banko ve sevkiyat; iskele/tavan örneği gerçek programda yok. |
| 2026-11-05 | Pafta görseli depoya konmaz; yerel kopya `docs/referans/yerel/` altında kalır. | Paftada telif koruma notu var ve depo herkese açık. |
| 2026-11-05 | Varsayılan kamera güneydoğudan 45° yön ve 45° eğimle bakar; genel bakışta etiketlerde yalnız alan kodu görünür. | Onaylı "yaklaşık 45° kamera" yönü; pafta kuzeyi ekranın üstüne yakın kalır, etiketler çakışmaz. |
| 2026-11-05 | Adım 2'de hareket dizisi kendi %0–100 ilerleme kaydırıcısıyla incelenir; takvim zamanına Adım 3'te bağlanır. | Hareket kalitesi takvim arayüzünden bağımsız doğrulanabilmeli. |
| 2026-11-05 | Her adım ayrı dal ve pull request ile ilerler; PR açıklaması o adımın brief'idir. | Her molada gözden geçirilebilen ve gerekirse geri alınabilen bir kayıt kalır. |
| 2026-11-05 | ~~Paketli iskele parçaları malzeme köşesinde başlar.~~ Askıya alındı. | İskele programda yok; M2'de ölçek ve tavan işi örneği olarak kurulu duruyor. |

## Kaynaktaki çalışma notları

- `BİRLİKTE-01/02`: İskele parçaları ve iki ustanın rolleri (tavan işi programa girerse).
- `BİRLİKTE-03`: Örnek veriden gerçek proje verisine geçiş. Referans program `src/data/reference-program.js` içinde hazır.
- `BİRLİKTE-04`: Ölçülü geometri ve navigasyon. Yaklaşık geometri `src/data/cafe-layout.js` içinde.
- `BİRLİKTE-05/06`: İş hareketleri ve zaman atlamasında sahneyi yeniden kurma.

## Her yeni iş için dolduracağımız kart

1. Alan, öncül işler ve hazır olması gereken nesneler.
2. Ekip, roller, araçlar ve taşınan malzemeler.
3. Alt adımlar; gerçek süre ve vardiya/bekleme ayrımı.
4. Her adım sonunda mekânda/nesnede değişen şey.
5. Çalışma noktaları, geçiş yolları ve kapanacak bölgeler.
6. Gerekli hareketler; eksik model/animasyon listesi.
7. İleri sarma, geri sarma ve gecikme kontrolü.
