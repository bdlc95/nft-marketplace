import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useIdentity, getIdentity } from '@/lib/session'
import { commerceApi } from '@/services/commerce'
import { privateKeys, cartOptions } from '@/features/account/queries'
import type { CartLine } from '@/types/contracts'
import { queryClient } from '@/app/query-client'
export type CartCommand =
  | { kind: 'add'; line: CartLine }
  | { kind: 'quantity'; line: CartLine }
  | { kind: 'remove'; line: Pick<CartLine, 'nftId' | 'editionId'> }
  | { kind: 'coupon'; code: string }
export function useCartMutation() {
  const identity = useIdentity()
  const cache = useQueryClient()
  return useMutation({
    mutationKey: ['cart-write'],
    mutationFn: (command: CartCommand) =>
      command.kind === 'add'
        ? commerceApi.add(command.line)
        : command.kind === 'quantity'
          ? commerceApi.quantity(command.line)
          : command.kind === 'remove'
            ? commerceApi.remove(command.line)
            : commerceApi.coupon(command.code),
    onMutate: () => ({ token: getIdentity().token }),
    onSuccess: (cart, _command, context) => {
      if (getIdentity().token !== context.token) return
      cache.setQueryData(cartOptions(identity.userId).queryKey, cart)
      void cache.invalidateQueries({
        queryKey: privateKeys.resource(identity.userId || 'guest', 'cart'),
      })
    },
  })
}
export async function waitForCartWrites() {
  const pending = () =>
    queryClient
      .getMutationCache()
      .findAll({ mutationKey: ['cart-write'], status: 'pending' }).length > 0
  if (!pending()) return
  await new Promise<void>((resolve) => {
    const unsubscribe = queryClient.getMutationCache().subscribe(() => {
      if (!pending()) {
        unsubscribe()
        resolve()
      }
    })
  })
}
