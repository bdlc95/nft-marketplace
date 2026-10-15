import { queryOptions } from '@tanstack/react-query'
import { nftApi } from '@/services/nfts'
import type { CatalogSearch } from '@/types/contracts'
import { defaultSearch } from './search'
import type { Collection } from '@/types/contracts'

export const nftKeys = {
  all: ['nfts'] as const,
  lists: ['nfts', 'list'] as const,
  list: (search: CatalogSearch) => ['nfts', 'list', search] as const,
  detail: (id: string) => ['nfts', 'detail', id] as const,
}

export const catalogOptions = (search: CatalogSearch) =>
  queryOptions({
    queryKey: nftKeys.list(search),
    queryFn: ({ signal }) => nftApi.list(search, signal),
  })

export const detailOptions = (id: string) =>
  queryOptions({
    queryKey: nftKeys.detail(id),
    queryFn: ({ signal }) => nftApi.detail(id, signal),
  })

export const recommendationsOptions = (collection: Collection) =>
  queryOptions({
    queryKey: [...nftKeys.lists, 'recommended', collection],
    queryFn: ({ signal }) =>
      nftApi.list({ ...defaultSearch, collection, recommended: true }, signal),
  })
