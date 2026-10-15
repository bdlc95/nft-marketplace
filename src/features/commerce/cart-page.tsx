import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/error-state'
import { FormField } from '@/components/form-field'
import { CommerceHeading } from '@/components/commerce-heading'
import { defaultSearch } from '@/features/catalog/search'
import { cartOptions } from '@/features/account/queries'
import { RelatedNfts } from '@/features/nft/detail-page'
import { useIdentity } from '@/lib/session'
import { formatEth } from '@/lib/eth'
import { errorMessage } from '@/services/http'
import { fieldErrors } from '@/lib/form-errors'
import type { Cart, ReceiptItem, Totals } from '@/types/contracts'
import { useCartMutation } from './cart-hooks'
export function AmountSummary({
  totals,
  compact = false,
  totalTestId = 'cart-total',
}: {
  totals: Totals
  compact?: boolean
  totalTestId?: string
}) {
  return (
    <dl
      className={`amount-summary design-amounts ${compact ? 'compact-amounts' : ''}`}
    >
      {!compact && (
        <>
          <div>
            <dt>Subtotal</dt>
            <dd data-testid="subtotal">{formatEth(totals.subtotal)}</dd>
          </div>
          <div>
            <dt>Desconto do lançamento</dt>
            <dd>
              {totals.discount === '0'
                ? '(-) 00.00'
                : `(-) ${formatEth(totals.discount)}`}
            </dd>
          </div>
        </>
      )}
      <div className="network-fee-row">
        <dt>Taxa de rede</dt>
        <dd>{formatEth(totals.networkFee)}</dd>
      </div>
      {!compact && (
        <div className="fee-estimate">
          <dt className="sr-only">Estimativa</dt>
          <dd>Taxa estimada</dd>
        </div>
      )}
      <div className="amount-total">
        <dt>Total</dt>
        <dd data-testid={totalTestId}>{formatEth(totals.total)}</dd>
      </div>
    </dl>
  )
}
export function CartSkeleton() {
  return (
    <div
      className="commerce-layout"
      data-testid="cart-skeleton"
      aria-label="Carregando carrinho"
    >
      <div className="space-y-4">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
      <Skeleton className="h-80" />
    </div>
  )
}
export function CartPage() {
  const { userId } = useIdentity()
  const result = useQuery(cartOptions(userId))
  return (
    <section className="commerce-page design-cart">
      <CommerceHeading title="Carrinho" mobileTitle="Carrinho de NFTs" />
      {result.isPending ? (
        <CartSkeleton />
      ) : result.isError ? (
        <ErrorState
          message={errorMessage(result.error)}
          retry={() => void result.refetch()}
        />
      ) : (
        <CartContent cart={result.data} />
      )}
    </section>
  )
}
function CartContent({ cart }: { cart: Cart }) {
  const action = useCartMutation()
  const [coupon, setCoupon] = useState(cart.coupon)
  useEffect(() => setCoupon(cart.coupon), [cart.coupon])
  if (!cart.items.length)
    return (
      <div className="empty-catalog">
        <h2>Seu carrinho está vazio</h2>
        <p>Encontre uma obra para começar sua coleção.</p>
        <Button asChild>
          <Link to="/" search={defaultSearch}>
            Explorar NFTs
          </Link>
        </Button>
      </div>
    )
  return (
    <>
      <div className="commerce-layout">
        <div className="cart-items">
          <div className="cart-table-head desktop-only">
            <span>NFTs</span>
            <span>Preço</span>
            <span>Edições</span>
            <span>Total</span>
            <span />
          </div>
          {cart.items.map((item) => (
            <CartItem key={item.key} item={item} />
          ))}
        </div>
        <aside className="order-summary cart-design-summary">
          <h2 className="desktop-only">Resumo da carteira</h2>
          {cart.warnings.map((warning) => (
            <p key={warning} role="alert" className="form-error">
              {warning}
            </p>
          ))}
          <form
            className="coupon-form"
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              action.mutate({ kind: 'coupon', code: coupon })
            }}
          >
            <FormField
              label="Código promocional"
              name="coupon"
              placeholder="Digite o código promocional..."
              value={coupon}
              error={fieldErrors(action.error).coupon}
              onChange={(event) => {
                setCoupon(event.target.value)
                action.reset()
              }}
            />
            <Button type="submit" disabled={action.isPending}>
              Aplicar
            </Button>
          </form>
          {cart.coupon && (
            <Button
              variant="ghost"
              disabled={action.isPending}
              onClick={() => action.mutate({ kind: 'coupon', code: '' })}
            >
              Remover cupom {cart.coupon}
            </Button>
          )}
          {action.isError && (
            <p role="alert" className="form-error">
              {errorMessage(action.error)}
            </p>
          )}
          <AmountSummary totals={cart} />
          {cart.warnings.length ? (
            <Button disabled>Revise o carrinho</Button>
          ) : (
            <Button asChild>
              <Link to="/checkout">Conectar e finalizar</Link>
            </Button>
          )}
          <Link
            to="/"
            search={defaultSearch}
            className="cart-continue desktop-only"
          >
            Continuar explorando
          </Link>
        </aside>
      </div>
      <div className="desktop-only cart-recommendations">
        <RelatedNfts
          collection="cosmos"
          currentId=""
          title="Colecionadores também viram"
        />
      </div>
    </>
  )
}
function CartItem({ item }: { item: ReceiptItem }) {
  const action = useCartMutation()
  const [quantity, setQuantity] = useState(String(item.quantity))
  useEffect(() => setQuantity(String(item.quantity)), [item.quantity])
  const set = (value: number) =>
    action.mutate({
      kind: 'quantity',
      line: { nftId: item.nftId, editionId: item.editionId, quantity: value },
    })
  const apply = () => {
    if (quantity !== String(item.quantity) && !action.isPending)
      set(Number(quantity))
  }
  return (
    <article
      className="cart-item design-cart-item"
      data-testid="cart-item"
      tabIndex={0}
    >
      <div className="cart-product">
        <Link to="/nfts/$nftId" params={{ nftId: item.nftId }}>
          <img
            src={item.image}
            width="70"
            height="70"
            alt={`Arte digital ${item.name}`}
          />
        </Link>
        <div>
          <h2>{item.name}</h2>
          <p className="desktop-only">
            ID do token: #
            {item.token || item.name.split('#')[1]?.padStart(4, '0')}
          </p>
          <p className="mobile-only">Edição: {item.edition}</p>
          <strong className="mobile-only">{formatEth(item.subtotal)}</strong>
        </div>
      </div>
      <strong className="cart-unit-price desktop-only">
        {formatEth(item.unitPrice)}
      </strong>
      <div className="cart-quantity">
        <Button
          aria-label={`Diminuir quantidade de ${item.name}`}
          disabled={item.quantity <= 1 || action.isPending}
          onClick={() => set(item.quantity - 1)}
        >
          −
        </Button>
        <input
          aria-label={`Quantidade de ${item.name}`}
          type="number"
          min="1"
          max={item.available}
          value={quantity}
          disabled={action.isPending}
          onChange={(event) => setQuantity(event.target.value)}
          onBlur={apply}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              apply()
            }
          }}
        />
        <Button
          aria-label={`Aumentar quantidade de ${item.name}`}
          disabled={item.quantity >= item.available || action.isPending}
          onClick={() => set(item.quantity + 1)}
        >
          +
        </Button>
      </div>
      <strong className="cart-line-total desktop-only">
        {formatEth(item.subtotal)}
      </strong>
      <button
        className="cart-remove"
        disabled={action.isPending}
        aria-label={`Remover ${item.name}`}
        onClick={() => action.mutate({ kind: 'remove', line: item })}
      >
        <img src="/assets/pdf/trash.png" width="24" height="24" alt="" />
      </button>
      {item.quantity > item.available && item.available > 0 && (
        <Button
          variant="outline"
          onClick={() => set(item.available)}
          disabled={action.isPending}
        >
          Ajustar para {item.available}
        </Button>
      )}
      {action.isError && (
        <p role="alert" className="form-error">
          {errorMessage(action.error)}
        </p>
      )}
    </article>
  )
}
