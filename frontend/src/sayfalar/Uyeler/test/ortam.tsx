/** Sayfa testleri için sağlayıcılar + bellek yönlendiricisi + sahte mutasyon. */
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { TemaSaglayici } from '../../../tema/TemaSaglayici'
import { BildirimSaglayici } from '../../../ui/Bildirim'

function Konum() {
  const konum = useLocation()
  return <output data-testid="konum">{`${konum.pathname}${konum.search}`}</output>
}

function Hedef() {
  const konum = useLocation()
  return <p>Gidilen sayfa {konum.pathname}</p>
}

/**
 * `oge` yalnızca `desen` rotasında çizilir; başka adrese gidilirse "Gidilen sayfa …" görünür.
 * `yeniden()` aynı ağacı tekrar çizer (sahte sorgu yanıtı değiştikten sonra).
 */
export function ciz(oge: ReactElement, yol: string, desen: string) {
  const agac = () => (
    <TemaSaglayici>
      <BildirimSaglayici>
          <MemoryRouter initialEntries={[yol]}>
            <Routes>
              <Route path={desen} element={oge} />
              <Route path="*" element={<Hedef />} />
            </Routes>
            <Konum />
          </MemoryRouter>
      </BildirimSaglayici>
    </TemaSaglayici>
  )
  const sonuc = render(agac())
  return { ...sonuc, yeniden: () => sonuc.rerender(agac()) }
}

export interface MutasyonSecenegi<D> {
  readonly onSuccess?: (veri: D) => void
  readonly onError?: (hata: unknown) => void
}

/** react-query mutasyonunun testte gereken kısmı; çağrıları sonradan tetiklemek için. */
export function sahteMutasyon<V, D>() {
  const mutate = vi.fn<(degisken: V, secenek?: MutasyonSecenegi<D>) => void>()
  return {
    mutate,
    isPending: false,
    /** Son çağrının onSuccess'ini verilen yanıtla çalıştırır. */
    basar: (veri: D) => mutate.mock.calls.at(-1)?.[1]?.onSuccess?.(veri),
    bozul: (hata: unknown) => mutate.mock.calls.at(-1)?.[1]?.onError?.(hata),
  }
}
