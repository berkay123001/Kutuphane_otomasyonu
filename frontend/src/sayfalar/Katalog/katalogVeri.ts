/** Katalog ekranının saf türetmeleri: yer numarası, durum damgaları, sekmeler, künye, raf sırtları. */
import type { HareketTipi, KategoriSayacli, KitapDetay, KitapListe } from '../../api/semalar'
import { SIRT_RENKLERI, karma, sirtRengi, tamAd } from '../../lib/bicim'
import { gunFarki, kisaTarih, zamandanIso } from '../../lib/tarih'
import type { Murekkep } from '../../ui/Damga'

export interface DurumDamgasi {
  readonly etiket: string
  readonly murekkep: Murekkep
}

export interface YerNumarasi {
  readonly ust: string
  readonly alt: string
}

/** '894.353 ATA·T' → iki satır; boşsa '—'. */
export function yerNumarasiBol(yer: string | null | undefined): YerNumarasi {
  const temiz = yer?.trim() ?? ''
  if (!temiz) return { ust: '—', alt: '' }
  const bosluk = temiz.search(/\s/)
  if (bosluk === -1) return { ust: temiz, alt: '' }
  return { ust: temiz.slice(0, bosluk), alt: temiz.slice(bosluk).trim() }
}

const KOPYASIZ: DurumDamgasi = { etiket: 'Kopyası yok', murekkep: 'k' }

/** Liste verisinden fiş damgası: rafta kopya varsa mor, yoksa koyu. */
export function listeDurumu(k: Pick<KitapListe, 'kopyaSayisi' | 'raftakiKopyaSayisi'>): DurumDamgasi {
  if (k.kopyaSayisi === 0) return KOPYASIZ
  if (k.raftakiKopyaSayisi > 0) {
    return { etiket: `Rafta · ${k.raftakiKopyaSayisi}/${k.kopyaSayisi}`, murekkep: 'v' }
  }
  return { etiket: 'Ödünçte', murekkep: 'k' }
}

type DetayKopya = KitapDetay['kopyalar'][number]

function vadeler(kopyalar: readonly DetayKopya[]): readonly string[] {
  return kopyalar
    .flatMap((k) => (k.aktifOdunc ? [k.aktifOdunc.sonTeslimTarihi.slice(0, 10)] : []))
    .toSorted()
}

/** Kopyalardan durum: gecikme > rafta > ayrıldı > ödünçte (en erken iade tarihiyle). */
export function detayDurumu(d: Pick<KitapDetay, 'kopyalar'>, bugun: string): DurumDamgasi {
  const { kopyalar } = d
  if (kopyalar.length === 0) return KOPYASIZ
  const enErken = vadeler(kopyalar)[0]
  if (enErken !== undefined && enErken < bugun) {
    return { etiket: `Gecikmiş · ${gunFarki(enErken, bugun)} gün`, murekkep: 'r' }
  }
  const rafta = kopyalar.filter((k) => k.durum === 'RAFTA').length
  if (rafta > 0) return { etiket: `Rafta · ${rafta}/${kopyalar.length}`, murekkep: 'v' }
  if (kopyalar.some((k) => k.durum === 'AYRILDI')) return { etiket: 'Ayrıldı', murekkep: 'k' }
  return { etiket: enErken ? `Ödünçte · ${kisaTarih(enErken)}` : 'Ödünçte', murekkep: 'k' }
}

/** Sırada bekleyen ayırtma varsa ikinci (koyu) damga. */
export function ayirtmaDamgasi(d: Pick<KitapDetay, 'bekleyenRezervasyonSayisi'>): string | null {
  const n = d.bekleyenRezervasyonSayisi
  return n > 0 ? `Ayırtıldı · ${n} sırada` : null
}

/** '800' → '800–899'; yüzlük olmayan kodlar olduğu gibi. */
export function aralikEtiketi(kod: string): string {
  return /^\d00$/.test(kod) ? `${kod}–${kod.charAt(0)}99` : kod
}

// ---------- sekmeler ----------
export interface Sekme {
  readonly anahtar: string
  readonly kategoriId: number | null
  readonly etiket: string
  readonly aralik: string
  readonly sayi: number | null
}

export const TUMU_ANAHTARI = 'tumu'

export function sekmeModeli(kategoriler: readonly KategoriSayacli[]): readonly Sekme[] {
  const toplam = kategoriler.reduce((n, k) => n + k.kitapSayisi, 0)
  const tumu: Sekme = {
    anahtar: TUMU_ANAHTARI,
    kategoriId: null,
    etiket: 'Tümü',
    aralik: '000–999',
    sayi: kategoriler.length ? toplam : null,
  }
  const sirali = kategoriler.toSorted((a, b) => a.kod.localeCompare(b.kod, 'tr', { numeric: true }))
  return [
    tumu,
    ...sirali.map((k) => ({
      anahtar: `k${k.id}`,
      kategoriId: k.id,
      etiket: k.ad,
      aralik: aralikEtiketi(k.kod),
      sayi: k.kitapSayisi,
    })),
  ]
}

