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
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
  },
})

const { setupServer } = await import('msw/node')
const { handlers } = await import('../src/mocks/handlers')
const { socketHandlers } = await import('../src/mocks/socket')
const server = setupServer(...handlers, ...socketHandlers)
server.listen({ onUnhandledRequest: 'error' })
// Usa o mesmo cliente de navegador, com WebSocket nativo interceptado em Node.
const { io } = await import(
  '../node_modules/socket.io-client/dist/socket.io.esm.min.js'
)
const { http } = await import('../src/services/http')
const { nftApi } = await import('../src/services/nfts')
const { defaultSearch } = await import('../src/features/catalog/search')
const { multiplyEth } = await import('../src/lib/eth')
const socket = io(origin, { transports: ['websocket'], autoConnect: false })
let timeout: ReturnType<typeof setTimeout> | undefined
try {
  const list = await nftApi.list(defaultSearch)
  assert.equal(list.total, 36)
  assert.equal(list.items.length, 9)
  assert.equal(
    (await nftApi.list({ ...defaultSearch, q: 'Kurio Apes' })).total,
    18,
  )
  const filtered = await nftApi.list({
    ...defaultSearch,
    collection: 'cosmos',
    category: 'photography',
    sort: 'price-desc',
  })
  assert.deepEqual(
    filtered.items.map((item) => item.name),
    [
      'Ivory Baron #088',
      'Luna',
      'Ember',
      'Pulse',
      'Violet Nomad #314',
      'Cosmic Bloom #118',
    ],
  )
  assert.equal(multiplyEth('1.042', 3), '3.126')
  await assert.rejects(nftApi.detail('missing'), (error: unknown) => {
    return (
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      (error.response as { status: number }).status === 404
    )
  })

  const connected = new Promise<void>((resolve, reject) => {
    timeout = setTimeout(
      () => reject(new Error('Socket.IO não conectou')),
      3000,
    )
    socket.once('connect', () => {
      clearTimeout(timeout)
      resolve()
    })
    socket.once('connect_error', reject)
  })
  socket.connect()
  await connected
  const updated = new Promise<{
    version: number
    nft: { editions: { price: string }[] }
  }>((resolve, reject) => {
    timeout = setTimeout(
      () => reject(new Error('Evento nft.updated não chegou')),
      3000,
    )
    socket.once(
      'nft.updated',
      (event: { version: number; nft: { editions: { price: string }[] } }) => {
        clearTimeout(timeout)
        resolve(event)
      },
    )
  })
  await http.patch('/__mock/nfts/nft-01', { price: '0.25' })
  const event = await updated
  assert.equal(event.version, 2)
  assert.equal(event.nft.editions[0].price, '0.25')
  assert.equal((await nftApi.detail('nft-01')).editions[0].price, '0.25')
  console.log(
    'PASS: Axios → MSW REST, filtros/404, precisão ETH e Socket.IO → MSW binding → nft.updated.',
  )
} finally {
  clearTimeout(timeout)
  socket.disconnect()
  server.close()
}
