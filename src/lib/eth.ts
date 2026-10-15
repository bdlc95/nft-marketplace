import type { Eth } from '@/types/contracts'

const WEI_PER_ETH = 10n ** 18n

// BigInt armazena unidades inteiras (wei), sem arredondamento binário.
export function ethToWei(value: Eth): bigint {
  if (!/^\d+(\.\d{1,18})?$/.test(value))
    throw new Error('Valor de ETH inválido')
  const [whole, fraction = ''] = value.split('.')
  return BigInt(whole) * WEI_PER_ETH + BigInt(fraction.padEnd(18, '0'))
}

export function weiToEth(value: bigint): Eth {
  if (value < 0n) throw new Error('Valor negativo não permitido')
  const fraction = (value % WEI_PER_ETH)
    .toString()
    .padStart(18, '0')
    .replace(/0+$/, '')
  return `${value / WEI_PER_ETH}${fraction ? `.${fraction}` : ''}`
}

export function multiplyEth(value: Eth, quantity: number): Eth {
  if (!Number.isSafeInteger(quantity) || quantity < 0)
    throw new Error('Quantidade inválida')
  return weiToEth(ethToWei(value) * BigInt(quantity))
}

export function compareEth(a: Eth, b: Eth): number {
  const first = ethToWei(a)
  const second = ethToWei(b)
  return first === second ? 0 : first < second ? -1 : 1
}

export function formatEth(value: Eth): string {
  // Apresenta todos os dígitos recebidos; não reduz a precisão para exibição.
  return `${value} ETH`
}
