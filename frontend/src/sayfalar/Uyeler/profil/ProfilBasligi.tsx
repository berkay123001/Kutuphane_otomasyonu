import { useId, useState } from 'react'
import { Link } from 'react-router'
import type { UyeDetay } from '../../../api/semalar'
import { Damga } from '../../../ui/Damga'
import { altBaslik, basDamgalari } from '../uyeVeri'
import ortak from '../ortak.module.css'
import stil from './Profil.module.css'

/** Damgalar sırayla vurulur (tasarım: .9s, 1.05s; eğimler -4°, 3°). */
const DAMGA_DUZENI = [
  { vur: 0.9, egim: -4 },
  { vur: 1.05, egim: 3 },
  { vur: 1.2, egim: -2 },
] as const

interface Props {
  readonly uye: UyeDetay
  readonly bugun: string
}

export function ProfilBasligi({ uye, bugun }: Props) {
  const damgalar = basDamgalari(uye, bugun)
  return (
    <header className={stil.bas}>
      <h1 className={`h1 ${stil.baslik}`}>
        <span className={ortak.satir}>
          <span>
            {uye.ad} {uye.soyad}
          </span>
        </span>
      </h1>
      <p className={stil.alt}>
        <span>{altBaslik(uye)}</span>
        {damgalar.map((d, i) => (
          <Damga
            key={d.metin}
            murekkep={d.murekkep}
            vur={DAMGA_DUZENI[i]?.vur ?? 1.2}
            egim={DAMGA_DUZENI[i]?.egim ?? -3}
          >
            {d.metin}
          </Damga>
        ))}
      </p>
      {uye.oduncEngelleri.length > 0 && (
        <ul className={stil.engeller} aria-label="Ödünç engelleri">
          {uye.oduncEngelleri.map((e) => (
            <li key={e} className={`note ${stil.engel}`}>
              {e}
            </li>
          ))}
        </ul>
      )}
    </header>
  )
}

function ArtiIkonu() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

/**
 * Üst bardaki mor bağlantı. Engel varsa gerçek bağlantı çizilmez (orta tık / yeni sekme de
 * açılmasın): odaklanabilir, kapalı görünen bir öğe ve Esc ile kapanan ipucu kalır.
 */
export function OduncVerBaglantisi({ uyeId, engeller }: { readonly uyeId: number; readonly engeller: readonly string[] }) {
  const ipucuId = useId()
  const [ipucuKapali, setIpucuKapali] = useState(false)
  if (engeller.length === 0) {
    return (
      <Link to={`/odunc?uye=${uyeId}`} className="btn btn-v">
        <ArtiIkonu />
        Bu üyeye ödünç ver
      </Link>
    )
  }
  return (
    <div
      className={stil.oduncVer}
      data-ipucu-kapali={ipucuKapali}
      onMouseLeave={() => setIpucuKapali(false)}
      onBlur={() => setIpucuKapali(false)}
    >
      <span
        role="link"
        tabIndex={0}
        className={`btn btn-v ${stil.engelli}`}
        aria-disabled="true"
        aria-describedby={ipucuId}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setIpucuKapali(true)
        }}
      >
        <ArtiIkonu />
        Bu üyeye ödünç ver
      </span>
      <div role="tooltip" id={ipucuId} className={stil.ipucu}>
        Şu an ödünç verilemez:
        <ul>
          {engeller.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
