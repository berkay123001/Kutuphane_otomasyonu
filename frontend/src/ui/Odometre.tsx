import stil from './ui.module.css'

const SERIT = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

export interface Hane {
  readonly rakam: string
  readonly gecikme: number
}

/** Her hane, 0'dan kendi rakamına kadar yuvarlanan bir şerit (tasarım: Main.dc.html .odo). */
export function haneler(deger: number, taban: number, aralik = 0.16): readonly Hane[] {
  return String(Math.max(0, Math.trunc(deger)))
    .split('')
    .map((rakam, i) => ({ rakam, gecikme: taban + i * aralik }))
}

interface Props {
  readonly deger: number
  /** Animasyon başlama gecikmesi (saniye) */
  readonly gecikme?: number
  readonly className?: string
}

export function Odometre({ deger, gecikme = 0, className }: Props) {
  return (
    <span className={`${stil.odometre} ${className ?? ''}`}>
      <span className="sr">{deger}</span>
      <span aria-hidden="true" className={stil.haneler}>
        {haneler(deger, gecikme).map((h, i) => (
          <span key={`${i}-${h.rakam}`} className={stil.odo}>
            <span
              className={stil.serit}
              style={{ translate: `0 -${10 + Number(h.rakam)}em`, animationDelay: `${h.gecikme}s` }}
            >
              {SERIT.map((r, j) => (
                <span key={j}>{r}</span>
              ))}
            </span>
          </span>
        ))}
      </span>
    </span>
  )
}
