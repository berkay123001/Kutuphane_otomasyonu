/** Ödünç ekranının saf türetmeleri: verilecek kopya, kopya damgaları, tarih bantları,
 *  fiş satırları ve iade fişindeki eski damgalar (fislik/Kitap.dc.html). */
import { ApiHatasi } from '../../api/istemci'
import type { KitapDetay, KitapListe, UyeDetay } from '../../api/semalar'
import { kucuk, tamAd } from '../../lib/bicim'
import { damgaTarihi, gunFarki, kisaTarih, parcala } from '../../lib/tarih'
import type { Murekkep } from '../../ui/Damga'

export type KitapKopyasi = KitapDetay['kopyalar'][number]
export type KitapHareketi = KitapDetay['hareketler'][number]

/** Başarılı ödünçten sonra hangi kopyanın hangi son güne damgalandığı. */
export interface VerilenKopya {
  readonly kopyaId: number
  readonly sonGun: string
}

/** URL'deki '?uye=7' ya da ':kitapId' değerini pozitif tam sayıya çevirir. */
export function idCoz(deger: string | null | undefined): number | null {
  if (!deger) return null
  const n = Number(deger)
  return Number.isInteger(n) && n > 0 ? n : null
}

/** Sunucunun seçeceği kopya: üyeye ayrılmış kopya, yoksa raftaki ilk kopya (id sırasıyla). */
export function verilecekKopyaId(kopyalar: readonly KitapKopyasi[], uyeId: number | null): number | null {
  const sirali = [...kopyalar].sort((a, b) => a.id - b.id)
  if (uyeId !== null) {
    const ayrilan = sirali.find((k) => k.durum === 'AYRILDI' && k.ayrilanRezervasyon?.uye.id === uyeId)
    if (ayrilan) return ayrilan.id
  }
  return sirali.find((k) => k.durum === 'RAFTA')?.id ?? null
}

export function konumMetni(k: { readonly blok: string | null; readonly rafNo: number | null }): string {
  const parcalar = [k.blok ? `${k.blok} Blok` : null, k.rafNo !== null ? `Raf ${k.rafNo}` : null].filter(
    (p): p is string => p !== null,
  )
  return parcalar.length > 0 ? parcalar.join(' · ') : 'Konum belirtilmemiş'
}

const KALIN_UNLULER = new Set(['a', 'ı', 'o', 'u'])
const INCE_UNLULER = new Set(['e', 'i', 'ö', 'ü'])
const SERT_UNSUZLER = new Set(['f', 's', 't', 'k', 'ç', 'ş', 'h', 'p'])

/** Bulunma eki, ünlü uyumu ve sertleşmeyle: 'Kerem Yıldız’da', 'Elif Demirci’de', 'Ali Koç’ta'. */
export function bulunmaEki(ad: string): string {
  const temiz = ad.trim()
  const harfler = [...kucuk(temiz)]
  const sonUnlu = harfler.filter((h) => KALIN_UNLULER.has(h) || INCE_UNLULER.has(h)).at(-1)
  const unlu = sonUnlu !== undefined && INCE_UNLULER.has(sonUnlu) ? 'e' : 'a'
  const unsuz = SERT_UNSUZLER.has(harfler.at(-1) ?? '') ? 't' : 'd'
  return `${temiz}’${unsuz}${unlu}`
}

export interface KopyaGorunumu {
  /** Kartın alt satırı: konum ya da kimde olduğu */
  readonly satir: string
  readonly damga: string
  readonly murekkep: Murekkep
  /** Rafta olmayan kopyalar soluk kâğıtta durur */
  readonly soluk: boolean
  /** Damga vurma gecikmesi (yalnızca yeni verilen kopyada) */
  readonly vur: number | false
}

function oduncteGorunumu(k: KitapKopyasi, konum: string, bugun: string): KopyaGorunumu {
  const odunc = k.aktifOdunc
  if (!odunc) return { satir: konum, damga: 'Ödünçte', murekkep: 'k', soluk: true, vur: false }
  const gecikmis = gunFarki(bugun, odunc.sonTeslimTarihi) < 0
  return {
    satir: bulunmaEki(tamAd(odunc.uye)),
    damga: `${gecikmis ? 'Gecikmiş' : 'Ödünçte'} · ${kisaTarih(odunc.sonTeslimTarihi)}`,
    murekkep: gecikmis ? 'r' : 'k',
    soluk: true,
    vur: false,
  }
}

