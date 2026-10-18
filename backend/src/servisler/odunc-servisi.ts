import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import type { Db } from '../db/client.js'
import { cezalar, hareketler, kitaplar, kopyalar, oduncler, rezervasyonlar, uyeler } from '../db/schema.js'
import { bulunamadi, cakisma, kuralIhlali } from '../http/hatalar.js'
import { KURALLAR, cezaTutari, gecikmeGunu, oduncEngelleri, uzatmaEngeli } from '../kurallar.js'
import { bugun, gunEkle } from '../tarih.js'
import { kopyayiSerbestBirak } from './rezervasyon-servisi.js'
import { uyeSayaclari } from './uye-durumu.js'

export interface OduncGirdisi {
  uyeId: number
  gun: number
  kitapId?: number
  barkod?: string
}

type Kopya = typeof kopyalar.$inferSelect

/** Üyeye bu kitap için ayrılmış (HAZIR) rezervasyonu bulur ve işlem bitene kadar kilitler. */
async function hazirRezervasyon(tx: Db, uyeId: number, kitapId: number) {
  const [rezervasyon] = await tx
    .select()
    .from(rezervasyonlar)
    .where(
      and(
        eq(rezervasyonlar.uyeId, uyeId),
        eq(rezervasyonlar.kitapId, kitapId),
        eq(rezervasyonlar.durum, 'HAZIR'),
      ),
    )
    .for('update')
  return rezervasyon
}

/**
 * Verilecek kopyayı seçer:
 * - barkod verildiyse o kopya (rafta ya da bu üyeye ayrılmış olmalı),
 * - kitap verildiyse önce üyeye ayrılmış kopya, yoksa raftaki ilk kopya.
 */
async function verilecekKopya(tx: Db, uyeId: number, girdi: OduncGirdisi): Promise<Kopya> {
  if (girdi.barkod) {
    const [kopya] = await tx.select().from(kopyalar).where(eq(kopyalar.barkod, girdi.barkod)).for('update')
    if (!kopya) throw bulunamadi('Kopya')
    if (kopya.durum === 'RAFTA') return kopya
    if (kopya.durum === 'AYRILDI') {
      const rez = await hazirRezervasyon(tx, uyeId, kopya.kitapId)
      if (rez?.kopyaId === kopya.id) return kopya
      throw cakisma('Bu kopya başka bir üye için ayrılmış')
    }
    throw cakisma('Bu kopya şu an ödünçte')
  }

  const kitapId = girdi.kitapId!
  const rez = await hazirRezervasyon(tx, uyeId, kitapId)
  const [kopya] = await tx
    .select()
    .from(kopyalar)
    .where(
      rez?.kopyaId
        ? eq(kopyalar.id, rez.kopyaId)
        : and(eq(kopyalar.kitapId, kitapId), eq(kopyalar.durum, 'RAFTA')),
    )
    .orderBy(asc(kopyalar.id))
    .limit(1)
    .for('update')
  if (!kopya) {
    const kitap = await tx.query.kitaplar.findFirst({ where: eq(kitaplar.id, kitapId) })
    throw kitap ? cakisma('Rafta uygun kopya yok; rezervasyon yapabilirsiniz') : bulunamadi('Kitap')
  }
  return kopya
}

/**
 * Üye kitabı aldıysa o kitaptaki açık rezervasyonu tamamlanmış sayılır.
 * Rezervasyon başka bir kopyayı tutuyorsa o kopya serbest bırakılır.
 */
async function uyeninRezervasyonunuKapat(tx: Db, uyeId: number, verilen: Kopya, bugunTarih: string) {
  const [acik] = await tx
    .update(rezervasyonlar)
    .set({ durum: 'TAMAMLANDI' })
    .where(
      and(
        eq(rezervasyonlar.uyeId, uyeId),
        eq(rezervasyonlar.kitapId, verilen.kitapId),
        inArray(rezervasyonlar.durum, ['BEKLIYOR', 'HAZIR']),
      ),
    )
    .returning()
  if (acik?.kopyaId && acik.kopyaId !== verilen.id) {
    await kopyayiSerbestBirak(tx, { id: acik.kopyaId, kitapId: verilen.kitapId }, bugunTarih)
  }
}

