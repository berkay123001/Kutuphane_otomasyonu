import { nesneyeGore } from '../../kabuk/rotalar'
import { ekranaCevir } from '../../sahne/kapsa'
import { useSahneDurum, useSahneEylem } from '../../sahne/SahneSaglayici'
import { SAHNE, type EtkilesimId } from '../../sahne/veri'
import stil from './Oda.module.css'

interface Props {
  readonly devreDisi: boolean
  readonly onSec: (id: EtkilesimId) => void
}

/** Odadaki tıklanabilir nesnelerin üstündeki görünmez düğmeler + nefes alan pirinç halkalar. */
export function SicakNoktalar({ devreDisi, onSec }: Props) {
  const { kapsa, ayar } = useSahneDurum()
  const { ayarla } = useSahneEylem()
  if (!kapsa) return null

  return (
    <div className={stil.noktalar}>
      {SAHNE.etkilesimler.map((e, i) => {
        const hedef = nesneyeGore(e.id)
        if (!hedef) return null
        const [x, y, w, h] = e.nokta
        const [sx, sy] = ekranaCevir([x, y], kapsa)
        const sw = Math.max(44, w * kapsa.olcek)
        const sh = Math.max(44, h * kapsa.olcek)
        const disarida = sx + sw < 0 || sy + sh < 0 || sx > window.innerWidth || sy > window.innerHeight
        if (disarida) return null
        const aktif = ayar.uzerinde === e.id
        return (
          <button
            key={e.id}
            type="button"
            className={stil.nokta}
            data-aktif={aktif}
            style={{
              left: sx - (sw - w * kapsa.olcek) / 2,
              top: sy - (sh - h * kapsa.olcek) / 2,
              width: sw,
              height: sh,
              animationDelay: `${1.2 + i * 0.15}s`,
            }}
            disabled={devreDisi}
            tabIndex={-1}
            onClick={() => onSec(e.id)}
            onMouseEnter={() => ayarla({ uzerinde: e.id })}
            onMouseLeave={() => ayarla({ uzerinde: null })}
            onFocus={() => ayarla({ uzerinde: e.id })}
            onBlur={() => ayarla({ uzerinde: null })}
            aria-label={`${e.etiket} — ${hedef.etiket} ekranını aç`}
          >
            <span className={stil.halka} aria-hidden="true" />
            <span className={stil.etiket} aria-hidden="true">
              <b>{hedef.etiket}</b>
              <span>{hedef.ipucu}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
