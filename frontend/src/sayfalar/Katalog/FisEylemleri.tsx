/** Seçili fişin düğmeleri: ödünç masasına git, üye adına ayırt. */
import { AnimatePresence } from 'motion/react'
import { useCallback, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import type { UyeListe } from '../../api/semalar'
import { useRezervasyon } from '../../api/sorgular'
import { tamAd } from '../../lib/bicim'
import { useBildirim } from '../../ui/Bildirim'
import { AyirtmaSecici } from './AyirtmaSecici'
import { IleriIkonu } from './ikonlar'
import stil from './Onizleme.module.css'

interface Props {
  readonly kitapId: number
  readonly baslik: string
}

export function FisEylemleri({ kitapId, baslik }: Props) {
  const [acik, setAcik] = useState(false)
  const seciciId = useId()
  const dugmeRef = useRef<HTMLButtonElement>(null)
  const { mutateAsync, isPending } = useRezervasyon()
  const { bildir, hataBildir } = useBildirim()

  const kapat = useCallback(() => {
    setAcik(false)
    dugmeRef.current?.focus()
  }, [])

  // Odak düğmede kalabilsin diye `disabled` yerine aria-disabled + koruma kullanılır.
  const ayirt = useCallback(
    async (uye: UyeListe) => {
      if (isPending) return
      try {
        const { veri } = await mutateAsync({ uyeId: uye.id, kitapId })
        bildir({
          tur: 'basari',
          baslik: `${tamAd(uye)} için ayırtıldı`,
          ayrinti: [veri.durum === 'HAZIR' ? 'Rafta hazır' : 'Sıraya alındı'],
        })
        kapat()
      } catch (hata) {
        hataBildir(hata, 'Kitap ayırtılamadı')
      }
    },
    [isPending, mutateAsync, kitapId, bildir, hataBildir, kapat],
  )

  return (
    <div className={stil.eylemAlani}>
      <div className={stil.eylemler}>
        <Link className="btn btn-v" to={`/odunc/${kitapId}`}>
          Fişi aç, ödünç ver
          <IleriIkonu />
        </Link>
        <button
          ref={dugmeRef}
          type="button"
          className={`btn ${isPending ? stil.bekliyor : ''}`}
          aria-expanded={acik}
          aria-controls={acik ? seciciId : undefined}
          aria-disabled={isPending || undefined}
          onClick={() => {
            if (!isPending) setAcik((a) => !a)
          }}
        >
          {isPending ? 'Ayırtılıyor…' : acik ? 'Ayırtmaktan vazgeç' : 'Bu kitabı ayırt'}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {acik && (
          <AyirtmaSecici
            key="secici"
            id={seciciId}
            baslik={baslik}
            bekliyor={isPending}
            onSec={(uye) => void ayirt(uye)}
            onKapat={kapat}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
