import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import { nftKeys } from '@/features/catalog/queries'
import { privateKeys } from '@/features/account/queries'
import { useIdentity } from '@/lib/session'
import type {
  Nft,
  NftUpdatedEvent,
  Order,
  OrderUpdatedEvent,
  PageResponse,
} from '@/types/contracts'
export function Realtime() {
  const cache = useQueryClient()
  const { token, userId } = useIdentity()
  const [connected, setConnected] = useState(false)
  const [notice, setNotice] = useState('')
  useEffect(() => {
    const socket = io(
      import.meta.env.VITE_SOCKET_URL || window.location.origin,
      {
        path: '/socket.io/',
        transports: ['websocket'],
        autoConnect: false,
        reconnectionDelay: 500,
        reconnectionDelayMax: 2000,
      },
    )
    const versions = new Map<string, number>()
    let active = true
    const reconcile = () => {
      if (!active) return
      setConnected(true)
      socket.emit('session.subscribe', { token })
      void cache.invalidateQueries({ queryKey: nftKeys.all })
      void cache.invalidateQueries({
        queryKey: privateKeys.owner(userId || 'guest'),
      })
    }
    const disconnect = () => {
      if (active) setConnected(false)
    }
    const receive = async (event: NftUpdatedEvent) => {
      if (
        !event ||
        event.resourceId !== event.nft?.id ||
        event.version !== event.nft.version
      )
        return
      const detail = cache.getQueryData<Nft>(nftKeys.detail(event.resourceId))
      const lists = cache.getQueriesData<PageResponse<Nft>>({
        queryKey: nftKeys.lists,
      })
      const current = Math.max(
        versions.get(event.resourceId) ?? 0,
        detail?.version ?? 0,
        ...lists.flatMap(
          ([, data]) =>
            data?.items
              .filter((nft) => nft.id === event.resourceId)
              .map((nft) => nft.version) ?? [],
        ),
      )
      if (event.version <= current) return
      versions.set(event.resourceId, event.version)
      await Promise.all([
        cache.cancelQueries({ queryKey: nftKeys.lists }),
        cache.cancelQueries({ queryKey: nftKeys.detail(event.resourceId) }),
        cache.cancelQueries({
          queryKey: privateKeys.resource(userId || 'guest', 'cart'),
        }),
      ])
      if (!active || (versions.get(event.resourceId) ?? 0) > event.version)
        return
      cache.setQueryData<Nft>(nftKeys.detail(event.resourceId), (previous) =>
        previous && previous.version > event.version ? previous : event.nft,
      )
      void cache.invalidateQueries({ queryKey: nftKeys.lists })
      void cache.invalidateQueries({
        queryKey: privateKeys.resource(userId || 'guest', 'cart'),
      })
      window.dispatchEvent(
        new CustomEvent('kurio:catalog-change', {
          detail: { id: event.resourceId, version: event.version },
        }),
      )
      setNotice(`${event.nft.name}: preço ou disponibilidade atualizados.`)
    }
    const receiveOrder = async (event: OrderUpdatedEvent) => {
      if (
        !active ||
        !token ||
        event?.userId !== userId ||
        event.order?.ownerId !== userId ||
        event.resourceId !== event.order.id ||
        event.version !== event.order.version
      )
        return
      const key = privateKeys.order(userId, event.resourceId)
      const previous = cache.getQueryData<Order>(key)
      const known = Math.max(
        versions.get(`order:${event.resourceId}`) || 0,
        previous?.version || 0,
      )
      if (
        event.version <= known ||
        (previous &&
          previous.status !== 'pending' &&
          previous.status !== event.order.status)
      )
        return
      versions.set(`order:${event.resourceId}`, event.version)
      await cache.cancelQueries({ queryKey: key })
      if (
        !active ||
        (versions.get(`order:${event.resourceId}`) || 0) > event.version
      )
        return
      cache.setQueryData(key, event.order)
      void cache.invalidateQueries({
        queryKey: privateKeys.resource(userId, 'orders'),
      })
      void cache.invalidateQueries({
        queryKey: privateKeys.resource(userId, 'cart'),
      })
      setNotice(
        `Pedido ${event.order.id}: ${event.order.status === 'confirmed' ? 'confirmado' : event.order.status === 'rejected' ? 'recusado' : 'em processamento'}.`,
      )
    }
    socket.on('connect', reconcile)
    socket.on('disconnect', disconnect)
    socket.on('connect_error', disconnect)
    socket.on('nft.updated', receive)
    socket.on('order.updated', receiveOrder)
    socket.connect()
    return () => {
      active = false
      socket.off('connect', reconcile)
      socket.off('disconnect', disconnect)
      socket.off('connect_error', disconnect)
      socket.off('nft.updated', receive)
      socket.off('order.updated', receiveOrder)
      socket.disconnect()
      versions.clear()
    }
  }, [cache, token, userId])
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 5500)
    return () => clearTimeout(timer)
  }, [notice])
  return (
    <div className="realtime-feedback">
      <span data-testid="socket-status" className="sr-only">
        Tempo real: {connected ? 'conectado' : 'reconectando'}
      </span>
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={notice ? 'realtime-notice' : 'sr-only'}
      >
        {notice}
      </span>
    </div>
  )
}
