import { delay, http as msw, HttpResponse, type PathParams } from 'msw'
import {
  accounts,
  createDefaultWallet,
  ensureAccounts,
  orderTimers,
  passwordHash,
  publicUser,
  saveAccounts,
  type StoredOrder,
} from './account-database'
import { config, nfts, persist } from './database'
import { mockNetwork } from './handlers'
import {
  broadcastNft,
  broadcastOrder,
  configureSocketAuth,
  disconnectSockets,
} from './socket'
import { ethToWei, weiToEth } from '@/lib/eth'
import type {
  Cart,
  CartLine,
  Collector,
  Network,
  Order,
  OrderRequest,
  Quote,
  RegisterInput,
  Session,
  Wallet,
} from '@/types/contracts'

class DomainError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message)
  }
}
const fail = (
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
): never => {
  throw new DomainError(status, code, message, fields)
}
const fieldsError = (fields: Record<string, string>) =>
  fail(422, 'VALIDATION', 'Revise os campos indicados.', fields)
const tokenOf = (request: Request) =>
  request.headers.get('authorization')?.replace(/^Bearer /, '') || ''
function userForToken(token: string): string | null {
  const session = accounts.sessions[token]
  return session && session.expiresAt > Date.now() ? session.userId : null
}
configureSocketAuth(userForToken)
function userId(request: Request) {
  const id = userForToken(tokenOf(request))
  if (!id)
    return fail(
      401,
      'SESSION_EXPIRED',
      'Sua sessão expirou. Entre novamente para continuar.',
    )
  return id
}
function owner(request: Request) {
  return tokenOf(request) ? userId(request) : 'guest'
}
const userById = (id: string) =>
  accounts.users.find((user) => user.id === id) ??
  fail(404, 'NOT_FOUND', 'Conta não encontrada.')
const emailValid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) &&
  value.length <= 254
const text = (value: unknown, min = 2, max = 80): value is string =>
  typeof value === 'string' &&
  value.trim().length >= min &&
  value.trim().length <= max
const phoneValid = (value: unknown): value is string =>
  typeof value === 'string' && /^\+?[\d\s()-]{10,18}$/.test(value)
const passwordValid = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length >= 8 &&
  value.length <= 128 &&
  /[a-z]/.test(value) &&
  /[A-Z]/.test(value) &&
  /\d/.test(value)
const networks: Network[] = ['ethereum', 'polygon', 'solana']
const isNetwork = (value: unknown): value is Network =>
  networks.includes(value as Network)
const cartFor = (id: string) =>
  (accounts.carts[id] ??= { revision: 1, coupon: '', items: [] })
const walletFor = (id: string, walletId: string) =>
  accounts.wallets[id]?.find((wallet) => wallet.id === walletId) ??
  fail(404, 'NOT_FOUND', 'Carteira não encontrada.')
