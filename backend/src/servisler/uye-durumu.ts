import { and, eq, sql } from 'drizzle-orm'
import type { Db } from '../db/client.js'
import { cezalar, oduncler } from '../db/schema.js'

const sayi = (ifade: ReturnType<typeof sql>) => ifade.mapWith(Number)

/** Ödünç kurallarının ihtiyaç duyduğu sayaçlar. */
export async function uyeSayaclari(db: Db, uyeId: number, bugunTarih: string) {
  const [odunc] = await db
    .select({
      aktifOduncSayisi: sayi(sql`count(*) filter (where ${oduncler.iadeZamani} is null)`),
      gecikmisOduncSayisi: sayi(
        sql`count(*) filter (where ${oduncler.iadeZamani} is null and ${oduncler.sonTeslimTarihi} < ${bugunTarih})`,
      ),
      okunanKitapSayisi: sayi(sql`count(*) filter (where ${oduncler.iadeZamani} is not null)`),
    })
    .from(oduncler)
    .where(eq(oduncler.uyeId, uyeId))

  const [ceza] = await db
    .select({ odenmemisCezaSayisi: sayi(sql`count(*)`) })
    .from(cezalar)
    .innerJoin(oduncler, eq(cezalar.oduncId, oduncler.id))
    .where(and(eq(oduncler.uyeId, uyeId), eq(cezalar.odendi, false)))

  return {
    aktifOduncSayisi: odunc?.aktifOduncSayisi ?? 0,
    gecikmisOduncSayisi: odunc?.gecikmisOduncSayisi ?? 0,
    okunanKitapSayisi: odunc?.okunanKitapSayisi ?? 0,
    odenmemisCezaSayisi: ceza?.odenmemisCezaSayisi ?? 0,
  }
}
