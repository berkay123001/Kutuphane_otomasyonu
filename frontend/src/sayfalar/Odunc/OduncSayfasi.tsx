/** Çekmece 03 · Kitap ve ödünç (fislik/Kitap.dc.html). /odunc → kitap seçici, /odunc/:kitapId → ödünç masası. */
import { Link, useParams } from 'react-router'
import { UstBar } from '../../kabuk/UstBar'
import { KitapOdunc } from './KitapOdunc'
import { KitapSecici } from './KitapSecici'
import { idCoz } from './oduncVeri'

function GeriIkonu() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

export default function OduncSayfasi() {
  const { kitapId } = useParams()

  return (
    <>
      <UstBar etiket="Çekmece 03 — Ödünç ver">
        <Link className="btn" to="/katalog">
          <GeriIkonu />
          Kataloğa dön
        </Link>
      </UstBar>
      {kitapId === undefined ? <KitapSecici /> : <KitapOdunc key={kitapId} kitapId={idCoz(kitapId)} />}
    </>
  )
}
