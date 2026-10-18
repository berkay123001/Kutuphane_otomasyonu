import { z } from 'zod'
import { gorevliSema, type Gorevli } from '../api/semalar'

const ANAHTAR = 'fislik-oturum'
const VARSAYILAN_OMUR_MS = 8 * 60 * 60 * 1000

export interface Oturum {
  readonly token: string
  readonly gorevli: Gorevli
  readonly bitis: number // epoch ms
}

const oturumSema = z.object({ token: z.string(), gorevli: gorevliSema, bitis: z.number() })

/** JWT'nin exp alanını okur (imza doğrulaması backend'de). */
export function tokenBitisi(token: string, simdi = Date.now()): number {
  try {
    const yuk = token.split('.')[1] ?? ''
    const json = JSON.parse(atob(yuk.replace(/-/g, '+').replace(/_/g, '/')))
    if (typeof json.exp === 'number') return json.exp * 1000
  } catch {
    // biçimsiz token: varsayılan ömür
  }
  return simdi + VARSAYILAN_OMUR_MS
}

export function oturumOlustur(token: string, gorevli: Gorevli, simdi = Date.now()): Oturum {
  return { token, gorevli, bitis: tokenBitisi(token, simdi) }
}

/** Gizli pencere/kota/engelli depolama durumlarında localStorage erişimi hata atabilir. */
function varsayilanDepo(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export const OTURUM_ANAHTARI = ANAHTAR

export function oturumuOku(depo: Storage | null = varsayilanDepo(), simdi = Date.now()): Oturum | null {
  if (!depo) return null
  try {
    const ham = depo.getItem(ANAHTAR)
    if (!ham) return null
    const sonuc = oturumSema.safeParse(JSON.parse(ham))
    if (!sonuc.success || sonuc.data.bitis <= simdi) {
      oturumuSil(depo)
      return null
    }
    return sonuc.data
  } catch {
    return null
  }
}

export function oturumuYaz(oturum: Oturum, depo: Storage | null = varsayilanDepo()): void {
  try {
    depo?.setItem(ANAHTAR, JSON.stringify(oturum))
  } catch {
    // depolama kapalıysa oturum yalnızca bu sekmede yaşar
  }
}

export function oturumuSil(depo: Storage | null = varsayilanDepo()): void {
  try {
    depo?.removeItem(ANAHTAR)
  } catch {
    // depolama kapalı
  }
}
