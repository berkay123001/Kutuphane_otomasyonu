/** Fiş yolu, büyük başlık, künye ve sağda dönerek gelen 3B kitap. */
import { Link } from 'react-router'
import type { KitapDetay } from '../../api/semalar'
import { sirtRengi } from '../../lib/bicim'
import { kapakDegiskenleri } from './kitapRengi'
import { kunyeSatiri, yerParcalari } from './oduncVeri'
import stil from './Kitap.module.css'

function kapakYaziBoyu(baslik: string): number {
  if (baslik.length > 48) return 14
  if (baslik.length > 30) return 17
  if (baslik.length > 18) return 19
  return 22
}

export function UcBoyutluKitap({ kitap }: { readonly kitap: Pick<KitapDetay, 'baslik' | 'yazar' | 'yerNumarasi'> }) {
  const [ust, alt] = yerParcalari(kitap.yerNumarasi)
  return (
    <div className={stil.b3} aria-hidden="true" style={kapakDegiskenleri(sirtRengi(kitap.baslik))}>
      <span className={stil.golge} />
      <div className={stil.sarmal}>
        <div className={stil.kitap}>
          <div className={`${stil.yuz} ${stil.arka}`} />
          <div className={`${stil.yuz} ${stil.alt}`} />
          <div className={`${stil.yuz} ${stil.ust}`} />
          <div className={`${stil.yuz} ${stil.sayfalar}`} />
          <div className={`${stil.yuz} ${stil.sirt}`}>
            <span className={stil.sirtBaslik}>{kitap.baslik}</span>
            <span className={stil.sirtEtiket}>
              {ust}
              {alt && <br />}
              {alt}
            </span>
          </div>
          <div className={`${stil.yuz} ${stil.on}`}>
            <div className={stil.kapak}>
              <span className={stil.kapakBaslik} style={{ fontSize: kapakYaziBoyu(kitap.baslik) }}>
                {kitap.baslik}
              </span>
              <span className={stil.kapakCizgi} />
              <span className={stil.kapakYazar}>{kitap.yazar}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function KitapBasligi({ kitap }: { readonly kitap: KitapDetay }) {
  return (
    <header className={stil.bas}>
      <div className={stil.basMetin}>
        <nav className={stil.kirinti} aria-label="Fiş yolu">
          <Link to={`/katalog?kitap=${kitap.id}`}>Katalog</Link>
          <span aria-hidden="true">/</span>
          <span>
            {kitap.kategori.kod} {kitap.kategori.ad}
          </span>
          <span aria-hidden="true">/</span>
          <span>{kitap.yerNumarasi ?? 'Yer numarası yok'}</span>
        </nav>
        <h1 className={`h1 ${stil.baslik}`} data-uzun={kitap.baslik.length > 22}>
          <span className={stil.satir}>
            <span>{kitap.baslik}</span>
          </span>
        </h1>
        <p className={stil.kunye}>{kunyeSatiri(kitap)}</p>
      </div>
      <UcBoyutluKitap kitap={kitap} />
    </header>
  )
}
