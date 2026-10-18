import { asc, count, countDistinct, eq, getTableColumns } from 'drizzle-orm'
import { Router } from 'express'
import { z } from 'zod'
import type { Db } from '../db/client.js'
import { kategoriler, kitaplar, kopyalar } from '../db/schema.js'
import { basarili, zorunluMetin } from '../http/yanit.js'

const kategoriSemasi = z.object({
  kod: zorunluMetin(20),
  ad: zorunluMetin(100),
})

export function kategoriRotalari(db: Db) {
  const rota = Router()

  rota.get('/', async (_req, res) => {
    const liste = await db
      .select({
        ...getTableColumns(kategoriler),
        kitapSayisi: countDistinct(kitaplar.id),
        kopyaSayisi: count(kopyalar.id),
      })
      .from(kategoriler)
      .leftJoin(kitaplar, eq(kitaplar.kategoriId, kategoriler.id))
      .leftJoin(kopyalar, eq(kopyalar.kitapId, kitaplar.id))
      .groupBy(kategoriler.id)
      .orderBy(asc(kategoriler.kod))
    basarili(res, liste)
  })

  rota.post('/', async (req, res) => {
    const [kategori] = await db.insert(kategoriler).values(kategoriSemasi.parse(req.body)).returning()
    basarili(res, kategori, 201)
  })

  return rota
}
