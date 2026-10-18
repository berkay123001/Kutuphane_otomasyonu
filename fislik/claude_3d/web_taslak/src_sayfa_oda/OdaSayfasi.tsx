import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { usePanel } from '../../api/sorgular'
import { CEKMECELER, nesneyeGore, type Cekmece } from '../../kabuk/rotalar'
import { TemaAnahtari } from '../../kabuk/TemaAnahtari'
import { basHarfler, tamAd } from '../../lib/bicim'
import { bugunIso, haftaninGunu, uzunTarih } from '../../lib/tarih'
import { useOturum } from '../../oturum/OturumSaglayici'
import { useSahneEylem, useSahneKipi } from '../../sahne/SahneSaglayici'
import type { EtkilesimId } from '../../sahne/veri'
import { useDaktilo } from '../../ui/useDaktilo'
import { SicakNoktalar } from './SicakNoktalar'
import stil from './Oda.module.css'

/** Nesne açılır (kareler), kamera ona yaklaşır, sonra sayfa gelir. */
const ACILMA_MS = 620
const YAKINLASMA_MS = 900

export default function OdaSayfasi() {
  useSahneKipi('tam', null)
  const { ayarla } = useSahneEylem()
  const { gorevli, cikisYap } = useOturum()
  const git = useNavigate()
  const azalt = useReducedMotion()
  const [giden, setGiden] = useState<EtkilesimId | null>(null)
  const zamanlayicilar = useRef<number[]>([])
  const panel = usePanel()
  const bugun = bugunIso()
  const selam = useDaktilo([`Hoş geldin, ${gorevli ? tamAd(gorevli) : 'görevli'}.`], 700, 38)

  useEffect(() => () => zamanlayicilar.current.forEach((t) => window.clearTimeout(t)), [])

  const sec = (id: EtkilesimId) => {
    const hedef = nesneyeGore(id)
    if (!hedef || giden) return
    setGiden(id)
    if (azalt) {
      git(hedef.yol)
      return
    }
    ayarla({ acik: id, uzerinde: null })
    zamanlayicilar.current = [
      window.setTimeout(() => ayarla({ yakin: id }), ACILMA_MS),
      window.setTimeout(() => git(hedef.yol), ACILMA_MS + YAKINLASMA_MS),
    ]
  }

  const vurgula = (c: Cekmece | null) => {
    if (!giden) ayarla({ uzerinde: c?.nesne ?? null })
  }

  const ozet = panel.data?.veri.bugun

  return (
    <div id="icerik" className={stil.oda} data-giden={giden ?? undefined}>
      <header className={stil.ust}>
        <div className={stil.marka}>
          <span className={stil.markaYazi}>
            <span className={stil.markaFis} aria-hidden="true" />
            Fişlik
          </span>
          <span className="eyebrow">
            {haftaninGunu(bugun)} · {uzunTarih(bugun)}
          </span>
        </div>
        <div className={stil.ustSag}>
          <TemaAnahtari />
          {gorevli && (
            <button type="button" className={stil.kisi} onClick={() => cikisYap()} aria-label="Oturumu kapat">
              <span className={stil.avatar} aria-hidden="true">
                {basHarfler(gorevli.ad, gorevli.soyad)}
              </span>
              <span>Çıkış</span>
            </button>
          )}
        </div>
      </header>

      <div className={stil.selam} aria-live="polite">
        <p className={stil.selamMetin}>
          {selam.satirlar[0]}
          {!selam.bitti && <span className={stil.imlec} aria-hidden="true" />}
        </p>
        {ozet && (
          <p className="note">
            Bugün {ozet.odunc} ödünç · {ozet.iade} iade ·{' '}
            <span className={ozet.gecikmis > 0 ? stil.kirmizi : undefined}>{ozet.gecikmis} gecikme</span>
          </p>
        )}
      </div>

      <SicakNoktalar devreDisi={giden !== null} onSec={sec} />

      <nav className={stil.menu} aria-label="Odadaki nesneler">
        <p className={stil.ipucu}>Odadaki bir nesneye dokun — ya da buradan seç</p>
        <div className={stil.plakalar}>
          {CEKMECELER.map((c, i) => (
            <motion.button
              key={c.yol}
              type="button"
              className={stil.plaka}
              onClick={() => sec(c.nesne)}
              onMouseEnter={() => vurgula(c)}
              onMouseLeave={() => vurgula(null)}
              onFocus={() => vurgula(c)}
              onBlur={() => vurgula(null)}
              disabled={giden !== null}
              initial={azalt ? false : { opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 160, damping: 18, delay: 0.9 + i * 0.09 }}
            >
              <span className={stil.plakaNo}>{c.no}</span>
              <span className={stil.plakaAd}>{c.etiket}</span>
              <span className={stil.plakaNesne}>{c.ipucu}</span>
            </motion.button>
          ))}
        </div>
      </nav>
    </div>
  )
}
