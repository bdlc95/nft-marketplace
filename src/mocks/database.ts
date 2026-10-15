import { createFixtures } from './fixtures'
import type { MockConfig, Nft } from '@/types/contracts'

const DB_KEY = 'nft-challenge:mock-db:v2'
const CONFIG_KEY = 'nft-challenge:mock-config:v1'

function restore(): Nft[] {
  try {
    const saved = localStorage.getItem(DB_KEY)
    if (saved) {
      const parsed: unknown = JSON.parse(saved)
      if (
        Array.isArray(parsed) &&
        parsed.every(
          (nft) =>
            nft?.id &&
            Array.isArray(nft.editions) &&
            typeof nft.version === 'number',
        )
      ) {
        const initial = createFixtures()
        const restored = (parsed as Nft[]).map((nft) => {
          const fixture = initial.find((item) => item.id === nft.id)
          if (nft.id === 'nft-08' && nft.name === 'Amber Rhythm #086') {
            nft.name = 'Golden Frequency #071'
            for (const edition of nft.editions)
              if (edition.price === '1.49') edition.price = '0.59'
          }
          if (
            nft.version === 1 &&
            ['nft-05', 'nft-06', 'nft-07'].includes(nft.id)
          ) {
            const current = nft.editions.find((item) => item.id === 'standard')
            const initial = fixture?.editions.find(
              (item) => item.id === 'standard',
            )
            if (current && initial) current.available = initial.available
          }
          return {
            ...nft,
            authImage: fixture?.authImage,
            token: fixture?.token || nft.token,
            collection: fixture?.collection || nft.collection,
            recommendationRank: fixture?.recommendationRank,
          }
        })
        return [
          ...restored,
          ...initial.filter(
            (nft) => !restored.some((item) => item.id === nft.id),
          ),
        ]
      }
    }
  } catch {
    /* Uma persistência inválida restaura fixtures conhecidas. */
  }
  return createFixtures()
}

const resetListeners = new Set<() => void>()
export function registerReset(listener: () => void) {
  resetListeners.add(listener)
}
export let nfts = restore()
export function config(): MockConfig {
  const scenario = localStorage.getItem(CONFIG_KEY)
  if (
    [
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
    ].includes(scenario ?? '')
  )
    return { scenario: scenario as MockConfig['scenario'] }
  return { scenario: 'standard' }
}
export function setConfig(value: MockConfig) {
  localStorage.setItem(CONFIG_KEY, value.scenario)
}
export function persist() {
  localStorage.setItem(DB_KEY, JSON.stringify(nfts))
}
export function reset() {
  for (const listener of resetListeners) listener()
  nfts = createFixtures()
  persist()
  setConfig({ scenario: 'standard' })
}
