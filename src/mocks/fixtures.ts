import type { Category, Collection, Network, Nft } from '@/types/contracts'

const names = [
  'Emerald Ape #042',
  'Sage Nomad #009',
  'Neon Vessel #552',
  'Cosmic Bloom #118',
  'Violet Nomad #314',
  'Ivory Baron #088',
  'Golden Beat #207',
  'Golden Frequency #071',
  'Golden Signal #160',
  'Waves',
  'Vertex',
  'Nova',
  'Echo',
  'Bloom',
  'Zenith',
  'Tide',
  'Halo',
  'Flux',
  'Oasis',
  'Vortex',
  'Nexus',
  'Mirage',
  'Sierra',
  'Cosmic',
  'Terra',
  'Aether',
  'Spark',
  'Mist',
  'Dawn',
  'Orbit',
  'Pulse',
  'Ember',
  'Luna',
  'Prism',
  'Horizon',
  'Mosaic',
]
const collections: Collection[] = ['cosmos', 'origins', 'horizons']
const categories: Category[] = [
  'art',
  'photography',
  'music',
  '3d',
  'collectibles',
  'generative',
  'gaming',
  'membership',
  'utility',
]
const networks: Network[] = ['ethereum', 'polygon', 'solana']
const prices = [
  '1.19',
  '1.69',
  '1.99',
  '1.29',
  '1.39',
  '1.79',
  '0.99',
  '0.59',
  '0.39',
]
const artworks = [
  'emerald',
  'sage',
  'ivory',
  'cosmic',
  'sage',
  'ivory',
  'golden',
  'golden',
  'golden',
]

export function createFixtures(): Nft[] {
  return names.map((name, i) => ({
    id: `nft-${String(i + 1).padStart(2, '0')}`,
    name,
    description: `Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na ${networks[Math.floor(i / 3) % 3][0].toUpperCase() + networks[Math.floor(i / 3) % 3].slice(1)}, com arte desbloqueável e acesso para colecionadores.`,
    creator: ['Nova Sato', 'Sam Rivera', 'Taylor Kim'][i % 3],
    collection: collections[Math.floor(i / 9) % 3],
    recommendationRank:
      [9, 6, 7, 1, 2, 3, 4, 8, 5][i % 9] + Math.floor(i / 9) * 10,
    category: categories[Math.floor(i / 3) % categories.length],
    network: networks[Math.floor(i / 3) % 3],
    image: `/assets/figma/${artworks[i % 9]}.png`,
    authImage: `/assets/figma/${['golden', 'ivory', 'emerald', 'sage', 'golden', 'ivory', 'emerald', 'sage', 'golden'][i % 9]}.png`,
    gallery:
      i === 0
        ? [
            '/assets/figma/detail-main.png',
            '/assets/figma/hero.png',
            '/assets/figma/emerald.png',
            '/assets/figma/detail-main.png',
          ]
        : [`/assets/figma/${artworks[i % 9]}.png`],
    mobileImage: i === 0 ? '/assets/figma/mobile-hero.png' : undefined,
    token:
      i < 9
        ? [
            '0042',
            '0009',
            '0552',
            '0118',
            '0314',
            '0088',
            '0207',
            '0071',
            '0160',
          ][i]
        : String(100 + i),
    attributes:
      i === 0
        ? ['Óculos', 'Esmeralda', 'Raro']
        : ['Arte digital', 'Kurio Editions'],
    rating: '4.8',
    reviewCount: 19,
    imageWidth: i % 9 === 3 ? 224 : 250,
    imageHeight: i % 9 === 3 ? 286 : 250,
    createdAt: new Date(Date.UTC(2026, 8, 30 - i, 12)).toISOString(),
    editions: [
      {
        id: 'standard',
        name: '1/50',
        price: prices[i] ?? `1.${String(i * 21).padStart(3, '0')}`,
        available: i === 4 || i === 5 ? 12 : i > 8 && i % 7 === 6 ? 0 : 8,
      },
      {
        id: 'premium',
        name: '1/1',
        price: `3.${String(i * 21).padStart(3, '0')}`,
        available: i % 4 === 0 ? 0 : 1,
      },
      {
        id: 'limited',
        name: '1/10',
        price: `2.${String(i * 21).padStart(3, '0')}`,
        available: 3,
      },
      { id: 'open', name: 'ABERTA', price: prices[i] ?? '1.19', available: 20 },
    ],
    version: 1,
  }))
}
