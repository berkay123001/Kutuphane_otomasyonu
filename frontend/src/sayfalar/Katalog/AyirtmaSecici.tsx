/** Satır içi üye seçici: en az iki harfle üye arar, seçilen üye adına kitabı ayırtır. */
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import type { UyeListe } from '../../api/semalar'
import { useUyeler } from '../../api/sorgular'
import { tamAd } from '../../lib/bicim'
import { useGecikmeli } from './useKatalogFiltresi'
import stil from './Onizleme.module.css'

interface Props {
  readonly id: string
  readonly baslik: string
  readonly bekliyor: boolean
  readonly onSec: (uye: UyeListe) => void
  readonly onKapat: () => void
}

const EN_AZ = 2
const YAY = { type: 'spring', stiffness: 320, damping: 30 } as const

interface SonucDurumu {
  readonly not: string
  readonly uyeler: readonly UyeListe[]
}

function useUyeSonuclari(q: string, bekliyor: boolean): SonucDurumu {
  const etkin = q.length >= EN_AZ
  const sorgu = useUyeler({ q, limit: 6 }, etkin)
  const uyeler = sorgu.data?.veri
  if (!etkin) return { not: 'En az iki harf yaz: ad, soyad ya da üye numarası.', uyeler: [] }
  if (sorgu.isError) return { not: 'Üyeler alınamadı, birazdan yeniden dene.', uyeler: [] }
  if (!uyeler) return { not: 'Üye fişleri aranıyor…', uyeler: [] }
  if (uyeler.length === 0) return { not: 'Eşleşen üye yok.', uyeler: [] }
  return { not: bekliyor ? 'Ayırtılıyor…' : `${uyeler.length} üye bulundu`, uyeler }
}

/** Durum satırı hep aynı öğedir (yalnızca metni değişir) ki ekran okuyucu her değişimi duyursun. */
function UyeSonuclari({ q, bekliyor, onSec }: Pick<Props, 'bekliyor' | 'onSec'> & { readonly q: string }) {
  const { not, uyeler } = useUyeSonuclari(q, bekliyor)
  return (
    <>
      <p className={stil.seciciNot} role="status">
        {not}
      </p>
      {uyeler.length > 0 && (
        <ul className={stil.seciciListe}>
          {uyeler.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                className={stil.uyeSecenek}
                aria-disabled={bekliyor || undefined}
                onClick={() => onSec(u)}
              >
                <span className={stil.uyeNo}>{u.uyeNo}</span>
                <span className={stil.uyeAd}>{tamAd(u)}</span>
                {!u.aktif && <span className={stil.uyePasif}>Pasif</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

export function AyirtmaSecici({ id, baslik, bekliyor, onSec, onKapat }: Props) {
  const azalt = useReducedMotion() ?? false
  const girdiId = useId()
  const girdiRef = useRef<HTMLInputElement>(null)
  const [q, setQ] = useState('')
  const gecikmeliQ = useGecikmeli(q.trim())

  // autoFocus, yüksekliği 0 olan kırpılmış kabı kaydırır ve başlığı gizlerdi.
  useEffect(() => {
    girdiRef.current?.focus({ preventScroll: true })
  }, [])

  const tusaBas = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape') return
    e.stopPropagation()
    onKapat()
  }

  return (
    <motion.div
      className={stil.seciciKap}
      initial={azalt ? false : { height: 0, opacity: 0, overflow: 'hidden' }}
      animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
      exit={azalt ? { opacity: 0 } : { height: 0, opacity: 0, overflow: 'hidden' }}
      transition={YAY}
    >
      <motion.div
        id={id}
        role="group"
        aria-label={`${baslik} için üye seç`}
        className={stil.secici}
        onKeyDown={tusaBas}
        initial={azalt ? false : { rotateX: -38, y: -14 }}
        animate={{ rotateX: 0, y: 0 }}
        transition={YAY}
      >
        <div className={stil.seciciBas}>
          <label htmlFor={girdiId}>Kimin adına ayırtılsın?</label>
          <button type="button" className={stil.kapat} onClick={onKapat}>
            Vazgeç
          </button>
        </div>
        <input
          ref={girdiRef}
          id={girdiId}
          className={stil.seciciGirdi}
          type="search"
          autoComplete="off"
          placeholder="Ad, soyad ya da Ü-0001"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <UyeSonuclari q={gecikmeliQ} bekliyor={bekliyor} onSec={onSec} />
      </motion.div>
    </motion.div>
  )
}
