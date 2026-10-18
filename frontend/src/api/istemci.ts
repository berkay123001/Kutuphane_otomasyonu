import { z, type ZodType } from 'zod'
import { metaSema, type Meta } from './semalar'

const TABAN = import.meta.env.VITE_API_URL ?? '/api'

export class ApiHatasi extends Error {
  readonly durum: number
  readonly ayrinti: unknown

  constructor(durum: number, mesaj: string, ayrinti?: unknown) {
    super(mesaj)
    this.name = 'ApiHatasi'
    this.durum = durum
    this.ayrinti = ayrinti
  }

  /** 422 kural ihlallerinde gerekçeler (ör. 'Ödenmemiş cezası var'), 400'de alan hataları. */
  get gerekceler(): readonly string[] {
    const a = this.ayrinti
    if (Array.isArray(a)) return a.filter((x): x is string => typeof x === 'string')
    if (a && typeof a === 'object') {
      const { formErrors = [], fieldErrors = {} } = a as {
        formErrors?: string[]
        fieldErrors?: Record<string, string[]>
      }
      return [...formErrors, ...Object.values(fieldErrors).flat()]
    }
    return []
  }
}

export interface Yanit<T> {
  readonly veri: T
  readonly meta?: Meta
}

type SorguDegeri = string | number | boolean | null | undefined

export interface IstekAyari {
  readonly yontem?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  readonly govde?: unknown
  readonly sorgu?: Readonly<Record<string, SorguDegeri>>
  readonly sinyal?: AbortSignal
}

interface Baglanti {
  readonly tokenAl: () => string | null
  readonly yetkisizde: () => void
}

let baglanti: Baglanti = { tokenAl: () => null, yetkisizde: () => undefined }

export function istemciyiBagla(yeni: Baglanti): void {
  baglanti = yeni
}

export function sorguMetni(sorgu: IstekAyari['sorgu']): string {
  if (!sorgu) return ''
  const parcalar = Object.entries(sorgu)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
  return parcalar.length ? `?${parcalar.join('&')}` : ''
}

const zarfSema = z.object({
  success: z.boolean().optional(),
  data: z.unknown().optional(),
  meta: z.unknown().optional(),
  error: z.string().optional(),
  details: z.unknown().optional(),
})
type Zarf = z.infer<typeof zarfSema>

/** JSON olmayan gövdeler (proxy/HTML hata sayfaları) asla kullanıcıya gösterilmez. */
export function durumMesaji(durum: number): string {
  if (durum === 429) return 'Çok fazla istek, biraz bekleyin'
  if (durum === 401) return 'Oturum geçersiz ya da süresi dolmuş'
  if (durum === 404) return 'İstenen kayıt bulunamadı'
  if (durum >= 500) return 'Sunucu şu an yanıt veremiyor, biraz sonra yeniden dene'
  return 'Beklenmeyen bir hata oluştu'
}

async function govdeyiOku(yanit: Response): Promise<Zarf | null> {
  if (yanit.status === 204) return null
  let metin: string
  try {
    metin = await yanit.text()
  } catch {
    throw new ApiHatasi(yanit.status, durumMesaji(yanit.status))
  }
  if (!metin) return null
  try {
    const sonuc = zarfSema.safeParse(JSON.parse(metin))
    return sonuc.success ? sonuc.data : { success: false, error: durumMesaji(yanit.status) }
  } catch {
    return yanit.ok ? { success: false, error: 'Sunucudan okunamayan yanıt geldi' } : { success: false, error: durumMesaji(yanit.status) }
  }
}

export async function istek<T>(yol: string, sema: ZodType<T>, ayar: IstekAyari = {}): Promise<Yanit<T>> {
  const token = baglanti.tokenAl()
  const basliklar: Record<string, string> = { Accept: 'application/json' }
  if (ayar.govde !== undefined) basliklar['Content-Type'] = 'application/json'
  if (token) basliklar.Authorization = `Bearer ${token}`

  let yanit: Response
  try {
    yanit = await fetch(`${TABAN}${yol}${sorguMetni(ayar.sorgu)}`, {
      method: ayar.yontem ?? 'GET',
      headers: basliklar,
      body: ayar.govde === undefined ? undefined : JSON.stringify(ayar.govde),
      signal: ayar.sinyal,
    })
  } catch (hata) {
    if (hata instanceof DOMException && hata.name === 'AbortError') throw hata
    throw new ApiHatasi(0, 'Sunucuya ulaşılamıyor. Bağlantını kontrol et.')
  }

  const govde = await govdeyiOku(yanit)

  if (!yanit.ok || govde?.success === false) {
    // Yalnızca şu anki oturumun token'ıyla atılmış istek 401 alırsa oturumu kapat
    if (yanit.status === 401 && token && baglanti.tokenAl() === token) baglanti.yetkisizde()
    throw new ApiHatasi(yanit.status, govde?.error ?? durumMesaji(yanit.status), govde?.details)
  }

  const sonuc = sema.safeParse(govde?.data ?? null)
  if (!sonuc.success) {
    throw new ApiHatasi(yanit.status, 'Sunucudan beklenmeyen biçimde yanıt geldi', sonuc.error.issues)
  }
  const meta = govde?.meta ? metaSema.safeParse(govde.meta) : undefined
  return { veri: sonuc.data, meta: meta?.success ? meta.data : undefined }
}
