import { and, desc, eq, inArray } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import type { Db } from '../db/client.js'
import { cezalar, oduncler } from '../db/schema.js'
import { bulunamadi, cakisma } from '../http/hatalar.js'
import { atla, basarili, idSemasi, sayfaSemasi } from '../http/yanit.js'
import { KITAP_OZETI, KOPYA_OZETI, UYE_OZETI } from './ozetler.js'

const listeSemasi = sayfaSemasi.extend({
  odendi: z.stringbool().optional(),
  uyeId: idSemasi.optional(),
})

export function cezaRotalari(db: Db) {
  const rota = Router()

  rota.get('/', async (req, res) => {
    const { odendi, uyeId, ...sayfa } = listeSemasi.parse(req.query)
    const filtre = and(
      odendi === undefined ? undefined : eq(cezalar.odendi, odendi),
      uyeId
        ? inArray(cezalar.oduncId, db.select({ id: oduncler.id }).from(oduncler).where(eq(oduncler.uyeId, uyeId)))
        : undefined,
    )

    const [liste, total] = await Promise.all([
      db.query.cezalar.findMany({
        where: filtre,
        orderBy: [desc(cezalar.olusturmaZamani), desc(cezalar.id)],
        limit: sayfa.limit,
        offset: atla(sayfa),
        with: {
          odunc: {
            columns: { id: true, sonTeslimTarihi: true, iadeZamani: true },
            with: {
              uye: { columns: UYE_OZETI },
              kopya: { columns: KOPYA_OZETI, with: { kitap: { columns: KITAP_OZETI } } },
            },
          },
        },
      }),
      db.$count(cezalar, filtre),
    ])
    basarili(res, liste, 200, { ...sayfa, total })
  })

  rota.post('/:id/ode', async (req, res) => {
    const id = idSemasi.parse(req.params.id)
    const [odenen] = await db
      .update(cezalar)
      .set({ odendi: true, odemeZamani: new Date() })
      .where(and(eq(cezalar.id, id), eq(cezalar.odendi, false)))
      .returning()

    if (!odenen) {
      const varMi = await db.query.cezalar.findFirst({ where: eq(cezalar.id, id) })
      throw varMi ? cakisma('Bu ceza zaten ödenmiş') : bulunamadi('Ceza')
    }
    basarili(res, odenen)
  })

  return rota
}
