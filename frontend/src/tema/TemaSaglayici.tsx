import {
  createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode,
} from 'react'

export type Tema = 'gunduz' | 'gece'

/** Tasarımla uyumlu anahtar ve değerler ('day' / 'night'). */
const ANAHTAR = 'fislik-tema'

export function kayitliTema(deger: string | null): Tema | null {
  if (deger === 'night') return 'gece'
  if (deger === 'day') return 'gunduz'
  return null
}

export function temaCoz(kayitli: string | null, sistemKaranlik: boolean): Tema {
  return kayitliTema(kayitli) ?? (sistemKaranlik ? 'gece' : 'gunduz')
}

function depodanOku(): string | null {
  try {
    return window.localStorage.getItem(ANAHTAR)
  } catch {
    return null
  }
}

function depoyaYaz(tema: Tema): void {
  try {
    window.localStorage.setItem(ANAHTAR, tema === 'gece' ? 'night' : 'day')
  } catch {
    // depolama kapalı: tercih yalnızca bu oturumda geçerli
  }
}

function sistemKaranlik(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

interface TemaBaglami {
  readonly tema: Tema
  readonly temaDegistir: (t?: Tema) => void
}

const Baglam = createContext<TemaBaglami | null>(null)

export function TemaSaglayici({ children }: { readonly children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(() => temaCoz(depodanOku(), sistemKaranlik()))
  /** Yalnızca kullanıcı değiştirdiyse kaydet (sistem tercihi sabitlenmesin). */
  const elleSecildi = useRef(false)

  // Boyamadan önce uygulanır; index.html'deki küçük betik de ilk yüklemedeki parlamayı önler.
  useLayoutEffect(() => {
    document.documentElement.dataset.tema = tema
  }, [tema])

  useEffect(() => {
    if (elleSecildi.current) depoyaYaz(tema)
  }, [tema])

  useEffect(() => {
    const dinle = (e: StorageEvent) => {
      if (e.key === ANAHTAR) setTema(temaCoz(e.newValue, sistemKaranlik()))
    }
    window.addEventListener('storage', dinle)
    return () => window.removeEventListener('storage', dinle)
  }, [])

  const temaDegistir = useCallback((t?: Tema) => {
    elleSecildi.current = true
    setTema((onceki) => t ?? (onceki === 'gece' ? 'gunduz' : 'gece'))
  }, [])

  const deger = useMemo(() => ({ tema, temaDegistir }), [tema, temaDegistir])
  return <Baglam.Provider value={deger}>{children}</Baglam.Provider>
}

export function useTema(): TemaBaglami {
  const b = useContext(Baglam)
  if (!b) throw new Error('useTema, TemaSaglayici içinde kullanılmalı')
  return b
}