/** Seçili kategoriye ait sekme; bilinmiyorsa (henüz yüklenmemiş vb.) yer tutucu. */
export function aktifSekme(sekmeler: readonly Sekme[], kategoriId: number | null): Sekme {
  const bulunan = sekmeler.find((s) => s.kategoriId === kategoriId)
  if (bulunan) return bulunan
  if (kategoriId === null) return { anahtar: TUMU_ANAHTARI, kategoriId, etiket: 'Tümü', aralik: '000–999', sayi: null }
  return { anahtar: `k${kategoriId}`, kategoriId, etiket: 'Kategori', aralik: '—', sayi: null }
}

const OK_TUSLARI = {
  yatay: { ileri: 'ArrowRight', geri: 'ArrowLeft' },
  dikey: { ileri: 'ArrowDown', geri: 'ArrowUp' },
} as const

/** Sekme şeridi (yatay) ve fiş yığını (dikey) için klavye: oklar döner, Home/End uçlara
 *  gider; başka tuşta null. */
export function hedefSira(tus: string, indeks: number, adet: number, eksen: keyof typeof OK_TUSLARI): number | null {
  if (adet <= 0) return null
  const oklar = OK_TUSLARI[eksen]
  if (tus === oklar.ileri) return (indeks + 1) % adet
  if (tus === oklar.geri) return (indeks - 1 + adet) % adet
  if (tus === 'Home') return 0
  if (tus === 'End') return adet - 1
  return null
}

/** Sayaç ve çekmece önündeki etiket: '800–899 · Edebiyat'. */
export function aralikMetni(s: Sekme): string {
  return `${s.aralik} · ${s.kategoriId === null ? 'Tüm koleksiyon' : s.etiket}`
}

// ---------- fiş metinleri ----------
export function yayinBilgisi(yayinevi: string | null, yayinYili: number | null): string | null {
  const parcalar = [yayinevi?.trim(), yayinYili ? String(yayinYili) : null].filter(Boolean)
  return parcalar.length ? parcalar.join(', ') : null
}

function noktala(metin: string): string {
  const t = metin.trim()
  return t.endsWith('.') ? t : `${t}.`
}

export function kopyaOzeti(kopya: number, rafta: number): string {
  return `${kopya} kopya · ${rafta} rafta`
}

export interface FisModeli {
  readonly yer: YerNumarasi
  readonly damga: DurumDamgasi
  readonly yayin: string
  readonly konu: string
  readonly ozet: string
}

export function fisModeli(k: KitapListe): FisModeli {
  return {
    yer: yerNumarasiBol(k.yerNumarasi),
    damga: listeDurumu(k),
    yayin: yayinBilgisi(k.yayinevi, k.yayinYili) ?? 'Yayın bilgisi yok',
    konu: k.kategori.ad,
    ozet: kopyaOzeti(k.kopyaSayisi, k.raftakiKopyaSayisi),
  }
}

type KunyeKaynagi = Pick<KitapListe, 'baslik' | 'yazar' | 'yayinevi' | 'yayinYili' | 'kategori'>

export interface Kunye {
  readonly bas: string
  readonly satir: string
  readonly konu: string
}

export function kunye(k: KunyeKaynagi): Kunye {
  const yayin = yayinBilgisi(k.yayinevi, k.yayinYili)
  const yazar = noktala(k.yazar)
  return {
    bas: yazar,
    satir: yayin ? `${k.baslik} / ${yazar} — ${noktala(yayin)}` : `${k.baslik} / ${yazar}`,
    konu: `1. ${noktala(k.kategori.ad)} I. Başlık.`,
  }
}

/** İlk raftaki kopyanın yeri (yoksa ilk kopya). */
export function rafYeri(kopyalar: readonly Pick<DetayKopya, 'blok' | 'rafNo' | 'durum'>[]): string {
  const kopya = kopyalar.find((k) => k.durum === 'RAFTA') ?? kopyalar[0]
  if (!kopya || (!kopya.blok && kopya.rafNo === null)) return 'Yer bilgisi yok'
  const parcalar = [kopya.blok ? `${kopya.blok} Blok` : null, kopya.rafNo !== null ? `Raf ${kopya.rafNo}` : null]
  return parcalar.filter(Boolean).join(' · ')
}

// ---------- önizleme ----------
export interface OnizlemeModeli {
  readonly id: number
  readonly baslik: string
  readonly yer: YerNumarasi
  readonly yerNumarasi: string | null
  readonly kunye: Kunye
  readonly damga: DurumDamgasi
  readonly ayirtma: string | null
  readonly demirbas: string
  readonly ozet: string
  /** Ayrıntı gelene kadar null */
  readonly rafYeri: string | null
}

