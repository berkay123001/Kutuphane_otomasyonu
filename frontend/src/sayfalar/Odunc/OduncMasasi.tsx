/** Yeşil çuha "Ödünç masası": okuyucu, süre, damga bantları, iade fişi ve damgalama. */
import { motion, useReducedMotion } from 'motion/react'
import { useId } from 'react'
import { Link } from 'react-router'
import type { KitapDetay, UyeDetay } from '../../api/semalar'
import { damgaTarihi, gunEkle } from '../../lib/tarih'
import { IadeFisi } from './IadeFisi'
import { AyirtmaTeklifi, Makbuz } from './Makbuz'
import { OkuyucuKarti } from './OkuyucuKarti'
import { OkuyucuSecici } from './OkuyucuSecici'
import {
  damgaIpucu, eskiDamgalar, kopyaNumarasi, siradaMi, tumEngeller, type OkuyucuDurumu,
} from './oduncVeri'
import { SureSecici, TarihBantlari } from './SureVeTarih'
import type { OduncMasasiDurumu } from './useOduncMasasi'
import stil from './Masa.module.css'
import damgaStil from './Damgalama.module.css'

function DamgaIkonu() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="5.5" r="3" />
      <path d="M12 8.5v5" />
      <path d="M5 13.5h14v3.5H5z" />
      <path d="M4 21h16" />
    </svg>
  )
}

interface EylemProps {
  readonly masa: OduncMasasiDurumu
  readonly uye: UyeDetay | null
  readonly hazir: boolean
  readonly ipucu: string
}

function MasaEylemleri({ masa, uye, hazir, ipucu }: EylemProps) {
  const ipucuId = useId()
  const azalt = useReducedMotion()
  if (masa.sonuc) {
    return (
      <motion.div
        className={damgaStil.eylemler}
        initial={azalt ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22, delay: azalt ? 0 : 1.4 }}
      >
        <Link className="btn btn-v" to={`/uyeler/${masa.sonuc.uyeId}`}>
          Okuyucu profiline git
        </Link>
        <button type="button" className="btn" onClick={masa.sifirla}>
          Yeni ödünç
        </button>
      </motion.div>
    )
  }
  return (
    <div className={damgaStil.eylemler}>
      <button
        type="button"
        className={`btn btn-v ${damgaStil.buyuk}`}
        disabled={!hazir}
        aria-disabled={masa.veriliyor || undefined}
        aria-describedby={ipucuId}
        aria-busy={masa.veriliyor}
        onClick={() => {
          if (uye && !masa.veriliyor) masa.damgala(uye)
        }}
      >
        <DamgaIkonu />
        {masa.veriliyor ? 'Damgalanıyor…' : 'Damgala ve ödünç ver'}
      </button>
      <p id={ipucuId} className={damgaStil.ipucu}>
        {ipucu}
      </p>
    </div>
  )
}

interface Props {
  readonly kitap: KitapDetay
  readonly masa: OduncMasasiDurumu
  readonly uye: UyeDetay | null
  readonly okuyucu: OkuyucuDurumu
  readonly verilecekId: number | null
  readonly bugun: string
}

export function OduncMasasi({ kitap, masa, uye, okuyucu, verilecekId, bugun }: Props) {
  const { sonuc } = masa
  const damgalandi = sonuc !== null
  const sonGun = sonuc?.sonGun ?? gunEkle(bugun, masa.sure)
  const engeller = uye ? tumEngeller(uye, kitap.kopyalar) : []
  const verilecek = kitap.kopyalar.find((k) => k.id === verilecekId)
  const ipucu = damgaIpucu({
    okuyucu,
    engelSayisi: engeller.length,
    verilecek: verilecek ? `${kopyaNumarasi(kitap.kopyalar, verilecek.id)} · ${verilecek.barkod}` : null,
  })
  const teklifEdilir = !damgalandi && uye !== null && engeller.length === 0 && (masa.teklif || !verilecek)

  return (
    <section className={stil.masa} aria-labelledby="h-masa">
      <div className={stil.masaBas}>
        <h2 className="h2" id="h-masa">
          Ödünç masası
        </h2>
        <span className={stil.masaNot}>Bugün · {damgaTarihi(bugun)}</span>
      </div>

      <div className={stil.alan}>
        <OkuyucuSecici
          key={masa.tur}
          seciliId={masa.uyeId}
          secili={uye}
          kilitli={masa.kilitli}
          onSec={masa.uyeSec}
          odakla={masa.tur > 0}
        />
        {okuyucu === 'yukleniyor' && <span className={stil.kimYukleniyor}>Okuyucu fişi getiriliyor…</span>}
        {okuyucu === 'hata' && (
          <p className={stil.aramaDurumu} role="alert">
            Okuyucu fişi açılamadı. Numarayla yeniden ara.
          </p>
        )}
        {uye && <OkuyucuKarti uye={uye} engeller={engeller} damgalandi={damgalandi} />}
      </div>

      <SureSecici sure={sonuc?.sure ?? masa.sure} onSec={masa.setSure} kilitli={masa.kilitli} />
      <TarihBantlari iso={sonGun} bugun={bugun} />
      <IadeFisi key={masa.tur} sonGun={sonGun} eskiler={uye ? eskiDamgalar(uye.gecmis) : []} damgalandi={damgalandi} />

      {uye && (teklifEdilir || masa.ayirtildi) && (
        <AyirtmaTeklifi
          ayirtildi={masa.ayirtildi}
          sirada={siradaMi(uye, kitap.id)}
          bekliyor={masa.ayirtiliyor}
          onAyirt={() => masa.ayirt(uye)}
        />
      )}
      {sonuc && <Makbuz sonuc={sonuc} />}
      <MasaEylemleri masa={masa} uye={uye} hazir={okuyucu === 'hazir' && engeller.length === 0 && !!verilecek} ipucu={ipucu} />
    </section>
  )
}
