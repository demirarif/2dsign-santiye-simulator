# Referans kaynaklar

## Referans site

<https://arabica-santiye-simulasyon-elif.bonnydingo1.chatgpt.site/>. Kullanıcı 5 Kasım 2026'da paylaştı; aynı gün okundu. Site "Beş gün. Tek koordinasyon." başlıklı bir planlama provasıdır. İçeriği:

- M1–M9 alanlarının adı, başlangıç durumu ve hedef son durumu.
- 52 iş: alan, planlanan gün/saat, süre (çalışma saati), ekip, kişi sayısı, bağımlılıklar, taşıma yönü (alan → alan / dış sevk).
- Varsayılan ayarlar: derz sonrası kür 12 saat, alçı sonrası bekleme 12 saat, kapasite 18 kişi, lojistik girişi M8.
- Sitenin kendi notu: "Ölçeksiz görselden oluşturuldu. Saatler, ekipler ve lojistik noktası öneridir; kapasite / metraj hesabı değildir."

Bu bilgiler `src/data/reference-program.js` içine birebir aktarıldı. Sitede döngüyle üretilen işler orada tek tek yazıldı. Sitenin zamanlama kuralı da (planlanan saat, bağımlılık bitişi ve kür/alçı beklemesinden en geç olanı) aynı dosyada; testler sitenin verdiği saatleri doğruluyor. Program henüz simülasyon çekirdeğine (usta, kaynak, alt adım) bağlanmadı.

## Pafta

Sitenin altlığı, 2D'SIGN Mimarlık'ın "01 — Yerleşim Planı" paftasıdır (Arabica Coffee House, Cepa Kitchen, fit renovasyon). Elimizdeki görsel 812 × 658 px ve ölçeksiz; paftadaki "Ölçek" alanı boş.

**Pafta görseli depoya konmadı.** Paftada 5846 sayılı Fikir ve Sanat Eserleri Kanunu kapsamında koruma notu var ve depo herkese açık. Yerel kopya `docs/referans/yerel/` klasöründe durur; bu klasör `.gitignore` ile dışarıda tutulur.

## Ölçek nasıl çıkarıldı

Paftada M2'nin yanında "108 M2 TAVAN" notu var. M2 alanının dolgu çokgeni 33 492 px² tutuyor. Buradan 1 px ≈ 0,057 m çıkıyor ve M2 ≈ 108,8 m² oluyor. Bu ölçekle diğer parçalar şöyle çıkıyor:

| Kontrol | Paftadan çıkan | Beklenen |
| --- | --- | --- |
| M3 kapı kanadı | ≈1,0 m | 0,9–1,0 m |
| Teras masası | ≈0,85 m | 0,7–0,8 m |
| İç mekân toplamı | ≈419 m² | — |
| Teras | ≈238 m² | — |

Yani ölçek ±%10 içinde tutarlı; kesin ölçü yerine geçmez.

## Paftadan yapılan yorumlar

Alanlar piksel düzeyinde dolgu renginden çıkarıldı ve dik açılı çokgenlere sadeleştirildi. Duvarlar ve açıklıklar çizgi renklerinden yorumlandı:

- **Koyu mavi çizgi = duvar, camgöbeği = cam/kepenk, macenta = yeni bölme** kabul edildi.
- M2'nin kesikli mavi sınırı ve "108 M2 TAVAN" yazısı **tavan sınırı** sayıldı, duvar değil. Bu yüzden M2; giriş koridoruna, banko önüne ve servis koridoruna açık.
- **Ana giriş:** M8'deki aynalı "GİRİŞ" yazısı ve sürgü okları, teras ile iç mekân arasında M6 ile M2 arasındaki ≈2,6 m'lik boşluğu gösteriyor.
- **Kuzey cephe camekân**; M1'in kuzeyi dolu duvar.
- **Batı cephe kepenk:** M7 "kepenk üstü" olarak açık kepenk ve üstünde ahşap kaplama şeklinde modellendi.
- **M3:** doğu duvarında çift kanatlı servis kapısı var; "23 m² asma tavan" notu M3'ü gösteriyor.
- **Sedirli mor oturma nişi** (M6 ile M7 arası) programda kodlu değil. Döşeme olarak var, alan olarak seçilemiyor.
- **Terastaki 41 koltuk** paftadan otomatik bulundu ve masa gruplarına yerleştirildi. Diğer mobilyalar paftaya bakılarak elle yerleştirildi. Hepsi referans yerleşimdir.

## AutoCAD dosyası gelince doğrulanacaklar

- Gerçek ölçüler ve duvar kalınlıkları; tavan yükseklikleri (şimdilik 3,3 m).
- Yukarıdaki duvar / alan sınırı / tavan sınırı yorumları.
- Kapı genişlikleri, kepenk açıklığı ve kolon ölçüsü.
- M9 içindeki bölmeler ve küçük odalar (şimdilik tek oda).
- Mor oturma nişinin hangi alana ait olduğu.

Ölçüler değişince yalnızca `src/data/cafe-layout.js` güncellenir. Testler alanların çakışmadığını, mobilyanın zeminde kaldığını ve dış duvarların çevreyi kapattığını kontrol eder.
