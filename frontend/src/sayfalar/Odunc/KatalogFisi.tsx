/** Çizgili katalog fişi: aşağıdan çevrilerek gelir, kayıt satırları daktiloyla yazılır. */
import { useMemo } from 'react'
import type { KitapDetay } from '../../api/semalar'
import { useDaktilo } from '../../ui/useDaktilo'
import { kayitSatirlari, konumMetni, yerParcalari } from './oduncVeri'
import stil from './Fis.module.css'

export function KatalogFisi({ kitap }: { readonly kitap: KitapDetay }) {
  const { baslik, yazar, yayinevi, yayinYili, kategori } = kitap
  const satirlar = useMemo(
    () => kayitSatirlari({ baslik, yazar, yayinevi, yayinYili, kategori }),
    [baslik, yazar, yayinevi, yayinYili, kategori],
  )
  const daktilo = useDaktilo(satirlar)
  const [ust, alt] = yerParcalari(kitap.yerNumarasi)
  const ilk = kitap.kopyalar[0]

  return (
    <article className={`${stil.kayit} card`} aria-labelledby="h-kayit">
      <h2 className="sr" id="h-kayit">
        Katalog fişi
      </h2>
      <div className={stil.kayitIzgara}>
        <p className={stil.yerNo}>
          <span>{ust}</span>
          <span>{alt}</span>
        </p>
        <div aria-hidden="true">
          {daktilo.satirlar.map((s, i) => (
            <p key={i} className={`${stil.daktiloSatiri} ${i > 0 ? stil.girintili : ''}`}>
              {s}
              {i === daktilo.aktifSatir && <span className={stil.imlec} />}
            </p>
          ))}
        </div>
        <p className="sr">{satirlar.join(' ')}</p>
      </div>
      <div className={stil.kayitAlt}>
        <span>Demirbaş {ilk?.barkod ?? '—'}</span>
        <span>{ilk ? konumMetni(ilk) : 'Kopya yok'}</span>
      </div>
      <span className={stil.delik} aria-hidden="true" />
    </article>
  )
}
