// Ferramentas de demonstração falam com endpoints próprios do MSW.
// Elas não alteram catálogo, cache ou estado de negócio diretamente.
import { http } from './http'
import type { MockConfig, Nft, Scenario } from '@/types/contracts'

export const mockControlApi = {
  async config() {
    return (await http.get<MockConfig>('/__mock/config')).data
  },
  async scenario(scenario: Scenario) {
    return (await http.put<MockConfig>('/__mock/config', { scenario })).data
  },
  async reset() {
    await http.post('/__mock/reset')
  },
  async updateNft(body: { price?: string; available?: number }) {
    return (await http.patch<Nft>('/__mock/nfts/nft-01', body)).data
  },
  async replay(mode: 'old' | 'duplicate') {
    await http.post(`/__mock/events/${mode}`)
  },
}
