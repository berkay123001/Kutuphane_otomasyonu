/** Etkileşim kare dizilerini önceden yükler ve önbellekte tutar. */
import { useEffect, useState } from 'react'
import type { Tema } from '../tema/TemaSaglayici'
import { SAHNE, kareYolu, type EtkilesimId } from './veri'

const onbellek = new Map<string, Promise<readonly HTMLImageElement[]>>()

function resimYukle(src: string): Promise<HTMLImageElement> {
  return new Promise((coz, reddet) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => coz(img)
    img.onerror = () => reddet(new Error(`Kare yüklenemedi: ${src}`))
    img.src = src
  })
}

export function kareleriYukle(id: EtkilesimId, tema: Tema): Promise<readonly HTMLImageElement[]> {
  const anahtar = `${id}/${tema}`
  const var_ = onbellek.get(anahtar)
  if (var_) return var_
  const yeni = Promise.all(
    Array.from({ length: SAHNE.kareSayisi }, (_, i) => resimYukle(kareYolu(id, tema, i + 1))),
  )
  yeni.catch(() => onbellek.delete(anahtar))
  onbellek.set(anahtar, yeni)
  return yeni
}

export function useKareler(id: EtkilesimId, tema: Tema): readonly HTMLImageElement[] | null {
  const [kareler, setKareler] = useState<readonly HTMLImageElement[] | null>(null)
  useEffect(() => {
    let iptal = false
    kareleriYukle(id, tema)
      .then((k) => {
        if (!iptal) setKareler(k)
      })
      .catch(() => {
        if (!iptal) setKareler(null)
      })
    return () => {
      iptal = true
    }
  }, [id, tema])
  return kareler
}

/** İlerlemeyi (0..1) hedefe doğru süreye göre doğrusal yaklaştırır. */
export function adimAt(mevcut: number, hedef: number, dtMs: number, sureMs: number): number {
  if (sureMs <= 0) return hedef
  const adim = dtMs / sureMs
  return mevcut < hedef ? Math.min(hedef, mevcut + adim) : Math.max(hedef, mevcut - adim)
}

/** 0..1 ilerlemeyi 1..N kare numarasına çevirir. */
export function kareNo(ilerleme: number, kareSayisi: number): number {
  const sinirli = Math.min(1, Math.max(0, ilerleme))
  return 1 + Math.round(sinirli * (kareSayisi - 1))
}
