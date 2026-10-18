import { and, asc, desc, eq, isNull, lt, sql } from 'drizzle-orm'
import { Router } from 'express'
import type { Db } from '../db/client.js'
import { hareketler, oduncler, uyeler } from '../db/schema.js'
import { basarili } from '../http/yanit.js'
import { gecikmeGunu } from '../kurallar.js'
import { bugun } from '../tarih.js'
import { KITAP_OZETI, KOPYA_OZETI, UYE_OZETI } from './ozetler.js'

const LISTE_UZUNLUGU = 10

export function panelRotalari(db: Db) {
  const rota = Router()

  rota.get('/', async (_req, res) => {
    const bugunTarih = bugun()
    const gecikmisFiltre = and(isNull(oduncler.iadeZamani), lt(oduncler.sonTeslimTarihi, bugunTarih))

    const [[hareketSayilari], gecikmis, yeniUye, sonHareketler, gecikenler] = await Promise.all([
      db
        .select({
          odunc: sql`count(*) filter (where ${hareketler.tip} = 'ODUNC')`.mapWith(Number),
          iade: sql`count(*) filter (where ${hareketler.tip} in ('IADE', 'GEC_IADE'))`.mapWith(Number),
        })
        .from(hareketler)
        .where(sql`(${hareketler.zaman} at time zone 'Europe/Istanbul')::date = ${bugunTarih}::date`),
      db.$count(oduncler, gecikmisFiltre),
      db.$count(uyeler, eq(uyeler.uyelikTarihi, bugunTarih)),
      db.query.hareketler.findMany({
        orderBy: [desc(hareketler.zaman), desc(hareketler.id)],
        limit: LISTE_UZUNLUGU,
        with: {
          uye: { columns: UYE_OZETI },
          kitap: { columns: KITAP_OZETI },
          kopya: { columns: KOPYA_OZETI },
        },
      }),
      db.query.oduncler.findMany({
        where: gecikmisFiltre,
        orderBy: asc(oduncler.sonTeslimTarihi),
        limit: LISTE_UZUNLUGU,
        with: {
          uye: { columns: UYE_OZETI },
          kopya: { columns: KOPYA_OZETI, with: { kitap: { columns: KITAP_OZETI } } },
        },
      }),
    ])

    basarili(res, {
      bugun: {
        odunc: hareketSayilari?.odunc ?? 0,
        iade: hareketSayilari?.iade ?? 0,
        gecikmis,
        yeniUye,
      },
      sonHareketler,
      gecikenler: gecikenler.map((o) => ({ ...o, gecikmeGunu: gecikmeGunu(o.sonTeslimTarihi, bugunTarih) })),
    })
  })

  return rota
}
