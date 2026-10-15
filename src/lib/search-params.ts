// A URL pública usa somente parâmetros escalares. Mantemos todos como texto
// ao ler: o parser JSON padrão do Router converteria ETH para Number.
export function parseSearch(search: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(search))
}

export function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(search)) {
    if (
      typeof value === 'string' ||
      typeof value === 'boolean' ||
      typeof value === 'number'
    )
      params.set(key, String(value))
  }
  const text = params.toString()
  return text ? `?${text}` : ''
}
