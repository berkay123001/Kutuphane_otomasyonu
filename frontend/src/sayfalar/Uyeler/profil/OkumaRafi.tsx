import { useMemo } from 'react'
import { Link } from 'react-router'
import { BosDurum } from '../../../ui/Durumlar'
import { rafKitaplari, type GecmisOdunc } from '../uyeVeri'
import ortak from '../ortak.module.css'
import stil from './OkumaRafi.module.css'

/** Son iade edilen kitaplar raftaki sırtlar olarak; sırta gelince ay/yıl görünür. */
export function OkumaRafi({ gecmis }: { readonly gecmis: readonly GecmisOdunc[] }) {
  const kitaplar = useMemo(() => rafKitaplari(gecmis), [gecmis])
  const son = kitaplar[kitaplar.length - 1]
  const dayakGecikmesi = son ? son.gecikmeSn + 0.15 : 0.7

  return (
    <section className={ortak.bolum} aria-labelledby="h-raf">
      <div className="sec-head">
        <h2 className="h2" id="h-raf">
          Okuma rafı
        </h2>
        {kitaplar.length > 0 && (
          <p className="note">Son okuduğu {kitaplar.length} kitap · sırta gel, tarihi görünsün</p>
        )}
      </div>
      {kitaplar.length === 0 ? (
        <BosDurum baslik="Raf henüz boş" aciklama="İade ettiği kitaplar burada sırt sırta dizilir." />
      ) : (
        <div>
          <div className={stil.raf}>
            <ul className={stil.kitaplar} aria-label="Son okuduğu kitaplar">
              {kitaplar.map((k) => (
                <li key={k.id} className={stil.yer}>
                  <Link
                    to={`/katalog?kitap=${k.kitapId}`}
                    className={stil.sirt}
                    style={{
                      backgroundColor: k.renk,
                      color: k.yazi,
                      height: `${k.yukseklik}px`,
                      width: `${k.genislik}px`,
                      animationDelay: `${k.gecikmeSn}s`,
                    }}
                  >
                    <span className={stil.sirtYazi} aria-hidden="true">
                      {k.baslik}
                    </span>
                    <span className={stil.ipucu}>
                      {k.baslik} · {k.tarih}
                    </span>
                  </Link>
                </li>
              ))}
              <li className={stil.dayak} aria-hidden="true" style={{ animationDelay: `${dayakGecikmesi}s` }} />
            </ul>
          </div>
          <div className={`${stil.tahta} grain`} aria-hidden="true" />
        </div>
      )}
    </section>
  )
}
