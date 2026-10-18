/** Okuyucu arama kutusu (combobox): üye no ya da ad, gecikmeli arama, okla gezilen liste. */
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useId, useRef } from 'react'
import type { UyeDetay, UyeListe } from '../../api/semalar'
import { basHarfler, tamAd } from '../../lib/bicim'
import { useOkuyucuArama } from './useOkuyucuArama'
import stil from './Masa.module.css'

function Secenek({ uye, kimlik, secili, onSec, onUzerinde }: {
  readonly uye: UyeListe
  readonly kimlik: string
  readonly secili: boolean
  readonly onSec: () => void
  readonly onUzerinde: () => void
}) {
  const tur = uye.tur === 'OGRENCI' ? 'Öğrenci' : 'Personel'
  return (
    <li
      id={kimlik}
      role="option"
      aria-selected={secili}
      className={stil.secenekSatiri}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onSec}
      onMouseEnter={onUzerinde}
    >
      <span className={stil.miniAvatar} aria-hidden="true">
        {basHarfler(uye.ad, uye.soyad)}
      </span>
      <span className={stil.secenekMetin}>
        <b>{tamAd(uye)}</b>
        <span>
          {uye.uyeNo} · {tur} · elinde {uye.aktifOduncSayisi}
          {uye.aktif ? '' : ' · pasif'}
        </span>
      </span>
    </li>
  )
}

interface Props {
  readonly seciliId: number | null
  readonly secili: UyeDetay | null
  readonly kilitli: boolean
  readonly onSec: (id: number | null) => void
  /** "Yeni ödünç" sonrası yeniden kurulunca kutuya odaklan. */
  readonly odakla?: boolean
}

export function OkuyucuSecici({ seciliId, secili, kilitli, onSec, odakla = false }: Props) {
  const kimlik = useId()
  const listeId = `${kimlik}-liste`
  const azalt = useReducedMotion()
  const girdi = useRef<HTMLInputElement>(null)
  const a = useOkuyucuArama(seciliId, onSec)

  useEffect(() => {
    if (odakla) girdi.current?.focus()
  }, [odakla])

  return (
    <>
      <label className={stil.etiket} htmlFor={`${kimlik}-girdi`}>
        Okuyucu numarası ya da adı
      </label>
      <div className={stil.kombo}>
        <input
          ref={girdi}
          id={`${kimlik}-girdi`}
          className={stil.girdi}
          type="text"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          aria-expanded={a.listeAcik}
          aria-controls={a.listeAcik ? listeId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={a.aktifUye ? `${listeId}-${a.aktifUye.id}` : undefined}
          placeholder="Ü-2291 ya da ad soyad"
          value={a.metin ?? secili?.uyeNo ?? a.secilenNo ?? ''}
          disabled={kilitli}
          onChange={a.degisti}
          onKeyDown={a.tus}
          onFocus={a.ac}
          onBlur={a.kapat}
        />
        <AnimatePresence>
          {a.listeAcik && (
            <motion.ul
              key="liste"
              id={listeId}
              role="listbox"
              aria-label="Bulunan okuyucular"
              className={stil.liste}
              initial={azalt ? false : { opacity: 0, y: -8, scaleY: 0.96 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            >
              {a.sonuclar.map((u, i) => (
                <Secenek
                  key={u.id}
                  uye={u}
                  kimlik={`${listeId}-${u.id}`}
                  secili={i === a.aktifSira}
                  onSec={() => a.sec(u)}
                  onUzerinde={() => a.uzerinde(i)}
                />
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
      {a.aramaHatasi && (
        <p className={stil.aramaDurumu} role="alert">
          Okuyucular aranamadı. Bağlantıyı kontrol edip yeniden yaz.
        </p>
      )}
      {a.bulunamadi && (
        <p className={stil.aramaDurumu} role="status">
          “{a.aranan}” ile eşleşen okuyucu yok.
        </p>
      )}
    </>
  )
}
