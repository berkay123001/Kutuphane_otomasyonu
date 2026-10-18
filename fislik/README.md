# Fişlik — Kütüphane Otomasyonu (tasarım dosyaları)

Bu klasör, tasarım kanvasındaki 4 ekranın kaynak dosyalarını içerir.

| Dosya | Ekran |
|---|---|
| `Main.dc.html` | 01 · Panel (bugünün çekmecesi, hareket defteri, gecikenler, koleksiyon dolabı) |
| `Katalog.dc.html` | 02 · Katalog (çekmece, fiş arama/filtre, seçili fiş, raftan çıkan kitap) |
| `Kitap.dc.html` | 03 · Kitap ve ödünç (3B kitap, daktilo fişi, damga animasyonu) |
| `Uye.dc.html` | 04 · Üye profili (dönen okuyucu kartı, eldeki kitaplar, okuma rafı) |
| `canvas.json` | Kanvas düzeni (artboard konumları ve boyutları) |

## Not

`.dc.html` dosyaları, tasarım kanvasının kendi çalışma ortamı (`support.js`) için yazılmış
"Design Component" sayfalarıdır: `{{...}}` yer tutucuları, `<sc-for>` / `<sc-if>` blokları ve
alttaki `class Component extends DCLogic` mantığı o ortamda çalışır. Bu yüzden doğrudan
tarayıcıda açıldığında animasyonlar ve veriler düzgün görünmez.

Tüm görsel stil (oda sahnesi, gündüz/gece teması, animasyonlar) her dosyanın başındaki
`<style>` bloğundadır ve olduğu gibi başka bir projeye taşınabilir.

Fontlar: Big Shoulders, Courier Prime, Schibsted Grotesk (Google Fonts).
