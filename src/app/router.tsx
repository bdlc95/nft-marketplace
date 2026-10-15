import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Link,
} from '@tanstack/react-router'
import { CatalogPage } from '@/features/catalog/catalog-page'
import { validateCatalogSearch, defaultSearch } from '@/features/catalog/search'
import { requireSession } from '@/features/account/session'
import { Layout } from './layout'
import { parseSearch, stringifySearch } from '@/lib/search-params'
import { safeReturnPath } from '@/lib/session'
import { ErrorState } from '@/components/error-state'
import { errorMessage } from '@/services/http'
import { queryClient } from './query-client'
import { detailOptions } from '@/features/catalog/queries'
const root = createRootRoute({
  component: Layout,
  errorComponent: ({ error, reset }) => (
    <ErrorState
      message={errorMessage(error)}
      retry={() => {
        reset()
        void router.invalidate()
      }}
    />
  ),
  notFoundComponent: () => (
    <section className="py-16 text-center">
      <h1 className="mb-6 text-3xl font-bold">Página não encontrada</h1>
      <Link to="/" search={defaultSearch} className="underline">
        Voltar ao catálogo
      </Link>
    </section>
  ),
})
const catalog = createRoute({
  getParentRoute: () => root,
  path: '/',
  validateSearch: validateCatalogSearch,
  component: CatalogPage,
})
const detail = createRoute({
  getParentRoute: () => root,
  path: '/nfts/$nftId',
  loader: ({ params }) => {
    // Começa o GET junto do chunk da tela; o useQuery reutiliza a requisição.
    void queryClient.prefetchQuery(detailOptions(params.nftId))
  },
  component: lazyRouteComponent(
    () => import('@/features/nft/detail-page'),
    'DetailPage',
  ),
})
const authSearch = (raw: Record<string, unknown>) => ({
  redirect: safeReturnPath(raw.redirect),
  ...(raw.expired === 'true' || raw.expired === true ? { expired: true } : {}),
})
const login = createRoute({
  getParentRoute: () => root,
  path: '/login',
  validateSearch: authSearch,
  component: lazyRouteComponent(
    () => import('@/features/account/auth-page'),
    'LoginPage',
  ),
})
const signup = createRoute({
  getParentRoute: () => root,
  path: '/signup',
  validateSearch: authSearch,
  component: lazyRouteComponent(
    () => import('@/features/account/auth-page'),
    'SignupPage',
  ),
})
const cart = createRoute({
  getParentRoute: () => root,
  path: '/cart',
  component: lazyRouteComponent(
    () => import('@/features/commerce/cart-page'),
    'CartPage',
  ),
})
const guard = ({ location }: { location: { href: string } }) =>
  requireSession(location.href)
const checkout = createRoute({
  getParentRoute: () => root,
  path: '/checkout',
  beforeLoad: guard,
  component: lazyRouteComponent(
    () => import('@/features/commerce/checkout-page'),
    'CheckoutPage',
  ),
})
const profile = createRoute({
  getParentRoute: () => root,
  path: '/profile',
  beforeLoad: guard,
  component: lazyRouteComponent(
    () => import('@/features/account/profile-page'),
    'ProfilePage',
  ),
})
const wallets = createRoute({
  getParentRoute: () => root,
  path: '/wallets',
  beforeLoad: guard,
  component: lazyRouteComponent(
    () => import('@/features/account/wallets-page'),
    'WalletsPage',
  ),
})
const favorites = createRoute({
  getParentRoute: () => root,
  path: '/favorites',
  beforeLoad: guard,
  component: lazyRouteComponent(
    () => import('@/features/account/favorites-page'),
    'FavoritesPage',
  ),
})
const orders = createRoute({
  getParentRoute: () => root,
  path: '/orders',
  beforeLoad: guard,
  component: lazyRouteComponent(
    () => import('@/features/commerce/order-page'),
    'OrdersPage',
  ),
})
const order = createRoute({
  getParentRoute: () => root,
  path: '/orders/$orderId',
  beforeLoad: guard,
  component: lazyRouteComponent(
    () => import('@/features/commerce/order-page'),
    'OrderPage',
  ),
})
export const router = createRouter({
  routeTree: root.addChildren([
    catalog,
    detail,
    login,
    signup,
    cart,
    checkout,
    profile,
    wallets,
    favorites,
    orders,
    order,
  ]),
  scrollRestoration: true,
  parseSearch,
  stringifySearch,
})
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