function ayrildiGorunumu(k: KitapKopyasi, konum: string): KopyaGorunumu {
  const rez = k.ayrilanRezervasyon
  return {
    satir: rez ? `${tamAd(rez.uye)} adına` : konum,
    damga: rez?.sonGecerlilik ? `Ayrıldı · ${kisaTarih(rez.sonGecerlilik)}` : 'Ayrıldı',
    murekkep: 'k',
    soluk: true,
    vur: false,
  }
}

/** Kopya kartındaki satır ve damga. Az önce verilen kopya mor 'Ödünçte' damgasıyla vurulur. */
export function kopyaGorunumu(k: KitapKopyasi, bugun: string, verilen: VerilenKopya | null): KopyaGorunumu {
  const konum = konumMetni(k)
  if (verilen && verilen.kopyaId === k.id) {
    return { satir: konum, damga: `Ödünçte · ${kisaTarih(verilen.sonGun)}`, murekkep: 'v', soluk: false, vur: 1.05 }
  }
  if (k.durum === 'ODUNCTE') return oduncteGorunumu(k, konum, bugun)
  if (k.durum === 'AYRILDI') return ayrildiGorunumu(k, konum)
  return { satir: konum, damga: 'Rafta', murekkep: 'v', soluk: false, vur: false }
}

export interface TarihBantlari {
  readonly onlar: number
  readonly birler: number
  /** 0-11, AY_KISA dizisindeki sıra */
  readonly ayIndex: number
  readonly yil: number
}

/** Damga bantlarının konumları: '2026-10-31' → { onlar: 3, birler: 1, ayIndex: 9, yil: 2026 }. */
export function tarihBantlari(iso: string): TarihBantlari {
  const { yil, ay, gun } = parcala(iso)
  return { onlar: Math.floor(gun / 10), birler: gun % 10, ayIndex: ay - 1, yil }
}

function noktala(metin: string): string {
  const t = metin.trim()
  return /[.!?…]$/.test(t) ? t : `${t}.`
}

type KayitKaynagi = Pick<KitapDetay, 'baslik' | 'yazar' | 'yayinevi' | 'yayinYili' | 'kategori'>

/** Katalog fişinin daktiloyla yazılan üç satırı. */
export function kayitSatirlari(k: KayitKaynagi): readonly [string, string, string] {
  const yayin = [k.yayinevi, k.yayinYili !== null ? String(k.yayinYili) : null].filter(Boolean).join(', ')
  const ikinci = `${k.baslik} / ${noktala(k.yazar)}${yayin ? ` — ${noktala(yayin)}` : ''}`
  return [noktala(k.yazar), ikinci, `1. ${noktala(k.kategori.ad)}  I. Başlık.`]
}

/** Başlık altındaki künye: 'Oğuz Atay · İletişim Yayınları · 3 kopya'. */
export function kunyeSatiri(k: Pick<KitapDetay, 'yazar' | 'yayinevi' | 'kopyalar'>): string {
  return [k.yazar, k.yayinevi, `${k.kopyalar.length} kopya`].filter(Boolean).join(' · ')
}

/** '894.353 ATA·T' → ['894.353', 'ATA·T'] (sırt etiketi ve fişin sol sütunu için). */
export function yerParcalari(yer: string | null): readonly [string, string] {
  const [ilk = '', ...kalan] = (yer ?? '').trim().split(/\s+/)
  return [ilk || '—', kalan.join(' ')]
}

export interface EskiDamga {
  readonly anahtar: number
  readonly metin: string
  readonly murekkep: 'k' | 'v'
  readonly egim: number
  readonly saydamlik: number
}

const ESKI_DESEN = [
  { murekkep: 'k', egim: -3, saydamlik: 0.5 },
  { murekkep: 'v', egim: 4, saydamlik: 0.46 },
  { murekkep: 'k', egim: -6, saydamlik: 0.6 },
  { murekkep: 'v', egim: 2, saydamlik: 0.68 },
] as const

/** Üyenin son iade ettiği ödünçlerin son günleri, eskiden yeniye (gecmis en yeni başta gelir). */
export function eskiDamgalar(
  gecmis: readonly { readonly id: number; readonly sonTeslimTarihi: string }[],
  adet = 4,
): readonly EskiDamga[] {
  return gecmis
    .slice(0, adet)
    .toReversed()
    .map((o, i) => {
      const desen = ESKI_DESEN[i % ESKI_DESEN.length] ?? ESKI_DESEN[0]
      return { anahtar: o.id, metin: damgaTarihi(o.sonTeslimTarihi), ...desen }
    })
}

