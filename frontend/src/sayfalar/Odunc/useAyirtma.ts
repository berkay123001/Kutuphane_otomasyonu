/** Rafta kopya yokken ayırtma: teklif ve sonuç hangi okuyucu içinse ona bağlı tutulur. */
import { useCallback, useRef, useState } from 'react'
import type { UyeDetay } from '../../api/semalar'
import { useRezervasyon } from '../../api/sorgular'
import { tamAd } from '../../lib/bicim'
import { useBildirim } from '../../ui/Bildirim'

export function useAyirtma(kitapId: number) {
  /** Ayırtma teklif edilen okuyucu (409 'rezervasyon yapabilirsiniz' sonrası). */
  const [teklifEdilen, setTeklifEdilen] = useState<number | null>(null)
  /** Bu ekranda sıraya alınan okuyucu. */
  const [ayirtilan, setAyirtilan] = useState<number | null>(null)
  const yolda = useRef(false)
  const rezervasyon = useRezervasyon()
  const { bildir, hataBildir } = useBildirim()

  const ayirt = (uye: UyeDetay) => {
    if (yolda.current) return
    yolda.current = true
    rezervasyon.mutate(
      { uyeId: uye.id, kitapId },
      {
        onSuccess: () => {
          setAyirtilan(uye.id)
          setTeklifEdilen(null)
          bildir({ tur: 'basari', baslik: 'Kitap ayırtıldı', ayrinti: [`${tamAd(uye)} sıraya alındı`] })
        },
        onError: (hata) => hataBildir(hata, 'Ayırtılamadı'),
        onSettled: () => {
          yolda.current = false
        },
      },
    )
  }

  const temizle = useCallback(() => setTeklifEdilen(null), [])

  return { teklifEdilen, setTeklifEdilen, ayirtilan, ayirt, temizle, ayirtiliyor: rezervasyon.isPending }
}
