/** Seçili kitabın büyük katalog fişi (tasarım: .big). Kitap değişince üst bileşen key verir ve fiş
 *  yeniden çevrilir; damga, etiketi değiştikçe yeniden vurulur. */
import { Damga } from '../../ui/Damga'
import type { OnizlemeModeli } from './katalogVeri'
import stil from './Onizleme.module.css'

export function BuyukFis({ model }: { readonly model: OnizlemeModeli }) {
  return (
    <article className={`${stil.buyuk} card`} aria-label={`${model.baslik} katalog fişi`}>
      <div className={stil.kayit}>
        <p className={stil.kayitYer}>
          <span>{model.yer.ust}</span>
          <span>{model.yer.alt}</span>
        </p>
        <div>
          <p>{model.kunye.bas}</p>
          <p className={stil.icerli}>{model.kunye.satir}</p>
          <p className={stil.icerli}>{model.kunye.konu}</p>
        </div>
      </div>
      <Damga
        key={model.damga.etiket}
        murekkep={model.damga.murekkep}
        vur={0.45}
        egim={-8}
        className={stil.durumDamga}
      >
        {model.damga.etiket}
      </Damga>
      {model.ayirtma && (
        <Damga key={model.ayirtma} murekkep="k" vur={0.2} egim={6} className={stil.ayirtmaDamga}>
          {model.ayirtma}
        </Damga>
      )}
      <div className={stil.kayitAlt}>
        <span>Demirbaş {model.demirbas}</span>
        <span>{model.ozet}</span>
      </div>
      <span className={stil.delik} aria-hidden="true" />
    </article>
  )
}
