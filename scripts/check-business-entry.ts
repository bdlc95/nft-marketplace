// Verificação de transporte em Node; não substitui os testes E2E do navegador.
import assert from 'node:assert/strict'
const events = new EventTarget()
const memory = new Map<string, string>()
const origin = 'http://localhost:5173'
Object.assign(globalThis, {
  window: globalThis,
  self: globalThis,
  location: { origin, href: `${origin}/`, protocol: 'http:' },
  document: { baseURI: `${origin}/`, cookie: '' },
  addEventListener: events.addEventListener.bind(events),
  removeEventListener: events.removeEventListener.bind(events),
  dispatchEvent: events.dispatchEvent.bind(events),
  localStorage: {
    removeItem: (key: string) => memory.delete(key),
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
  },
})

const { setupServer } = await import('msw/node')
const { handlers } = await import('../src/mocks/handlers')
const { businessHandlers } = await import('../src/mocks/business')
const { socketHandlers } = await import('../src/mocks/socket')
const server = setupServer(...handlers, ...businessHandlers, ...socketHandlers)
server.listen({ onUnhandledRequest: 'error' })
const { accountApi, commerceApi } = await import('../src/services/commerce')
const { setIdentity } = await import('../src/lib/session')
const { http } = await import('../src/services/http')
const { accounts, orderTimers } = await import('../src/mocks/account-database')
try {
  await commerceApi.add({ nftId: 'nft-01', editionId: 'standard', quantity: 2 })
  const session = await accountApi.login({
    email: 'bruno@example.test',
    password: 'Kurio123!',
  })
  setIdentity({ token: session.token, userId: session.user.id })
  assert.equal((await commerceApi.cart()).items[0].quantity, 2)
  assert.equal(
    accounts.users.some((user) => 'password' in user),
    false,
  )
  await commerceApi.coupon('KURIO10')
  assert.equal((await commerceApi.cart()).total, '2.158')
  await accountApi.walletConnection('user-bruno-wallet', 'connect')
  const quote = await commerceApi.quote('ethereum')
  await http.put('/__mock/config', { scenario: 'order-pending' })
  const payload = {
    quoteId: quote.id,
    walletId: 'user-bruno-wallet',
    collector: {
      name: 'Pessoa Teste',
      email: 'pessoa@example.test',
      phone: '11987654321',
      acceptTerms: true,
    },
  }
  const first = await commerceApi.order(payload, 'attempt-test-0001')
  const same = await commerceApi.order(payload, 'attempt-test-0001')
  assert.equal(first.id, same.id)
  await assert.rejects(
    commerceApi.order(
      { ...payload, collector: { ...payload.collector, name: 'Outro Nome' } },
      'attempt-test-0001',
    ),
    (error: unknown) =>
      (error as { response: { status: number } }).response.status === 409,
  )
  await commerceApi.add({ nftId: 'nft-01', editionId: 'standard', quantity: 1 })
  await http.post('/__mock/orders/settle', { status: 'confirmed' })
  assert.equal((await commerceApi.cart()).items[0].quantity, 1)
  const confirmed = await commerceApi.getOrder(first.id)
  await http.patch('/__mock/nfts/nft-01', { price: '0.25' })
  assert.equal(
    (await commerceApi.getOrder(first.id)).quote.total,
    confirmed.quote.total,
  )
  const fresh = await commerceApi.quote('ethereum')
  await http.post('/__mock/fee', {})
  await assert.rejects(
    commerceApi.order({ ...payload, quoteId: fresh.id }, 'attempt-test-0002'),
    (error: unknown) =>
      (error as { response: { data: { code: string } } }).response.data.code ===
      'QUOTE_CHANGED',
  )
  await accountApi.logout()
  setIdentity({ token: '', userId: '' })
  const other = await accountApi.login({
    email: 'jade@example.test',
    password: 'Kurio123!',
  })
  setIdentity({ token: other.token, userId: other.user.id })
  assert.equal((await commerceApi.cart()).items.length, 0)
  await assert.rejects(
    commerceApi.getOrder(first.id),
    (error: unknown) =>
      (error as { response: { status: number } }).response.status === 403,
  )
  console.log(
    'PASS: contas com PBKDF2, merge, cupom/wei, idempotência/conflito, snapshot, retirada exata, cotação alterada e isolamento/403 via Axios/MSW.',
  )
} finally {
  for (const timer of orderTimers.values()) clearTimeout(timer)
  server.close()
}
