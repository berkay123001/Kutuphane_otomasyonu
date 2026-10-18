import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

// Kolon adları drizzle'ın `casing: 'snake_case'` ayarıyla otomatik snake_case olur.
// Tüm tablolarda RLS açık ve hiç policy yok: Supabase'in Data API'si (anon key) tablolara erişemez,
// tablo sahibi olarak bağlanan backend ise RLS'ten etkilenmez.

export const uyeTuru = pgEnum('uye_turu', ['OGRENCI', 'PERSONEL'])
export const kopyaDurumu = pgEnum('kopya_durumu', ['RAFTA', 'ODUNCTE', 'AYRILDI'])
export const rezervasyonDurumu = pgEnum('rezervasyon_durumu', [
  'BEKLIYOR',
  'HAZIR',
  'TAMAMLANDI',
  'IPTAL',
])
export const hareketTipi = pgEnum('hareket_tipi', ['ODUNC', 'IADE', 'GEC_IADE', 'UZATMA', 'AYIRTMA'])

const kimlik = () => integer().primaryKey().generatedAlwaysAsIdentity()
const tarih = () => date({ mode: 'string' })
const zaman = () => timestamp({ withTimezone: true })

// ---------- kişiler ----------

export const gorevliler = pgTable('gorevliler', {
  id: kimlik(),
  ad: text().notNull(),
  soyad: text().notNull(),
  eposta: text(),
  telefon: text(),
  kullaniciAdi: text().notNull().unique(),
  sifreHash: text().notNull(),
  aktif: boolean().notNull().default(true),
  olusturmaZamani: zaman().notNull().defaultNow(),
}).enableRLS()

export const uyeler = pgTable(
  'uyeler',
  {
    id: kimlik(),
    // Ü-0001, Ü-0002 ... id'den türetilir; 9999'dan sonra basamak sayısı büyür.
    uyeNo: text()
      .notNull()
      .generatedAlwaysAs(sql`'Ü-' || lpad("id"::text, greatest(4, length("id"::text)), '0')`),
    ad: text().notNull(),
    soyad: text().notNull(),
    eposta: text(),
    telefon: text(),
    tur: uyeTuru().notNull(),
    bolum: text(),
    uyelikTarihi: tarih().notNull().default(sql`(now() at time zone 'Europe/Istanbul')::date`),
    kartGecerlilik: tarih().notNull(),
    aktif: boolean().notNull().default(true),
  },
  (t) => [uniqueIndex().on(t.uyeNo)],
).enableRLS()

// ---------- katalog ----------

export const kategoriler = pgTable('kategoriler', {
  id: kimlik(),
  kod: text().notNull().unique(),
  ad: text().notNull(),
}).enableRLS()

export const kitaplar = pgTable(
  'kitaplar',
  {
    id: kimlik(),
    isbn: text().unique(),
    baslik: text().notNull(),
    yazar: text().notNull(),
    yayinevi: text(),
    yayinYili: integer(),
    yerNumarasi: text(),
    kategoriId: integer()
      .notNull()
      .references(() => kategoriler.id),
    olusturmaZamani: zaman().notNull().defaultNow(),
  },
  (t) => [index().on(t.kategoriId)],
).enableRLS()

export const kopyalar = pgTable(
  'kopyalar',
  {
    id: kimlik(),
    // 000001, 000002 ... raftaki etikete basılan numara.
    barkod: text()
      .notNull()
      .generatedAlwaysAs(sql`lpad("id"::text, greatest(6, length("id"::text)), '0')`),
    kitapId: integer()
      .notNull()
      .references(() => kitaplar.id, { onDelete: 'cascade' }),
    blok: text(),
    rafNo: integer(),
    durum: kopyaDurumu().notNull().default('RAFTA'),
  },
  (t) => [uniqueIndex().on(t.barkod), index().on(t.kitapId)],
).enableRLS()

// ---------- dolaşım ----------

export const oduncler = pgTable(
  'oduncler',
  {
    id: kimlik(),
    uyeId: integer()
      .notNull()
      .references(() => uyeler.id),
    kopyaId: integer()
      .notNull()
      .references(() => kopyalar.id),
    verilisZamani: zaman().notNull().defaultNow(),
    sonTeslimTarihi: tarih().notNull(),
    iadeZamani: zaman(),
    uzatildi: boolean().notNull().default(false),
  },
  (t) => [
    index().on(t.uyeId),
    // Bir kopya aynı anda yalnızca bir kişide olabilir.
    uniqueIndex('oduncler_aktif_kopya').on(t.kopyaId).where(sql`iade_zamani is null`),
  ],
).enableRLS()