export async function oduncVer(db: Db, girdi: OduncGirdisi, gorevliId: number, bugunTarih = bugun()) {
  return db.transaction(async (tx) => {
    // Üye satırını kilitleyerek aynı anda iki ödünçle kotanın aşılmasını engelleriz.
    const [uye] = await tx.select().from(uyeler).where(eq(uyeler.id, girdi.uyeId)).for('update')
    if (!uye) throw bulunamadi('Üye')

    const engeller = oduncEngelleri({ ...uye, ...(await uyeSayaclari(tx, uye.id, bugunTarih)) }, bugunTarih)
    if (engeller.length > 0) throw kuralIhlali('Bu üyeye ödünç verilemez', engeller)

    const kopya = await verilecekKopya(tx, uye.id, girdi)

    const [ayniKitap] = await tx
      .select({ id: oduncler.id })
      .from(oduncler)
      .innerJoin(kopyalar, eq(oduncler.kopyaId, kopyalar.id))
      .where(and(eq(oduncler.uyeId, uye.id), eq(kopyalar.kitapId, kopya.kitapId), isNull(oduncler.iadeZamani)))
      .limit(1)
    if (ayniKitap) throw cakisma('Üyenin elinde bu kitabın bir kopyası zaten var')

    await tx.update(kopyalar).set({ durum: 'ODUNCTE' }).where(eq(kopyalar.id, kopya.id))
    await uyeninRezervasyonunuKapat(tx, uye.id, kopya, bugunTarih)

    const [odunc] = await tx
      .insert(oduncler)
      .values({ uyeId: uye.id, kopyaId: kopya.id, sonTeslimTarihi: gunEkle(bugunTarih, girdi.gun) })
      .returning()
    await tx.insert(hareketler).values({
      tip: 'ODUNC',
      kitapId: kopya.kitapId,
      kopyaId: kopya.id,
      uyeId: uye.id,
      gorevliId,
    })
    return odunc!
  })
}

/** Ödüncü kopyasıyla birlikte kilitleyerek okur. */
async function kilitliOdunc(tx: Db, id: number) {
  const [satir] = await tx
    .select({ odunc: oduncler, kitapId: kopyalar.kitapId })
    .from(oduncler)
    .innerJoin(kopyalar, eq(oduncler.kopyaId, kopyalar.id))
    .where(eq(oduncler.id, id))
    .for('update')
  if (!satir) throw bulunamadi('Ödünç')
  return satir
}

export async function oduncUzat(db: Db, id: number, gorevliId: number, bugunTarih = bugun()) {
  return db.transaction(async (tx) => {
    const { odunc, kitapId } = await kilitliOdunc(tx, id)

    const bekleyen = await tx.query.rezervasyonlar.findFirst({
      where: and(eq(rezervasyonlar.kitapId, kitapId), eq(rezervasyonlar.durum, 'BEKLIYOR')),
    })
    const engel = uzatmaEngeli(
      {
        iadeEdildi: odunc.iadeZamani !== null,
        uzatildi: odunc.uzatildi,
        sonTeslimTarihi: odunc.sonTeslimTarihi,
        bekleyenRezervasyonVar: bekleyen !== undefined,
      },
      bugunTarih,
    )
    if (engel) throw kuralIhlali(engel)

    const [guncel] = await tx
      .update(oduncler)
      .set({ uzatildi: true, sonTeslimTarihi: gunEkle(odunc.sonTeslimTarihi, KURALLAR.uzatmaGunu) })
      .where(eq(oduncler.id, id))
      .returning()
    await tx.insert(hareketler).values({
      tip: 'UZATMA',
      kitapId,
      kopyaId: odunc.kopyaId,
      uyeId: odunc.uyeId,
      gorevliId,
    })
    return guncel!
  })
}

export async function iadeAl(db: Db, id: number, gorevliId: number, bugunTarih = bugun()) {
  return db.transaction(async (tx) => {
    const { odunc, kitapId } = await kilitliOdunc(tx, id)
    if (odunc.iadeZamani) throw cakisma('Bu kitap zaten iade edilmiş')

    const gecikme = gecikmeGunu(odunc.sonTeslimTarihi, bugunTarih)
    const [guncel] = await tx
      .update(oduncler)
      .set({ iadeZamani: new Date() })
      .where(eq(oduncler.id, id))
      .returning()

    const [ceza] =
      gecikme > 0
        ? await tx
            .insert(cezalar)
            .values({ oduncId: id, gecikmeGunu: gecikme, tutar: cezaTutari(gecikme) })
            .returning()
        : []

    await tx.insert(hareketler).values({
      tip: gecikme > 0 ? 'GEC_IADE' : 'IADE',
      kitapId,
      kopyaId: odunc.kopyaId,
      uyeId: odunc.uyeId,
      gorevliId,
    })
    await kopyayiSerbestBirak(tx, { id: odunc.kopyaId, kitapId }, bugunTarih)

    return { odunc: guncel!, ceza: ceza ?? null }
  })
}
