import { and, asc, eq, inArray, isNull, lt } from 'drizzle-orm'
import type { Db } from '../db/client.js'
import { hareketler, kitaplar, kopyalar, oduncler, rezervasyonlar, uyeler } from '../db/schema.js'
import { HttpHatasi, bulunamadi, cakisma, kuralIhlali } from '../http/hatalar.js'
import { KURALLAR, rezervasyonEngelleri } from '../kurallar.js'
import { bugun, gunEkle } from '../tarih.js'
import { uyeSayaclari } from './uye-durumu.js'

const ACIK_DURUMLAR = ['BEKLIYOR', 'HAZIR'] as const

/**
 * Boşa çıkan kopyayı (iade / iptal / süre dolumu) sıradaki bekleyen üyeye ayırır;
 * bekleyen yoksa rafa geri koyar.
 */
export async function kopyayiSerbestBirak(tx: Db, kopya: { id: number; kitapId: number }, bugunTarih: string) {
  // FOR UPDATE: aynı anda iki kopya iade edilirse ikincisi kilidi bekler; satır artık BEKLIYOR değilse
  // Postgres onu atlayıp sıradakini verir. Böylece iki kopya aynı kişiye ayrılmaz.
  const [siradaki] = await tx
    .select({ id: rezervasyonlar.id })
    .from(rezervasyonlar)
    .where(and(eq(rezervasyonlar.kitapId, kopya.kitapId), eq(rezervasyonlar.durum, 'BEKLIYOR')))
    .orderBy(asc(rezervasyonlar.olusturmaZamani), asc(rezervasyonlar.id))
    .limit(1)
    .for('update')

  if (!siradaki) {
    await tx.update(kopyalar).set({ durum: 'RAFTA' }).where(eq(kopyalar.id, kopya.id))
    return
  }

  await tx
    .update(rezervasyonlar)
    .set({
      durum: 'HAZIR',
      kopyaId: kopya.id,
      sonGecerlilik: gunEkle(bugunTarih, KURALLAR.rezervasyonBeklemeGunu),
    })
    .where(eq(rezervasyonlar.id, siradaki.id))
  await tx.update(kopyalar).set({ durum: 'AYRILDI' }).where(eq(kopyalar.id, kopya.id))
}

export async function rezervasyonYap(
  db: Db,
  girdi: { uyeId: number; kitapId: number },
  gorevliId: number,
  bugunTarih = bugun(),
) {
  return db.transaction(async (tx) => {
    const uye = await tx.query.uyeler.findFirst({ where: eq(uyeler.id, girdi.uyeId) })
    if (!uye) throw bulunamadi('Üye')
    const engeller = rezervasyonEngelleri({ ...uye, ...(await uyeSayaclari(tx, uye.id, bugunTarih)) }, bugunTarih)
    if (engeller.length > 0) throw kuralIhlali('Bu üye rezervasyon yapamaz', engeller)

    const kitap = await tx.query.kitaplar.findFirst({ where: eq(kitaplar.id, girdi.kitapId) })
    if (!kitap) throw bulunamadi('Kitap')

    const acik = await tx.query.rezervasyonlar.findFirst({
      where: and(
        eq(rezervasyonlar.uyeId, uye.id),
        eq(rezervasyonlar.kitapId, kitap.id),
        inArray(rezervasyonlar.durum, [...ACIK_DURUMLAR]),
      ),
    })
    if (acik) throw cakisma('Üyenin bu kitap için zaten açık bir rezervasyonu var')

    const [elinde] = await tx
      .select({ id: oduncler.id })
      .from(oduncler)
      .innerJoin(kopyalar, eq(oduncler.kopyaId, kopyalar.id))
      .where(and(eq(oduncler.uyeId, uye.id), eq(kopyalar.kitapId, kitap.id), isNull(oduncler.iadeZamani)))
      .limit(1)
    if (elinde) throw cakisma('Bu kitap zaten üyenin elinde')

    const [raftaki] = await tx
      .select()
      .from(kopyalar)
      .where(and(eq(kopyalar.kitapId, kitap.id), eq(kopyalar.durum, 'RAFTA')))
      .orderBy(asc(kopyalar.id))
      .limit(1)
      .for('update')

    const [rezervasyon] = await tx
      .insert(rezervasyonlar)
      .values({
        uyeId: uye.id,
        kitapId: kitap.id,
        ...(raftaki
          ? {
              durum: 'HAZIR' as const,
              kopyaId: raftaki.id,
              sonGecerlilik: gunEkle(bugunTarih, KURALLAR.rezervasyonBeklemeGunu),
            }
          : {}),
      })
      .returning()

    if (raftaki) {
      await tx.update(kopyalar).set({ durum: 'AYRILDI' }).where(eq(kopyalar.id, raftaki.id))
    }
    await tx.insert(hareketler).values({
      tip: 'AYIRTMA',
      kitapId: kitap.id,
      kopyaId: raftaki?.id ?? null,
      uyeId: uye.id,
      gorevliId,
    })
    return rezervasyon!
  })
}

export async function rezervasyonIptal(db: Db, id: number, bugunTarih = bugun()) {
  return db.transaction(async (tx) => {
    const [rezervasyon] = await tx
      .select()
      .from(rezervasyonlar)
      .where(eq(rezervasyonlar.id, id))
      .for('update')
    if (!rezervasyon) throw bulunamadi('Rezervasyon')
    if (rezervasyon.durum !== 'BEKLIYOR' && rezervasyon.durum !== 'HAZIR') {
      throw cakisma('Rezervasyon zaten kapanmış')
    }

    const [guncel] = await tx
      .update(rezervasyonlar)
      .set({ durum: 'IPTAL' })
      .where(eq(rezervasyonlar.id, id))
      .returning()

    if (rezervasyon.durum === 'HAZIR' && rezervasyon.kopyaId) {
      await kopyayiSerbestBirak(tx, { id: rezervasyon.kopyaId, kitapId: rezervasyon.kitapId }, bugunTarih)
    }
    return guncel!
  })
}

/** Süresi içinde alınmayan HAZIR rezervasyonları kapatır. Sunucu saatte bir çağırır. */
export async function suresiDolanRezervasyonlariKapat(db: Db, bugunTarih = bugun()): Promise<number> {
  const dolanlar = await db
    .select({ id: rezervasyonlar.id })
    .from(rezervasyonlar)
    .where(and(eq(rezervasyonlar.durum, 'HAZIR'), lt(rezervasyonlar.sonGecerlilik, bugunTarih)))

  for (const { id } of dolanlar) {
    await rezervasyonIptal(db, id, bugunTarih).catch((hata: unknown) => {
      // Bu arada başka biri kapattıysa (409) sorun değil; diğer hatalar loglanır.
      if (!(hata instanceof HttpHatasi)) console.error(`Rezervasyon ${id} kapatılamadı:`, hata)
    })
  }
  return dolanlar.length
}
