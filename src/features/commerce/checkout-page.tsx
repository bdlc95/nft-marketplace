import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { Link, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/error-state'
import {
  cartOptions,
  privateKeys,
  walletsOptions,
} from '@/features/account/queries'
import { useSession } from '@/features/account/session'
import { networkLabels } from '@/features/catalog/search'
import { useIdentity, getIdentity } from '@/lib/session'
import {
  accountApi,
  commerceApi,
  type CheckoutDraft,
} from '@/services/commerce'
import { errorMessage } from '@/services/http'
import { errorCode, fieldErrors } from '@/lib/form-errors'
import { formatEth } from '@/lib/eth'
import type { Collector, Network, Order, Quote } from '@/types/contracts'
import { AmountSummary, CartSkeleton } from './cart-page'
import { CommerceHeading } from '@/components/commerce-heading'
import { WalletFields, type WalletFormValues } from '@/components/wallet-fields'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { TransactionItems } from './transaction-items'
import type { Wallet } from '@/types/contracts'
import { DemoControls } from '@/components/demo-controls'
import {
  readAttempt,
  readDraft,
  writeAttempt,
  writeDraft,
  type Attempt,
} from './checkout-state'
export function CheckoutPage() {
  const { userId } = useIdentity()
  return <CheckoutContent key={userId} uid={userId} />
}
function CheckoutContent({ uid }: { uid: string }) {
  const identity = useIdentity()
  const { user } = useSession()
  const navigate = useNavigate()
  const cache = useQueryClient()
  const [draft, setDraft] = useState<CheckoutDraft>(
    () =>
      readDraft(uid) || {
        collector: {
          name: user?.name || '',
          email: user?.email || '',
          phone: user?.phone || '',
          acceptTerms: false,
        },
        network: 'ethereum',
        walletId: '',
      },
  )
  const [reviewed, setReviewed] = useState<Quote | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [provider, setProvider] =
    useState<NonNullable<Wallet['provider']>>('coinbase')
  const [walletAddress, setWalletAddress] = useState('')
  const [otherWallet, setOtherWallet] = useState(false)
  const [changed, setChanged] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [attempt, setAttempt] = useState<Attempt | null>(() => readAttempt(uid))
  const cart = useQuery(cartOptions(uid, draft.network))
  const wallets = useQuery(walletsOptions(uid))
  const selected = wallets.data?.find((wallet) => wallet.id === draft.walletId)
  useEffect(() => {
    if (!wallets.data || draft.walletId || walletAddress) return
    const wallet =
      wallets.data.find(
        (item) => item.network === draft.network && item.primary,
      ) || wallets.data.find((item) => item.network === draft.network)
    if (wallet) setDraft((previous) => ({ ...previous, walletId: wallet.id }))
  }, [wallets.data, draft.walletId, draft.network, walletAddress])
  useEffect(() => {
    if (draft.collector.username !== undefined) return
    setDraft((previous) => ({
      ...previous,
      collector: {
        ...previous.collector,
        username: user?.username || user?.email.split('@')[0] || '',
        profileName: user?.username || user?.email.split('@')[0] || '',
        referralCode: 'KURIO',
        ens: user?.ens || user?.email.split('@')[0] || '',
      },
    }))
  }, [draft.collector.username, user])
  const gotoOrder = (order: Order) => {
    if (getIdentity().token !== identity.token) return
    if (attempt) {
      const saved = { ...attempt, orderId: order.id }
      writeAttempt(uid, saved)
      setAttempt(saved)
    }
    void navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
  }
  const recover = useMutation({
    mutationFn: (saved: Attempt) => commerceApi.orderByAttempt(saved.key),
    onSuccess: gotoOrder,
  })
  const submit = useMutation({
    mutationFn: (saved: Attempt) => commerceApi.order(saved.payload, saved.key),
    onSuccess: gotoOrder,
    onError: (error) => {
      if (getIdentity().token !== identity.token) return
      if (errorCode(error) === 'QUOTE_CHANGED' && error instanceof AxiosError) {
        setReviewed(error.response?.data.quote)
        setChanged(true)
        writeAttempt(uid, null)
        setAttempt(null)
      } else if (
        error instanceof AxiosError &&
        error.response &&
        error.response.status < 500 &&
        error.response.status !== 401
      ) {
        writeAttempt(uid, null)
        setAttempt(null)
        setErrors(fieldErrors(error))
      }
      // Transporte incerto conserva a tentativa. Reenvio sempre reutiliza payload/chave.
    },
  })
  const review = useMutation({
    mutationFn: () => commerceApi.quote(draft.network),
    onSuccess: (quote) => {
      setReviewed(quote)
      setChanged(false)
      submit.reset()
      setErrors({})
      setReviewOpen(true)
    },
  })
  const connection = useMutation({
    mutationFn: (action: 'connect' | 'disconnect' | 'refuse') =>
      accountApi.walletConnection(draft.walletId, action),
    onSettled: () => {
      if (getIdentity().token === identity.token)
        void cache.invalidateQueries({
          queryKey: privateKeys.resource(uid, 'wallets'),
        })
    },
  })
  const recovering = recover.mutate
  useEffect(() => {
    const saved = readAttempt(uid)
    if (saved) recovering(saved)
  }, [uid, recovering])
  useEffect(() => {
    if (uid) writeDraft(uid, draft)
  }, [uid, draft])
  useEffect(() => {
    const stale = (event: Event) => {
      const nftId = (event as CustomEvent<{ id: string }>).detail?.id
      if (reviewed?.items.some((item) => item.nftId === nftId)) setChanged(true)
    }
    window.addEventListener('kurio:catalog-change', stale)
    return () => window.removeEventListener('kurio:catalog-change', stale)
  }, [reviewed])
  useEffect(() => {
    if (!reviewed || !cart.data) return
    const live = cart.data
    if (
      live.revision !== reviewed.revision ||
      live.total !== reviewed.total ||
      live.warnings.length ||
      live.items.some(
        (item) =>
          !reviewed.items.some(
            (old) =>
              old.key === item.key &&
              old.quantity === item.quantity &&
              old.unitPrice === item.unitPrice &&
              old.version === item.version,
          ),
      )
    )
      setChanged(true)
  }, [reviewed, cart.data])
  function change(patch: Partial<CheckoutDraft>) {
    if (attempt) return
    setDraft((previous) => ({ ...previous, ...patch }))
    setReviewed(null)
    setChanged(false)
    setErrors({})
    review.reset()
    submit.reset()
    connection.reset()
  }
  function collector(patch: Partial<Collector>) {
    change({ collector: { ...draft.collector, ...patch } })
  }
  function requestReview() {
    const data = draft.collector
    const invalid: Record<string, string> = {}
    if (data.name.trim().length < 2) invalid.name = 'Informe seu nome completo.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
      invalid.email = 'Informe um e-mail válido.'
    for (const key of [
      'username',
      'profileName',
      'referralCode',
      'ens',
    ] as const)
      if (!data[key] || data[key].trim().length < 2)
        invalid[key] = 'Preencha este campo.'
    if (!selected || selected.network !== draft.network)
      invalid.walletId = 'Selecione uma carteira da rede escolhida.'
    if (!selected?.connected)
      invalid.walletId = 'Conecte sua carteira antes de continuar.'
    setErrors(invalid)
    if (!Object.keys(invalid).length) review.mutate()
  }
  function purchase() {
    if (submit.isPending || !reviewed || changed || !selected?.connected) return
    const saved: Attempt = attempt || {
      key: crypto.randomUUID(),
      payload: {
        quoteId: reviewed.id,
        walletId: draft.walletId,
        collector: { ...structuredClone(draft.collector), acceptTerms: true },
        walletProvider: provider,
      },
    }
    writeAttempt(uid, saved)
    setAttempt(saved)
    submit.mutate(saved)
  }
  const busy = submit.isPending || recover.isPending
  if (cart.isPending || wallets.isPending)
    return (
      <section className="commerce-page">
        <h1>Pagamento</h1>
        <CartSkeleton />
      </section>
    )
  if (cart.isError || wallets.isError)
    return (
      <ErrorState
        message={errorMessage(cart.error || wallets.error)}
        retry={() => {
          void cart.refetch()
          void wallets.refetch()
        }}
      />
    )
  if (attempt)
    return (
      <section className="commerce-page">
        <h1>Recuperar tentativa de compra</h1>
        <div className="account-panel stack-form">
          <p>
            Estamos verificando o resultado antes de permitir outra compra. A
            mesma tentativa não cria um segundo pedido.
          </p>
          <p role="status">{busy ? 'Consultando pedido…' : ''}</p>
          {(submit.isError || recover.isError) && (
            <p role="alert" className="form-error">
              {errorMessage(recover.error || submit.error)}
            </p>
          )}
          <Button disabled={busy} onClick={() => recover.mutate(attempt)}>
            Verificar pedido
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => submit.mutate(attempt)}
          >
            Reenviar mesma tentativa
          </Button>
          {recover.isError &&
            recover.error instanceof AxiosError &&
            recover.error.response?.status === 404 && (
              <Button
                variant="ghost"
                onClick={() => {
                  writeAttempt(uid, null)
                  setAttempt(null)
                  setReviewed(null)
                  recover.reset()
                }}
              >
                Revisar nova tentativa
              </Button>
            )}
        </div>
      </section>
    )
  if (!cart.data.items.length)
    return (
      <section className="commerce-page">
        <h1>Pagamento</h1>
        <p>Seu carrinho está vazio.</p>
        <Link to="/cart" className="text-link">
          Voltar ao carrinho
        </Link>
      </section>
    )
  const form: WalletFormValues = {
    displayName: draft.collector.name,
    name: draft.collector.username || '',
    network: draft.network,
    address: walletAddress || selected?.address || '',
    provider,
    email: draft.collector.email,
    profileName: draft.collector.profileName || '',
    secondary: draft.collector.secondary || '',
    referralCode: draft.collector.referralCode || '',
    ens: draft.collector.ens || '',
  }
  function updateField(name: keyof WalletFormValues, value: string) {
    if (name === 'network') {
      setWalletAddress('')
      change({ network: value as Network, walletId: '' })
    } else if (name === 'provider') {
      setProvider(value as NonNullable<Wallet['provider']>)
      setReviewed(null)
    } else if (name === 'address') {
      setWalletAddress(value)
      const wallet = wallets.data?.find(
        (item) =>
          item.address.toLowerCase() === value.toLowerCase() &&
          item.network === draft.network,
      )
      change({ walletId: wallet?.id || '' })
    } else
      collector({
        [name === 'displayName' ? 'name' : name === 'name' ? 'username' : name]:
          value,
      })
  }
  const displayErrors = {
    ...errors,
    displayName: errors.name,
    name: errors.username,
    address: errors.walletId,
  }
  function selectWallet(id: string) {
    const wallet = wallets.data?.find((item) => item.id === id)
    if (!wallet || attempt) return
    setWalletAddress('')
    change({ walletId: id, network: wallet.network })
  }
  function chooseProvider(value: NonNullable<Wallet['provider']>) {
    setProvider(value)
    if (selected && !connection.isPending) {
      if (provider === value && selected.connected)
        connection.mutate('disconnect')
      else if (!selected.connected) connection.mutate('connect')
    }
    setReviewed(null)
  }
  return (
    <section className="commerce-page checkout-design">
      <CommerceHeading title="Pagamento" mobileTitle="Pagamento com carteira" />
      <div className="commerce-layout">
        <div className="checkout-forms desktop-only">
          <h1>Perfil do colecionador</h1>
          <WalletFields
            form={form}
            errors={displayErrors}
            change={updateField}
            checkout
          />
          <label className="use-another-wallet">
            <input
              type="checkbox"
              checked={otherWallet}
              onChange={(event) => setOtherWallet(event.target.checked)}
            />
            Usar outra carteira?
          </label>
          {otherWallet && (
            <select
              className="control"
              aria-label="Carteira"
              value={draft.walletId}
              onChange={(event) => selectWallet(event.target.value)}
            >
              <option value="">Selecione uma carteira</option>
              {wallets.data.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.name} · {networkLabels[wallet.network]}
                </option>
              ))}
            </select>
          )}
          <div className="form-field collector-note">
            <label htmlFor="collector-note">
              Observação do colecionador (opcional)
            </label>
            <textarea
              id="collector-note"
              value={draft.collector.note || ''}
              onChange={(event) => collector({ note: event.target.value })}
            />
          </div>
        </div>
        <aside className="checkout-design-summary">
          <div className="mobile-wallets mobile-only">
            <header>
              <h2>Carteira conectada</h2>
              <Link to="/wallets">Trocar carteira</Link>
            </header>
            <div>
              {wallets.data.map((wallet) => (
                <button
                  key={wallet.id}
                  className={`connected-wallet ${draft.walletId === wallet.id ? 'selected' : ''}`}
                  onClick={() => selectWallet(wallet.id)}
                >
                  <span className="wallet-radio" />
                  <span>
                    <strong>
                      {wallet.primary ? 'Principal' : wallet.name}
                    </strong>
                    <small>
                      {wallet.ens
                        ? `${wallet.ens}.eth`
                        : `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`}
                    </small>
                    <small>
                      {wallet.primary ? 'Rede principal' : 'Rede'}{' '}
                      {networkLabels[wallet.network]}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="desktop-only">
            <h2>Seus NFTs</h2>
            <TransactionItems items={(reviewed || cart.data).items} />
            <Link className="checkout-coupon-link" to="/cart">
              Tem um código promocional? Aplique aqui
            </Link>
            <AmountSummary
              totals={reviewed || cart.data}
              totalTestId="checkout-total"
            />
          </div>
          {cart.data.warnings.map((warning) => (
            <p key={warning} role="alert" className="form-error">
              {warning}
            </p>
          ))}
          <h2 className="provider-heading">Carteira e rede</h2>
          <div className="payment-providers">
            {(['walletconnect', 'metamask', 'coinbase'] as const).map(
              (value) => (
                <button
                  type="button"
                  key={value}
                  aria-label={
                    {
                      walletconnect: 'WalletConnect',
                      metamask: 'MetaMask',
                      coinbase: 'Coinbase Wallet',
                    }[value]
                  }
                  className={
                    provider === value && selected?.connected ? 'selected' : ''
                  }
                  aria-pressed={provider === value && !!selected?.connected}
                  disabled={!selected || connection.isPending}
                  onClick={() => chooseProvider(value)}
                >
                  <img
                    className="provider-mark mobile-only"
                    src={`/assets/pdf/provider-${value}.png`}
                    width="40"
                    height="40"
                    alt=""
                  />
                  <span className="provider-radio" />
                  <span>
                    {value === 'walletconnect' ? (
                      <>
                        <span className="desktop-only wallet-chip">
                          METAMASK • WALLETCONNECT • COINBASE
                        </span>
                        <span className="mobile-only">WalletConnect</span>
                      </>
                    ) : value === 'metamask' ? (
                      'MetaMask'
                    ) : (
                      'Coinbase Wallet'
                    )}
                  </span>
                </button>
              ),
            )}
          </div>
          {connection.isError && (
            <p role="alert" className="form-error">
              {errorMessage(connection.error)}
            </p>
          )}
          {errors.walletId && (
            <p role="alert" className="form-error">
              {errors.walletId}
            </p>
          )}
          <span className="sr-only" role="status">
            {selected?.connected
              ? 'Carteira conectada.'
              : 'Carteira desconectada.'}
          </span>
          {review.isError && (
            <p role="alert" className="form-error">
              {errorMessage(review.error)}
            </p>
          )}
          <div className="mobile-only mobile-payment-total">
            Total:{' '}
            <strong data-testid="mobile-payment-total">
              {formatEth((reviewed || cart.data).total)}
            </strong>
          </div>
          <Button
            className="checkout-pay"
            disabled={review.isPending || busy || cart.data.warnings.length > 0}
            onClick={requestReview}
          >
            {review.isPending ? 'Validando valores…' : 'Confirmar compra'}
          </Button>
        </aside>
      </div>
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="purchase-review">
          <DialogTitle>Seus NFTs</DialogTitle>
          <DialogDescription>
            Confira os valores antes de confirmar a compra.
          </DialogDescription>
          {reviewed && (
            <>
              <TransactionItems items={reviewed.items} />
              <AmountSummary totals={reviewed} />
            </>
          )}
          {changed && (
            <p role="alert" className="quote-warning">
              Os valores ou a disponibilidade mudaram. Atualize a revisão e
              confirme novamente.
            </p>
          )}
          {submit.isError && (
            <p role="alert" className="form-error">
              {errorMessage(submit.error)}
            </p>
          )}
          <Button
            disabled={!reviewed || changed || !selected?.connected || busy}
            onClick={purchase}
          >
            Confirmar compra
          </Button>
          {changed && (
            <Button disabled={review.isPending} onClick={requestReview}>
              Atualizar revisão
            </Button>
          )}
          {import.meta.env.VITE_SHOW_TEST_CONTROLS === 'true' && (
            <DemoControls />
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
