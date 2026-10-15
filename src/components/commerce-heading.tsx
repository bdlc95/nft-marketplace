import { Link } from '@tanstack/react-router'
import { defaultSearch } from '@/features/catalog/search'
export function CommerceHeading({
  title,
  mobileTitle = title,
}: {
  title: 'Carrinho' | 'Pagamento'
  mobileTitle?: string
}) {
  return (
    <>
      <p className="commerce-breadcrumb desktop-only">
        <Link to="/" search={defaultSearch}>
          Início
        </Link>{' '}
        /{' '}
        <Link to="/" search={defaultSearch} hash="catalog">
          Mercado
        </Link>{' '}
        / {title}
      </p>
      <header className="commerce-mobile-heading mobile-only">
        <Link
          to={title === 'Carrinho' ? '/' : '/cart'}
          search={title === 'Carrinho' ? defaultSearch : undefined}
          aria-label="Voltar"
        >
          ‹
        </Link>
        <h1>{mobileTitle}</h1>
      </header>
    </>
  )
}
