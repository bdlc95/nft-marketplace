import { useEffect } from 'react'
import { SessionMonitor } from '@/features/account/session'
import { Outlet, useRouterState } from '@tanstack/react-router'
import { DemoControls } from '@/components/demo-controls'
import { MarketHeader, MobileNav } from '@/components/market-header'
import { MarketFooter } from '@/components/market-footer'
import { Realtime } from './realtime'
import { useIdentity } from '@/lib/session'

export function Layout() {
  const path = useRouterState({ select: (state) => state.location.pathname })
  const { token, userId } = useIdentity()
  const auth = path === '/login' || path === '/signup'
  const account = path === '/profile' || path === '/wallets'
  const confirmation = path.startsWith('/orders/')
  const commerce = path === '/cart' || path === '/checkout'
  useEffect(() => {
    const titles: Record<string, string> = {
      '/login': 'Entrar',
      '/signup': 'Criar conta',
      '/cart': 'Carrinho',
      '/checkout': 'Pagamento',
      '/profile': 'Meu perfil',
      '/wallets': 'Carteiras',
      '/favorites': 'Favoritos',
      '/orders': 'Pedidos',
    }
    if (titles[path]) document.title = `${titles[path]} — Kurio`
  }, [path])
  return (
    <div
      className={`app-shell ${path.startsWith('/nfts/') ? 'detail-shell' : ''} ${auth ? 'auth-shell' : ''} ${account ? 'collector-shell' : ''} ${confirmation ? 'confirmation-shell' : ''} ${commerce ? 'commerce-shell' : ''}`}
    >
      <a href="#main" className="skip-link">
        Ir para o conteúdo
      </a>
      <SessionMonitor />
      <MarketHeader />
      <Realtime key={`${userId}:${token}`} />
      <main id="main" tabIndex={-1} className="market-main">
        <Outlet />
      </main>
      {!auth && !account && !confirmation && <MarketFooter />}
      {import.meta.env.VITE_ENABLE_MOCKS === 'true' &&
        import.meta.env.VITE_SHOW_TEST_CONTROLS === 'true' &&
        !confirmation && (
          <div className="demo-panel">
            <p>Ambiente de demonstração</p>
            <DemoControls />
          </div>
        )}
      {!auth && !['/cart', '/checkout'].includes(path) && !confirmation && (
        <MobileNav />
      )}
    </div>
  )
}
