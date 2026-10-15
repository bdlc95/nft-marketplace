import type {
  CatalogSearch,
  Category,
  Collection,
  Network,
  Sort,
} from '@/types/contracts'

export const defaultSearch: CatalogSearch = {
  q: '',
  category: 'all',
  collection: 'all',
  sort: 'recent',
  page: 1,
  available: false,
  network: 'all',
  priceMin: '',
  priceMax: '',
  view: 'all',
}

function option<T extends string>(
  value: unknown,
  options: readonly T[],
  fallback: T,
): T {
  return options.includes(value as T) ? (value as T) : fallback
}

export function validateCatalogSearch(
  raw: Record<string, unknown>,
): CatalogSearch {
  const page = Number(raw.page)
  return {
    q: typeof raw.q === 'string' ? raw.q.trim().slice(0, 100) : '',
    category: option<Category | 'all'>(
      raw.category,
      ['all', ...Object.keys(categoryLabels)] as (Category | 'all')[],
      'all',
    ),
    collection: option<Collection | 'all'>(
      raw.collection,
      ['all', 'cosmos', 'origins', 'horizons'],
      'all',
    ),
    sort: option<Sort>(
      raw.sort,
      ['recent', 'price-asc', 'price-desc', 'name'],
      'recent',
    ),
    page: Number.isSafeInteger(page) && page > 0 ? Math.min(page, 10_000) : 1,
    available: raw.available === true || raw.available === 'true',
    network: option<Network | 'all'>(
      raw.network,
      ['all', 'ethereum', 'polygon', 'solana'],
      'all',
    ),
    priceMin:
      typeof raw.priceMin === 'string' &&
      /^\d{1,3}(\.\d{1,18})?$/.test(raw.priceMin)
        ? raw.priceMin
        : '',
    priceMax:
      typeof raw.priceMax === 'string' &&
      /^\d{1,3}(\.\d{1,18})?$/.test(raw.priceMax)
        ? raw.priceMax
        : '',
    view: option(raw.view, ['all', 'new', 'trending'] as const, 'all'),
  }
}

export const categoryLabels: Record<Category, string> = {
  art: 'Arte digital',
  photography: 'Fotografia',
  music: 'Música',
  '3d': 'Arte 3D',
  collectibles: 'Colecionáveis',
  generative: 'Generativa',
  gaming: 'Jogos',
  membership: 'Assinaturas',
  utility: 'Utilidade',
}
export const collectionLabels = {
  cosmos: 'Kurio Apes',
  origins: 'Origins',
  horizons: 'Horizons',
}
export const networkLabels = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}
