# Birlikte ilerleme planı

Her adım küçük, gösterilebilir bir sonuç üretir. Bir sonraki mesleğe geçmeden önce ilk işin görünümü ve davranışı üzerinde anlaşacağız.

## Mevcut durum

Adım 0 tamamlandı. Adım 1'in **örnek ölçülü önizlemesi hazır**: zemin, dört yönde kesit duvarları, açık giriş, malzeme köşesi, parçalı mobil iskele ve ölçek ustası. Kamera döndükçe yakın duvarlar alçalır. İskele aşamaları model incelemesi için seçilebilir. Gerçek ölçüler ve iskele seçimi henüz kullanıcıyla kesinleştirilmedi; kurulum animasyonu ve görev takvimi bu ekrana bağlı değil.

Doğrulama: 41 otomatik test geçti; tarayıcıda sahnenin açılması, döndürme/yakınlaşma ve parça aşamaları kontrol edildi. 360 px genişlikte içerik yatay taşmıyor. Sonraki adım 2: tek parça taşıma hareketi.

Çalışma ortamı (5 Kasım 2026): Proje GitHub deposuna alındı. Önizleme artık tarayıcıda doğrudan açılan tek dosyalık bir sayfa (`npm run preview:build`). Ekran görüntüleri `npm run preview:capture` ile cihaz öykünmesi altında otomatik alınıyor; sayfa hatası yakalanırsa komut başarısız oluyor.

| Adım | Üreteceğimiz sonuç | Birlikte belirlenecek nokta | Tamam sayma ölçütü |
| --- | --- | --- | --- |
| 0 — Temel | Veri sözleşmeleri, takvim, örnek iş dizisi, model adaptörü | Bu dokümandaki sınırlar | Çekirdek testler ve örnek program çalışıyor |
| 1 — Tek alan | M2 için zemin, duvar, giriş, depo ve çalışma noktası olan kaba 3D sahne | Ölçüler / referans plan ve iskele tipi | Çatısız görünüm, 45° başlangıç kamera, yakınlaşma/döndürme |
| 2 — Usta ve ekipman | Onaylı usta; tutma noktaları; bir malzeme taşıma hareketi | Usta görünümü korunarak el/alet uyumu | Malzeme elde kaymıyor; yürüme ve durma geçişi okunuyor |
| 3 — İskele | Parçalı model ve iki ustanın kurulum/söküm hareketleri | Parça görünümü, roller ve tempo | Her aşama görünür; geri sarma doğru; ustalar parçaların içinden geçmiyor |
| 4 — Tesisat işi | Platforma çıkma, boru yerleştirme ve bağlantı | İş noktası, ekipman ve hareket kalitesi | İskele hazırken başlıyor; tesisat bitince söküm başlıyor |
| 5 — Etkileşim | Zaman çizelgesi, oynat/duraklat, usta ve alan seçimi | Panelde gösterilecek bilgiler | Zaman, 3D ve detay paneli aynı durumu gösteriyor |
| 6 — Kafe bütünü | M1–M9 geometrisi ve doğrulanmış rota ağı | Kapılar, sabit engeller, sevkiyat ve kapalı alanlar | Ustalar geçilebilir yollarda gidiyor; yol kapanınca durum anlaşılır |
| 7 — Meslekler | Elektrik, boya, seramik, mobilya, alçıpan ve söküm | Her meslek için ilk temsilî iş | Kataloğa eklenen her işin ekipmanı ve anlaşılır hareketi var |
| 8 — Gerçek program | Referansın iş listesi, bağımlılıklar, sevkiyatlar ve beklemeler | 52 işin doğrulanması, süreler, ekip sayıları | Gecikmeler doğru yayılıyor; görünür imalat seçili zamana uyuyor |
| 9 — Çoklu ekip | Hedef cihazlarda eşzamanlı çalışan ustalar | 7–8 temsilî figür / programdaki gerçek kişi sayısı kararı | Kamera, seçim ve zaman kontrolü hedef cihazda akıcı |

## Henüz karara bağlanmayanlar

- Ölçülü planın kaynağı ve kaba sahnede kullanılacak sınırlar.
- İskele tipi, boyutları ve parçaları; ilk tesisatın boru mu havalandırma kanalı mı olacağı.
- Gün/saat hızlandırılırken hareketlerin ne kadar ayrıntılı gösterileceği.
- Usta sayısının programdaki kişi sayısını birebir mi temsil edeceği.
- Aynı alandaki işler için fiziksel çalışma kapasitesi ve geçiş kapanmaları.
- İleride projeyi kaydetme/paylaşma gereksinimi; buna göre kalıcı kayıt ve yayınlama.

Bunları sırayla ele alacağız; kod iskeletini kullanmak için tümüne bugün cevap vermek gerekmiyor.

## Verilen kararlar

Geçici kararlar gerçek veri gelince yeniden değerlendirilir.

| Tarih | Karar | Gerekçe |
| --- | --- | --- |
| 2026-11-05 | Adım 2–3 boyunca varsayılan ölçülerle devam: 8,4 × 6,6 m oda; 2,2 × 1,35 m tekerlekli iskele, platform 1,22 m. *Geçici.* | Gerçek plan gelince yalnızca `src/data/pilot-layout.js` değişir; hareket ve model kodu etkilenmez. |
| 2026-11-05 | İlk taşınacak parça iskelenin bir yan çerçevesi. | Adım 3'teki kurulumun ilk parçası; tutma noktaları ve taşıma pozu doğrudan yeniden kullanılır. |
| 2026-11-05 | Çekiç kemer askısında durur; yalnızca çakma/sabitleme hareketlerinde ele alınır. | Taşıma ve iki elle yapılan işlerde eller boş olmalı; ustanın onaylı görünümü korunur. |
| 2026-11-05 | Paketli iskele parçaları malzeme köşesinde başlar; "taşındı" durumu çalışma alanında görünür. | Takvimdeki "parçaları çalışma alanına taşı" adımı 3D'de gerçek bir yer değişikliği olarak okunmalı. |
| 2026-11-05 | Adım 2'de hareket dizisi kendi %0–100 ilerleme kaydırıcısıyla incelenir; takvim zamanına Adım 5'te bağlanır. | Hareket kalitesi, takvim arayüzünden bağımsız doğrulanabilmeli. |
| 2026-11-05 | Her adım ayrı dal ve pull request ile ilerler; PR açıklaması o adımın brief'idir. | Her molada gözden geçirilebilen ve gerekirse geri alınabilen bir kayıt kalır. |

## Kaynaktaki çalışma notları

- `BİRLİKTE-01/02`: İskele parçaları ve iki ustanın rolleri.
- `BİRLİKTE-03`: Örnek veriden gerçek proje verisine geçiş.
- `BİRLİKTE-04`: Ölçülü geometri ve navigasyon.
- `BİRLİKTE-05/06`: İş hareketleri ve zaman atlamasında sahneyi yeniden kurma.

## Her yeni iş için dolduracağımız kart

1. Alan, öncül işler ve hazır olması gereken nesneler.
2. Ekip, roller, araçlar ve taşınan malzemeler.
3. Alt adımlar; gerçek süre ve vardiya/bekleme ayrımı.
4. Her adım sonunda mekânda/nesnede değişen şey.
5. Çalışma noktaları, geçiş yolları ve kapanacak bölgeler.
6. Gerekli hareketler; eksik model/animasyon listesi.
7. İleri sarma, geri sarma ve gecikme kontrolü.
