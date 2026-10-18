import { memo } from 'react'
import { rafUret } from './raflar'
import stil from './OdaCizimi.module.css'

const UNITELER = rafUret()
const yildizlar = Array.from({ length: 12 }, (_, i) => i)
const pervazlar = ['m1', 'm2', 'm3', 'm4', 'm5'] as const
const izdusum = Array.from({ length: 12 }, (_, i) => i)
const tozlar = Array.from({ length: 14 }, (_, i) => i)

function sinif(...adlar: readonly (string | false | undefined)[]): string {
  return adlar.filter(Boolean).map((a) => stil[a as string] ?? '').join(' ')
}

/** Raflar: tasarımdaki 7 ünite × 13 raf, tohumlu kitaplar (değişmez, bir kez çizilir). */
const Raflar = memo(function Raflar() {
  return (
    <div className={stil.shelves}>
      {UNITELER.map((unite, u) => (
        <div key={u} className={stil.unit}>
          {unite.map((raf, r) => (
            <div key={r} className={stil.shelf}>
              {raf.map((k, i) => (
                <span
                  key={i}
                  className={sinif('bk', `k${k.renk}`, k.egik && 'lean', k.bosluk && 'gap')}
                  style={{ height: `${k.yukseklik}%`, width: k.genislik }}
                />
              ))}
            </div>
          ))}
        </div>
      ))}
      <div className={stil.rail} />
      <div className={stil.ladder} />
      <div className={stil.floor} />
    </div>
  )
})

function Pencere() {
  return (
    <div className={stil.winwrap}>
      <div className={stil.win}>
        <div className={stil['sky-d']} />
        <div className={stil.sun} />
        <div className={sinif('cloud', 'ca')} />
        <div className={sinif('cloud', 'cb')} />
        <div className={sinif('cloud', 'cc')} />
        <div className={stil['sky-n']}>
          {yildizlar.map((i) => (
            <i key={i} />
          ))}
          <b className={stil.shoot} />
        </div>
        <div className={stil.moon} />
        <div className={stil.hill} />
        {pervazlar.map((m) => (
          <div key={m} className={sinif('mul', m)} />
        ))}
      </div>
      <div className={sinif('curt', 'l')} />
      <div className={sinif('curt', 'r')} />
      <div className={stil.sill}>
        <span className={stil.pot} />
        <span className={sinif('leaf', 'la')} />
        <span className={sinif('leaf', 'lb')} />
        <span className={sinif('leaf', 'lc')} />
      </div>
    </div>
  )
}

function Huzmeler({ tur }: { readonly tur: 'sd' | 'sn' }) {
  return (
    <div className={sinif('shafts', tur)}>
      <span className={sinif('shaft', 's1')} />
      <span className={sinif('shaft', 's2')} />
      {tur === 'sd' && <span className={sinif('shaft', 's3')} />}
      <div className={stil.proj}>
        {izdusum.map((i) => (
          <i key={i} />
        ))}
      </div>
    </div>
  )
}

/** Tasarımdaki kütüphane odasının canlı CSS çizimi: raflar, kemerli pencere (gündüz güneş/bulut,
 *  gece ay/yıldız), perdeler, gölge ve ışık katmanları.
 *  Canlı hâli ağır olduğu için uygulamada doğrudan kullanılmaz; scripts/oda-gorseli.mjs bunu
 *  /_oda adresinde çizip gündüz/gece görsellerini üretir (public/oda/). */
export const OdaCizimi = memo(function OdaCizimi({ isiklarYaniyor = false }: {
  readonly isiklarYaniyor?: boolean
}) {
  return (
    <>
      <div className={stil.room} aria-hidden="true">
        <Raflar />
        <Pencere />
      </div>
      <div className={stil.shade} aria-hidden="true">
        <div className={stil.vig} />
        <div className={stil.dark} />
      </div>
      <div className={stil.light} aria-hidden="true">
        <Huzmeler tur="sd" />
        <Huzmeler tur="sn" />
        <div className={stil.dust}>
          {tozlar.map((i) => (
            <i key={i} />
          ))}
        </div>
        <div className={stil.lampglow} />
      </div>
      {isiklarYaniyor && <div className={stil.lights} aria-hidden="true" />}
    </>
  )
})
