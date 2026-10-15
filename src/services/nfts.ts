import { http } from './http'
import type { CatalogSearch, Nft, PageResponse } from '@/types/contracts'

export const nftApi = {
  async list(
    search: CatalogSearch & { recommended?: boolean },
    signal?: AbortSignal,
  ) {
    const { data } = await http.get<PageResponse<Nft>>('/nfts', {
      params: search,
      signal,
    })
    return data
  },
  async detail(id: string, signal?: AbortSignal) {
    const { data } = await http.get<Nft>(`/nfts/${encodeURIComponent(id)}`, {
      signal,
    })
    return data
  },
}
