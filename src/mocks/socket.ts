import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/types/contracts'
const endpoint = new URL('/', window.location.origin)
endpoint.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
const connection = ws.link(endpoint.toString())
type MockSocket = ReturnType<typeof toSocketIo>
const clients = new Map<MockSocket, string>()
let resolveUser: (token: string) => string | null = () => null
let blockedUntil = 0
export function configureSocketAuth(resolve: typeof resolveUser) {
  resolveUser = resolve
}
export function broadcastNft(event: NftUpdatedEvent) {
  for (const socket of clients.keys()) socket.client.emit('nft.updated', event)
}
export function broadcastOrder(event: OrderUpdatedEvent) {
  // Nunca transmite um pedido privado a um socket de outra sessão.
  for (const [socket, token] of clients)
    if (resolveUser(token) === event.userId)
      socket.client.emit('order.updated', event)
}
export function disconnectSockets(userId: string | null) {
  blockedUntil = Date.now() + 2000
  for (const [socket, token] of clients)
    if (!userId || resolveUser(token) === userId) socket.rawClient.close()
}
export const socketHandlers = [
  connection.addEventListener('connection', (raw) => {
    if (Date.now() < blockedUntil) {
      raw.client.close()
      return
    }
    const socket = toSocketIo(raw)
    clients.set(socket, '')
    socket.client.on(
      'session.subscribe',
      (_event, payload: { token?: string }) => {
        clients.set(
          socket,
          typeof payload?.token === 'string' && resolveUser(payload.token)
            ? payload.token
            : '',
        )
      },
    )
    const heartbeat = window.setInterval(() => raw.client.send('2'), 10_000)
    raw.client.addEventListener('close', () => {
      window.clearInterval(heartbeat)
      clients.delete(socket)
    })
  }),
]
