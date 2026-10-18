import { AnimatePresence, motion, useAnimate, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { ApiHatasi } from '../../api/istemci'
import { TemaAnahtari } from '../../kabuk/TemaAnahtari'
import { useOturum } from '../../oturum/OturumSaglayici'
import { Damga } from '../../ui/Damga'
import { useDaktilo } from '../../ui/useDaktilo'
import stil from './Giris.module.css'

export const girisFormu = z.object({
  kullaniciAdi: z.string().trim().min(1, 'Kullanıcı adını yaz').max(50),
  sifre: z.string().min(1, 'Şifreyi yaz').max(200),
})

type Durum = 'bos' | 'gonderiliyor' | 'reddedildi' | 'onaylandi'

/** Yalnızca uygulama içi yollar: '//site.com' ya da '/\\site.com' gibi adresler reddedilir. */
export function donusAdresi(state: unknown): string {
  const donus = (state as { donus?: unknown } | null)?.donus
  const guvenli = typeof donus === 'string' && donus.startsWith('/') && !/^\/[/\\]/.test(donus)
  return guvenli && donus !== '/giris' ? donus : '/'
}

export default function GirisSayfasi() {
  const { oturum, girisYap, sonCikisSebebi } = useOturum()
  const konum = useLocation()
  const git = useNavigate()
  const azalt = useReducedMotion()
  const [kullaniciAdi, setKullaniciAdi] = useState('')
  const [sifre, setSifre] = useState('')
  const [durum, setDurum] = useState<Durum>('bos')
  const [hata, setHata] = useState<string | null>(null)
  const [sarsinti, setSarsinti] = useState(0)
  const [sarsKapsam, sars] = useAnimate<HTMLDivElement>()
  const sifreAlani = useRef<HTMLInputElement>(null)
  const baslik = useDaktilo(['Görevli girişi', 'Ödünç masasını açmak için fişini imzala.'], 500, 32)

  useEffect(() => {
    if (durum !== 'onaylandi') return undefined
    const t = window.setTimeout(() => git(donusAdresi(konum.state), { replace: true }), azalt ? 0 : 1250)
    return () => window.clearTimeout(t)
  }, [durum, git, konum.state, azalt])

  if (oturum && durum !== 'onaylandi') return <Navigate to={donusAdresi(konum.state)} replace />

  const reddet = (mesaj: string) => {
    setHata(mesaj)
    setDurum('reddedildi')
    setSarsinti((n) => n + 1)
    sifreAlani.current?.focus()
    if (!azalt && sarsKapsam.current) {
      void sars(sarsKapsam.current, { x: [0, -14, 12, -8, 5, 0] }, { duration: 0.45, ease: 'easeInOut' })
    }
  }

  const gonder = async (e: FormEvent) => {
    e.preventDefault()
    const kontrol = girisFormu.safeParse({ kullaniciAdi, sifre })
    if (!kontrol.success) {
      reddet(kontrol.error.issues[0]?.message ?? 'Bilgiler eksik')
      return
    }
    setDurum('gonderiliyor')
    setHata(null)
    try {
      await girisYap(kontrol.data.kullaniciAdi, kontrol.data.sifre)
      setDurum('onaylandi')
    } catch (err) {
      reddet(err instanceof ApiHatasi ? err.message : 'Giriş yapılamadı')
    }
  }

  return (
    <div id="icerik" className={stil.giris}>
      <div className={stil.ust}>
        <TemaAnahtari />
      </div>

      <header className={stil.marka}>
        <span className={stil.markaSatir}>
          <span>Fişlik</span>
        </span>
        <span className={stil.markaAlt}>kart kataloğundan doğan kütüphane otomasyonu</span>
      </header>

      <div ref={sarsKapsam} className={stil.sarsici}>
      <AnimatePresence>
        {durum !== 'onaylandi' || !azalt ? (
          <motion.form
            key="fis"
            className={`${stil.fis} card`}
            onSubmit={gonder}
            noValidate
            initial={azalt ? false : { opacity: 0, x: 220, y: -60, rotate: 18 }}
            animate={
              durum === 'onaylandi'
                ? { opacity: 0, y: -220, x: 160, rotate: 14, transition: { delay: 0.75, duration: 0.6, ease: [0.6, 0, 0.8, 0.4] } }
                : { opacity: 1, x: 0, y: 0, rotate: -1.6 }
            }
            transition={{ type: 'spring', stiffness: 120, damping: 16, delay: azalt ? 0 : 0.35 }}
            aria-labelledby="giris-baslik"
          >
            <span className={stil.igne} aria-hidden="true" />
            <h1 id="giris-baslik" className={stil.baslik}>
              <span className="sr">Görevli girişi</span>
              <span aria-hidden="true">
                {baslik.satirlar[0]}
                {baslik.aktifSatir === 0 && <span className={stil.imlec} />}
              </span>
            </h1>
            <p className={stil.alt} aria-hidden="true">
              {baslik.satirlar[1]}
              {baslik.aktifSatir === 1 && <span className={stil.imlec} />}
            </p>

            {sonCikisSebebi === 'sure' && durum === 'bos' && (
              <p className={stil.uyari}>Oturumun süresi doldu, yeniden giriş yap.</p>
            )}

            <label className={stil.alan}>
              <span>Kullanıcı adı</span>
              <input
                value={kullaniciAdi}
                onChange={(e) => setKullaniciAdi(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={50}
                required
                readOnly={durum === 'gonderiliyor'}
                aria-invalid={durum === 'reddedildi'}
                aria-describedby={hata ? 'giris-hata' : undefined}
              />
            </label>
            <label className={stil.alan}>
              <span>Şifre</span>
              <input
                ref={sifreAlani}
                type="password"
                value={sifre}
                onChange={(e) => setSifre(e.target.value)}
                autoComplete="current-password"
                maxLength={200}
                required
                readOnly={durum === 'gonderiliyor'}
                aria-invalid={durum === 'reddedildi'}
                aria-describedby={hata ? 'giris-hata' : undefined}
              />
            </label>

            <div className={stil.alt2}>
              <button type="submit" className="btn btn-v" disabled={durum === 'gonderiliyor'}>
                {durum === 'gonderiliyor' ? 'Fiş okunuyor…' : 'Masayı aç'}
              </button>
              <div className={stil.damgaYeri} aria-hidden="true">
                {durum === 'reddedildi' && (
                  <Damga key={sarsinti} murekkep="r" vur={0.05} egim={-6}>
                    Reddedildi
                  </Damga>
                )}
                {durum === 'onaylandi' && (
                  <Damga murekkep="v" vur={0.05} egim={-5} className={stil.onay}>
                    Giriş onaylandı
                  </Damga>
                )}
              </div>
            </div>
            <p id="giris-hata" className={stil.hata} role="alert">
              {hata}
            </p>
            {durum === 'onaylandi' && <p className="sr">Giriş onaylandı, masa açılıyor.</p>}
          </motion.form>
        ) : null}
      </AnimatePresence>
      </div>
    </div>
  )
}