function editionFor(line: Pick<CartLine, 'nftId' | 'editionId'>) {
  const nft =
    nfts.find((item) => item.id === line.nftId) ??
    fail(404, 'NOT_FOUND', 'NFT não encontrado.')
  const edition =
    nft.editions.find((item) => item.id === line.editionId) ??
    fail(404, 'NOT_FOUND', 'Edição não encontrada.')
  return { nft, edition }
}
function validateQuantity(quantity: unknown, available: number) {
  if (!Number.isSafeInteger(quantity) || Number(quantity) < 1)
    return fieldsError({
      quantity: 'Informe uma quantidade inteira maior que zero.',
    })
  if (Number(quantity) > available)
    return fail(
      409,
      'STOCK_CONFLICT',
      `Há apenas ${available} unidade(s) disponível(is).`,
      { quantity: 'A quantidade excede o estoque.' },
    )
}
function couponValid(code: string) {
  if (code === 'EXPIRADO' || (accounts.expiredCoupons ?? []).includes(code))
    return fail(422, 'COUPON_EXPIRED', 'Este cupom expirou.', {
      coupon: 'Cupom expirado.',
    })
  if (code && code !== 'KURIO10')
    return fail(422, 'COUPON_INVALID', 'Cupom inválido.', {
      coupon: 'Use um código válido.',
    })
}
function cartView(id: string, network: Network = 'ethereum'): Cart {
  const cart = cartFor(id)
  const warnings: string[] = []
  const items = cart.items.map((line) => {
    const { nft, edition } = editionFor(line)
    if (line.quantity > edition.available)
      warnings.push(
        `${nft.name}: ajuste a quantidade para ${edition.available}.`,
      )
    return {
      ...line,
      key: `${line.nftId}:${line.editionId}`,
      name: nft.name,
      image: nft.image,
      edition: edition.name,
      unitPrice: edition.price,
      subtotal: weiToEth(ethToWei(edition.price) * BigInt(line.quantity)),
      available: edition.available,
      version: nft.version,
      token: nft.token,
    }
  })
  let validCoupon = true
  try {
    couponValid(cart.coupon)
  } catch (error) {
    validCoupon = false
    warnings.push(
      error instanceof Error ? error.message : 'Cupom indisponível.',
    )
  }
  const subtotal = items.reduce(
    (sum, item) => sum + ethToWei(item.subtotal),
    0n,
  )
  const discount = cart.coupon && validCoupon ? subtotal / 10n : 0n
  const fee = items.length
    ? ethToWei(
        accounts.feeOverride ||
          { ethereum: '0.016', polygon: '0.001', solana: '0.0005' }[network],
      )
    : 0n
  return {
    revision: cart.revision,
    coupon: cart.coupon,
    items,
    warnings,
    subtotal: weiToEth(subtotal),
    discount: weiToEth(discount),
    networkFee: weiToEth(fee),
    total: weiToEth(subtotal - discount + fee),
  }
}
function quoteFingerprint(cart: Cart, network: Network) {
  return JSON.stringify({
    revision: cart.revision,
    coupon: cart.coupon,
    network,
    totals: [cart.subtotal, cart.discount, cart.networkFee, cart.total],
    items: cart.items.map((item) => [
      item.key,
      item.quantity,
      item.unitPrice,
      item.available,
      item.version,
    ]),
    warnings: cart.warnings,
  })
}
function makeQuote(id: string, network: Network): Quote {
  const cart = cartView(id, network)
  if (!cart.items.length)
    return fail(409, 'EMPTY_CART', 'Seu carrinho está vazio.')
  if (cart.warnings.length)
    return fail(409, 'CART_CONFLICT', cart.warnings.join(' '))
  const quote: Quote = {
    ...cart,
    id: crypto.randomUUID(),
    ownerId: id,
    network,
    expiresAt: Date.now() + 5 * 60_000,
    fingerprint: quoteFingerprint(cart, network),
  }
  accounts.quotes[quote.id] = structuredClone(quote)
  saveAccounts()
  return quote
}
function emitNft(id: string) {
  const nft = nfts.find((item) => item.id === id)!
  broadcastNft({
    eventId: `nft-${id}-v${nft.version}`,
    resourceId: id,
    version: nft.version,
    nft: structuredClone(nft),
  })
}
function orderPublic(order: StoredOrder): Order {
  const {
    id,
    ownerId,
    status,
    version,
    createdAt,
    transaction,
    reason,
    quote,
    collector,
    wallet,
  } = order
  return structuredClone({
    id,
    ownerId,
    status,
    version,
    createdAt,
    transaction,
    reason,
    quote,
    collector,
    wallet,
  })
}
function emitOrder(order: StoredOrder) {
  broadcastOrder({
    eventId: `order-${order.id}-v${order.version}`,
    resourceId: order.id,
    userId: order.ownerId,
    version: order.version,
    order: orderPublic(order),
  })
}
function finishOrder(order: StoredOrder, decision: 'confirmed' | 'rejected') {
  if (order.status !== 'pending') return
  order.status = decision
  order.version += 1
  order.settleAt = null
  if (decision === 'confirmed') {
    order.transaction = `0x${order.id.replace(/\D/g, '').padStart(64, '0')}`
    // Remove apenas as quantidades do snapshot; inclusões posteriores sobrevivem.
    const cart = cartFor(order.ownerId)
    for (const bought of order.quote.items) {
      const line = cart.items.find(
        (item) =>
          item.nftId === bought.nftId && item.editionId === bought.editionId,
      )
      if (line) line.quantity = Math.max(0, line.quantity - bought.quantity)
    }
    cart.items = cart.items.filter((item) => item.quantity > 0)
    cart.revision += 1
    if (!cart.items.length) cart.coupon = ''
  } else {
    order.reason =
      'Pagamento recusado pela carteira. Nenhuma compra foi confirmada.'
    if (order.reserved)
      for (const item of order.quote.items) {
        const { nft, edition } = editionFor(item)
        edition.available += item.quantity
        nft.version += 1
        emitNft(nft.id)
      }
  }
  order.reserved = false
  persist()
  saveAccounts()
  emitOrder(order)
  const timer = orderTimers.get(order.id)
  if (timer) clearTimeout(timer)
  orderTimers.delete(order.id)
}
function scheduleOrder(order: StoredOrder) {
  if (
    order.status !== 'pending' ||
    order.settleAt === null ||
    orderTimers.has(order.id)
  )
    return
  if (order.settleAt <= Date.now()) {
    finishOrder(order, order.decision === 'rejected' ? 'rejected' : 'confirmed')
    return
  }
  orderTimers.set(
    order.id,
    setTimeout(
      () =>
        finishOrder(
          order,
          order.decision === 'rejected' ? 'rejected' : 'confirmed',
        ),
      order.settleAt - Date.now(),
    ),
  )
}
function findOrder(id: string, uid: string) {
  const order =
    accounts.orders[id] ?? fail(404, 'NOT_FOUND', 'Pedido não encontrado.')
  if (order.ownerId !== uid)
    return fail(
      403,
      'FORBIDDEN',
      'Você não tem permissão para acessar este pedido.',
    )
  scheduleOrder(order)
  return order
}
function collectorErrors(data: Collector) {
  const errors: Record<string, string> = {}
  if (!text(data.name)) errors.name = 'Informe seu nome completo.'
  if (!emailValid(data.email)) errors.email = 'Informe um e-mail válido.'
  if (data.phone && !phoneValid(data.phone))
    errors.phone = 'Informe um telefone válido.'
  for (const key of ['username', 'profileName', 'referralCode', 'ens'] as const)
    if (data[key] !== undefined && !text(data[key], 2, 40))
      errors[key] = 'Preencha este campo.'
  if (data.acceptTerms !== true)
    errors.acceptTerms = 'Aceite os termos para continuar.'
  return errors
}
function createOrder(
  request: Request,
  input: OrderRequest,
): { order: Order; created: boolean } {
  const uid = userId(request)
  const key = request.headers.get('idempotency-key') || ''
  if (!/^[a-z0-9_-]{8,100}$/i.test(key))
    return fieldsError({ idempotency: 'Chave de tentativa inválida.' })
  if (
    input.walletProvider &&
    !['metamask', 'walletconnect', 'coinbase'].includes(input.walletProvider)
  )
    return fieldsError({ walletProvider: 'Selecione uma carteira válida.' })
  const fingerprint = JSON.stringify({
    quoteId: input.quoteId,
    walletId: input.walletId,
    collector: input.collector,
    walletProvider: input.walletProvider,
  })
  const previous = accounts.attempts[`${uid}:${key}`]
  if (previous) {
    if (previous.fingerprint !== fingerprint)
      return fail(
        409,
        'IDEMPOTENCY_CONFLICT',
        'Esta chave já foi usada com outros dados.',
      )
    return {
      order: orderPublic(findOrder(previous.orderId, uid)),
      created: false,
    }
  }
  const quote =
    accounts.quotes[input.quoteId] ??
    fail(409, 'QUOTE_MISSING', 'Revise o carrinho antes de comprar.')
  if (quote.ownerId !== uid)
    return fail(403, 'FORBIDDEN', 'Cotação pertence a outra conta.')
  const current = cartView(uid, quote.network)
  if (current.warnings.length)
    return fail(409, 'CART_CONFLICT', current.warnings.join(' '))
  if (
    quote.expiresAt <= Date.now() ||
    quote.fingerprint !== quoteFingerprint(current, quote.network)
  ) {
    const replacement = makeQuote(uid, quote.network)
    throw new QuoteChanged(replacement)
  }
  const errors = collectorErrors(input.collector || ({} as Collector))
  if (Object.keys(errors).length) return fieldsError(errors)
  const wallet = walletFor(uid, input.walletId)
  if (wallet.network !== quote.network)
    return fieldsError({
      walletId: 'Selecione uma carteira da rede escolhida.',
    })
  if (!wallet.connected)
    return fail(
      409,
      'WALLET_DISCONNECTED',
      'Conecte sua carteira antes de comprar.',
    )
  const id = `ORD-${String(Object.keys(accounts.orders).length + 1).padStart(4, '0')}`
  const order: StoredOrder = {
    id,
    ownerId: uid,
    status: 'pending',
    version: 1,
    createdAt: new Date().toISOString(),
    transaction: '',
    reason: '',
    quote: structuredClone(quote),
    collector: structuredClone(input.collector),
    wallet: {
      ...structuredClone(wallet),
      provider: input.walletProvider || wallet.provider || 'metamask',
    },
    settleAt: config().scenario === 'order-pending' ? null : Date.now() + 1800,
    decision:
      config().scenario === 'payment-rejected' ? 'rejected' : 'confirmed',
    reserved: true,
  }
  // Reserva atômica no mock: pedidos simultâneos não consomem o mesmo estoque.
  for (const item of quote.items) {
    const { nft, edition } = editionFor(item)
    edition.available -= item.quantity
    nft.version += 1
  }
  accounts.orders[id] = order
  accounts.attempts[`${uid}:${key}`] = { fingerprint, orderId: id }
  persist()
  saveAccounts()
  for (const item of quote.items) emitNft(item.nftId)
  scheduleOrder(order)
  emitOrder(order)
  return { order: orderPublic(order), created: true }
}
class QuoteChanged extends DomainError {
  constructor(public quote: Quote) {
    super(
      409,
      'QUOTE_CHANGED',
      'Preço, estoque, cupom ou taxa mudaram. Revise os novos valores e confirme novamente.',
    )
  }
}
async function login(
  request: Request,
  email: unknown,
  password: unknown,
): Promise<Session> {
  const user = accounts.users.find(
    (item) =>
      typeof email === 'string' &&
      item.email.toLowerCase() === email.trim().toLowerCase(),
  )
  if (
    !user ||
    typeof password !== 'string' ||
    (await passwordHash(password, user.salt)) !== user.passwordHash
  )
    return fail(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
  return issueSession(request, user)
}
function issueSession(
  request: Request,
  user: (typeof accounts.users)[number],
): Session {
  const previous = tokenOf(request)
  if (previous) delete accounts.sessions[previous]
  const cart = cartFor(user.id)
  const guest = cartFor('guest')
  let adjusted = false
  for (const item of guest.items) {
    const { edition } = editionFor(item)
    const line = cart.items.find(
      (entry) =>
        entry.nftId === item.nftId && entry.editionId === item.editionId,
    )
    const quantity = Math.min(
      edition.available,
      item.quantity + (line?.quantity || 0),
    )
    if (quantity !== item.quantity + (line?.quantity || 0)) adjusted = true
    if (line) line.quantity = quantity
    else if (quantity > 0) cart.items.push({ ...item, quantity })
  }
  cart.items = cart.items.filter((line) => line.quantity > 0)
  cart.revision += 1
  if (!cart.coupon && guest.coupon) {
    try {
      couponValid(guest.coupon)
      cart.coupon = guest.coupon
    } catch {
      adjusted = true
    }
  }
  accounts.carts.guest = { revision: guest.revision + 1, coupon: '', items: [] }
  const token = crypto.randomUUID()
  const expiresAt = Date.now() + 30 * 60_000
  accounts.sessions[token] = { userId: user.id, expiresAt }
  saveAccounts()
  return {
    token,
    expiresAt,
    user: publicUser(user),
    cartNotice: adjusted
      ? 'Carrinho mesclado com ajustes para respeitar o estoque.'
      : '',
  }
}
function validateWallet(body: Partial<Wallet>) {
  const errors: Record<string, string> = {}
  if (!text(body.name, 2, 40)) errors.name = 'Use um nome de 2 a 40 caracteres.'
  if (!isNetwork(body.network)) errors.network = 'Selecione uma rede válida.'
  const validAddress =
    typeof body.address === 'string' &&
    (body.network === 'solana'
      ? /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(body.address)
      : /^0x[0-9a-fA-F]{40}$/.test(body.address))
  if (!validAddress) errors.address = 'Endereço inválido para esta rede.'
  if (
    body.provider &&
    !['metamask', 'walletconnect', 'coinbase'].includes(body.provider)
  )
    errors.provider = 'Selecione uma carteira.'
  for (const key of [
    'displayName',
    'profileName',
    'referralCode',
    'ens',
  ] as const)
    if (body[key] !== undefined && !text(body[key], 2, 40))
      errors[key] = 'Preencha este campo.'
  if (body.email !== undefined && !emailValid(body.email))
    errors.email = 'Informe um e-mail válido.'
  if (Object.keys(errors).length) fieldsError(errors)
}
type Body = Record<string, unknown>
type Context = { request: Request; params: PathParams; body: Body }
function endpoint(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  handler: (ctx: Context) => unknown | Promise<unknown>,
  controlled = false,
) {
  return msw[method](`/api${path}`, async ({ request, params }) => {
    const anonymousRead =
      !tokenOf(request) &&
      (path === '/auth/session' || path.startsWith('/cart'))
    // Visitantes não precisam calcular os hashes das duas contas fictícias.
    if (!anonymousRead) await ensureAccounts()
    if (!controlled) {
      const failure = await mockNetwork(request.url)
      if (failure) return failure
    }
    try {
      const body = ['GET', 'DELETE'].includes(request.method)
        ? {}
        : ((await request.json().catch(() => ({}))) as Body)
      const result = await handler({ request, params, body })
      return HttpResponse.json(result ?? { ok: true })
    } catch (error) {
      if (error instanceof DomainError)
        return HttpResponse.json(
          {
            code: error.code,
            message: error.message,
            fields: error.fields,
            ...(error instanceof QuoteChanged ? { quote: error.quote } : {}),
          },
          { status: error.status },
        )
      console.error('Falha no mock de negócio', error)
      return HttpResponse.json(
        { code: 'INTERNAL', message: 'Falha interna no servidor.' },
        { status: 500 },
      )
    }
  })
}
export const businessHandlers = [
  endpoint('post', '/auth/login', ({ request, body }) =>
    login(request, body.email, body.password),
  ),
  // Os provedores são simulados na rede, como as demais integrações do desafio.
  endpoint('post', '/auth/social', async ({ request, body }) => {
    if (body.provider !== 'google' && body.provider !== 'facebook')
      return fieldsError({ provider: 'Selecione um provedor válido.' })
    const email = `${body.provider}@example.test`
    let user = accounts.users.find((item) => item.email === email)
    if (!user) {
      const id = `user-${body.provider}`
      const salt = crypto.randomUUID()
      user = {
        id,
        email,
        name:
          body.provider === 'google'
            ? 'Colecionador Google'
            : 'Colecionador Facebook',
        phone: '',
        avatar: '',
        username: body.provider,
        walletAlias: 'Principal',
        ens: body.provider,
        salt,
        passwordHash: await passwordHash(crypto.randomUUID(), salt),
      }
      accounts.users.push(user)
      accounts.favorites[id] = []
    }
    if (!accounts.wallets[user.id]?.length)
      accounts.wallets[user.id] = [createDefaultWallet(user.id)]
    return issueSession(request, user)
  }),
  endpoint('post', '/auth/register', async ({ request, body }) => {
    const input = body as unknown as RegisterInput
    const errors: Record<string, string> = {}
    if (!text(input.name)) errors.name = 'Informe um nome de 2 a 80 caracteres.'
    if (!emailValid(input.email)) errors.email = 'Informe um e-mail válido.'
    if (!passwordValid(input.password))
      errors.password =
        'Use ao menos 8 caracteres, maiúscula, minúscula e número.'
    if (input.password !== input.confirmPassword)
      errors.confirmPassword = 'As senhas não coincidem.'
    if (Object.keys(errors).length) return fieldsError(errors)
    if (
      accounts.users.some(
        (user) => user.email.toLowerCase() === input.email.trim().toLowerCase(),
      )
    )
      return fail(409, 'EMAIL_CONFLICT', 'Este e-mail já está cadastrado.', {
        email: 'E-mail já cadastrado.',
      })
    const id = crypto.randomUUID()
    const salt = crypto.randomUUID()
    accounts.users.push({
      id,
      name: input.name.trim(),
      username:
        input.name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, '')
          .slice(0, 40) || 'colecionador',
      ens:
        input.name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '')
          .slice(0, 40) || 'colecionador',
      email: input.email.trim().toLowerCase(),
      phone: '',
      avatar: '',
      salt,
      passwordHash: await passwordHash(input.password, salt),
    })
    accounts.wallets[id] = []
    accounts.favorites[id] = []
    saveAccounts()
    return login(request, input.email, input.password)
  }),
  endpoint('get', '/auth/session', ({ request }) => {
    if (!tokenOf(request)) return { user: null }
    const uid = userId(request)
    const session = accounts.sessions[tokenOf(request)]
    return {
      token: tokenOf(request),
      user: publicUser(userById(uid)),
      expiresAt: session.expiresAt,
    }
  }),
  endpoint('post', '/auth/logout', ({ request }) => {
    delete accounts.sessions[tokenOf(request)]
    saveAccounts()
    return { ok: true }
  }),
  endpoint('get', '/profile', ({ request }) =>
    publicUser(userById(userId(request))),
  ),
  endpoint('patch', '/profile', ({ request, body }) => {
    const user = userById(userId(request))
    const errors: Record<string, string> = {}
    if (!text(body.name)) errors.name = 'Informe um nome válido.'
    if (!emailValid(body.email)) errors.email = 'Informe um e-mail válido.'
    if (body.phone && !phoneValid(body.phone))
      errors.phone = 'Informe um telefone válido.'
    for (const field of ['username', 'walletAlias', 'ens'] as const) {
      if (body[field] !== undefined && !text(body[field], 2, 40))
        errors[field] = 'Informe um valor de 2 a 40 caracteres.'
    }
    if (
      typeof body.username === 'string' &&
      !/^[a-zA-Z0-9_.-]{2,40}$/.test(body.username)
    )
      errors.username = 'Use letras, números, ponto, traço ou sublinhado.'
    if (typeof body.ens === 'string' && !/^[a-zA-Z0-9-]{2,40}$/.test(body.ens))
      errors.ens = 'Informe o nome ENS sem o sufixo .eth.'
    if (
      typeof body.avatar !== 'string' ||
      body.avatar.length > 700_000 ||
      (body.avatar &&
        !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(
          body.avatar,
        ))
    )
      errors.avatar = 'Use PNG, JPEG ou WebP de até 500 KB.'
    if (Object.keys(errors).length) return fieldsError(errors)
    if (
      accounts.users.some(
        (item) =>
          item.id !== user.id &&
          item.email.toLowerCase() === String(body.email).trim().toLowerCase(),
      )
    )
      return fail(409, 'EMAIL_CONFLICT', 'E-mail já cadastrado.', {
        email: 'Este e-mail pertence a outra conta.',
      })
    if (config().scenario === 'validation-error')
      return fieldsError({
        name: 'Alteração recusada.',
      })
    Object.assign(user, {
      name: String(body.name).trim(),
      email: String(body.email).trim().toLowerCase(),
      phone: body.phone,
      avatar: body.avatar,
      username: body.username ?? user.username,
      walletAlias: body.walletAlias ?? user.walletAlias,
      ens: body.ens ?? user.ens,
    })
    saveAccounts()
    return publicUser(user)
  }),
  endpoint('put', '/profile/password', async ({ request, body }) => {
    const uid = userId(request)
    const user = userById(uid)
    const errors: Record<string, string> = {}
    if (
      typeof body.currentPassword !== 'string' ||
      (await passwordHash(body.currentPassword, user.salt)) !==
        user.passwordHash
    )
      errors.currentPassword = 'Senha atual incorreta.'
    if (!passwordValid(body.newPassword))
      errors.newPassword = 'Use 8 caracteres, maiúscula, minúscula e número.'
    if (body.newPassword !== body.confirmPassword)
      errors.confirmPassword = 'As senhas não coincidem.'
    if (Object.keys(errors).length) return fieldsError(errors)
    user.salt = crypto.randomUUID()
    user.passwordHash = await passwordHash(String(body.newPassword), user.salt)
    for (const [token, session] of Object.entries(accounts.sessions))
      if (session.userId === uid && token !== tokenOf(request))
        delete accounts.sessions[token]
    saveAccounts()
    return { ok: true }
  }),
  endpoint(
    'get',
    '/favorites',
    ({ request }) => accounts.favorites[userId(request)] ?? [],
  ),
  endpoint('put', '/favorites/:nftId', ({ request, params }) => {
    const uid = userId(request)
    editionFor({ nftId: String(params.nftId), editionId: 'standard' })
    if (config().scenario === 'favorite-error')
      return fail(
        503,
        'FAVORITE_FAILURE',
        'Não foi possível salvar o favorito. Tente novamente.',
      )
    const list = (accounts.favorites[uid] ??= [])
    if (!list.includes(String(params.nftId))) list.push(String(params.nftId))
    saveAccounts()
    return list
  }),
  endpoint('delete', '/favorites/:nftId', ({ request, params }) => {
    const uid = userId(request)
    if (config().scenario === 'favorite-error')
      return fail(
        503,
        'FAVORITE_FAILURE',
        'Não foi possível remover o favorito.',
      )
    accounts.favorites[uid] = (accounts.favorites[uid] ?? []).filter(
      (id) => id !== params.nftId,
    )
    saveAccounts()
    return accounts.favorites[uid]
  }),
  endpoint('get', '/cart', ({ request }) =>
    cartView(
      owner(request),
      isNetwork(new URL(request.url).searchParams.get('network'))
        ? (new URL(request.url).searchParams.get('network') as Network)
        : 'ethereum',
    ),
  ),
  endpoint('post', '/cart/items', ({ request, body }) => {
    const uid = owner(request)
    const line = body as unknown as CartLine
    const { edition } = editionFor(line)
    const cart = cartFor(uid)
    const previous = cart.items.find(
      (item) => item.nftId === line.nftId && item.editionId === line.editionId,
    )
    validateQuantity(line.quantity, edition.available)
    const quantity = line.quantity + (previous?.quantity || 0)
    validateQuantity(quantity, edition.available)
    if (previous) previous.quantity = quantity
    else cart.items.push({ ...line, quantity })
    cart.revision += 1
    saveAccounts()
    return cartView(uid)
  }),
  endpoint(
    'patch',
    '/cart/items/:nftId/:editionId',
    ({ request, params, body }) => {
      const uid = owner(request)
      const cart = cartFor(uid)
      const line =
        cart.items.find(
          (item) =>
            item.nftId === params.nftId && item.editionId === params.editionId,
        ) ?? fail(404, 'NOT_FOUND', 'Item não encontrado no carrinho.')
      validateQuantity(body.quantity, editionFor(line).edition.available)
      line.quantity = Number(body.quantity)
      cart.revision += 1
      saveAccounts()
      return cartView(uid)
    },
  ),
  endpoint('delete', '/cart/items/:nftId/:editionId', ({ request, params }) => {
    const uid = owner(request)
    const cart = cartFor(uid)
    cart.items = cart.items.filter(
      (item) =>
        item.nftId !== params.nftId || item.editionId !== params.editionId,
    )
    cart.revision += 1
    saveAccounts()
    return cartView(uid)
  }),
  endpoint('put', '/cart/coupon', ({ request, body }) => {
    const uid = owner(request)
    const code = String(body.code || '')
      .trim()
      .toUpperCase()
    couponValid(code)
    const cart = cartFor(uid)
    cart.coupon = code
    cart.revision += 1
    saveAccounts()
    return cartView(uid)
  }),
  endpoint('post', '/quotes', ({ request, body }) => {
    if (!isNetwork(body.network))
      return fieldsError({ network: 'Selecione uma rede válida.' })
    return makeQuote(userId(request), body.network)
  }),
  endpoint('post', '/orders', async ({ request, body }) => {
    const result = createOrder(request, body as unknown as OrderRequest)
    if (result.created && config().scenario === 'order-timeout')
      await delay(6500)
    return result.order
  }),
  endpoint('get', '/orders/by-attempt/:key', ({ request, params }) => {
    const uid = userId(request)
    const attempt =
      accounts.attempts[`${uid}:${params.key}`] ??
      fail(404, 'NOT_FOUND', 'Esta tentativa ainda não criou um pedido.')
    return orderPublic(findOrder(attempt.orderId, uid))
  }),
  endpoint('get', '/orders', ({ request }) => {
    const uid = userId(request)
    return Object.values(accounts.orders)
      .filter((order) => order.ownerId === uid)
      .map((order) => orderPublic(findOrder(order.id, uid)))
  }),
  endpoint('get', '/orders/:id', ({ request, params }) =>
    orderPublic(findOrder(String(params.id), userId(request))),
  ),
  endpoint(
    'get',
    '/wallets',
    ({ request }) => accounts.wallets[userId(request)] ?? [],
  ),
  endpoint('post', '/wallets', ({ request, body }) =>
    saveWallet(userId(request), body as Partial<Wallet>),
  ),
  endpoint('patch', '/wallets/:id', ({ request, params, body }) =>
    saveWallet(userId(request), body as Partial<Wallet>, String(params.id)),
  ),
  endpoint('post', '/wallets/:id/connection', ({ request, params, body }) => {
    const uid = userId(request)
    const wallet = walletFor(uid, String(params.id))
    if (
      body.action === 'refuse' ||
      (body.action === 'connect' && config().scenario === 'wallet-refused')
    ) {
      wallet.connected = false
      saveAccounts()
      return fail(409, 'WALLET_REFUSED', 'Conexão recusada pela carteira.')
    }
    if (!['connect', 'disconnect'].includes(String(body.action)))
      return fieldsError({ action: 'Ação inválida.' })
    wallet.connected = body.action === 'connect'
    saveAccounts()
    return wallet
  }),
  endpoint(
    'post',
    '/__mock/session/expire',
    ({ request }) => {
      const session = accounts.sessions[tokenOf(request)]
      if (session) session.expiresAt = 0
      saveAccounts()
      return { expired: true }
    },
    true,
  ),
  endpoint(
    'post',
    '/__mock/coupon/expire',
    () => {
      accounts.expiredCoupons ??= []
      if (!accounts.expiredCoupons.includes('KURIO10'))
        accounts.expiredCoupons.push('KURIO10')
      saveAccounts()
      return { expired: true }
    },
    true,
  ),
  endpoint(
    'post',
    '/__mock/fee',
    () => {
      accounts.feeOverride = '0.009'
      saveAccounts()
      return { updated: true }
    },
    true,
  ),
  endpoint(
    'post',
    '/__mock/socket/disconnect',
    ({ request }) => {
      disconnectSockets(userForToken(tokenOf(request)))
      return { disconnected: true }
    },
    true,
  ),
  endpoint(
    'post',
    '/__mock/orders/settle',
    ({ request, body }) => {
      const uid = userId(request)
      const order =
        Object.values(accounts.orders)
          .filter((item) => item.ownerId === uid && item.status === 'pending')
          .at(-1) ?? fail(404, 'NOT_FOUND', 'Não há pedido pendente.')
      if (!['confirmed', 'rejected'].includes(String(body.status)))
        return fieldsError({ status: 'Estado inválido.' })
      finishOrder(order, body.status as 'confirmed' | 'rejected')
      return orderPublic(order)
    },
    true,
  ),
  endpoint(
    'post',
    '/__mock/orders/replay',
    ({ request, body }) => {
      const uid = userId(request)
      const source =
        Object.values(accounts.orders)
          .filter((item) => item.ownerId === uid)
          .at(-1) ?? fail(404, 'NOT_FOUND', 'Não há pedido para repetir.')
      const order = orderPublic(source)
      if (body.mode === 'old') {
        order.version = Math.max(0, order.version - 1)
        order.status = 'pending'
      }
      broadcastOrder({
        eventId: `order-${order.id}-v${order.version}`,
        resourceId: order.id,
        userId: uid,
        version: order.version,
        order,
      })
      return { emitted: true }
    },
    true,
  ),
]
function saveWallet(
  uid: string,
  body: Partial<Wallet>,
  existingId?: string,
): Wallet[] {
  validateWallet(body)
  const list = (accounts.wallets[uid] ??= [])
  const original = existingId ? walletFor(uid, existingId) : undefined
  if (
    list.some(
      (wallet) =>
        wallet.id !== existingId &&
        wallet.network === body.network &&
        (wallet.network === 'solana'
          ? wallet.address
          : wallet.address.toLowerCase()) ===
          (body.network === 'solana'
            ? String(body.address)
            : String(body.address).toLowerCase()),
    )
  )
    return fail(409, 'WALLET_CONFLICT', 'Esta carteira já está cadastrada.', {
      address: 'Endereço já cadastrado.',
    })
  const wallet: Wallet = {
    id: existingId || crypto.randomUUID(),
    name: String(body.name).trim(),
    address: String(body.address).trim(),
    network: body.network as Network,
    primary: body.primary === true || !list.length,
    connected:
      original &&
      original.address === body.address &&
      original.network === body.network
        ? original.connected
        : false,
    provider: body.provider || original?.provider || 'metamask',
    displayName: body.displayName ?? original?.displayName,
    profileName: body.profileName ?? original?.profileName,
    email: body.email ?? original?.email,
    ens: body.ens ?? original?.ens,
    referralCode: body.referralCode ?? original?.referralCode,
    secondary: body.secondary ?? original?.secondary,
  }
  if (wallet.primary) for (const item of list) item.primary = false
  if (original) Object.assign(original, wallet)
  else list.push(wallet)
  if (!list.some((item) => item.primary)) list[0].primary = true
  saveAccounts()
  return list
}
