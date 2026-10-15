import { delay, http, HttpResponse } from 'msw'
import { compareEth, ethToWei } from '@/lib/eth'
import { validateCatalogSearch } from '@/features/catalog/search'
import {
  categoryLabels,
  collectionLabels,
  networkLabels,
} from '@/features/catalog/search'
import { config, nfts, persist, reset, setConfig } from './database'
import { broadcastNft } from './socket'
import type { MockConfig, NftUpdatedEvent, Scenario } from '@/types/contracts'

function apiError(status: number, code: string, message: string) {
  return HttpResponse.json({ code, message }, { status })
}

export async function mockNetwork(url: string) {
  const { scenario } = config()
  const q = new URL(url).searchParams.get('q') ?? ''
  // Não usamos aleatoriedade: o mesmo termo reproduz a mesma latência.
  await delay(
    scenario === 'slow'
      ? 2500
      : scenario === 'variable'
        ? q.length % 2 === 0
          ? 1200
          : 150
        : 120,
  )
  if (scenario === 'http-error')
    return apiError(
      503,
      'TRANSIENT_FAILURE',
      'O catálogo está temporariamente indisponível.',
    )
  if (scenario === 'network-error') return HttpResponse.error()
  return undefined
}

export const handlers = [
  http.get('/api/nfts', async ({ request }) => {
    const failure = await mockNetwork(request.url)
    if (failure) return failure
    const url = new URL(request.url)
    const search = validateCatalogSearch(Object.fromEntries(url.searchParams))
    let result = nfts.filter((nft) => {
      const haystack =
        `${nft.name} ${nft.creator} ${nft.collection} ${collectionLabels[nft.collection]}`.toLowerCase()
      return (
        haystack.includes(search.q.toLowerCase()) &&
        (search.collection === 'all' || search.collection === nft.collection) &&
        (search.category === 'all' || search.category === nft.category) &&
        (!search.available ||
          nft.editions.some((edition) => edition.available > 0)) &&
        (search.network === 'all' || nft.network === search.network) &&
        (!search.priceMin ||
          compareEth(nft.editions[0].price, search.priceMin) >= 0) &&
        (!search.priceMax ||
          compareEth(nft.editions[0].price, search.priceMax) <= 0) &&
        (search.view !== 'new' || nft.id <= 'nft-09') &&
        (search.view !== 'trending' ||
          nft.id.endsWith('1') ||
          nft.id.endsWith('3') ||
          nft.id.endsWith('5'))
      )
    })
    if (config().scenario === 'empty') result = []
    result.sort((a, b) => {
      if (url.searchParams.get('recommended') === 'true')
        return (a.recommendationRank || 100) - (b.recommendationRank || 100)
      if (search.sort === 'name') return a.name.localeCompare(b.name)
      if (search.sort === 'price-asc')
        return compareEth(a.editions[0].price, b.editions[0].price)
      if (search.sort === 'price-desc')
        return compareEth(b.editions[0].price, a.editions[0].price)
      return b.createdAt.localeCompare(a.createdAt)
    })
    const pageSize = 9
    const categories = Object.fromEntries(
      Object.keys(categoryLabels).map((category) => [
        category,
        nfts.filter((nft) => nft.category === category).length,
      ]),
    )
    const networks = Object.fromEntries(
      Object.keys(networkLabels).map((network) => [
        network,
        nfts.filter((nft) => nft.network === network).length,
      ]),
    )
    return HttpResponse.json({
      items: result.slice((search.page - 1) * pageSize, search.page * pageSize),
      total: result.length,
      page: search.page,
      pageSize,
      totalPages: Math.ceil(result.length / pageSize),
      facets: { categories, networks },
    })
  }),
  http.get('/api/nfts/:id', async ({ request, params }) => {
    const failure = await mockNetwork(request.url)
    if (failure) return failure
    const nft = nfts.find((item) => item.id === params.id)
    return nft
      ? HttpResponse.json(nft)
      : apiError(404, 'NOT_FOUND', 'Este NFT não foi encontrado.')
  }),
  http.get('/api/__mock/config', () => HttpResponse.json(config())),
  http.put('/api/__mock/config', async ({ request }) => {
    const value = (await request.json()) as MockConfig
    const valid: Scenario[] = [
      'standard',
      'slow',
      'variable',
      'empty',
      'http-error',
      'network-error',
      'favorite-error',
      'payment-rejected',
      'order-timeout',
      'order-pending',
      'wallet-refused',
      'validation-error',
    ]
    if (!valid.includes(value.scenario))
      return apiError(422, 'VALIDATION', 'Cenário desconhecido.')
    setConfig(value)
    return HttpResponse.json(config())
  }),
  http.post('/api/__mock/reset', () => {
    reset()
    return HttpResponse.json({ reset: true })
  }),
  http.patch('/api/__mock/nfts/:id', async ({ request, params }) => {
    const nft = nfts.find((item) => item.id === params.id)
    if (!nft) return apiError(404, 'NOT_FOUND', 'Este NFT não foi encontrado.')
    const body = (await request.json()) as {
      price?: string
      available?: number
    }
    if (body.price !== undefined) {
      try {
        ethToWei(body.price)
      } catch {
        return apiError(422, 'VALIDATION', 'Preço decimal inválido.')
      }
    }
    if (
      body.available !== undefined &&
      (!Number.isSafeInteger(body.available) || body.available < 0)
    )
      return apiError(422, 'VALIDATION', 'Quantidade inválida.')
    if (body.price !== undefined) nft.editions[0].price = body.price
    if (body.available !== undefined) nft.editions[0].available = body.available
    nft.version += 1
    persist()
    const event: NftUpdatedEvent = {
      eventId: `nft-${nft.id}-v${nft.version}`,
      resourceId: nft.id,
      version: nft.version,
      nft: structuredClone(nft),
    }
    broadcastNft(event)
    return HttpResponse.json(nft)
  }),
  http.post('/api/__mock/events/:mode', ({ params }) => {
    const source = nfts[0]
    const nft = structuredClone(source)
    if (params.mode === 'old') {
      nft.version = Math.max(0, source.version - 1)
      nft.editions[0].price = '99'
    } else if (params.mode !== 'duplicate')
      return apiError(422, 'VALIDATION', 'Evento desconhecido.')
    broadcastNft({
      eventId: `nft-${nft.id}-v${nft.version}`,
      resourceId: nft.id,
      version: nft.version,
      nft,
    })
    return HttpResponse.json({ emitted: true })
  }),
]
