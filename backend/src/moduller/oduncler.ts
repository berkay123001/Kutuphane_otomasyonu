import { and, asc, eq, isNotNull, isNull, lt } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import type { Db } from '../db/client.js'
import { oduncler } from '../db/schema.js'
import { gorevliId } from '../http/kimlik.js'
import { atla, basarili, idSemasi, sayfaSemasi } from '../http/yanit.js'
import { KURALLAR, gecikmeGunu } from '../kurallar.js'
import { iadeAl, oduncUzat, oduncVer } from '../servisler/odunc-servisi.js'
import { bugun } from '../tarih.js'
import { KITAP_OZETI, KOPYA_OZETI, UYE_OZETI } from './ozetler.js'

const oduncSemasi = z
  .object({
    uyeId: idSemasi,
    gun: z.literal(KURALLAR.oduncSureleri, {
      error: `Ödünç süresi ${KURALLAR.oduncSureleri.join(', ')} günden biri olmalı`,
    }),
    kitapId: idSemasi.optional(),
    barkod: z.string().trim().min(1).max(50).optional(),
  })
  .refine((g) => (g.kitapId === undefined) !== (g.barkod === undefined), {
    message: 'kitapId ya da barkod alanlarından yalnızca biri gönderilmeli',
  })

const listeSemasi = sayfaSemasi.extend({
  durum: z.enum(['aktif', 'gecikmis', 'iade']).optional(),
  uyeId: idSemasi.optional(),
})

function durumFiltresi(durum: 'aktif' | 'gecikmis' | 'iade' | undefined, bugunTarih: string) {
  switch (durum) {
    case 'aktif':
      return isNull(oduncler.iadeZamani)
    case 'gecikmis':
      return and(isNull(oduncler.iadeZamani), lt(oduncler.sonTeslimTarihi, bugunTarih))
    case 'iade':
      return isNotNull(oduncler.iadeZamani)
    default:
      return undefined
  }
}

export function oduncRotalari(db: Db) {
  const rota = Router()

  rota.get('/', async (req, res) => {
    const { durum, uyeId, ...sayfa } = listeSemasi.parse(req.query)
    const bugunTarih = bugun()
    const filtre = and(
      durumFiltresi(durum, bugunTarih),
      uyeId ? eq(oduncler.uyeId, uyeId) : undefined,
    )

    const [liste, total] = await Promise.all([
      db.query.oduncler.findMany({
        where: filtre,
        orderBy: [asc(oduncler.sonTeslimTarihi), asc(oduncler.id)],
        limit: sayfa.limit,
        offset: atla(sayfa),
        with: {
          uye: { columns: UYE_OZETI },
          kopya: { columns: KOPYA_OZETI, with: { kitap: { columns: KITAP_OZETI } } },
          ceza: true,
        },
      }),
      db.$count(oduncler, filtre),
    ])

    const data = liste.map((o) => ({
      ...o,
      gecikmeGunu: o.iadeZamani ? (o.ceza?.gecikmeGunu ?? 0) : gecikmeGunu(o.sonTeslimTarihi, bugunTarih),
    }))
    basarili(res, data, 200, { ...sayfa, total })
  })

  rota.post('/', async (req, res) => {
    const odunc = await oduncVer(db, oduncSemasi.parse(req.body), gorevliId(res))
    basarili(res, odunc, 201)
  })

  rota.post('/:id/uzat', async (req, res) => {
    basarili(res, await oduncUzat(db, idSemasi.parse(req.params.id), gorevliId(res)))
  })

  rota.post('/:id/iade', async (req, res) => {
    basarili(res, await iadeAl(db, idSemasi.parse(req.params.id), gorevliId(res)))
  })

  return rota
}
