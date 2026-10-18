import { and, asc, eq } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import type { Db } from '../db/client.js'
import { rezervasyonDurumu, rezervasyonlar } from '../db/schema.js'
import { gorevliId } from '../http/kimlik.js'
import { atla, basarili, idSemasi, sayfaSemasi } from '../http/yanit.js'
import { rezervasyonIptal, rezervasyonYap } from '../servisler/rezervasyon-servisi.js'
import { KITAP_OZETI, KOPYA_OZETI, UYE_OZETI } from './ozetler.js'

const rezervasyonSemasi = z.object({
  uyeId: idSemasi,
  kitapId: idSemasi,
})

const listeSemasi = sayfaSemasi.extend({
  durum: z.enum(rezervasyonDurumu.enumValues).optional(),
  uyeId: idSemasi.optional(),
  kitapId: idSemasi.optional(),
})

export function rezervasyonRotalari(db: Db) {
  const rota = Router()

  rota.get('/', async (req, res) => {
    const { durum, uyeId, kitapId, ...sayfa } = listeSemasi.parse(req.query)
    const filtre = and(
      durum ? eq(rezervasyonlar.durum, durum) : undefined,
      uyeId ? eq(rezervasyonlar.uyeId, uyeId) : undefined,
      kitapId ? eq(rezervasyonlar.kitapId, kitapId) : undefined,
    )

    const [liste, total] = await Promise.all([
      db.query.rezervasyonlar.findMany({
        where: filtre,
        orderBy: [asc(rezervasyonlar.olusturmaZamani), asc(rezervasyonlar.id)],
        limit: sayfa.limit,
        offset: atla(sayfa),
        with: {
          uye: { columns: UYE_OZETI },
          kitap: { columns: KITAP_OZETI },
          kopya: { columns: KOPYA_OZETI },
        },
      }),
      db.$count(rezervasyonlar, filtre),
    ])
    basarili(res, liste, 200, { ...sayfa, total })
  })

  rota.post('/', async (req, res) => {
    const rezervasyon = await rezervasyonYap(db, rezervasyonSemasi.parse(req.body), gorevliId(res))
    basarili(res, rezervasyon, 201)
  })

  rota.post('/:id/iptal', async (req, res) => {
    basarili(res, await rezervasyonIptal(db, idSemasi.parse(req.params.id)))
  })

  return rota
}