/** Büyük fiş: ayrıntı geldiyse kopyalardan, gelmediyse liste satırından. */
export function onizlemeModeli(
  liste: KitapListe | undefined,
  detay: KitapDetay | undefined,
  bugun: string,
): OnizlemeModeli | null {
  const kaynak = detay ?? liste
  if (!kaynak) return null
  const kopya = detay ? detay.kopyalar.length : (liste?.kopyaSayisi ?? 0)
  const rafta = detay
    ? detay.kopyalar.filter((k) => k.durum === 'RAFTA').length
    : (liste?.raftakiKopyaSayisi ?? 0)
  return {
    id: kaynak.id,
    baslik: kaynak.baslik,
    yer: yerNumarasiBol(kaynak.yerNumarasi),
    yerNumarasi: kaynak.yerNumarasi,
    kunye: kunye(kaynak),
    damga: detay ? detayDurumu(detay, bugun) : listeDurumu({ kopyaSayisi: kopya, raftakiKopyaSayisi: rafta }),
    ayirtma: detay ? ayirtmaDamgasi(detay) : null,
    demirbas: detay?.kopyalar[0]?.barkod ?? '—',
    ozet: kopyaOzeti(kopya, rafta),
    rafYeri: detay ? rafYeri(detay.kopyalar) : null,
  }
}

// ---------- mini raf ----------
export interface Sirt {
  readonly anahtar: string
  readonly renk: string
  readonly yukseklik: number
  readonly genislik: number
  readonly yan: 'sol' | 'sag' | null
  readonly secili: boolean
}

export const SIRT_SAYISI = 15
export const SECILI_SIRA = 6

/** Seçili kitap 7. sırada; dolgu sırtları kitap kimliğinden tohumlanır (tasarımdaki LCG). */
export function rafSirtlari(kitapId: number): readonly Sirt[] {
  let tohum = karma(String(kitapId)) % 233280
  const rastgele = () => {
    tohum = (tohum * 9301 + 49297) % 233280
    return tohum / 233280
  }
  return Array.from({ length: SIRT_SAYISI }, (_, i): Sirt => {
    if (i === SECILI_SIRA) {
      return { anahtar: 'secili', renk: sirtRengi(String(kitapId)), yukseklik: 94, genislik: 46, yan: null, secili: true }
    }
    const renk = SIRT_RENKLERI[Math.floor(rastgele() * SIRT_RENKLERI.length)] ?? SIRT_RENKLERI[0]
    const yukseklik = 60 + Math.floor(rastgele() * 30)
    const genislik = 16 + Math.floor(rastgele() * 14)
    const yan = i === SECILI_SIRA - 1 ? 'sol' : i === SECILI_SIRA + 1 ? 'sag' : null
    return { anahtar: `d${i}`, renk, yukseklik, genislik, yan, secili: false }
  })
}

// ---------- hareketler ----------
export const HAREKET_ETIKETI: Record<HareketTipi, string> = {
  ODUNC: 'Ödünç',
  IADE: 'İade',
  GEC_IADE: 'Geç iade',
  UZATMA: 'Uzatma',
  AYIRTMA: 'Ayırtma',
}

export interface HareketSatiri {
  readonly id: number
  readonly tarih: string
  readonly barkod: string
  readonly uye: string
  readonly tip: string
  readonly gec: boolean
}

export function hareketSatirlari(hareketler: KitapDetay['hareketler'], adet = 6): readonly HareketSatiri[] {
  return hareketler.slice(0, adet).map((h) => ({
    id: h.id,
    tarih: kisaTarih(zamandanIso(h.zaman)),
    barkod: h.kopya?.barkod ?? '—',
    uye: tamAd(h.uye),
    tip: HAREKET_ETIKETI[h.tip],
    gec: h.tip === 'GEC_IADE',
  }))
}

// ---------- adres çubuğu ----------
/** Pozitif tam sayı kimlik; değilse null. */
export function idCoz(deger: string | null): number | null {
  if (deger === null || !/^\d+$/.test(deger)) return null
  const n = Number(deger)
  return Number.isSafeInteger(n) && n > 0 ? n : null
}

export function paramlariGuncelle(
  onceki: URLSearchParams,
  degisim: Readonly<Record<string, string | number | null>>,
): URLSearchParams {
  const yeni = new URLSearchParams(onceki)
  Object.entries(degisim).forEach(([k, v]) => {
    if (v === null || v === '') yeni.delete(k)
    else yeni.set(k, String(v))
  })
  return yeni
}

/** Riffle girişinde fiş başına gecikme; uzun listelerde sınırlı. */
export function riffleGecikmesi(sira: number, taban: number): number {
  return Number((taban + Math.min(sira, 16) * 0.06).toFixed(2))
}

/** Fiş, tur başladıktan `gecenSn` sonra kurulduysa planlı sırasına kalan süre;
 *  sırası geçmişse (arama sonucu yeni gelen fiş) kısa bir kademeyle hemen düşer. */
export function kalanGecikme(sira: number, taban: number, gecenSn: number): number {
  const kalan = riffleGecikmesi(sira, taban) - gecenSn
  return kalan > 0 ? Number(kalan.toFixed(2)) : Math.min(sira, 8) * 0.03
}
