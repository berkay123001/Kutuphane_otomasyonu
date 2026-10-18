/** Arka plandaki 3B odanın durumu. Sahne rota değişse de yeniden kurulmaz; sayfalar
 *  yalnızca hangi kipte (tam / arka) olduğunu ve hangi nesnenin açık durduğunu söyler.
 *
 *  Eylemler ve durum ayrı bağlamlarda: sayfalar yalnızca (hiç değişmeyen) eylemleri dinler,
 *  böylece menüde gezinmek ya da pencereyi boyutlandırmak açık sayfayı yeniden çizdirmez. */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react'
import type { Kapsa } from './kapsa'
import type { EtkilesimId } from './veri'

export type SahneKipi = 'tam' | 'arka'

export interface SahneAyari {
  readonly kip: SahneKipi
  readonly acik: EtkilesimId | null
  readonly uzerinde: EtkilesimId | null
  readonly yakin: EtkilesimId | null
}

interface SahneEylemleri {
  readonly ayarla: (degisim: Partial<SahneAyari>) => void
  readonly kapsaBildir: (k: Kapsa) => void
}

interface SahneDurumu {
  readonly ayar: SahneAyari
  readonly kapsa: Kapsa | null
}

const BASLANGIC: SahneAyari = { kip: 'tam', acik: null, uzerinde: null, yakin: null }
const EylemBaglami = createContext<SahneEylemleri | null>(null)
const DurumBaglami = createContext<SahneDurumu | null>(null)

function ayniKapsa(a: Kapsa | null, b: Kapsa): boolean {
  return a !== null && a.olcek === b.olcek && a.x === b.x && a.y === b.y
}

export function SahneSaglayici({ children }: { readonly children: ReactNode }) {
  const [ayar, setAyar] = useState<SahneAyari>(BASLANGIC)
  const [kapsa, setKapsa] = useState<Kapsa | null>(null)

  const ayarla = useCallback((degisim: Partial<SahneAyari>) => {
    setAyar((onceki) => {
      const yeni = { ...onceki, ...degisim }
      const ayni = (Object.keys(yeni) as (keyof SahneAyari)[]).every((k) => yeni[k] === onceki[k])
      return ayni ? onceki : yeni
    })
  }, [])

  const kapsaBildir = useCallback((k: Kapsa) => {
    setKapsa((onceki) => (ayniKapsa(onceki, k) ? onceki : k))
  }, [])

  const eylemler = useMemo(() => ({ ayarla, kapsaBildir }), [ayarla, kapsaBildir])
  const durum = useMemo(() => ({ ayar, kapsa }), [ayar, kapsa])

  return (
    <EylemBaglami.Provider value={eylemler}>
      <DurumBaglami.Provider value={durum}>{children}</DurumBaglami.Provider>
    </EylemBaglami.Provider>
  )
}

/** Yalnızca eylemler — hiç değişmez, dinleyeni yeniden çizdirmez. */
export function useSahneEylem(): SahneEylemleri {
  const b = useContext(EylemBaglami)
  if (!b) throw new Error('useSahneEylem, SahneSaglayici içinde kullanılmalı')
  return b
}

/** Sahne durumu — yalnızca sahneyi çizen bileşenler (Sahne, SicakNoktalar) dinlemeli. */
export function useSahneDurum(): SahneDurumu {
  const b = useContext(DurumBaglami)
  if (!b) throw new Error('useSahneDurum, SahneSaglayici içinde kullanılmalı')
  return b
}

/** Sayfa açıldığında sahneyi o sayfaya göre ayarlar (ör. Katalog: arka plan, çekmece açık). */
export function useSahneKipi(kip: SahneKipi, acik: EtkilesimId | null = null): void {
  const { ayarla } = useSahneEylem()
  useEffect(() => {
    ayarla({ kip, acik, uzerinde: null, yakin: null })
  }, [ayarla, kip, acik])
}
