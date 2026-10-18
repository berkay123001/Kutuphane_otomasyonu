import { and, asc, count, desc, eq, getTableColumns, ilike, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import type { Db } from '../db/client.js'
import { cezalar, oduncler, rezervasyonlar, uyeler } from '../db/schema.js'
import { bulunamadi } from '../http/hatalar.js'
import {
  atla,
  basarili,
  enAzBirAlan,
  idSemasi,
  istegeBagliEposta,
  istegeBagliMetin,
  likeKalibi,
  sayfaSemasi,
  zorunluMetin,
} from '../http/yanit.js'
import { KURALLAR, gecikmeGunu, oduncEngelleri } from '../kurallar.js'
import { uyeSayaclari } from '../servisler/uye-durumu.js'
import { bugun, gunEkle } from '../tarih.js'
import { KITAP_OZETI, KOPYA_OZETI } from './ozetler.js'

const uyeSemasi = z.object({
  ad: zorunluMetin(100),
  soyad: zorunluMetin(100),
  eposta: istegeBagliEposta,
  telefon: istegeBagliMetin(30),
  tur: z.enum(['OGRENCI', 'PERSONEL']),
  bolum: istegeBagliMetin(100),
  kartGecerlilik: z.iso.date().optional(),
})

const uyeGuncellemeSemasi = uyeSemasi
  .partial()
  .extend({ aktif: z.boolean().optional() })
  .refine(enAzBirAlan, 'Güncellenecek alan yok')

const listeSemasi = sayfaSemasi.extend({
  q: z.string().trim().max(100).optional(),
  aktif: z.stringbool().optional(),
})

const KITAPLI_KOPYA = { columns: KOPYA_OZETI, with: { kitap: { columns: KITAP_OZETI } } } as const

async function uyeDetayi(db: Db, id: number) {
  const uye = await db.query.uyeler.findFirst({ where: eq(uyeler.id, id) })
  if (!uye) throw bulunamadi('Üye')
  const bugunTarih = bugun()

  const [aktifOduncler, gecmis, odenmemisCezalar, acikRezervasyonlar, sayaclar] = await Promise.all([
    db.query.oduncler.findMany({
      where: and(eq(oduncler.uyeId, id), isNull(oduncler.iadeZamani)),
      orderBy: asc(oduncler.sonTeslimTarihi),
      with: { kopya: KITAPLI_KOPYA },
    }),
    db.query.oduncler.findMany({
      where: and(eq(oduncler.uyeId, id), isNotNull(oduncler.iadeZamani)),
      orderBy: desc(oduncler.iadeZamani),
      limit: 20,
      with: { kopya: KITAPLI_KOPYA, ceza: true },
    }),
    db.query.cezalar.findMany({
      where: and(
        eq(cezalar.odendi, false),
        inArray(cezalar.oduncId, db.select({ id: oduncler.id }).from(oduncler).where(eq(oduncler.uyeId, id))),
      ),
      with: { odunc: { columns: { id: true }, with: { kopya: KITAPLI_KOPYA } } },
    }),
    db.query.rezervasyonlar.findMany({
      where: and(eq(rezervasyonlar.uyeId, id), inArray(rezervasyonlar.durum, ['BEKLIYOR', 'HAZIR'])),
      orderBy: asc(rezervasyonlar.olusturmaZamani),
      with: { kitap: { columns: KITAP_OZETI } },
    }),
    uyeSayaclari(db, id, bugunTarih),
  ])

  return {
    ...uye,
    aktifOduncler: aktifOduncler.map((o) => ({ ...o, gecikmeGunu: gecikmeGunu(o.sonTeslimTarihi, bugunTarih) })),
    gecmis,
    odenmemisCezalar,
    rezervasyonlar: acikRezervasyonlar,
    istatistik: sayaclar,
    oduncEngelleri: oduncEngelleri({ ...uye, ...sayaclar }, bugunTarih),
  }
}

export function uyeRotalari(db: Db) {
  const rota = Router()

  rota.get('/', async (req, res) => {
    const { q, aktif, ...sayfa } = listeSemasi.parse(req.query)
    const kalip = q ? likeKalibi(q) : undefined
    const filtre = and(
      kalip
        ? or(
            ilike(sql`${uyeler.ad} || ' ' || ${uyeler.soyad}`, kalip),
            ilike(uyeler.uyeNo, kalip),
            ilike(uyeler.eposta, kalip),
          )
        : undefined,
      aktif === undefined ? undefined : eq(uyeler.aktif, aktif),
    )

    const [liste, total] = await Promise.all([
      db
        .select({ ...getTableColumns(uyeler), aktifOduncSayisi: count(oduncler.id) })
        .from(uyeler)
        .leftJoin(oduncler, and(eq(oduncler.uyeId, uyeler.id), isNull(oduncler.iadeZamani)))
        .where(filtre)
        .groupBy(uyeler.id)
        .orderBy(asc(uyeler.soyad), asc(uyeler.ad), asc(uyeler.id))
        .limit(sayfa.limit)
        .offset(atla(sayfa)),
      db.$count(uyeler, filtre),
    ])
    basarili(res, liste, 200, { ...sayfa, total })
  })

  rota.get('/:id', async (req, res) => {
    basarili(res, await uyeDetayi(db, idSemasi.parse(req.params.id)))
  })

  rota.post('/', async (req, res) => {
    const girdi = uyeSemasi.parse(req.body)
    const [uye] = await db
      .insert(uyeler)
      .values({
        ...girdi,
        kartGecerlilik: girdi.kartGecerlilik ?? gunEkle(bugun(), KURALLAR.kartGecerlilikGunu),
      })
      .returning()
    basarili(res, uye, 201)
  })

  rota.patch('/:id', async (req, res) => {
    const id = idSemasi.parse(req.params.id)
    const [uye] = await db
      .update(uyeler)
      .set(uyeGuncellemeSemasi.parse(req.body))
      .where(eq(uyeler.id, id))
      .returning()
    if (!uye) throw bulunamadi('Üye')
    basarili(res, uye)
  })

  return rota
}