export const cezalar = pgTable('cezalar', {
  id: kimlik(),
  oduncId: integer()
    .notNull()
    .unique()
    .references(() => oduncler.id),
  gecikmeGunu: integer().notNull(),
  tutar: numeric({ precision: 10, scale: 2, mode: 'number' }).notNull(),
  odendi: boolean().notNull().default(false),
  odemeZamani: zaman(),
  olusturmaZamani: zaman().notNull().defaultNow(),
}).enableRLS()

export const rezervasyonlar = pgTable(
  'rezervasyonlar',
  {
    id: kimlik(),
    uyeId: integer()
      .notNull()
      .references(() => uyeler.id),
    kitapId: integer()
      .notNull()
      .references(() => kitaplar.id),
    kopyaId: integer().references(() => kopyalar.id),
    olusturmaZamani: zaman().notNull().defaultNow(),
    sonGecerlilik: tarih(),
    durum: rezervasyonDurumu().notNull().default('BEKLIYOR'),
  },
  (t) => [
    index().on(t.kitapId),
    // Üye aynı kitap için tek açık rezervasyon tutabilir.
    uniqueIndex('rezervasyonlar_acik_uye_kitap')
      .on(t.uyeId, t.kitapId)
      .where(sql`durum in ('BEKLIYOR', 'HAZIR')`),
  ],
).enableRLS()

export const hareketler = pgTable(
  'hareketler',
  {
    id: kimlik(),
    tip: hareketTipi().notNull(),
    zaman: zaman().notNull().defaultNow(),
    kitapId: integer()
      .notNull()
      .references(() => kitaplar.id),
    kopyaId: integer().references(() => kopyalar.id),
    uyeId: integer()
      .notNull()
      .references(() => uyeler.id),
    gorevliId: integer().references(() => gorevliler.id),
  },
  (t) => [index().on(t.zaman), index().on(t.kitapId)],
).enableRLS()

// ---------- ilişkiler (db.query.* için) ----------

export const kategorilerIliskileri = relations(kategoriler, ({ many }) => ({
  kitaplar: many(kitaplar),
}))

export const kitaplarIliskileri = relations(kitaplar, ({ one, many }) => ({
  kategori: one(kategoriler, { fields: [kitaplar.kategoriId], references: [kategoriler.id] }),
  kopyalar: many(kopyalar),
  rezervasyonlar: many(rezervasyonlar),
}))

export const kopyalarIliskileri = relations(kopyalar, ({ one, many }) => ({
  kitap: one(kitaplar, { fields: [kopyalar.kitapId], references: [kitaplar.id] }),
  oduncler: many(oduncler),
  rezervasyonlar: many(rezervasyonlar),
}))

export const uyelerIliskileri = relations(uyeler, ({ many }) => ({
  oduncler: many(oduncler),
  rezervasyonlar: many(rezervasyonlar),
}))

export const odunclerIliskileri = relations(oduncler, ({ one }) => ({
  uye: one(uyeler, { fields: [oduncler.uyeId], references: [uyeler.id] }),
  kopya: one(kopyalar, { fields: [oduncler.kopyaId], references: [kopyalar.id] }),
  ceza: one(cezalar),
}))

export const cezalarIliskileri = relations(cezalar, ({ one }) => ({
  odunc: one(oduncler, { fields: [cezalar.oduncId], references: [oduncler.id] }),
}))

export const rezervasyonlarIliskileri = relations(rezervasyonlar, ({ one }) => ({
  uye: one(uyeler, { fields: [rezervasyonlar.uyeId], references: [uyeler.id] }),
  kitap: one(kitaplar, { fields: [rezervasyonlar.kitapId], references: [kitaplar.id] }),
  kopya: one(kopyalar, { fields: [rezervasyonlar.kopyaId], references: [kopyalar.id] }),
}))

export const hareketlerIliskileri = relations(hareketler, ({ one }) => ({
  kitap: one(kitaplar, { fields: [hareketler.kitapId], references: [kitaplar.id] }),
  kopya: one(kopyalar, { fields: [hareketler.kopyaId], references: [kopyalar.id] }),
  uye: one(uyeler, { fields: [hareketler.uyeId], references: [uyeler.id] }),
  gorevli: one(gorevliler, { fields: [hareketler.gorevliId], references: [gorevliler.id] }),
}))
