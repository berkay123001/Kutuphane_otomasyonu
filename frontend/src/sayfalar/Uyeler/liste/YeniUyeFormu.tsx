import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useId, useRef, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { useNavigate } from 'react-router'
import { useUyeOlustur } from '../../../api/sorgular'
import { UYE_TURLERI } from '../../../api/semalar'
import { tamAd } from '../../../lib/bicim'
import { useBildirim } from '../../../ui/Bildirim'
import { Damga } from '../../../ui/Damga'
import {
  BOS_FORM, FORM_ALANLARI, TUR_ETIKETI, formuCoz, sunucuAlanHatalari,
  type FormAlani, type FormHatalari, type UyeFormu,
} from '../uyeVeri'
import { CanliKart, type KartAsamasi } from './CanliKart'
import ortak from '../ortak.module.css'
import stil from './YeniUyeFormu.module.css'

type MetinAlani = Exclude<FormAlani, 'tur'>

interface AlanProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'value' | 'onChange'> {
  readonly id: string
  readonly etiket: string
  readonly deger: string
  readonly hata?: string
  readonly zorunlu?: boolean
  readonly onDegis: (deger: string) => void
}

function Alan({ id, etiket, deger, hata, zorunlu, onDegis, ...girdi }: AlanProps) {
  const hataId = `${id}-hata`
  return (
    <div className={stil.alan}>
      <label htmlFor={id}>
        {etiket}
        {zorunlu && (
          <span className={stil.zorunlu} aria-hidden="true">
            {' '}*
          </span>
        )}
      </label>
      <input
        id={id}
        value={deger}
        onChange={(e) => onDegis(e.target.value)}
        aria-invalid={hata ? true : undefined}
        aria-describedby={hata ? hataId : undefined}
        aria-required={zorunlu || undefined}
        {...girdi}
      />
      <span id={hataId} className={stil.hata}>
        <AnimatePresence initial={false} mode="wait">
          {hata && (
            <motion.span
              key={hata}
              style={{ display: 'block' }}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {hata}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </div>
  )
}

function TurSecici({ kimlik, tur, onSec }: { readonly kimlik: string; readonly tur: UyeFormu['tur']; readonly onSec: (t: UyeFormu['tur']) => void }) {
  return (
    <fieldset className={stil.tur}>
      <legend>Tür</legend>
      <div className={stil.secici}>
        {UYE_TURLERI.map((t) => (
          <label key={t} className={stil.secenek} data-secili={tur === t}>
            <input className="sr" type="radio" name={`${kimlik}-tur`} value={t} checked={tur === t} onChange={() => onSec(t)} />
            {tur === t && <motion.span layoutId={`${kimlik}-isaret`} className={stil.isaret} transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
            <span>{TUR_ETIKETI[t]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

const METIN_ALANLARI: readonly { alan: MetinAlani; etiket: string; ek: InputHTMLAttributes<HTMLInputElement> }[] = [
  { alan: 'ad', etiket: 'Ad', ek: { autoComplete: 'given-name', maxLength: 100 } },
  { alan: 'soyad', etiket: 'Soyad', ek: { autoComplete: 'family-name', maxLength: 100 } },
  { alan: 'bolum', etiket: 'Bölüm', ek: { placeholder: 'ör. Yazılım Mühendisliği', maxLength: 100 } },
  { alan: 'eposta', etiket: 'E-posta', ek: { type: 'email', autoComplete: 'email', inputMode: 'email', maxLength: 200 } },
  { alan: 'telefon', etiket: 'Telefon', ek: { type: 'tel', autoComplete: 'tel', maxLength: 30 } },
]

function hataOzeti(hatalar: FormHatalari): string {
  const mesajlar = FORM_ALANLARI.flatMap((a) => (hatalar[a] ? [hatalar[a]] : []))
  return mesajlar.length ? `Düzeltilecek ${mesajlar.length} alan: ${mesajlar.join('. ')}` : ''
}

/** Yeni okuyucu fişi: istemcide doğrulanır, sunucu alan hataları yerine yazılır. */
export function YeniUyeFormu({ onKapat }: { readonly onKapat: () => void }) {
  const kimlik = useId()
  const azalt = useReducedMotion()
  const [form, setForm] = useState<UyeFormu>(BOS_FORM)
  const [hatalar, setHatalar] = useState<FormHatalari>({})
  const olustur = useUyeOlustur()
  const git = useNavigate()
  const { bildir, hataBildir } = useBildirim()
  /** Her hata gösteriminde artar; odak, hatalar DOM'a yazıldıktan sonra taşınır. */
  const [odakIstegi, setOdakIstegi] = useState(0)
  const [basilan, setBasilan] = useState<{ readonly uyeNo: string } | null>(null)
  const yonlendirme = useRef(0)
  const alanId = (a: FormAlani) => `${kimlik}-${a}`
  const asama: KartAsamasi = basilan ? 'basildi' : olustur.isPending ? 'basiliyor' : 'taslak'

  useEffect(() => () => window.clearTimeout(yonlendirme.current), [])

  useEffect(() => {
    document.getElementById(`${kimlik}-ad`)?.focus({ preventScroll: true })
  }, [kimlik])

  useEffect(() => {
    if (odakIstegi === 0) return
    const ilk = FORM_ALANLARI.find((a) => hatalar[a])
    if (ilk) document.getElementById(`${kimlik}-${ilk}`)?.focus()
    // Bilerek yalnızca yeni gösterim isteğine bağlı: yazarken hata silinince odak kaçmasın.
  }, [odakIstegi])

  const degis = <K extends keyof UyeFormu>(alan: K, deger: UyeFormu[K]) => {
    setForm((f) => ({ ...f, [alan]: deger }))
    setHatalar((h) => (h[alan] ? Object.fromEntries(Object.entries(h).filter(([k]) => k !== alan)) : h))
  }

  const hatalariGoster = (yeni: FormHatalari) => {
    setHatalar(yeni)
    setOdakIstegi((n) => n + 1)
  }

  const gonder = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (olustur.isPending || basilan) return
    const sonuc = formuCoz(form)
    if (!sonuc.tamam) {
      hatalariGoster(sonuc.hatalar)
      return
    }
    olustur.mutate(sonuc.veri, {
      onSuccess: ({ veri }) => {
        // Kart basılır: barkod, "Onaylı" damgası, dönüp imza — sonra profile geçilir
        setBasilan({ uyeNo: veri.uyeNo })
        bildir({ tur: 'basari', baslik: `${tamAd(veri)} kaydedildi`, ayrinti: [`Okuyucu no ${veri.uyeNo}`] })
        yonlendirme.current = window.setTimeout(() => void git(`/uyeler/${veri.id}`), azalt ? 0 : 3600)
      },
      onError: (h) => {
        hatalariGoster(sunucuAlanHatalari(h))
        hataBildir(h, 'Üye kaydedilemedi')
      },
    })
  }

  return (
    <motion.div
      className={stil.sarmal}
      initial={azalt ? false : { height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={azalt ? { opacity: 0 } : { height: 0, opacity: 0 }}
      transition={{ duration: 0.55, ease: [0.2, 0.9, 0.2, 1] }}
    >
      <div className={stil.duzen}>
      <motion.form
        id="yeni-uye"
        className={`card ${stil.fis}`}
        aria-labelledby={`${kimlik}-baslik`}
        noValidate
        onSubmit={gonder}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onKapat()
        }}
        initial={azalt ? false : { y: -60, rotate: -2.5 }}
        animate={{ y: 0, rotate: -0.4 }}
        transition={{ type: 'spring', stiffness: 170, damping: 17, delay: 0.05 }}
      >
        <div className={stil.ust}>
          <h2 id={`${kimlik}-baslik`}>Yeni okuyucu fişi</h2>
          <Damga murekkep="k" vur={0.35} egim={3}>
            Taslak
          </Damga>
          <p>Okuyucu no otomatik verilir · kart 1 yıl geçerli olur.</p>
        </div>
        <div className={stil.alanlar}>
          {METIN_ALANLARI.slice(0, 2).map((a) => (
            <Alan key={a.alan} id={alanId(a.alan)} etiket={a.etiket} deger={form[a.alan]} hata={hatalar[a.alan]} zorunlu onDegis={(v) => degis(a.alan, v)} {...a.ek} />
          ))}
          <TurSecici kimlik={kimlik} tur={form.tur} onSec={(t) => degis('tur', t)} />
          {METIN_ALANLARI.slice(2).map((a) => (
            <Alan key={a.alan} id={alanId(a.alan)} etiket={a.etiket} deger={form[a.alan]} hata={hatalar[a.alan]} onDegis={(v) => degis(a.alan, v)} {...a.ek} />
          ))}
        </div>
        <p className="sr" role="alert">
          {hataOzeti(hatalar)}
        </p>
        <div className={stil.alt}>
          <button
            type="submit"
            className={`btn btn-v ${ortak.dugme}`}
            aria-disabled={olustur.isPending || basilan !== null || undefined}
            aria-busy={olustur.isPending}
          >
            {basilan ? 'Kart basıldı' : olustur.isPending ? 'Kart basılıyor…' : 'Kaydet ve kartı bas'}
          </button>
          <button type="button" className={`btn ${ortak.murekkepDugme}`} onClick={onKapat}>
            Vazgeç
          </button>
        </div>
      </motion.form>
      <CanliKart form={form} asama={asama} uyeNo={basilan?.uyeNo} />
      </div>
    </motion.div>
  )
}
