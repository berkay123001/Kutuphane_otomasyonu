/** 7/14/21 gün seçimi ve iade tarihini gösteren dönen damga bantları (onlar · birler · ay · yıl). */
import { useId } from 'react'
import type { OduncSuresi } from '../../api/uclar'
import { AY_KISA, damgaTarihi, parcala } from '../../lib/tarih'
import { tarihBantlari } from './oduncVeri'
import { SURELER } from './useOduncMasasi'
import stil from './Masa.module.css'

interface SureProps {
  readonly sure: OduncSuresi
  readonly kilitli: boolean
  readonly onSec: (s: OduncSuresi) => void
}

export function SureSecici({ sure, kilitli, onSec }: SureProps) {
  const etiketId = useId()
  return (
    <div className={stil.alan}>
      <span className={stil.etiket} id={etiketId}>
        Ödünç süresi
      </span>
      <div className={stil.secenekler} role="group" aria-labelledby={etiketId}>
        {SURELER.map((n) => (
          <button
            key={n}
            type="button"
            className={stil.sure}
            aria-pressed={n === sure}
            aria-label={`${n} gün`}
            disabled={kilitli}
            onClick={() => onSec(n)}
          >
            {n}
            <small>gün</small>
          </button>
        ))}
      </div>
    </div>
  )
}

const ONLAR = ['0', '1', '2', '3'] as const
const BIRLER = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

function Bant({ degerler, sira, gecikme }: {
  readonly degerler: readonly string[]
  readonly sira: number
  readonly gecikme: number
}) {
  return (
    <span className={stil.bant}>
      <span
        className={stil.serit}
        style={{ translate: `0 ${-1.1 * Math.max(0, sira)}em`, transitionDelay: `${gecikme}s` }}
      >
        {degerler.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </span>
    </span>
  )
}

export function TarihBantlari({ iso, bugun }: { readonly iso: string; readonly bugun: string }) {
  const b = tarihBantlari(iso)
  const buYil = parcala(bugun).yil
  const yillar = [String(buYil), String(buYil + 1)]
  return (
    <div className={stil.alan}>
      <span className={stil.etiket}>İade tarihi · damga bantları</span>
      <div className={stil.bantlar} aria-hidden="true">
        <Bant degerler={ONLAR} sira={b.onlar} gecikme={0} />
        <Bant degerler={BIRLER} sira={b.birler} gecikme={0.08} />
        <span className={stil.ayrac}>·</span>
        <Bant degerler={AY_KISA} sira={b.ayIndex} gecikme={0.16} />
        <span className={stil.ayrac}>·</span>
        <Bant degerler={yillar} sira={b.yil - buYil} gecikme={0.24} />
      </div>
      <span className="sr" aria-live="polite">
        İade tarihi {damgaTarihi(iso)}
      </span>
    </div>
  )
}
