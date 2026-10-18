/** Panel ekranının saf türetimleri: damga eşlemesi, sayaç fişleri, hatırlatma listesi, dolap seçimi. */
import { z } from 'zod'
import type { HareketTipi, KategoriSayacli, Panel, PanelGeciken } from '../../api/semalar'
import { gunFarki, parcala } from '../../lib/tarih'
import type { Murekkep } from '../../ui/Damga'

// ---------- hareket defteri ----------

export interface HareketDamgasi {
  readonly metin: string
  readonly murekkep: Murekkep
}

export const HAREKET_DAMGALARI: Readonly<Record<HareketTipi, HareketDamgasi>> = {
  ODUNC: { metin: 'Ödünç', murekkep: 'v' },
  IADE: { metin: 'İade', murekkep: 'k' },
  GEC_IADE: { metin: 'Geç iade', murekkep: 'r' },
  UZATMA: { metin: 'Uzatma', murekkep: 'v' },
  AYIRTMA: { metin: 'Ayırtma', murekkep: 'k' },
}

export function hareketDamgasi(tip: HareketTipi): HareketDamgasi {
  return HAREKET_DAMGALARI[tip]
}

/** Tasarımdaki damga eğimleri, satır sırasına göre döner. */
const SATIR_EGIMLERI = [-4, 3, -2, -6, 2, -3] as const

export interface SatirZamani {
  /** Satırın yazdırılmaya başlama gecikmesi (s) */
  readonly satir: number
  /** Damganın vurulma gecikmesi (s) */
  readonly damga: number
  readonly egim: number
}

export function satirZamani(sira: number): SatirZamani {
  const satir = 1.7 + sira * 0.22
  return {
    satir: yuvarla(satir),
    damga: yuvarla(satir + 0.45),
    egim: SATIR_EGIMLERI[sira % SATIR_EGIMLERI.length] ?? -4,
  }
}

export function defterNotu(satirSayisi: number): string {
  return satirSayisi === 0 ? 'Henüz hareket yok' : `Son ${satirSayisi} hareket · en yenisi üstte`
}

/** Günlük defter numarası: yılın kaçıncı günü, dört haneli ('0291'). */
export function defterNo(iso: string): string {
  const { yil } = parcala(iso)
  return String(gunFarki(`${yil}-01-01`, iso) + 1).padStart(4, '0')
}

// ---------- bugünün çekmecesi ----------

export function ozetCumlesi(bugun: Panel['bugun']): string {
  return `Bugün ${bugun.odunc} fiş kesildi, ${bugun.iade} kitap döndü.`
}

export function enEskiGecikme(gecikenler: readonly Pick<PanelGeciken, 'gecikmeGunu'>[]): number | null {
  if (gecikenler.length === 0) return null
  return gecikenler.reduce((enBuyuk, g) => Math.max(enBuyuk, g.gecikmeGunu), 0)
}

export function gecikmeAyrintisi(gecikenler: readonly Pick<PanelGeciken, 'gecikmeGunu'>[]): string {
  const enEski = enEskiGecikme(gecikenler)
  return enEski === null ? 'gecikme yok' : `en eskisi ${enEski} gün`
}

/** Geciken toplamı: sayaç (tüm gecikmişler) ile listedeki (ilk 10) uzunluğun büyüğü. */
export function gecikenToplami(veri: {
  readonly bugun: Pick<Panel['bugun'], 'gecikmis'>
  readonly gecikenler: readonly unknown[]
}): number {
  return Math.max(veri.bugun.gecikmis, veri.gecikenler.length)
}

export type FisHedefi =
  | { readonly tur: 'rota'; readonly yol: string }
  | { readonly tur: 'capa'; readonly id: string }

export interface SayacFisi {
  readonly anahtar: 'odunc' | 'iade' | 'geciken' | 'yeniUye'
  readonly sekme: string
  readonly deger: number
  readonly etiket: string
  readonly ayrinti: string
  readonly hedef: FisHedefi
  readonly kirmizi: boolean
}

export const GECIKENLER_CAPASI = 'gecikenler'

export interface SayacVerisi {
  readonly bugun: Panel['bugun']
  readonly gecikenler: readonly Pick<PanelGeciken, 'gecikmeGunu'>[]
}

export function sayacFisleri(veri: SayacVerisi): readonly SayacFisi[] {
  const { bugun, gecikenler } = veri
  return [
    { anahtar: 'odunc', sekme: 'Ödünç', deger: bugun.odunc, etiket: 'fiş kesildi', ayrinti: 'masadan bugün', hedef: { tur: 'rota', yol: '/odunc' }, kirmizi: false },
    { anahtar: 'iade', sekme: 'İade', deger: bugun.iade, etiket: 'kitap döndü', ayrinti: 'rafa dönüyor', hedef: { tur: 'rota', yol: '/katalog' }, kirmizi: false },
    { anahtar: 'geciken', sekme: 'Geciken', deger: bugun.gecikmis, etiket: 'fiş süresini aştı', ayrinti: gecikmeAyrintisi(gecikenler), hedef: { tur: 'capa', id: GECIKENLER_CAPASI }, kirmizi: true },
    { anahtar: 'yeniUye', sekme: 'Yeni üye', deger: bugun.yeniUye, etiket: 'okuyucu kartı basıldı', ayrinti: 'bugün katıldı', hedef: { tur: 'rota', yol: '/uyeler' }, kirmizi: false },
  ]
}

