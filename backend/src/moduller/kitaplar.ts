import { and, asc, count, desc, eq, getTableColumns, ilike, inArray, isNull, or, sql } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import type { Db } from '../db/client.js'
import { hareketler, kategoriler, kitaplar, kopyalar, oduncler, rezervasyonlar } from '../db/schema.js'
import { bulunamadi } from '../http/hatalar.js'
import {
  atla,
  basarili,
  enAzBirAlan,
  idSemasi,
  istegeBagliMetin,
  likeKalibi,
  sayfaSemasi,
  zorunluMetin,
} from '../http/yanit.js'
import { kopyayiSerbestBirak } from '../servisler/rezervasyon-servisi.js'
import { bugun } from '../tarih.js'
import { KOPYA_OZETI, UYE_OZETI } from './ozetler.js'

const kitapSemasi = z.object({
  isbn: istegeBagliMetin(20),
  baslik: zorunluMetin(300),
  yazar: zorunluMetin(200),
  yayinevi: istegeBagliMetin(200),
  yayinYili: z.number().int().min(0).max(3000).nullish(),
  yerNumarasi: istegeBagliMetin(50),
  kategoriId: idSemasi,
})

const konumSemasi = z.object({
  blok: istegeBagliMetin(20),
  rafNo: z.number().int().min(0).max(100_000).nullish(),
})

const yeniKitapSemasi = kitapSemasi.extend({
  ...konumSemasi.shape,
  kopyaSayisi: z.number().int().min(1).max(100).default(1),
})

const kitapGuncellemeSemasi = kitapSemasi.partial().refine(enAzBirAlan, 'Güncellenecek alan yok')

const kopyaEklemeSemasi = konumSemasi.extend({
  adet: z.number().int().min(1).max(100).default(1),
})

const listeSemasi = sayfaSemasi.extend({
  q: z.string().trim().max(100).optional(),
  kategoriId: idSemasi.optional(),
})

async function kategoriVarMi(db: Db, id: number) {
  const kategori = await db.query.kategoriler.findFirst({ where: eq(kategoriler.id, id) })
  if (!kategori) throw bulunamadi('Kategori')
}

async function kitapDetayi(db: Db, id: number) {
  const kitap = await db.query.kitaplar.findFirst({
    where: eq(kitaplar.id, id),
    with: {
      kategori: true,
      kopyalar: {
        orderBy: asc(kopyalar.id),
        with: {
          oduncler: {
            where: isNull(oduncler.iadeZamani),
            columns: { id: true, verilisZamani: true, sonTeslimTarihi: true },
            with: { uye: { columns: UYE_OZETI } },
          },
          rezervasyonlar: {
            where: eq(rezervasyonlar.durum, 'HAZIR'),
            columns: { id: true, sonGecerlilik: true },
            with: { uye: { columns: UYE_OZETI } },
          },
        },
      },
    },
  })
  if (!kitap) throw bulunamadi('Kitap')

  const [hareketListesi, bekleyenRezervasyonSayisi] = await Promise.all([
    db.query.hareketler.findMany({
      where: eq(hareketler.kitapId, id),
      orderBy: [desc(hareketler.zaman), desc(hareketler.id)],
      limit: 20,
      with: { uye: { columns: UYE_OZETI }, kopya: { columns: KOPYA_OZETI } },
    }),
    db.$count(rezervasyonlar, and(eq(rezervasyonlar.kitapId, id), eq(rezervasyonlar.durum, 'BEKLIYOR'))),
  ])

  return {
    ...kitap,
    kopyalar: kitap.kopyalar.map(({ oduncler: aktif, rezervasyonlar: ayrilan, ...kopya }) => ({
      ...kopya,
      aktifOdunc: aktif[0] ?? null,
      ayrilanRezervasyon: ayrilan[0] ?? null,
    })),
    bekleyenRezervasyonSayisi,
    hareketler: hareketListesi,
  }
}

