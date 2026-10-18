import { useReducedMotion } from 'motion/react'
import type { MouseEvent, ReactNode } from 'react'
import { Link } from 'react-router'
import { noktaliTarih } from '../../lib/tarih'
import { Damga } from '../../ui/Damga'
import { Odometre } from '../../ui/Odometre'
import { sayacFisleri, type FisHedefi, type SayacFisi, type SayacVerisi } from './panelVeri'
import ortak from './Panel.module.css'
import stil from './BugununCekmecesi.module.css'

/** Tasarım zamanlaması (s): fişler 150 ms arayla yükselir, sayaçlar ardından döner. */
const YUKSELIS = 0.8
const SAYAC = 1.2
const ARALIK = 0.15
const DAMGA = 2.7

function capayaKaydir(olay: MouseEvent<HTMLAnchorElement>, id: string, azalt: boolean): void {
  // Ctrl/Cmd/Shift tıklaması ve orta tuş tarayıcıya kalsın (yeni sekme vb.)
  if (olay.button !== 0 || olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey) return
  const hedef = document.getElementById(id)
  if (!hedef) return
  olay.preventDefault()
  hedef.scrollIntoView?.({ behavior: azalt ? 'auto' : 'smooth', block: 'start' })
  hedef.focus({ preventScroll: true })
}

interface BaglantiProps {
  readonly hedef: FisHedefi
  readonly className: string
  readonly gecikme: number
  readonly children: ReactNode
}

function FisBaglantisi({ hedef, className, gecikme, children }: BaglantiProps) {
  const azalt = useReducedMotion() ?? false
  const style = { animationDelay: `${gecikme}s` }
  if (hedef.tur === 'rota') {
    return (
      <Link to={hedef.yol} className={className} style={style}>
        {children}
      </Link>
    )
  }
  return (
    <a href={`#${hedef.id}`} className={className} style={style} onClick={(e) => capayaKaydir(e, hedef.id, azalt)}>
      {children}
    </a>
  )
}

function SayacKarti({ fis, sira }: { readonly fis: SayacFisi; readonly sira: number }) {
  const siniflar = `${stil.fis} card ${fis.kirmizi ? stil.kirmizi : ''}`
  return (
    <FisBaglantisi hedef={fis.hedef} className={siniflar} gecikme={YUKSELIS + sira * ARALIK}>
      <span className={stil.sekme}>{fis.sekme}</span>
      <Odometre className={stil.sayi} deger={fis.deger} gecikme={SAYAC + sira * ARALIK} />
      <span className={stil.etiket}>{fis.etiket}</span>
      <span className={stil.ayrinti}>{fis.ayrinti}</span>
      {fis.kirmizi && fis.deger > 0 && (
        <Damga murekkep="r" vur={DAMGA} egim={-9} className={stil.gecikmisDamga}>
          Gecikmiş
        </Damga>
      )}
    </FisBaglantisi>
  )
}

interface Props {
  readonly bugun: string
  readonly veri: SayacVerisi
}

/** Karanlık çekmece kuyusundan yükselen dört sayaç fişi; üstüne gelince fiş yukarı çıkar. */
export function BugununCekmecesi({ bugun, veri }: Props) {
  return (
    <div className={stil.tepsi}>
      <div className={stil.kuyu}>
        {sayacFisleri(veri).map((fis, i) => (
          <SayacKarti key={fis.anahtar} fis={fis} sira={i} />
        ))}
      </div>
      <div className={`${stil.on} grain`}>
        <span className={`${ortak.plaka} ${ortak.plakaGenis}`}>
          <span>Bugün</span>
          <span>{noktaliTarih(bugun)}</span>
        </span>
        <span className={ortak.kulp} aria-hidden="true" />
      </div>
    </div>
  )
}
