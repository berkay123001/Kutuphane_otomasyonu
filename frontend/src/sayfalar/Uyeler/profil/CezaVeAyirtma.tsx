import { useCezaOde, useRezervasyonIptal } from '../../../api/sorgular'
import { para } from '../../../lib/bicim'
import { kisaTarih } from '../../../lib/tarih'
import { useBildirim } from '../../../ui/Bildirim'
import { Damga } from '../../../ui/Damga'
import type { IslemAkisi } from '../kancalar'
import { cezaToplami, type AcikRezervasyon, type OdenmemisCeza } from '../uyeVeri'
import ortak from '../ortak.module.css'
import { DefterBolumu } from './Defter'
import stil from './Defter.module.css'

type Akis = IslemAkisi & { readonly damga: string | null }

function CezaSatiri({ ceza, akis }: { readonly ceza: OdenmemisCeza; readonly akis: Akis }) {
  const ode = useCezaOde()
  const { bildir, hataBildir } = useBildirim()
  const { kitap } = ceza.odunc.kopya
  const kapali = ode.isPending || akis.damga !== null
  const tikla = () => {
    if (kapali) return
    akis.basla()
    ode.mutate(ceza.id, {
      onSuccess: () => {
        akis.bitti('Ödendi')
        bildir({ tur: 'basari', baslik: `${para(ceza.tutar)} ceza ödendi`, ayrinti: [kitap.baslik] })
      },
      onError: (h) => {
        akis.hata()
        hataBildir(h, 'Ödeme kaydedilemedi')
      },
    })
  }
  return (
    <>
      <div className={stil.bilgi}>
        <b>{kitap.baslik}</b>
        <span>
          {kitap.yazar} · {ceza.gecikmeGunu} gün gecikme
        </span>
      </div>
      <div className={stil.sag}>
        <span className={stil.tutar}>{para(ceza.tutar)}</span>
        <button
          type="button"
          className={`btn ${ortak.murekkepDugme}`}
          onClick={tikla}
          aria-disabled={kapali || undefined}
          aria-busy={ode.isPending}
        >
          {ode.isPending ? 'Ödeniyor…' : akis.damga ? 'Ödendi' : 'Öde'}
          {' '}
          <span className="sr">· {kitap.baslik}</span>
        </button>
      </div>
    </>
  )
}

export function OdenmemisCezalar({ cezalar }: { readonly cezalar: readonly OdenmemisCeza[] }) {
  return (
    <DefterBolumu
      kimlik="h-cezalar"
      baslik="Ödenmemiş cezalar"
      not={`${cezalar.length} ceza · toplam ${para(cezaToplami(cezalar))}`}
      ogeler={cezalar}
      murekkep="v"
      satir={(c, akis) => <CezaSatiri ceza={c} akis={akis} />}
    />
  )
}

function RezervasyonDurumu({ r }: { readonly r: AcikRezervasyon }) {
  if (r.durum === 'HAZIR') {
    return (
      <Damga murekkep="v" egim={-3}>
        Rafta bekliyor{r.sonGecerlilik ? ` · son gün ${kisaTarih(r.sonGecerlilik)}` : ''}
      </Damga>
    )
  }
  return (
    <Damga murekkep="k" egim={2}>
      Sırada
    </Damga>
  )
}

function RezervasyonSatiri({ r, akis }: { readonly r: AcikRezervasyon; readonly akis: Akis }) {
  const iptal = useRezervasyonIptal()
  const { bildir, hataBildir } = useBildirim()
  const kapali = iptal.isPending || akis.damga !== null
  const tikla = () => {
    if (kapali) return
    akis.basla()
    iptal.mutate(r.id, {
      onSuccess: () => {
        akis.bitti('İptal edildi')
        bildir({ tur: 'basari', baslik: 'Ayırtma iptal edildi', ayrinti: [r.kitap.baslik] })
      },
      onError: (h) => {
        akis.hata()
        hataBildir(h, 'Ayırtma iptal edilemedi')
      },
    })
  }
  return (
    <>
      <div className={stil.bilgi}>
        <b>{r.kitap.baslik}</b>
        <span>
          {r.kitap.yazar} · {r.kitap.yerNumarasi ?? 'yer numarası yok'}
        </span>
      </div>
      <div className={stil.sag}>
        <RezervasyonDurumu r={r} />
        <button
          type="button"
          className={`btn ${ortak.murekkepDugme}`}
          onClick={tikla}
          aria-disabled={kapali || undefined}
          aria-busy={iptal.isPending}
        >
          {iptal.isPending ? 'İptal ediliyor…' : akis.damga ? 'İptal edildi' : 'İptal'}
          {' '}
          <span className="sr">· {r.kitap.baslik}</span>
        </button>
      </div>
    </>
  )
}

export function Ayirttiklari({ rezervasyonlar }: { readonly rezervasyonlar: readonly AcikRezervasyon[] }) {
  const hazir = rezervasyonlar.filter((r) => r.durum === 'HAZIR').length
  return (
    <DefterBolumu
      kimlik="h-ayirtma"
      baslik="Ayırttıkları"
      not={hazir > 0 ? `${hazir} kitap rafta onu bekliyor` : 'Sırası gelince rafta ayrılır'}
      ogeler={rezervasyonlar}
      murekkep="r"
      satir={(r, akis) => <RezervasyonSatiri r={r} akis={akis} />}
    />
  )
}
