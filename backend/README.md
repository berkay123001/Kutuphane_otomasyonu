# Fişlik — Backend

Kütüphane otomasyonu API'si. TypeScript + Express 5 + Drizzle ORM + PostgreSQL (Supabase).
Class diagram: [`../docs/class-diagram.png`](../docs/class-diagram.png)

## Kurulum

```bash
npm install
cp .env.example .env        # JWT_SECRET ve ILK_GOREVLI_SIFRE'yi doldur
npm run db:seed             # kategoriler + ilk görevli + demo veri  (yalnız temel için: npm run db:seed -- --temel)
npm run dev                 # http://localhost:3000/api
```

`DATABASE_URL` boşsa veriler yerelde `./.veri` klasörüne yazılır (gömülü Postgres, kurulum gerekmez).
Tabloları sıfırlamak için `.veri` klasörünü silmen yeterli. Yerel modda klasörü aynı anda tek süreç
açabilir: `npm run dev` çalışırken `db:seed` çalıştırma (Supabase'de böyle bir kısıt yok).

### Supabase'e bağlamak

1. [supabase.com](https://supabase.com) → ücretsiz hesap → **New project** (bölge: Frankfurt/Central EU).
2. Proje sayfasında **Connect** → **Session pooler** bağlantı adresini kopyala.
3. `.env` içinde `DATABASE_URL=` satırına yapıştır, `[YOUR-PASSWORD]` yerine proje şifreni yaz.
4. (Önerilir) **Database Settings → SSL Configuration**'dan sertifikayı indir, yolunu `DATABASE_SSL_CA`'ya yaz
   ve **Enforce SSL**'i aç. CA olmadan da bağlantı şifrelidir ama sunucu kimliği doğrulanmaz.
5. `npm run db:seed` → `npm run dev`. Tablolar ilk açılışta otomatik oluşur.

Tabloları Supabase panelinde **Table Editor**'dan görebilirsin. Tüm tablolarda RLS açık ve policy yok:
Supabase'in otomatik REST API'si (anon key) tablolara erişemez, veri yalnızca bu backend üzerinden okunur.
Supabase "RLS enabled, no policies" uyarısı gösterirse bu bilerek böyle.

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Geliştirme sunucusu (dosya değişince yeniden başlar) |
| `npm start` | Sunucuyu başlatır |
| `npm test` / `npm run test:coverage` | Testler (bellekte ayrı veritabanında çalışır, gerçek veriye dokunmaz) |
| `npm run test:postgres` | Testleri `.env`'deki Postgres'te (Supabase) çalıştırır; eş zamanlı istek testleri de dahil. Her dosya geçici bir şema açıp sonunda siler, gerçek tablolara dokunmaz (~5 dk) |
| `npm run typecheck` | TypeScript kontrolü |
| `npm run db:seed` | İlk veriler |
| `npm run db:generate` | `src/db/schema.ts` değişince yeni migration üretir |

## İş kuralları (`src/kurallar.ts`)

- Bir üye aynı anda en fazla **5** kitap alır; süre **7 / 14 / 21** gün.
- Pasif üye, kartı dolmuş üye, gecikmiş kitabı ya da ödenmemiş cezası olan üye ödünç alamaz.
- Süre **bir kez 7 gün** uzatılır; gecikmişse veya kitabı bekleyen varsa uzatılamaz.
- Geç iadede gün başına **2 TL** ceza kesilir.
- Rezervasyonda da aynı engeller geçerli (kota hariç; kota kitap teslim alınırken bakılır).
- Rafta kopya varsa rezervasyon hemen ayrılır (**HAZIR**, 3 gün); yoksa sıraya girer (**BEKLIYOR**).
  İade edilen kopya sıradakine ayrılır. 3 günde alınmayan rezervasyon otomatik kapanır.

## API

Tüm yanıtlar `{ success, data, error?, details?, meta? }` biçimindedir. Listeler `?page=&limit=` alır,
`meta: { total, page, limit }` döner. `/api/saglik` ve `/api/auth/giris` dışındaki her uç
`Authorization: Bearer <token>` ister.

| Metot | Yol | Açıklama |
|---|---|---|
| POST | `/api/auth/giris` | `{ kullaniciAdi, sifre }` → `{ token, gorevli }` |
| GET | `/api/auth/ben` | Giriş yapan görevli |
| POST | `/api/auth/sifre` | `{ mevcutSifre, yeniSifre }` kendi şifresini değiştirir |
| GET / POST | `/api/gorevliler` | Görevli listesi / yeni görevli |
| PATCH | `/api/gorevliler/:id` | Bilgi güncelle; `{ aktif: false }` ile hesabı kapatır (oturumu da anında düşer) |
| GET / POST | `/api/kategoriler` | Kitap ve kopya sayılarıyla kategoriler / yeni kategori |
| GET | `/api/kitaplar?q=&kategoriId=` | Katalog araması (başlık, yazar, yer no, ISBN) |
| POST | `/api/kitaplar` | Kitap + `kopyaSayisi` kadar kopya ekler |
| GET / PATCH / DELETE | `/api/kitaplar/:id` | Detay (kopyalar, kimde, hareketler) / güncelle / sil |
| POST | `/api/kitaplar/:id/kopyalar` | `{ adet, blok, rafNo }` yeni kopya |
| PATCH / DELETE | `/api/kopyalar/:id` | Kopya yeri / raftaki kopyayı sil |
| GET / POST | `/api/uyeler?q=&aktif=` | Üye arama / yeni üye |
| GET / PATCH | `/api/uyeler/:id` | Profil (elindekiler, geçmiş, ceza, engeller) / güncelle |
| GET | `/api/oduncler?durum=aktif\|gecikmis\|iade&uyeId=` | Ödünç listesi |
| POST | `/api/oduncler` | `{ uyeId, gun, kitapId }` ya da `{ uyeId, gun, barkod }` |
| POST | `/api/oduncler/:id/uzat` | 7 gün uzat |
| POST | `/api/oduncler/:id/iade` | İade al → `{ odunc, ceza }` |
| GET / POST | `/api/rezervasyonlar?durum=&uyeId=&kitapId=` | Liste / `{ uyeId, kitapId }` ayırt |
| POST | `/api/rezervasyonlar/:id/iptal` | İptal |
| GET | `/api/cezalar?odendi=&uyeId=` | Ceza listesi |
| POST | `/api/cezalar/:id/ode` | Cezayı ödendi işaretle |
| GET | `/api/panel` | Bugünün sayıları, son hareketler, gecikenler |

Hata kodları: `400` geçersiz istek · `401` giriş gerekli · `404` bulunamadı ·
`409` çakışma (ör. kopya ödünçte) · `422` kural engeli (`details` içinde sebepler).
