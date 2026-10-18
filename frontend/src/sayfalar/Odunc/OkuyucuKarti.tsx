/** Seçili okuyucunun kâğıt künyesi: baş harfler, ad, tür/bölüm, uygunluk damgası ve engeller. */
import { motion, useReducedMotion } from 'motion/react'
import { Link } from 'react-router'
import type { UyeDetay } from '../../api/semalar'
import { basHarfler, tamAd } from '../../lib/bicim'
import { Damga } from '../../ui/Damga'
import { okuyucuAltSatiri } from './oduncVeri'
import stil from './Masa.module.css'

function KartDamgasi({ damgalandi, uygun }: { readonly damgalandi: boolean; readonly uygun: boolean }) {
  if (damgalandi) {
    return (
      <Damga key="verildi" murekkep="v" vur={1.05}>
        Verildi
      </Damga>
    )
  }
  return uygun ? (
    <Damga key="uygun" murekkep="v" vur={0.2}>
      Uygun
    </Damga>
  ) : (
    <Damga key="engel" murekkep="r" vur={0.2}>
      Verilemez
    </Damga>
  )
}

interface Props {
  readonly uye: UyeDetay
  readonly engeller: readonly string[]
  readonly damgalandi: boolean
}

export function OkuyucuKarti({ uye, engeller, damgalandi }: Props) {
  const azalt = useReducedMotion()
  const uygun = engeller.length === 0
  return (
    <>
      <motion.div
        initial={azalt ? false : { opacity: 0, y: 14, rotate: -1.5 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      >
        <Link className={stil.kim} to={`/uyeler/${uye.id}`}>
          <span className={stil.kimAvatar} aria-hidden="true">
            {basHarfler(uye.ad, uye.soyad)}
          </span>
          <span className={stil.kimMetin}>
            <b>{tamAd(uye)}</b>
            <span>{okuyucuAltSatiri(uye)}</span>
          </span>
          <KartDamgasi damgalandi={damgalandi} uygun={uygun} />
        </Link>
      </motion.div>
      {!damgalandi && !uygun && (
        <ul className={stil.engeller} aria-label="Ödünç engelleri">
          {engeller.map((e, i) => (
            <li key={e}>
              <Damga murekkep="lr" vur={0.3 + i * 0.12} className={stil.engelDamga}>
                {e}
              </Damga>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
