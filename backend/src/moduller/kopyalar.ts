import { eq } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import type { Db } from '../db/client.js'
import { kopyalar } from '../db/schema.js'
import { bulunamadi, cakisma } from '../http/hatalar.js'
import { basarili, enAzBirAlan, idSemasi, istegeBagliMetin } from '../http/yanit.js'

const konumGuncellemeSemasi = z
  .object({
    blok: istegeBagliMetin(20),
    rafNo: z.number().int().min(0).max(100_000).nullish(),
  })
  .refine(enAzBirAlan, 'Güncellenecek alan yok')

export function kopyaRotalari(db: Db) {
  const rota = Router()

  // Durum (RAFTA/ODUNCTE/AYRILDI) elle değiştirilmez; ödünç, iade ve rezervasyon işlemleri yönetir.
  rota.patch('/:id', async (req, res) => {
    const id = idSemasi.parse(req.params.id)
    const [kopya] = await db
      .update(kopyalar)
      .set(konumGuncellemeSemasi.parse(req.body))
      .where(eq(kopyalar.id, id))
      .returning()
    if (!kopya) throw bulunamadi('Kopya')
    basarili(res, kopya)
  })

  rota.delete('/:id', async (req, res) => {
    const id = idSemasi.parse(req.params.id)
    const kopya = await db.query.kopyalar.findFirst({ where: eq(kopyalar.id, id) })
    if (!kopya) throw bulunamadi('Kopya')
    if (kopya.durum !== 'RAFTA') throw cakisma('Yalnızca raftaki kopya silinebilir')

    await db.delete(kopyalar).where(eq(kopyalar.id, id))
    res.status(204).end()
  })

  return rota
}
