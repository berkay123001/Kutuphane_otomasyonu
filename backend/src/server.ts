import { uygulamaOlustur } from './app.js'
import { ayarlariYukle } from './config.js'
import { veritabaniBaglan } from './db/client.js'
import { suresiDolanRezervasyonlariKapat } from './servisler/rezervasyon-servisi.js'

const SAAT_MS = 60 * 60 * 1000

const ayarlar = ayarlariYukle()
const { db, kapat } = await veritabaniBaglan({
  url: ayarlar.DATABASE_URL,
  sslCa: ayarlar.DATABASE_SSL_CA,
  yerelKlasor: ayarlar.YEREL_VERI_KLASORU,
})
console.info(
  ayarlar.DATABASE_URL
    ? 'Veritabanı: Postgres (DATABASE_URL)'
    : `Veritabanı: yerel PGlite (${ayarlar.YEREL_VERI_KLASORU}) — Supabase için .env'e DATABASE_URL ekleyin`,
)

const rezervasyonTemizligi = () =>
  suresiDolanRezervasyonlariKapat(db).catch((hata: unknown) =>
    console.error('Süresi dolan rezervasyonlar kapatılamadı:', hata),
  )
await rezervasyonTemizligi()
const zamanlayici = setInterval(rezervasyonTemizligi, SAAT_MS)

const app = uygulamaOlustur(db, {
  jwtGizli: ayarlar.JWT_SECRET,
  corsOrigin: ayarlar.CORS_ORIGIN,
  proxySayisi: ayarlar.TRUST_PROXY,
})
const sunucu = app.listen(ayarlar.PORT, (hata) => {
  if (hata) {
    console.error(`Sunucu başlatılamadı (port ${ayarlar.PORT}):`, hata.message)
    process.exit(1)
  }
  console.info(`Fişlik API hazır: http://localhost:${ayarlar.PORT}/api`)
})

const kapan = () => {
  clearInterval(zamanlayici)
  sunucu.close(() => {
    kapat().finally(() => process.exit(0))
  })
}
process.on('SIGINT', kapan)
process.on('SIGTERM', kapan)
