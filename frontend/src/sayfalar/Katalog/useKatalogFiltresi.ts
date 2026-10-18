/** Arama ve sekme seçimi: anında görünür, 250 ms sonra adres çubuğuna (q, kategori) yazılır.
 *  Sorgu adres çubuğundaki değerleri kullanır; dışarıdan gelen değişiklikler (geri tuşu, menü
 *  bağlantısı) yerel durumu da günceller. */
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { idCoz, paramlariGuncelle } from './katalogVeri'

export const GECIKME_MS = 250

export function useGecikmeli<T>(deger: T, ms = GECIKME_MS): T {
  const [gecikmeli, setGecikmeli] = useState(deger)
  useEffect(() => {
    const zamanlayici = window.setTimeout(() => setGecikmeli(deger), ms)
    return () => window.clearTimeout(zamanlayici)
  }, [deger, ms])
  return gecikmeli
}

export interface KatalogFiltresi {
  /** Arama kutusundaki metin (anında) */
  readonly arama: string
  readonly aramaDegistir: (metin: string) => void
  /** Sekmelerde görünen seçim (anında) */
  readonly secilenKategori: number | null
  readonly kategoriSec: (id: number | null) => void
  /** Sorguya uygulanan değerler (adres çubuğu) */
  readonly q: string
  readonly kategoriId: number | null
  readonly kitapId: number | null
  readonly kitapSec: (id: number) => void
}

interface Uygulanan {
  readonly q: string
  readonly kategoriId: number | null
}

export function useKatalogFiltresi(): KatalogFiltresi {
  const [params, setParams] = useSearchParams()
  const q = (params.get('q') ?? '').trim()
  const kategoriId = idCoz(params.get('kategori'))
  const kitapId = idCoz(params.get('kitap'))

  const [arama, setArama] = useState(q)
  const [secilenKategori, setSecilenKategori] = useState(kategoriId)
  const yazilan = useRef<Uygulanan>({ q, kategoriId })

  // Adres çubuğu dışarıdan değiştiyse (kendi yazdığımızın yankısı değilse) yerel durumu eşitle.
  useEffect(() => {
    const son = yazilan.current
    if (son.q === q && son.kategoriId === kategoriId) return
    yazilan.current = { q, kategoriId }
    setArama(q)
    setSecilenKategori(kategoriId)
  }, [q, kategoriId])

  const gecikmeliArama = useGecikmeli(arama)
  const gecikmeliKategori = useGecikmeli(secilenKategori)

  // setParams her adres değişiminde yeni kimlik alır; bağımlılık olsaydı dış gezinmeden hemen
  // sonra eski gecikmeli değerler geri yazılırdı. Yalnızca gecikmeli değerler değişince yazılır.
  const adreseYaz = useEffectEvent((hedef: Uygulanan) => {
    const son = yazilan.current
    if (son.q === hedef.q && son.kategoriId === hedef.kategoriId) return
    yazilan.current = hedef
    setParams((onceki) => paramlariGuncelle(onceki, { q: hedef.q, kategori: hedef.kategoriId }), {
      replace: true,
    })
  })

  useEffect(() => {
    adreseYaz({ q: gecikmeliArama.trim(), kategoriId: gecikmeliKategori })
  }, [gecikmeliArama, gecikmeliKategori])

  const kitapSec = useCallback(
    (id: number) => setParams((onceki) => paramlariGuncelle(onceki, { kitap: id }), { replace: true }),
    [setParams],
  )

  return {
    arama,
    aramaDegistir: setArama,
    secilenKategori,
    kategoriSec: setSecilenKategori,
    q,
    kategoriId,
    kitapId,
    kitapSec,
  }
}