// ---------- gecikenler destesi ----------

export const DESTE_BOYU = 4

/** Desteye en çok geciken ilk dört fiş girer; en çok geciken en önde (en sonda) durur. */
export function desteKartlari<T>(gecikenler: readonly T[], adet = DESTE_BOYU): readonly T[] {
  return gecikenler.slice(0, adet).reverse()
}

export const HATIRLATMA_ANAHTARI = 'fislik-hatirlatilan'
const EN_FAZLA_KAYIT = 500
const kayitSemasi = z.array(z.number().int().positive()).max(EN_FAZLA_KAYIT)

type OkunurDepo = Pick<Storage, 'getItem'>
type YazilirDepo = Pick<Storage, 'setItem'>

export function hatirlatilanlariOku(depo: OkunurDepo | null): readonly number[] {
  if (!depo) return []
  try {
    const ham = depo.getItem(HATIRLATMA_ANAHTARI)
    if (!ham) return []
    const sonuc = kayitSemasi.safeParse(JSON.parse(ham))
    return sonuc.success ? sonuc.data : []
  } catch {
    return []
  }
}

export function hatirlatilanlariYaz(depo: YazilirDepo | null, idler: readonly number[]): boolean {
  if (!depo) return false
  try {
    depo.setItem(HATIRLATMA_ANAHTARI, JSON.stringify(idler.slice(-EN_FAZLA_KAYIT)))
    return true
  } catch {
    return false
  }
}

/** Kartların hepsi işaretliyse işaretleri kaldırır, değilse hepsini işaretler.
 *  Artık gecikmede olmayan ödünçler listeden ayıklanır. */
export function hatirlatmaDegistir(
  isaretli: readonly number[],
  kartIdleri: readonly number[],
  gecerliIdler: readonly number[],
): readonly number[] {
  const kume = new Set(isaretli)
  const hepsi = kartIdleri.length > 0 && kartIdleri.every((id) => kume.has(id))
  const sonraki = hepsi
    ? isaretli.filter((id) => !kartIdleri.includes(id))
    : [...isaretli, ...kartIdleri.filter((id) => !kume.has(id))]
  const gecerli = new Set(gecerliIdler)
  return [...new Set(sonraki)].filter((id) => gecerli.has(id))
}

export interface HatirlatmaDurumu {
  readonly hepsiIsaretli: boolean
  /** Henüz işaretlenmemiş kartlardaki farklı üye sayısı */
  readonly kisiSayisi: number
  readonly etiket: string
}

export function hatirlatmaDurumu(
  kartlar: readonly Pick<PanelGeciken, 'id' | 'uyeId'>[],
  isaretli: readonly number[],
): HatirlatmaDurumu {
  const kume = new Set(isaretli)
  const bekleyen = kartlar.filter((k) => !kume.has(k.id))
  const hepsiIsaretli = kartlar.length > 0 && bekleyen.length === 0
  const kisiSayisi = new Set(bekleyen.map((k) => k.uyeId)).size
  return {
    hepsiIsaretli,
    kisiSayisi,
    etiket: hepsiIsaretli ? 'İşaretleri kaldır' : `${kisiSayisi} kişiyi hatırlatıldı olarak işaretle`,
  }
}

// ---------- koleksiyon dolabı ----------

export const OTOMATIK_ACILIS_MS = 3600

/** Kimse dokunmazsa açılacak çekmece: en çok kopyası olan (eşitlikte ilk). Boş dolapta yok. */
export function otomatikKategori(kategoriler: readonly Pick<KategoriSayacli, 'id' | 'kopyaSayisi'>[]): number | null {
  const enIyi = kategoriler.reduce<Pick<KategoriSayacli, 'id' | 'kopyaSayisi'> | null>(
    (secilen, k) => (secilen === null || k.kopyaSayisi > secilen.kopyaSayisi ? k : secilen),
    null,
  )
  return enIyi && enIyi.kopyaSayisi > 0 ? enIyi.id : null
}

export function toplamKopya(kategoriler: readonly Pick<KategoriSayacli, 'kopyaSayisi'>[]): number {
  return kategoriler.reduce((t, k) => t + k.kopyaSayisi, 0)
}

/** Çapraz dalga: sol üstten sağ alta doğru (tasarım: 5 sütun, 70 ms adım). */
export function cekmeceGecikmesi(sira: number, sutun = 5): number {
  return yuvarla(1.3 + ((sira % sutun) + Math.floor(sira / sutun)) * 0.07)
}

function yuvarla(n: number): number {
  return Math.round(n * 100) / 100
}
