import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { ApiHatasi } from './api/istemci'
import { App } from './App'
import { OturumSaglayici } from './oturum/OturumSaglayici'
import { TemaSaglayici } from './tema/TemaSaglayici'
import { BildirimSaglayici } from './ui/Bildirim'
import './stil/global.css'

const sorguIstemcisi = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      refetchOnWindowFocus: false,
      retry: (deneme, hata) =>
        !(hata instanceof ApiHatasi && hata.durum >= 400 && hata.durum < 500) && deneme < 2,
    },
  },
})

const kok = document.getElementById('kok')
if (!kok) throw new Error('#kok bulunamadı')

createRoot(kok).render(
  <StrictMode>
    <QueryClientProvider client={sorguIstemcisi}>
      <MotionConfig reducedMotion="user">
      <TemaSaglayici>
        <BildirimSaglayici>
          <OturumSaglayici>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </OturumSaglayici>
        </BildirimSaglayici>
      </TemaSaglayici>
      </MotionConfig>
    </QueryClientProvider>
  </StrictMode>,
)
