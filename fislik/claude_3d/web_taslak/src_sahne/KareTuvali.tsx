import { useEffect, useRef } from 'react'
import type { Tema } from '../tema/TemaSaglayici'
import { adimAt, kareNo, useKareler } from './kareler'
import { SAHNE, etkilesim, type EtkilesimId } from './veri'
import stil from './Sahne.module.css'

const SURE_MS = 820

function hareketAzaltilmis(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

interface Props {
  readonly id: EtkilesimId
  readonly tema: Tema
  readonly hedef: number
}

/** Bir nesnenin (çekmece, kapı…) önceden render edilmiş karelerini kendi bölgesinde oynatır. */
export function KareTuvali({ id, tema, hedef }: Props) {
  const tuval = useRef<HTMLCanvasElement>(null)
  const ilerleme = useRef(hedef)
  const kareler = useKareler(id, tema)
  const [x, y, w, h] = etkilesim(id).alan

  useEffect(() => {
    const c = tuval.current?.getContext('2d')
    if (!c || !kareler) return undefined
    let son = performance.now()
    let istek = 0

    const ciz = () => {
      const no = kareNo(ilerleme.current, SAHNE.kareSayisi)
      c.clearRect(0, 0, w, h)
      const kare = kareler[no - 1]
      if (no > 1 && kare) c.drawImage(kare, 0, 0, w, h)
    }

    const kare = (simdi: number) => {
      const sure = hareketAzaltilmis() ? 0 : SURE_MS
      ilerleme.current = adimAt(ilerleme.current, hedef, simdi - son, sure)
      son = simdi
      ciz()
      if (ilerleme.current !== hedef) istek = requestAnimationFrame(kare)
    }

    ciz()
    if (ilerleme.current !== hedef) istek = requestAnimationFrame(kare)
    return () => cancelAnimationFrame(istek)
  }, [hedef, kareler, w, h])

  return (
    <canvas
      ref={tuval}
      className={stil.kare}
      width={w}
      height={h}
      style={{ left: x, top: y, width: w, height: h }}
      aria-hidden="true"
    />
  )
}
