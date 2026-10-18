import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { istemciyiBagla } from '../api/istemci'
import type { Gorevli } from '../api/semalar'
import { girisYap as girisIstegi } from '../api/uclar'
import { OTURUM_ANAHTARI, oturumOlustur, oturumuOku, oturumuSil, oturumuYaz, type Oturum } from './depo'

export type CikisSebebi = 'kullanici' | 'sure' | 'baska-sekme'

/** setTimeout 2^31-1 ms'den uzun gecikmeleri hemen çalıştırır. */
const EN_UZUN_BEKLEME = 2 ** 31 - 1

interface OturumBaglami {
  readonly oturum: Oturum | null
  readonly gorevli: Gorevli | null
  readonly girisYap: (kullaniciAdi: string, sifre: string) => Promise<Gorevli>
  readonly cikisYap: (sebep?: CikisSebebi) => void
  readonly sonCikisSebebi: CikisSebebi | null
}

const Baglam = createContext<OturumBaglami | null>(null)

export function OturumSaglayici({ children }: { readonly children: ReactNode }) {
  const qc = useQueryClient()
  const [oturum, setOturum] = useState<Oturum | null>(() => oturumuOku())
  const [sonCikisSebebi, setSonCikisSebebi] = useState<CikisSebebi | null>(null)
  const oturumRef = useRef(oturum)
  const cikisRef = useRef<(sebep: CikisSebebi) => void>(() => undefined)

  // İstemci, alt bileşenlerin efektlerinden önce (ilk çizimde) bağlanır.
  useState(() => {
    istemciyiBagla({
      tokenAl: () => oturumRef.current?.token ?? null,
      yetkisizde: () => cikisRef.current('sure'),
    })
    return true
  })

  const oturumuKur = useCallback((yeni: Oturum | null) => {
    oturumRef.current = yeni
    setOturum(yeni)
  }, [])

  const cikisYap = useCallback(
    (sebep: CikisSebebi = 'kullanici') => {
      if (sebep !== 'baska-sekme') oturumuSil()
      oturumuKur(null)
      setSonCikisSebebi(sebep)
      qc.clear()
    },
    [qc, oturumuKur],
  )

  useEffect(() => {
    cikisRef.current = cikisYap
  }, [cikisYap])

  // Başka sekmede çıkış/giriş yapılırsa bu sekme de uyar.
  useEffect(() => {
    const dinle = (e: StorageEvent) => {
      if (e.key !== OTURUM_ANAHTARI) return
      const yeni = oturumuOku()
      if (yeni) {
        oturumuKur(yeni)
        setSonCikisSebebi(null)
      } else if (oturumRef.current) {
        cikisYap('baska-sekme')
      }
    }
    window.addEventListener('storage', dinle)
    return () => window.removeEventListener('storage', dinle)
  }, [cikisYap, oturumuKur])

  useEffect(() => {
    if (!oturum) return undefined
    const kalan = Math.min(EN_UZUN_BEKLEME, Math.max(0, oturum.bitis - Date.now()))
    const zamanlayici = window.setTimeout(() => cikisYap('sure'), kalan)
    return () => window.clearTimeout(zamanlayici)
  }, [oturum, cikisYap])

  const girisYap = useCallback(
    async (kullaniciAdi: string, sifre: string) => {
      const { veri } = await girisIstegi(kullaniciAdi, sifre)
      const yeni = oturumOlustur(veri.token, veri.gorevli)
      oturumuYaz(yeni)
      setSonCikisSebebi(null)
      oturumuKur(yeni)
      return veri.gorevli
    },
    [oturumuKur],
  )

  const deger = useMemo<OturumBaglami>(
    () => ({ oturum, gorevli: oturum?.gorevli ?? null, girisYap, cikisYap, sonCikisSebebi }),
    [oturum, girisYap, cikisYap, sonCikisSebebi],
  )
  return <Baglam.Provider value={deger}>{children}</Baglam.Provider>
}

export function useOturum(): OturumBaglami {
  const b = useContext(Baglam)
  if (!b) throw new Error('useOturum, OturumSaglayici içinde kullanılmalı')
  return b
}
