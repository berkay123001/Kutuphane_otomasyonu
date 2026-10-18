/** Okuyucu combobox'ının durumu: gecikmeli arama, açık/kapalı liste ve klavye gezintisi. */
import { useState, type ChangeEvent, type KeyboardEvent } from 'react'
import type { UyeListe } from '../../api/semalar'
import { useUyeler } from '../../api/sorgular'
import { useGecikmeli } from './useGecikmeli'

const EN_AZ_HARF = 2

export function useOkuyucuArama(seciliId: number | null, onSec: (id: number | null) => void) {
  /** null: seçili okuyucunun numarası gösterilir; metin: kullanıcı arıyor. */
  const [metin, setMetin] = useState<string | null>(seciliId !== null ? null : '')
  /** Seçilen okuyucunun fişi gelene kadar kutuda numarası kalsın. */
  const [secilenNo, setSecilenNo] = useState<string | null>(null)
  const [acik, setAcik] = useState(false)
  const [aktif, setAktif] = useState(0)
  const aranan = useGecikmeli((metin ?? '').trim(), 250)
  const etkin = seciliId === null && aranan.length >= EN_AZ_HARF
  const sorgu = useUyeler({ q: aranan, limit: 6 }, etkin)
  const sonuclar: readonly UyeListe[] = etkin ? (sorgu.data?.veri ?? []) : []
  const listeAcik = acik && sonuclar.length > 0
  const aktifSira = Math.max(0, Math.min(aktif, sonuclar.length - 1))
  const aktifUye = listeAcik ? sonuclar[aktifSira] : undefined
  const bitti = acik && etkin && !sorgu.isFetching

  const sec = (u: UyeListe) => {
    setMetin(null)
    setSecilenNo(u.uyeNo)
    setAcik(false)
    onSec(u.id)
  }

  const degisti = (e: ChangeEvent<HTMLInputElement>) => {
    setMetin(e.target.value)
    setAcik(true)
    setAktif(0)
    if (seciliId !== null) onSec(null)
  }

  const gez = (asagi: boolean) => {
    if (!listeAcik) {
      setAcik(true)
      setAktif(asagi ? 0 : Math.max(0, sonuclar.length - 1))
      return
    }
    setAktif(Math.max(0, Math.min(sonuclar.length - 1, aktifSira + (asagi ? 1 : -1))))
  }

  const tus = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      gez(e.key === 'ArrowDown')
    } else if (e.key === 'Enter' && aktifUye) {
      e.preventDefault()
      sec(aktifUye)
    } else if (e.key === 'Escape' && acik) {
      e.preventDefault()
      setAcik(false)
    }
  }

  return {
    metin,
    secilenNo,
    aranan,
    sonuclar,
    listeAcik,
    aktifSira,
    aktifUye,
    bulunamadi: bitti && !sorgu.isError && sonuclar.length === 0,
    aramaHatasi: bitti && sorgu.isError,
    sec,
    degisti,
    tus,
    ac: () => setAcik(true),
    kapat: () => setAcik(false),
    uzerinde: setAktif,
  }
}
