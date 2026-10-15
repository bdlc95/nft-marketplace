import { Link } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { formatEth } from '@/lib/eth'
import type { Nft } from '@/types/contracts'

export function NftCard({
  nft,
  priority = false,
}: {
  nft: Nft
  priority?: boolean
}) {
  return (
    <Card
      className="nft-card border-0 bg-transparent p-0 shadow-none rounded-none gap-0"
      data-testid="nft-card"
    >
      <Link
        to="/nfts/$nftId"
        params={{ nftId: nft.id }}
        className="nft-card-link"
      >
        <div className="nft-art">
          <img
            src={nft.image}
            width={nft.imageWidth}
            height={nft.imageHeight}
            alt={`Arte digital ${nft.name}`}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
          />
        </div>
        <CardContent className="nft-card-copy p-0">
          <h2>{nft.name}</h2>
          <p>{formatEth(nft.editions[0].price)}</p>
          {nft.editions[0].available === 0 && (
            <span className="stock-note">Edição esgotada</span>
          )}
        </CardContent>
      </Link>
    </Card>
  )
}
