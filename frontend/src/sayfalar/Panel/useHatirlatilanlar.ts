import { useCallback, useEffect, useState } from 'react'
import { HATIRLATMA_ANAHTARI, hatirlatilanlariOku, hatirlatilanlariYaz, hatirlatmaDegistir } from './panelVeri'

function depo(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** Hatırlatma için arka uç ucu yok: işaretler yalnızca bu tarayıcıda (localStorage) tutulur. */
export function useHatirlatilanlar(gecerliIdler: readonly number[]) {
  const [isaretli, setIsaretli] = useState<readonly number[]>(() => hatirlatilanlariOku(depo()))

  // Başka sekmedeki işaretler buraya da yansısın; düğme etiketi ile eylem hep aynı durumu görür.
  useEffect(() => {
    const dinle = (olay: StorageEvent) => {
      if (olay.key === HATIRLATMA_ANAHTARI || olay.key === null) setIsaretli(hatirlatilanlariOku(depo()))
    }
    window.addEventListener('storage', dinle)
    return () => window.removeEventListener('storage', dinle)
  }, [])

  /** Kartların işaretini değiştirir; depoya yazılabildiyse true döner. */
  const degistir = useCallback(
    (kartIdleri: readonly number[]): boolean => {
      const sonraki = hatirlatmaDegistir(isaretli, kartIdleri, gecerliIdler)
      setIsaretli(sonraki)
      return hatirlatilanlariYaz(depo(), sonraki)
    },
    [isaretli, gecerliIdler],
  )

  return { isaretli, degistir } as const
}
