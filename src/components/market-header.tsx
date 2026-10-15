import { Link, useRouterState } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { FigmaIcon } from './figma-icon'
import { FeatureInfo } from './feature-info'
import { defaultSearch } from '@/features/catalog/search'
import { cartOptions } from '@/features/account/queries'
import { useSession } from '@/features/account/session'
export function MarketHeader() {
  const path = useRouterState({ select: (state) => state.location.pathname })
  const home = ['/', '/login', '/signup', '/profile', '/wallets'].includes(path)
  const { user, identity } = useSession()
  const cart = useQuery(cartOptions(identity.userId))
  const quantity =
    cart.data?.items.reduce((sum, item) => sum + item.quantity, 0) || 0
  return (
    <header className={`market-header ${home ? 'with-divider' : ''}`}>
      <Link className="wordmark" to="/" search={defaultSearch}>
        KURIO
      </Link>
      <nav aria-label="Navegação principal" className="desktop-nav">
        <Link to="/" search={defaultSearch} className={home ? 'active' : ''}>
          Início{home && <FigmaIcon name="imgActiveUnderline" />}
        </Link>
        <Link
          to="/"
          search={defaultSearch}
          hash="catalog"
          className={!home ? 'active' : ''}
        >
          Mercado{!home && <FigmaIcon name="dd-imgActiveUnderline" />}
        </Link>
        <FeatureInfo>
          <button type="button">Criadores</button>
        </FeatureInfo>
        <FeatureInfo>
          <button type="button">Aprenda</button>
        </FeatureInfo>
      </nav>
      <div className="header-actions">
        <Link
          to="/"
          search={(previous) => ({ ...defaultSearch, ...previous })}
          hash="search-form"
          className="icon-button"
          aria-label="Abrir busca"
        >
          <FigmaIcon name="imgSearchIcon" />
        </Link>
        <Link
          to="/cart"
          className="icon-button cart-action"
          aria-label={`Abrir carrinho, ${quantity} itens`}
        >
          <FigmaIcon name="imgCartIcon" />
          <span className="cart-badge" data-testid="cart-count">
            {quantity}
          </span>
        </Link>
        {user ? (
          <Button asChild className="sign-in">
            <Link to="/profile" aria-label="Minha conta">
              <FigmaIcon name="imgLogout" />
              Entrar
            </Link>
          </Button>
        ) : (
          <Button asChild className="sign-in">
            <Link to="/login" search={{ redirect: path }}>
              <FigmaIcon name="imgLogout" />
              Entrar
            </Link>
          </Button>
        )}
      </div>
      {home && (
        <div className="header-divider">
          <FigmaIcon name="imgLine1" />
        </div>
      )}
    </header>
  )
}
export function MobileNav() {
  return (
    <nav className="mobile-nav" aria-label="Navegação mobile">
      <div className="mobile-nav-art">
        <FigmaIcon name="mh-imgVector" />
      </div>
      <Link
        to="/"
        search={defaultSearch}
        aria-label="Início"
        className="mobile-nav-item"
      >
        <FigmaIcon name="mh-imgHome" />
      </Link>
      <Link to="/favorites" className="mobile-nav-item" aria-label="Favoritos">
        <FigmaIcon name="mh-imgVector1" />
      </Link>
      <Link
        to="/"
        search={defaultSearch}
        hash="catalog"
        className="mobile-nav-center"
        aria-label="Explorar NFTs"
      >
        <FigmaIcon name="mh-imgEllipse39" />
        <span className="scan-mark">
          {[2, 3, 4, 5, 6].map((part) => (
            <FigmaIcon
              key={part}
              name={`mh-imgVector${part}`}
              className={`scan-part-${part}`}
            />
          ))}
        </span>
      </Link>
      <Link to="/cart" className="mobile-nav-item" aria-label="Carrinho">
        <FigmaIcon name="mh-imgShop" />
      </Link>
      <Link to="/profile" className="mobile-nav-item" aria-label="Perfil">
        <FigmaIcon name="mh-imgUser" />
      </Link>
    </nav>
  )
}
