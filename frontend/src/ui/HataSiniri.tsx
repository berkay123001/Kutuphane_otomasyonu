import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Damga } from './Damga'
import stil from './ui.module.css'

interface Props {
  readonly children: ReactNode
  /** Sessiz: yalnızca hiçbir şey çizme (ör. arka plan sahnesi çökerse uygulama sürsün). */
  readonly sessiz?: boolean
}

interface Durum {
  readonly hata: Error | null
}

/** Yeni sürüm yayınlandıktan sonra eski sayfa paketleri bulunamayabilir. */
export function paketHatasiMi(hata: Error): boolean {
  return /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(hata.message)
}

/** Çizim sırasında atılan hataları yakalar; uygulamanın tamamen boş kalmasını önler. */
export class HataSiniri extends Component<Props, Durum> {
  override state: Durum = { hata: null }

  static getDerivedStateFromError(hata: Error): Durum {
    return { hata }
  }

  override componentDidCatch(hata: Error, bilgi: ErrorInfo): void {
    // Tarayıcı geliştirici araçlarında izlenebilsin diye hata kaydı (console.log değil)
    console.error('Fişlik çizim hatası', hata, bilgi.componentStack)
  }

  private readonly yenile = () => window.location.reload()

  override render() {
    const { hata } = this.state
    if (!hata) return this.props.children
    if (this.props.sessiz) return null
    const paket = paketHatasiMi(hata)
    return (
      <div className={stil.hataSiniri}>
        <div className={`${stil.hataKutusu} card`} role="alert">
          <Damga murekkep="r" vur={0.1}>
            {paket ? 'Yeni sürüm' : 'Hata'}
          </Damga>
          <p className={stil.hataMesaji}>
            {paket
              ? 'Fişlik güncellendi; bu sayfanın yeni hâlini almak için yenilemek gerekiyor.'
              : 'Bu çekmece açılırken bir şeyler ters gitti.'}
          </p>
          <button type="button" className="btn btn-v" onClick={this.yenile}>
            Sayfayı yenile
          </button>
        </div>
      </div>
    )
  }
}
