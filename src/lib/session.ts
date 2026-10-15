import { useSyncExternalStore } from 'react'
interface Identity {
  token: string
  userId: string
}
const key = 'kurio:identity'
function restore(): Identity {
  try {
    const saved = JSON.parse(
      localStorage.getItem(key) || '{}',
    ) as Partial<Identity>
    return {
      token: typeof saved.token === 'string' ? saved.token : '',
      userId: typeof saved.userId === 'string' ? saved.userId : '',
    }
  } catch {
    return { token: '', userId: '' }
  }
}
let identity = restore()
const listeners = new Set<() => void>()
export const getIdentity = () => identity
export function setIdentity(next: Identity) {
  identity = next
  localStorage.setItem(key, JSON.stringify(next))
  for (const listener of listeners) listener()
}
export function useIdentity() {
  return useSyncExternalStore((listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }, getIdentity)
}
export function safeReturnPath(value: unknown): string {
  return typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\') &&
    ![...value].some(
      (character) =>
        character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127,
    ) &&
    !/^\/(login|signup)(\?|$)/.test(value)
    ? value
    : '/'
}
