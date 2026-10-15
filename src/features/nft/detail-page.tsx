import { useEffect, useState } from 'react'
import { getRouteApi, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import * as Tabs from '@radix-ui/react-tabs'
import {
  recommendationsOptions,
  detailOptions,
} from '@/features/catalog/queries'
import {
  collectionLabels,
  defaultSearch,
  networkLabels,
} from '@/features/catalog/search'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ErrorState } from '@/components/error-state'
import { PurchaseButtons } from '@/features/commerce/purchase-buttons'
import { FavoriteButton } from '@/features/account/favorite-button'
import { FeatureInfo } from '@/components/feature-info'
import { FigmaIcon } from '@/components/figma-icon'
import { NftCard } from '@/components/nft-card'
import { formatEth, multiplyEth } from '@/lib/eth'
import { errorMessage, isNotFound } from '@/services/http'
import type { Collection } from '@/types/contracts'

const route = getRouteApi('/nfts/$nftId')

export function DetailPage() {
  const { nftId } = route.useParams()
  // Trocar o id recria o componente e reinicia edição, quantidade e galeria.
  return <NftDetail key={nftId} id={nftId} />
}

function NftDetail({ id }: { id: string }) {
  const result = useQuery(detailOptions(id))
  const [editionId, setEditionId] = useState('standard')
  const [quantity, setQuantity] = useState(1)
  const [galleryIndex, setGalleryIndex] = useState(0)
  const nft = result.data
  const edition = nft?.editions.find((item) => item.id === editionId)
  // O estoque pode mudar por socket. A quantidade exibida acompanha o limite atual.
  const safeQuantity = edition ? Math.min(quantity, edition.available) : 0
  useEffect(() => {
    document.title = nft ? `${nft.name} — Kurio` : 'NFT — Kurio'
  }, [nft])

  if (result.isPending)
    return (
      <div
        data-testid="detail-skeleton"
        aria-label="Carregando NFT"
        className="detail-loading"
      >
        <Skeleton className="aspect-square" />
        <div className="space-y-6">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-24" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      </div>
    )
  if (result.isError && !nft)
    return (
      <ErrorState
        message={
          isNotFound(result.error)
            ? 'Este NFT não foi encontrado.'
            : errorMessage(result.error)
        }
        retry={
          isNotFound(result.error) ? undefined : () => void result.refetch()
        }
      />
    )
  if (!nft || !edition) return <ErrorState message="Edição não encontrada." />

  const image = nft.gallery[galleryIndex] || nft.image
  const total = formatEth(multiplyEth(edition.price, safeQuantity))
  const editionArt: Record<string, string> = {
    premium: 'dd-imgEllipse24',
    limited: 'dd-imgEllipse25',
    standard: 'dd-imgEllipse26',
    open: 'dd-imgEllipse27',
  }
  const orderedEditions = ['premium', 'limited', 'standard', 'open'].flatMap(
    (key) => nft.editions.filter((item) => item.id === key),
  )

  return (
    <>
      <div className="detail-breadcrumb">
        <Link to="/" search={defaultSearch}>
          Início
        </Link>{' '}
        / Mercado
      </div>
      <div className="mobile-detail-header">
        <Link to="/" search={defaultSearch} aria-label="Voltar ao catálogo">
          <FigmaIcon name="md-imgArrowLeft2" />
        </Link>
        <FavoriteButton id={id} compact />
      </div>
      {result.isError && (
        <ErrorState
          message="Não foi possível atualizar este NFT. Tente novamente antes de continuar."
          retry={() => void result.refetch()}
        />
      )}
      <div className="detail-top">
        <section className="nft-gallery" aria-label={`Galeria de ${nft.name}`}>
          <div className="gallery-thumbnails">
            {nft.gallery.map((art, index) => (
              <button
                key={`${art}-${index}`}
                onClick={() => setGalleryIndex(index)}
                aria-label={`Mostrar imagem ${index + 1}`}
                aria-pressed={index === galleryIndex}
              >
                <img src={art} width={100} height={100} alt="" loading="lazy" />
              </button>
            ))}
          </div>
          <div className="gallery-picture">
            <picture>
              {galleryIndex === 0 && nft.mobileImage && (
                <source media="(max-width: 640px)" srcSet={nft.mobileImage} />
              )}
              <img
                src={image}
                width={404}
                height={404}
                alt={`Arte digital ${nft.name}, imagem ${galleryIndex + 1}`}
                fetchPriority="high"
              />
            </picture>
            <Dialog>
              <DialogTrigger asChild>
                <button className="zoom-trigger" aria-label="Ampliar imagem">
                  <FigmaIcon name="dd-imgFrame238" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>{nft.name}</DialogTitle>
                </DialogHeader>
                <img
                  className="zoom-art"
                  src={image}
                  alt={`Imagem ampliada de ${nft.name}`}
                  width={404}
                  height={404}
                />
              </DialogContent>
            </Dialog>
          </div>
        </section>
        <section className="nft-info" aria-label="Informações do NFT">
          <div className="nft-title-row">
            <h1>{nft.name}</h1>
            <span className="mobile-rating mobile-only">
              <FigmaIcon name="md-imgStar" />
              {nft.rating}
              <span>({nft.reviewCount})</span>
            </span>
          </div>
          <div className="detail-price-row">
            <p data-testid="edition-price">{formatEth(edition.price)}</p>
            <div
              className="nft-review"
              aria-label={`Nota ${nft.rating} de 5, ${nft.reviewCount} avaliações`}
            >
              {Array.from({ length: 5 }, (_, i) => (
                <FigmaIcon
                  key={i}
                  name={i === 4 ? 'dd-imgStar1' : 'dd-imgStar'}
                />
              ))}
              <span>({nft.reviewCount} avaliações)</span>
            </div>
          </div>
          <div className="nft-about">
            <h2>Sobre este NFT:</h2>
            <p>
              <span className="desktop-only">{nft.description}</span>
              <span className="mobile-only">
                Um colecionável digital {edition.name} finalizado à mão da
                coleção Kurio Editions, verificado na{' '}
                {networkLabels[nft.network]}.
              </span>
            </p>
          </div>
          <fieldset className="edition-picker">
            <legend>Edição:</legend>
            <div className="edition-options">
              {orderedEditions.map((item) => (
                <label key={item.id}>
                  <input
                    type="radio"
                    name="edition"
                    value={item.id}
                    checked={editionId === item.id}
                    onChange={() => {
                      setEditionId(item.id)
                      setQuantity(1)
                    }}
                  />
                  <FigmaIcon name={editionArt[item.id]} />
                  <span>{item.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="purchase-controls">
            <div className="purchase-summary">
              <div
                role="group"
                aria-label="Quantidade"
                className="quantity-control"
              >
                <span className="mobile-only">Qtd.</span>
                <Button
                  aria-label="Diminuir quantidade"
                  disabled={safeQuantity <= 1}
                  onClick={() => setQuantity(safeQuantity - 1)}
                >
                  <FigmaIcon name="dd-imgFrame" />
                </Button>
                <output aria-label="Quantidade selecionada">
                  {safeQuantity}
                </output>
                <Button
                  aria-label="Aumentar quantidade"
                  disabled={safeQuantity >= edition.available}
                  onClick={() => setQuantity(safeQuantity + 1)}
                >
                  <FigmaIcon name="dd-imgFrame1" />
                </Button>
              </div>
              <p data-testid="edition-total" className="detail-total mobile-only">
                <span className="desktop-only">Total: </span>
                {total}
              </p>
            </div>
            <PurchaseButtons
              nftId={id}
              editionId={editionId}
              quantity={safeQuantity}
              disabled={safeQuantity === 0 || result.isError}
            />
          </div>
          <p className={edition.available > 0 ? 'sr-only' : 'detail-stock'} role="status">
            {edition.available > 0
              ? `${edition.available} unidades disponíveis`
              : 'Esta edição está esgotada.'}
          </p>
          <div className="token-info">
            <p>ID do token: #{nft.token}</p>
            <p>Coleção: {collectionLabels[nft.collection]}</p>
            <p>Atributos: {nft.attributes.join(', ')}</p>
          </div>
          <div className="detail-share desktop-only">
            <strong>Compartilhar este NFT:</strong>
            <FeatureInfo>
              <button aria-label="Compartilhar no LinkedIn">
                <FigmaIcon name="dd-imgLinkedin" />
              </button>
            </FeatureInfo>
            <FeatureInfo>
              <button aria-label="Compartilhar no Twitter">
                <FigmaIcon name="dd-imgTwitter" />
              </button>
            </FeatureInfo>
          </div>
        </section>
      </div>
      <Tabs.Root defaultValue="details" className="nft-description">
        <Tabs.List className="description-tabs" aria-label="Conteúdo do NFT">
          <Tabs.Trigger value="details">Detalhes do NFT</Tabs.Trigger>
          <Tabs.Trigger value="reviews">
            Avaliações de colecionadores ({nft.reviewCount})
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="details" className="description-content">
          <p>
            {nft.name} é uma obra digital {edition.name} finalizada à mão da
            coleção Kurio Editions. Cada atributo fica armazenado nos metadados
            do token e verificado na {networkLabels[nft.network]}. A obra
            explora identidade, movimento e luz em um mundo digital sem
            fronteiras.
          </p>
          <p>
            A propriedade inclui a arte em alta resolução, lançamentos
            exclusivos para colecionadores e um registro permanente de
            procedência registrada na rede. {nft.creator} recebe 5% de direitos
            autorais nas vendas secundárias, apoiando novos trabalhos e
            lançamentos da comunidade.
          </p>
          <h2>Rede:</h2>
          <p>
            Cunhado na {networkLabels[nft.network]} com procedência imutável e
            metadados armazenados no IPFS.
          </p>
          <h2>Contrato:</h2>
          <p>
            Direitos autorais do criador: 5% nas vendas secundárias, pagos
            automaticamente pelos mercados compatíveis.
          </p>
          <h2>Direitos autorais:</h2>
          <p>0x7A42...19E8 • Contrato inteligente ERC-721 verificado.</p>
        </Tabs.Content>
        <Tabs.Content value="reviews" className="description-content">
          <p>
            Nota {nft.rating} de 5, com {nft.reviewCount} avaliações.
          </p>
          <p>Comentários individuais não estão disponíveis neste bloco.</p>
        </Tabs.Content>
      </Tabs.Root>
      <RelatedNfts collection={nft.collection} currentId={nft.id} />
    </>
  )
}

export function RelatedNfts({
  collection,
  currentId,
  title = 'Mais desta coleção',
}: {
  collection: Collection
  currentId: string
  title?: string
}) {
  // A vitrine relacionada usa o mesmo contrato REST e cache da página inicial.
  const result = useQuery(recommendationsOptions(collection))
  const items = result.data?.items
    .filter((item) => item.id !== currentId)
    .slice(0, 5)
  return (
    <section className="related-nfts">
      <h2>{title}</h2>
      {result.isPending ? (
        <div className="related-grid">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : result.isError ? (
        <ErrorState
          message={errorMessage(result.error)}
          retry={() => void result.refetch()}
        />
      ) : (
        <div className="related-grid">
          {items?.map((nft) => (
            <NftCard key={nft.id} nft={nft} />
          ))}
        </div>
      )}
    </section>
  )
}
