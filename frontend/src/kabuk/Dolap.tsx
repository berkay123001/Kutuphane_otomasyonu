import { NavLink, Link } from 'react-router'
import { basHarfler, tamAd } from '../lib/bicim'
import { useOturum } from '../oturum/OturumSaglayici'
import { CEKMECELER } from './rotalar'
import { BankerLamba } from './TemaAnahtari'
import stil from './Kabuk.module.css'

/** Sol taraftaki ahşap dolap: menü çekmeceleri, lamba (tema), marka ve nöbetçi görevli. */
export function Dolap() {
  const { gorevli, cikisYap } = useOturum()

  return (
    <nav className={`${stil.dolap} grain`} aria-label="Ana menü">
      <BankerLamba />
      <Link className={stil.marka} to="/panel" aria-label="Fişlik — panele dön">
        <span className={stil.markaYazi}>
          <span className={stil.markaFis} aria-hidden="true" />
          Fişlik
        </span>
        <span className={stil.markaAlt}>kütüphane otomasyonu</span>
      </Link>

      <div className={stil.cekmeceler}>
        {CEKMECELER.map((c, i) => (
          <NavLink
            key={c.yol}
            to={c.yol}
            className={({ isActive }) => `${stil.cekmece} grain ${isActive ? stil.acik : ''}`}
            style={{ animationDelay: `${0.08 * i}s` }}
          >
            <span className={stil.plaka}>
              <span>{c.no}</span>
              <span>{c.etiket}</span>
            </span>
            <span className={stil.kulp} aria-hidden="true" />
          </NavLink>
        ))}
      </div>

      {gorevli && (
        <div className={stil.nobet}>
          <span className={stil.nobetAvatar} aria-hidden="true">
            {basHarfler(gorevli.ad, gorevli.soyad)}
          </span>
          <span className={stil.nobetMetin}>
            <b>{tamAd(gorevli)}</b>
            <span>Ödünç masası · @{gorevli.kullaniciAdi}</span>
          </span>
          <button type="button" className={stil.cikis} onClick={() => cikisYap()} aria-label="Oturumu kapat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" />
            </svg>
          </button>
        </div>
      )}
    </nav>
  )
}
