import { useQuery } from '@tanstack/react-query'
import { useIdentity } from '@/lib/session'
import { AccountLayout } from './account-layout'
import { favoritesOptions } from './queries'
import { detailOptions } from '@/features/catalog/queries'
import { NftCard } from '@/components/nft-card'
import { FavoriteButton } from './favorite-button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/error-state'
import { errorMessage } from '@/services/http'
export function FavoritesPage() {
  const { userId } = useIdentity()
  const result = useQuery(favoritesOptions(userId))
  return (
    <AccountLayout title="Seus favoritos">
      {result.isPending ? (
        <Skeleton className="h-64" />
      ) : result.isError ? (
        <ErrorState
          message={errorMessage(result.error)}
          retry={() => void result.refetch()}
        />
      ) : !result.data.length ? (
        <p className="empty-catalog">
          Você ainda não salvou NFTs nos favoritos.
        </p>
      ) : (
        <div className="favorites-grid">
          {result.data.map((id) => (
            <FavoriteItem key={id} id={id} />
          ))}
        </div>
      )}
    </AccountLayout>
  )
}
function FavoriteItem({ id }: { id: string }) {
  const nft = useQuery(detailOptions(id))
  return (
    <div>
      {nft.isPending ? (
        <Skeleton className="h-64" />
      ) : nft.isError ? (
        <ErrorState
          message={errorMessage(nft.error)}
          retry={() => void nft.refetch()}
        />
      ) : (
        <>
          <NftCard nft={nft.data} />
          <FavoriteButton id={id} />
        </>
      )}
    </div>
  )
}
