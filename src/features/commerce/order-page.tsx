import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/error-state'
import { FeatureInfo } from '@/components/feature-info'
import { AccountLayout } from '@/features/account/account-layout'
import { orderOptions, privateKeys } from '@/features/account/queries'
import { useIdentity } from '@/lib/session'
import { formatEth } from '@/lib/eth'
import { commerceApi } from '@/services/commerce'
import { errorMessage } from '@/services/http'
import { networkLabels } from '@/features/catalog/search'
import { AmountSummary } from './cart-page'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { TransactionItems } from './transaction-items'
import { DemoControls } from '@/components/demo-controls'
import { readAttempt, writeAttempt } from './checkout-state'
const route = getRouteApi('/orders/$orderId')
export function OrderPage() {
  const { orderId } = route.useParams()
  const navigate = useNavigate()
  const { userId } = useIdentity()
  const result = useQuery(orderOptions(userId, orderId))
  const order = result.data
  useEffect(() => {
    const attempt = readAttempt(userId)
    if (
      order &&
      order.status !== 'pending' &&
      attempt?.payload.quoteId === order.quote.id
    )
      writeAttempt(userId, null)
  }, [order, userId])
  if (result.isPending)
    return <Skeleton className="h-96" aria-label="Consultando pedido" />
  if (result.isError)
    return (
      <ErrorState
        message={errorMessage(result.error)}
        retry={() => void result.refetch()}
      />
    )
  if (!order) return null
  const formattedDate = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
    .format(new Date(order.createdAt))
    .replace(/(\w{3}) (\d{4})$/, '$1, $2')
  const provider = {
    metamask: 'MetaMask',
    walletconnect: 'WalletConnect',
    coinbase: 'Coinbase Wallet',
  }[order.wallet.provider || 'metamask']
  return (
    <section className="commerce-page confirmation-page">
      <span className="sr-only" data-testid="order-id">
        {order.id}
      </span>
      {order.status === 'confirmed' ? (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) void navigate({ to: '/orders' })
          }}
        >
          <DialogContent
            className="receipt-modal"
            overlayClassName="receipt-overlay"
            showCloseButton={false}
            aria-describedby="receipt-description"
          >
            <button
              className="receipt-close"
              type="button"
              aria-label="Fechar"
              onClick={() => void navigate({ to: '/orders' })}
            >
              ×
            </button>
            <img
              className="receipt-thanks"
              src="/assets/pdf/thank-you.png"
              width="68"
              height="82"
              alt=""
            />
            <DialogTitle>Seus NFTs agora estão na sua carteira</DialogTitle>
            <div className="transaction-meta">
              <div>
                <strong>ID da transação</strong>
                <span>
                  {order.transaction.slice(0, 6)}…{order.transaction.slice(-4)}
                </span>
              </div>
              <div>
                <span>Data</span>
                <span>{formattedDate}</span>
              </div>
              <div>
                <span>Total</span>
                <span>{formatEth(order.quote.total)}</span>
              </div>
              <div>
                <strong>Carteira</strong>
                <span>{provider}</span>
              </div>
            </div>
            <div className="receipt-details" data-testid="receipt">
              <h2>Detalhes da transação</h2>
              <TransactionItems items={order.quote.items} receipt />
              <AmountSummary totals={order.quote} compact />
              <p id="receipt-description">
                Transação confirmada na {networkLabels[order.quote.network]}. A
                propriedade foi transferida para sua carteira conectada e
                registrada na rede.
              </p>
              <div id="transaction">
                <FeatureInfo
                  message={`Referência da transação no ambiente simulado: ${order.transaction}.`}
                >
                  <Button>Ver no Etherscan</Button>
                </FeatureInfo>
              </div>
            </div>
            {import.meta.env.VITE_SHOW_TEST_CONTROLS === 'true' && (
              <DemoControls />
            )}
          </DialogContent>
        </Dialog>
      ) : (
        <div className="pending-order account-panel">
          <h1>
            {order.status === 'pending'
              ? 'Pagamento em processamento'
              : 'Pagamento recusado'}
          </h1>
          <p role="status">
            {order.status === 'pending'
              ? 'Aguardando confirmação. Você pode recarregar esta página sem criar outro pedido.'
              : order.reason}
          </p>
          <TransactionItems items={order.quote.items} />
          <AmountSummary totals={order.quote} />
          {order.status === 'pending' && (
            <Button variant="outline" onClick={() => void result.refetch()}>
              Atualizar status
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to="/cart">Voltar ao carrinho</Link>
          </Button>
          {import.meta.env.VITE_SHOW_TEST_CONTROLS === 'true' && (
            <DemoControls />
          )}
        </div>
      )}
    </section>
  )
}

export function OrdersPage() {
  const { userId } = useIdentity()
  const result = useQuery({
    queryKey: privateKeys.resource(userId, 'orders'),
    queryFn: ({ signal }) => commerceApi.orders(signal),
    refetchInterval: (query) =>
      query.state.data?.some((order) => order.status === 'pending')
        ? 1500
        : false,
  })
  return (
    <AccountLayout title="Meus pedidos">
      {result.isPending ? (
        <Skeleton className="h-64" />
      ) : result.isError ? (
        <ErrorState
          message={errorMessage(result.error)}
          retry={() => void result.refetch()}
        />
      ) : !result.data.length ? (
        <p className="empty-catalog">Você ainda não fez pedidos.</p>
      ) : (
        <div className="orders-list">
          {result.data.map((order) => (
            <Link
              key={order.id}
              to="/orders/$orderId"
              params={{ orderId: order.id }}
            >
              <strong>{order.id}</strong>
              <span>
                {
                  {
                    pending: 'Em processamento',
                    confirmed: 'Confirmado',
                    rejected: 'Recusado',
                  }[order.status]
                }
              </span>
              <span>{formatEth(order.quote.total)}</span>
            </Link>
          ))}
        </div>
      )}
    </AccountLayout>
  )
}
