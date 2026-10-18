import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { Kabuk } from './kabuk/Kabuk'
import { OdaArkaPlani } from './oda/OdaArkaPlani'
import { KorumaliRota } from './oturum/KorumaliRota'
import { useOturum } from './oturum/OturumSaglayici'
import { HataSiniri } from './ui/HataSiniri'
import { Yukleniyor } from './ui/Durumlar'

const YUKLEYICILER = {
  giris: () => import('./sayfalar/Giris/GirisSayfasi'),
  panel: () => import('./sayfalar/Panel/PanelSayfasi'),
  katalog: () => import('./sayfalar/Katalog/KatalogSayfasi'),
  odunc: () => import('./sayfalar/Odunc/OduncSayfasi'),
  uyeler: () => import('./sayfalar/Uyeler/UyelerSayfasi'),
  uyeProfil: () => import('./sayfalar/Uyeler/UyeProfilSayfasi'),
}

/** Yalnızca arka plan görsellerini üretmek için (scripts/oda-gorseli.mjs). */
const OdaCizimi = lazy(() => import('./oda/OdaCizimi').then((m) => ({ default: m.OdaCizimi })))
const GirisSayfasi = lazy(YUKLEYICILER.giris)
const PanelSayfasi = lazy(YUKLEYICILER.panel)
const KatalogSayfasi = lazy(YUKLEYICILER.katalog)
const OduncSayfasi = lazy(YUKLEYICILER.odunc)
const UyelerSayfasi = lazy(YUKLEYICILER.uyeler)
const UyeProfilSayfasi = lazy(YUKLEYICILER.uyeProfil)

/** Tarayıcı boşta kalınca tüm ekran paketlerini önceden indirir: geçişte takılma olmaz. */
function useEkranlariOnYukle() {
  useEffect(() => {
    const yukle = () => Object.values(YUKLEYICILER).forEach((y) => void y().catch(() => undefined))
    const w: Window = window
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(yukle, { timeout: 4000 })
      return () => w.cancelIdleCallback(id)
    }
    const t = w.setTimeout(yukle, 1500)
    return () => w.clearTimeout(t)
  }, [])
}

const ACILIS_ANAHTARI = 'fislik-isiklar-yandi'

/** Tasarımdaki açılış: oturum açılınca (oturum başına bir kez) ışıklar titreyerek yanar. */
function useIsikAcilisi(): boolean {
  const { oturum } = useOturum()
  const [oynat, setOynat] = useState(false)
  useEffect(() => {
    if (!oturum) return
    try {
      if (sessionStorage.getItem(ACILIS_ANAHTARI)) return
      sessionStorage.setItem(ACILIS_ANAHTARI, '1')
    } catch {
      // depolama kapalıysa her açılışta oynar
    }
    setOynat(true)
  }, [oturum])
  return oynat
}

export function SayfaYukleniyor() {
  return (
    <div style={{ position: 'relative', zIndex: 1, padding: '120px clamp(16px, 4vw, 52px)' }}>
      <Yukleniyor metin="Çekmece açılıyor…" />
    </div>
  )
}

export function App() {
  useEkranlariOnYukle()
  const isiklar = useIsikAcilisi()
  const { pathname } = useLocation()
  if (pathname === '/_oda') {
    return (
      <Suspense fallback={null}>
        <OdaCizimi />
      </Suspense>
    )
  }
  return (
    <>
      <a className="sr" href="#icerik">
        İçeriğe geç
      </a>
      <OdaArkaPlani isiklarYaniyor={isiklar} />
      <HataSiniri>
        <Suspense fallback={<SayfaYukleniyor />}>
          <Routes>
            <Route path="/giris" element={<GirisSayfasi />} />
            <Route element={<KorumaliRota />}>
              <Route index element={<Navigate to="/panel" replace />} />
              <Route element={<Kabuk />}>
                <Route path="panel" element={<PanelSayfasi />} />
                <Route path="katalog" element={<KatalogSayfasi />} />
                <Route path="odunc" element={<OduncSayfasi />} />
                <Route path="odunc/:kitapId" element={<OduncSayfasi />} />
                <Route path="uyeler" element={<UyelerSayfasi />} />
                <Route path="uyeler/:uyeId" element={<UyeProfilSayfasi />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </HataSiniri>
    </>
  )
}