export function kitapRotalari(db: Db) {
  const rota = Router()

  rota.get('/', async (req, res) => {
    const { q, kategoriId, ...sayfa } = listeSemasi.parse(req.query)
    const kalip = q ? likeKalibi(q) : undefined
    const filtre = and(
      kalip
        ? or(
            ilike(kitaplar.baslik, kalip),
            ilike(kitaplar.yazar, kalip),
            ilike(kitaplar.yerNumarasi, kalip),
            ilike(kitaplar.isbn, kalip),
          )
        : undefined,
      kategoriId ? eq(kitaplar.kategoriId, kategoriId) : undefined,
    )

    const [liste, total] = await Promise.all([
      db
        .select({
          ...getTableColumns(kitaplar),
          kategori: { id: kategoriler.id, kod: kategoriler.kod, ad: kategoriler.ad },
          kopyaSayisi: count(kopyalar.id),
          raftakiKopyaSayisi: sql`count(${kopyalar.id}) filter (where ${kopyalar.durum} = 'RAFTA')`.mapWith(Number),
        })
        .from(kitaplar)
        .innerJoin(kategoriler, eq(kitaplar.kategoriId, kategoriler.id))
        .leftJoin(kopyalar, eq(kopyalar.kitapId, kitaplar.id))
        .where(filtre)
        .groupBy(kitaplar.id, kategoriler.id)
        .orderBy(asc(kitaplar.baslik), asc(kitaplar.id))
        .limit(sayfa.limit)
        .offset(atla(sayfa)),
      db.$count(kitaplar, filtre),
    ])
    basarili(res, liste, 200, { ...sayfa, total })
  })

  rota.get('/:id', async (req, res) => {
    basarili(res, await kitapDetayi(db, idSemasi.parse(req.params.id)))
  })

  rota.post('/', async (req, res) => {
    const { kopyaSayisi, blok, rafNo, ...bilgi } = yeniKitapSemasi.parse(req.body)
    await kategoriVarMi(db, bilgi.kategoriId)

    const sonuc = await db.transaction(async (tx) => {
      const [kitap] = await tx.insert(kitaplar).values(bilgi).returning()
      const kopyaListesi = await tx
        .insert(kopyalar)
        .values(Array.from({ length: kopyaSayisi }, () => ({ kitapId: kitap!.id, blok, rafNo })))
        .returning()
      return { ...kitap!, kopyalar: kopyaListesi }
    })
    basarili(res, sonuc, 201)
  })

  rota.patch('/:id', async (req, res) => {
    const id = idSemasi.parse(req.params.id)
    const degisiklik = kitapGuncellemeSemasi.parse(req.body)
    if (degisiklik.kategoriId) await kategoriVarMi(db, degisiklik.kategoriId)

    const [kitap] = await db.update(kitaplar).set(degisiklik).where(eq(kitaplar.id, id)).returning()
    if (!kitap) throw bulunamadi('Kitap')
    basarili(res, kitap)
  })

  // Geçmişi olan (ödünç, rezervasyon, hareket) kitap veritabanı kısıtı yüzünden silinemez → 409.
  rota.delete('/:id', async (req, res) => {
    const [silinen] = await db
      .delete(kitaplar)
      .where(eq(kitaplar.id, idSemasi.parse(req.params.id)))
      .returning({ id: kitaplar.id })
    if (!silinen) throw bulunamadi('Kitap')
    res.status(204).end()
  })

  rota.post('/:id/kopyalar', async (req, res) => {
    const kitapId = idSemasi.parse(req.params.id)
    const { adet, blok, rafNo } = kopyaEklemeSemasi.parse(req.body)

    const eklenenler = await db.transaction(async (tx) => {
      const kitap = await tx.query.kitaplar.findFirst({ where: eq(kitaplar.id, kitapId) })
      if (!kitap) throw bulunamadi('Kitap')

      const yeni = await tx
        .insert(kopyalar)
        .values(Array.from({ length: adet }, () => ({ kitapId, blok, rafNo })))
        .returning()
      // Kitabı bekleyen varsa yeni kopya önce onlara ayrılır.
      for (const kopya of yeni) await kopyayiSerbestBirak(tx, kopya, bugun())

      return tx
        .select()
        .from(kopyalar)
        .where(inArray(kopyalar.id, yeni.map((k) => k.id)))
        .orderBy(asc(kopyalar.id))
    })
    basarili(res, eklenenler, 201)
  })

  return rota
}
