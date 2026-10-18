import { useTema } from '../tema/TemaSaglayici'
import stil from './Kabuk.module.css'

export function GunesIkonu() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

export function AyIkonu() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
    </svg>
  )
}

/** Üst bardaki kayan gündüz/gece anahtarı (tasarım: .tsw). */
export function TemaAnahtari() {
  const { tema, temaDegistir } = useTema()
  const gece = tema === 'gece'
  return (
    <button type="button" className={stil.tsw} onClick={() => temaDegistir()} aria-pressed={gece} aria-label="Gece modu">
      <span className={stil.tswRay}>
        <span className={stil.tswTopuz} data-gece={gece}>
          {gece ? <AyIkonu /> : <GunesIkonu />}
        </span>
      </span>
      {gece ? 'Gece' : 'Gündüz'}
    </button>
  )
}

/** Dolabın tepesindeki banker lambası: zinciri çekilince gece olur. */
export function BankerLamba() {
  const { tema, temaDegistir } = useTema()
  const gece = tema === 'gece'
  return (
    <button
      type="button"
      className={stil.lamba}
      data-gece={gece}
      onClick={() => temaDegistir()}
      aria-pressed={gece}
      aria-label={gece ? 'Lambayı söndür, gündüze dön' : 'Lambayı yak, geceye geç'}
    >
      <span className={stil.lambaAbajur} />
      <span className={stil.lambaGovde} />
      <span className={stil.lambaTaban} />
      <span className={stil.lambaZincir} />
    </button>
  )
}
