import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import { uygulamaOlustur } from '../src/app.js'
import { veritabaniBaglan, type Db } from '../src/db/client.js'
import { gorevliler, kategoriler, kitaplar, kopyalar, oduncler, uyeler } from '../src/db/schema.js'
import { tokenUret } from '../src/http/kimlik.js'
import { bugun, gunEkle } from '../src/tarih.js'
import { geciciSemayaBaglan } from './gecici-sema.js'

export const TEST_SIFRESI = 'dogru-sifre-123'
const TEST_JWT_GIZLI = 'test-icin-en-az-otuz-iki-karakterlik-gizli-anahtar'

/** TEST_DATABASE_URL verilirse testler gerçek Postgres'te (geçici şemada) çalışır. */
export const GERCEK_POSTGRES = process.env.TEST_DATABASE_URL

/** Her test dosyası kendi temiz veritabanını açar: varsayılan bellekte PGlite, istenirse gerçek Postgres. */
export async function testOrtami() {
  const { db, kapat } = GERCEK_POSTGRES
    ? await geciciSemayaBaglan(GERCEK_POSTGRES)
    : await veritabaniBaglan({})
  const [gorevli] = await db
    .insert(gorevliler)
    .values({
      ad: 'Selin',
      soyad: 'Aydın',
      kullaniciAdi: 'selin',
      sifreHash: await bcrypt.hash(TEST_SIFRESI, 4),
    })
    .returning()
  const [kategori] = await db.insert(kategoriler).values({ kod: '800', ad: 'Edebiyat' }).returning()

  const app = uygulamaOlustur(db, { jwtGizli: TEST_JWT_GIZLI })
  const yetki = `Bearer ${tokenUret(gorevli!, TEST_JWT_GIZLI)}`

  const api = {
    get: (url: string) => request(app).get(url).set('Authorization', yetki),
    post: (url: string, govde: object = {}) =>
      request(app).post(url).set('Authorization', yetki).send(govde),
    patch: (url: string, govde: object) =>
      request(app).patch(url).set('Authorization', yetki).send(govde),
    delete: (url: string) => request(app).delete(url).set('Authorization', yetki),
  }

  return { db, app, api, gorevli: gorevli!, kategori: kategori!, kapat }
}

let sayac = 0

export async function kitapEkle(db: Db, kategoriId: number, kopyaSayisi = 1) {
  sayac += 1
  const [kitap] = await db
    .insert(kitaplar)
    .values({ baslik: `Test Kitabı ${sayac}`, yazar: 'Test Yazar', kategoriId })
    .returning()
  const kopyaListesi = await db
    .insert(kopyalar)
    .values(Array.from({ length: kopyaSayisi }, () => ({ kitapId: kitap!.id })))
    .returning()
  return { kitap: kitap!, kopyalar: kopyaListesi }
}

export async function uyeEkle(db: Db, degisiklik: Partial<typeof uyeler.$inferInsert> = {}) {
  sayac += 1
  const [uye] = await db
    .insert(uyeler)
    .values({
      ad: `Üye${sayac}`,
      soyad: 'Test',
      tur: 'OGRENCI',
      kartGecerlilik: gunEkle(bugun(), 365),
      ...degisiklik,
    })
    .returning()
  return uye!
}

/** Geçmiş tarihli (ör. gecikmiş) ödünç kaydını doğrudan yazar. */
export async function eskiOduncEkle(db: Db, uyeId: number, kopyaId: number, sonTeslimGunFarki: number) {
  const [odunc] = await db
    .insert(oduncler)
    .values({ uyeId, kopyaId, sonTeslimTarihi: gunEkle(bugun(), sonTeslimGunFarki) })
    .returning()
  await db.update(kopyalar).set({ durum: 'ODUNCTE' }).where(eq(kopyalar.id, kopyaId))
  return odunc!
}
