import { AnimatePresence } from 'motion/react'
import { useMemo } from 'react'
import { BosDurum } from '../../../ui/Durumlar'
import { useHayaletler, useOdakKurtarici } from '../kancalar'
import { oduncleriSirala, type AktifOdunc } from '../uyeVeri'
import ortak from '../ortak.module.css'
import { OduncFisi } from './OduncFisi'
import stil from './Elindekiler.module.css'

interface Props {
  readonly oduncler: readonly AktifOdunc[]
  readonly bugun: string
}

/** Üyenin elindeki kitaplar; iade alınan fiş damgalanır, sonra masadan kayar. */
export function Elindekiler({ oduncler, bugun }: Props) {
  const sirali = useMemo(() => oduncleriSirala(oduncler), [oduncler])
  const odak = useOdakKurtarici<HTMLElement>()
  const { liste, damgasi, tut, damgala, birak } = useHayaletler(sirali, undefined, odak.kurtar)

  return (
    <section ref={odak.kap} className={ortak.bolum} aria-labelledby="h-elindekiler">
      <div className="sec-head">
        <h2 ref={odak.baslik} tabIndex={-1} className="h2" id="h-elindekiler">
          Elindekiler
        </h2>
        <p className="note">Her kare bir gün · mor geçti, boş kaldı, kırmızı gecikti</p>
      </div>
      <div className={stil.fisler}>
        <AnimatePresence mode="popLayout">
          {liste.map((o, i) => (
            <OduncFisi
              key={o.id}
              odunc={o}
              sira={i}
              bugun={bugun}
              damga={damgasi(o.id)}
              iade={{ basla: () => tut(o, i), bitti: (d) => damgala(o.id, d), hata: () => birak(o.id) }}
            />
          ))}
        </AnimatePresence>
        {liste.length === 0 && (
          <BosDurum baslik="Elinde kitap yok" aciklama="Ödünç verilen kitaplar burada gün gün sayılır." />
        )}
      </div>
    </section>
  )
}
