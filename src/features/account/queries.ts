import { queryOptions } from '@tanstack/react-query'
import { accountApi, commerceApi } from '@/services/commerce'
import { getIdentity } from '@/lib/session'
import type { Network } from '@/types/contracts'
export const privateKeys = {
  root: ['private'] as const,
  owner: (uid: string) => ['private', uid] as const,
  resource: (uid: string, resource: string) =>
    ['private', uid, resource] as const,
  order: (uid: string, id: string) => ['private', uid, 'order', id] as const,
}
export const sessionOptions = () =>
  queryOptions({
    queryKey: ['session', getIdentity().token],
    queryFn: ({ signal }) => accountApi.session(signal),
    staleTime: 15_000,
    retry: false,
  })
export const cartOptions = (uid: string, network: Network = 'ethereum') =>
  queryOptions({
    queryKey: [...privateKeys.resource(uid || 'guest', 'cart'), network],
    queryFn: ({ signal }) => commerceApi.cart(network, signal),
  })
export const profileOptions = (uid: string) =>
  queryOptions({
    queryKey: privateKeys.resource(uid, 'profile'),
    queryFn: ({ signal }) => accountApi.profile(signal),
    enabled: !!uid,
  })
export const walletsOptions = (uid: string) =>
  queryOptions({
    queryKey: privateKeys.resource(uid, 'wallets'),
    queryFn: ({ signal }) => accountApi.wallets(signal),
    enabled: !!uid,
  })
export const favoritesOptions = (uid: string) =>
  queryOptions({
    queryKey: privateKeys.resource(uid, 'favorites'),
    queryFn: ({ signal }) => accountApi.favorites(signal),
    enabled: !!uid,
  })
export const orderOptions = (uid: string, id: string) =>
  queryOptions({
    queryKey: privateKeys.order(uid, id),
    queryFn: ({ signal }) => commerceApi.getOrder(id, signal),
    enabled: !!uid,
    refetchInterval: (query) =>
      query.state.data?.status === 'pending' ? 1500 : false,
  })