export const ELINDE_VAR = 'Elinde bu kitabın bir kopyası zaten var'

/** Sunucunun bildirdiği engeller + bu kitabın bir kopyası zaten üyedeyse o da. */
export function tumEngeller(
  uye: Pick<UyeDetay, 'id' | 'oduncEngelleri'>,
  kopyalar: readonly KitapKopyasi[],
): readonly string[] {
  const elinde = kopyalar.some((k) => k.aktifOdunc?.uye.id === uye.id)
  return elinde && !uye.oduncEngelleri.includes(ELINDE_VAR)
    ? [...uye.oduncEngelleri, ELINDE_VAR]
    : uye.oduncEngelleri
}

/** Üyenin bu kitap için zaten açık (bekleyen/hazır) rezervasyonu var mı? */
export function siradaMi(uye: Pick<UyeDetay, 'rezervasyonlar'>, kitapId: number): boolean {
  return uye.rezervasyonlar.some((r) => r.kitapId === kitapId)
}

/** 409 'Rafta uygun kopya yok; rezervasyon yapabilirsiniz' → ayırtma teklif edilir. */
export function rezervasyonOnerilir(hata: unknown): boolean {
  return hata instanceof ApiHatasi && hata.durum === 409 && /rezervasyon/i.test(hata.message)
}

export type OkuyucuDurumu = 'yok' | 'yukleniyor' | 'hata' | 'hazir'

/** Damgala düğmesinin altındaki ipucu: neden kapalı ya da hangi kopya verilecek. */
export function damgaIpucu(d: {
  readonly okuyucu: OkuyucuDurumu
  readonly engelSayisi: number
  readonly verilecek: string | null
}): string {
  if (d.okuyucu === 'yok') return 'Önce okuyucuyu seç.'
  if (d.okuyucu === 'yukleniyor') return 'Okuyucu fişi getiriliyor…'
  if (d.okuyucu === 'hata') return 'Okuyucu fişi açılamadı.'
  if (d.engelSayisi > 0) return 'Engeller kalkmadan bu okuyucuya ödünç verilemez.'
  if (d.verilecek === null) return 'Rafta verilebilecek kopya yok.'
  return `${d.verilecek} verilecek.`
}

export function okuyucuAltSatiri(
  uye: Pick<UyeDetay, 'tur' | 'bolum'> & { readonly istatistik: { readonly aktifOduncSayisi: number } },
): string {
  const tur = uye.tur === 'OGRENCI' ? 'Öğrenci' : 'Personel'
  return [tur, uye.bolum, `elinde ${uye.istatistik.aktifOduncSayisi} kitap`].filter(Boolean).join(' · ')
}

export const HAREKET_ETIKETI: Record<KitapHareketi['tip'], string> = {
  ODUNC: 'Ödünç',
  IADE: 'İade',
  GEC_IADE: 'Geç iade',
  UZATMA: 'Uzatma',
  AYIRTMA: 'Ayırtma',
}

/** Hareketteki kopyanın kart numarası: 'K.2' (kopya yoksa '—'). */
export function kopyaNumarasi(kopyalar: readonly KitapKopyasi[], kopyaId: number | null | undefined): string {
  const sira = kopyalar.findIndex((k) => k.id === kopyaId)
  return sira >= 0 ? `K.${sira + 1}` : '—'
}

/** Kitap seçicideki küçük fişin damgası. */
export function listeDamgasi(k: Pick<KitapListe, 'kopyaSayisi' | 'raftakiKopyaSayisi'>): {
  readonly metin: string
  readonly murekkep: Murekkep
} {
  if (k.kopyaSayisi === 0) return { metin: 'Kopyasız', murekkep: 'k' }
  if (k.raftakiKopyaSayisi === 0) return { metin: 'Ödünçte', murekkep: 'k' }
  return { metin: `Rafta · ${k.raftakiKopyaSayisi}/${k.kopyaSayisi}`, murekkep: 'v' }
}

/** Makbuzdaki fiş numarası: 417 → '0417'. */
export function fisNo(id: number): string {
  return String(id).padStart(4, '0')
}
