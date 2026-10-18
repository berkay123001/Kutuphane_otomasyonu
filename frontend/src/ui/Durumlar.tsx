import { ApiHatasi } from '../api/istemci'
import { Damga } from './Damga'
import stil from './ui.module.css'

/** Yüklenirken: boş fişler hafifçe nefes alır. */
export function Yukleniyor({ metin = 'Fişler çekmeceden çıkarılıyor…', adet = 3 }: {
  readonly metin?: string
  readonly adet?: number
}) {
  return (
    <div className={stil.yukleniyor} role="status" aria-live="polite">
      <div className={stil.yuklenenFisler} aria-hidden="true">
        {Array.from({ length: adet }, (_, i) => (
          <span key={i} className={`${stil.bosFis} card`} style={{ animationDelay: `${i * 0.18}s` }} />
        ))}
      </div>
      <span className="note">{metin}</span>
    </div>
  )
}

/** Hata: mesaj + kural gerekçeleri damga olarak, isteğe bağlı yeniden dene. */
export function HataKutusu({ hata, yenidenDene }: { readonly hata: unknown; readonly yenidenDene?: () => void }) {
  const mesaj = hata instanceof ApiHatasi ? hata.message : 'Bir şeyler ters gitti'
  const gerekceler = hata instanceof ApiHatasi ? hata.gerekceler : []
  return (
    <div className={`${stil.hataKutusu} card`} role="alert">
      <Damga murekkep="r" vur={0.1}>
        Hata
      </Damga>
      <p className={stil.hataMesaji}>{mesaj}</p>
      {gerekceler.length > 0 && (
        <ul className={stil.gerekceler}>
          {gerekceler.map((g, i) => (
            <li key={`${i}-${g}`}>{g}</li>
          ))}
        </ul>
      )}
      {yenidenDene && (
        <button type="button" className="btn" onClick={yenidenDene}>
          Yeniden dene
        </button>
      )}
    </div>
  )
}

export function BosDurum({ baslik, aciklama }: { readonly baslik: string; readonly aciklama?: string }) {
  return (
    <div className={`${stil.bos} card`}>
      <strong>{baslik}</strong>
      {aciklama && <span>{aciklama}</span>}
    </div>
  )
}
