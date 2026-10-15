import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { FigmaIcon } from '@/components/figma-icon'
import { accountApi } from '@/services/commerce'
import { errorMessage } from '@/services/http'
import { getIdentity, useIdentity } from '@/lib/session'
import { favoritesOptions, privateKeys } from './queries'
export function FavoriteButton({
  id,
  compact = false,
}: {
  id: string
  compact?: boolean
}) {
  const { userId, token } = useIdentity()
  const cache = useQueryClient()
  const navigate = useNavigate()
  const favorites = useQuery(favoritesOptions(userId))
  const active = favorites.data?.includes(id) || false
  const mutation = useMutation({
    mutationFn: (selected: boolean) => accountApi.favorite(id, selected),
    onMutate: async (selected) => {
      await cache.cancelQueries({
        queryKey: privateKeys.resource(userId, 'favorites'),
      })
      const previous =
        cache.getQueryData<string[]>(
          privateKeys.resource(userId, 'favorites'),
        ) || []
      cache.setQueryData(
        privateKeys.resource(userId, 'favorites'),
        selected
          ? [...new Set([...previous, id])]
          : previous.filter((value) => value !== id),
      )
      return { previous, token }
    },
    onError: (_error, _selected, context) => {
      if (getIdentity().token === context?.token)
        cache.setQueryData(
          privateKeys.resource(userId, 'favorites'),
          context.previous,
        )
    },
    onSuccess: (data, _selected, context) => {
      if (getIdentity().token === context?.token)
        cache.setQueryData(privateKeys.resource(userId, 'favorites'), data)
    },
    onSettled: (_data, _error, _selected, context) => {
      if (getIdentity().token === context?.token)
        void cache.invalidateQueries({
          queryKey: privateKeys.resource(userId, 'favorites'),
        })
    },
  })
  return (
    <div className={compact ? 'favorite-compact' : 'favorite-control'}>
      <Button
        variant="outline"
        className="favorite-button"
        aria-label={active ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
        aria-pressed={active}
        disabled={mutation.isPending || (!!userId && favorites.isPending)}
        onClick={() => {
          if (!token) {
            void navigate({ to: '/login', search: { redirect: `/nfts/${id}` } })
            return
          }
          mutation.mutate(!active)
        }}
      >
        <FigmaIcon name="dd-imgHeart1" />
        {!compact && <span>{active ? 'Salvo' : 'Favoritar'}</span>}
      </Button>
      {mutation.isError && (
        <p className="form-error" role="alert">
          {errorMessage(mutation.error)}
        </p>
      )}
    </div>
  )
}
