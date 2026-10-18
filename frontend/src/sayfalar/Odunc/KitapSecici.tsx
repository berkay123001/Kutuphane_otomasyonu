/** /odunc — kitap seçici: çizgili kâğıt arama kutusu ve küçük katalog fişleri (?uye= korunur). */
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useId, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import type { KitapListe } from '../../api/semalar'
import { useKitaplar, useUye } from '../../api/sorgular'
import { tamAd } from '../../lib/bicim'
import { Damga } from '../../ui/Damga'
import { BosDurum, HataKutusu, Yukleniyor } from '../../ui/Durumlar'
import { idCoz, listeDamgasi } from './oduncVeri'
import { useGecikmeli } from './useGecikmeli'
import stil from './Secici.module.css'

function KucukFis({ kitap, uyeId }: { readonly kitap: KitapListe; readonly uyeId: number | null }) {
  const damga = listeDamgasi(kitap)
  const yayin = [kitap.yayinevi, kitap.yayinYili].filter(Boolean).join(', ')
  return (
    <Link className={stil.fis} to={{ pathname: `/odunc/${kitap.id}`, search: uyeId ? `?uye=${uyeId}` : '' }}>
      <span className={stil.fisUst}>
        <span>{kitap.yerNumarasi ?? '—'}</span>
        <Damga murekkep={damga.murekkep} className={stil.fisDamga}>
          {damga.metin}
        </Damga>
      </span>
      <span className={stil.fisBaslik}>
        {kitap.baslik} <span className={stil.fisYazar}>/ {kitap.yazar}</span>
      </span>
      <span className={stil.fisGovde}>
        {yayin && <span>{yayin}</span>}
        <span className={stil.meta}>
          {kitap.kategori.kod} {kitap.kategori.ad}
        </span>
      </span>
      <span className={stil.delik} aria-hidden="true" />
    </Link>
  )
}

function Sonuclar({ aranan, uyeId }: { readonly aranan: string; readonly uyeId: number | null }) {
  const azalt = useReducedMotion()
  const sorgu = useKitaplar({ q: aranan || undefined, limit: 12 })
  if (sorgu.isError) return <HataKutusu hata={sorgu.error} yenidenDene={() => void sorgu.refetch()} />
  if (!sorgu.data) return <Yukleniyor metin="Çekmecedeki fişler çıkarılıyor…" />
  const kitaplar = sorgu.data.veri
  if (kitaplar.length === 0) {
    return <BosDurum baslik="Eşleşen fiş yok" aciklama="Aramayı kısalt ya da yazar adıyla dene." />
  }
  return (
    <ul className={stil.sonuclar} data-eski={sorgu.isPlaceholderData} aria-label="Bulunan kitaplar">
      <AnimatePresence initial={!azalt} mode="popLayout">
        {kitaplar.map((k, i) => (
          <motion.li
            key={k.id}
            layout={!azalt}
            initial={azalt ? false : { opacity: 0, y: 34, rotate: i % 2 ? 3 : -3 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 240, damping: 22, delay: azalt ? 0 : 0.25 + i * 0.05 }}
          >
            <KucukFis kitap={k} uyeId={uyeId} />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  )
}

function OkuyucuNotu({ uyeId }: { readonly uyeId: number | null }) {
  const sorgu = useUye(uyeId)
  const uye = uyeId !== null ? sorgu.data?.veri : undefined
  return (
    <p className="note">
      {uye ? `${tamAd(uye)} için bir kitap seç` : 'Bir fiş seç — kitap ödünç masasına gelsin'}
    </p>
  )
}

export function KitapSecici() {
  const [parametreler] = useSearchParams()
  const uyeId = idCoz(parametreler.get('uye'))
  const aramaId = useId()
  const [metin, setMetin] = useState('')
  const aranan = useGecikmeli(metin.trim(), 250)

  return (
    <>
      <header className={stil.bas}>
        <h1 className={`h1 ${stil.baslik}`}>
          <span className={stil.satir}>
            <span>Ödünç ver</span>
          </span>
        </h1>
        <OkuyucuNotu uyeId={uyeId} />
      </header>
      <div className={stil.arama}>
        <label className="eyebrow" htmlFor={aramaId}>
          Kitap ara
        </label>
        <div className={stil.kutu}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4.2-4.2" />
          </svg>
          <input
            id={aramaId}
            type="search"
            autoComplete="off"
            placeholder="Başlık, yazar ya da yer numarası"
            value={metin}
            onChange={(e) => setMetin(e.target.value)}
          />
        </div>
      </div>
      <Sonuclar aranan={aranan} uyeId={uyeId} />
    </>
  )
}
