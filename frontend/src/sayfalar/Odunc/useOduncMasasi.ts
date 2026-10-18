/** Ödünç masasının durumu: seçili okuyucu (?uye=), süre, damgalama sonucu ve ayırtma teklifi. */
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ApiHatasi } from '../../api/istemci'
import type { UyeDetay } from '../../api/semalar'
import { anahtar, useOduncVer } from '../../api/sorgular'
import type { OduncSuresi } from '../../api/uclar'
import { tamAd } from '../../lib/bicim'
import { kisaTarih } from '../../lib/tarih'
import { useBildirim } from '../../ui/Bildirim'
import { idCoz, rezervasyonOnerilir } from './oduncVeri'
import { useAyirtma } from './useAyirtma'

export const SURELER: readonly OduncSuresi[] = [7, 14, 21]
const VARSAYILAN_SURE: OduncSuresi = 14

export interface OduncSonucu {
  readonly oduncId: number
  readonly kopyaId: number
  readonly sonGun: string
  readonly sure: OduncSuresi
  readonly uyeId: number
  readonly uyeAdi: string
}

/** Seçili okuyucunun tek kaynağı URL'dir (?uye=); seçim yalnızca URL'yi yazar. */
function useSeciliOkuyucu(sonra: () => void) {
  const [parametreler, setParametreler] = useSearchParams()
  const uyeId = idCoz(parametreler.get('uye'))
  const uyeyiYaz = useCallback(
    (id: number | null) => {
      sonra()
      setParametreler(
        (onceki) => {
          const yeni = new URLSearchParams(onceki)
          if (id === null) yeni.delete('uye')
          else yeni.set('uye', String(id))
          return yeni
        },
        { replace: true },
      )
    },
    [setParametreler, sonra],
  )
  return { uyeId, uyeyiYaz }
}

export function useOduncMasasi(kitapId: number) {
  const ayirtma = useAyirtma(kitapId)
  const { uyeId, uyeyiYaz } = useSeciliOkuyucu(ayirtma.temizle)
  const [sure, setSure] = useState<OduncSuresi>(VARSAYILAN_SURE)
  const [sonuc, setSonuc] = useState<OduncSonucu | null>(null)
  /** "Yeni ödünç" ile artar; okuyucu kutusu ve fiş temiz başlasın diye anahtar olarak kullanılır. */
  const [tur, setTur] = useState(0)
  const yolda = useRef(false)
  const odunc = useOduncVer()
  const qc = useQueryClient()
  const { bildir, hataBildir } = useBildirim()
  const kilitli = sonuc !== null || odunc.isPending || ayirtma.ayirtiliyor

  /** 409/422 sonrası raf ve okuyucu bilgisi bayatlamış olabilir: tazele ki düğme doğru kapansın. */
  const durumuTazele = (hata: unknown, id: number) => {
    if (!(hata instanceof ApiHatasi) || (hata.durum !== 409 && hata.durum !== 422)) return
    void qc.invalidateQueries({ queryKey: anahtar.kitap(kitapId) })
    void qc.invalidateQueries({ queryKey: anahtar.uye(id) })
  }

  const damgala = (uye: UyeDetay) => {
    if (yolda.current) return
    yolda.current = true
    ayirtma.setTeklifEdilen(null)
    odunc.mutate(
      { uyeId: uye.id, gun: sure, hedef: { kitapId } },
      {
        onSuccess: ({ veri }) => {
          setSonuc({ oduncId: veri.id, kopyaId: veri.kopyaId, sonGun: veri.sonTeslimTarihi, sure, uyeId: uye.id, uyeAdi: tamAd(uye) })
          bildir({ tur: 'basari', baslik: 'Ödünç verildi', ayrinti: [`${tamAd(uye)} · son gün ${kisaTarih(veri.sonTeslimTarihi)}`] })
        },
        onError: (hata) => {
          hataBildir(hata, 'Ödünç verilemedi')
          ayirtma.setTeklifEdilen(rezervasyonOnerilir(hata) ? uye.id : null)
          durumuTazele(hata, uye.id)
        },
        onSettled: () => {
          yolda.current = false
        },
      },
    )
  }

  const sifirla = () => {
    setSonuc(null)
    setSure(VARSAYILAN_SURE)
    odunc.reset()
    uyeyiYaz(null)
    setTur((t) => t + 1)
  }

  return {
    uyeId,
    /** İstek yoldayken okuyucu değiştirilemez (makbuz ve damga karışmasın). */
    uyeSec: (id: number | null) => (yolda.current || kilitli ? undefined : uyeyiYaz(id)),
    sure,
    setSure,
    sonuc,
    damgala,
    sifirla,
    tur,
    kilitli,
    veriliyor: odunc.isPending,
    teklif: uyeId !== null && ayirtma.teklifEdilen === uyeId,
    ayirtildi: uyeId !== null && ayirtma.ayirtilan === uyeId,
    ayirt: ayirtma.ayirt,
    ayirtiliyor: ayirtma.ayirtiliyor,
  }
}

export type OduncMasasiDurumu = ReturnType<typeof useOduncMasasi>
