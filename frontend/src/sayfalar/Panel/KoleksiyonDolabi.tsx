import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { KategoriSayacli } from '../../api/semalar'
import { KategoriCekmecesi } from './KategoriCekmecesi'
import { OTOMATIK_ACILIS_MS, otomatikKategori } from './panelVeri'
import stil from './KoleksiyonDolabi.module.css'

/** Kimse dokunmazsa bir süre sonra en dolu çekmeceyi kendiliğinden açar. */
function useCekmeceSecimi(kategoriler: readonly KategoriSayacli[]) {
  const [acik, setAcik] = useState<number | null>(null)
  const dokunuldu = useRef(false)
  const otomatik = useMemo(() => otomatikKategori(kategoriler), [kategoriler])

  useEffect(() => {
    if (otomatik === null) return undefined
    const zamanlayici = window.setTimeout(() => {
      if (!dokunuldu.current) setAcik(otomatik)
    }, OTOMATIK_ACILIS_MS)
    return () => window.clearTimeout(zamanlayici)
  }, [otomatik])

  const degistir = useCallback((id: number) => {
    dokunuldu.current = true
    setAcik((onceki) => (onceki === id ? null : id))
  }, [])

  const kapat = useCallback(() => {
    dokunuldu.current = true
    setAcik(null)
  }, [])

  return { acik, degistir, kapat } as const
}

interface Props {
  readonly kategoriler: readonly KategoriSayacli[]
}

/** Dewey çekmeceli koleksiyon dolabı; bir çekmece açıkken Esc ile kapanır. */
export function KoleksiyonDolabi({ kategoriler }: Props) {
  const { acik, degistir, kapat } = useCekmeceSecimi(kategoriler)

  const tusaBasildi = (olay: KeyboardEvent<HTMLDivElement>) => {
    if (olay.key !== 'Escape' || acik === null) return
    // Odak kaybolacak "Fişlere bak" bağlantısındaysa çekmecenin kendisine dönsün.
    olay.currentTarget.querySelector<HTMLButtonElement>('button[aria-expanded="true"]')?.focus()
    kapat()
  }

  return (
    <div className={`${stil.dolap} grain`} onKeyDown={tusaBasildi}>
      {kategoriler.map((k, i) => (
        <KategoriCekmecesi
          key={k.id}
          kategori={k}
          sira={i}
          acik={acik === k.id}
          onDegistir={() => degistir(k.id)}
        />
      ))}
    </div>
  )
}
