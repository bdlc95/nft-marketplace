import type { CheckoutDraft } from '@/services/commerce'
import type { OrderRequest } from '@/types/contracts'
export interface Attempt {
  key: string
  payload: OrderRequest
  orderId?: string
}
const draftKey = (uid: string) => `kurio:checkout:${uid}`
const attemptKey = (uid: string) => `kurio:attempt:${uid}`
export function readDraft(uid: string): CheckoutDraft | null {
  try {
    return JSON.parse(localStorage.getItem(draftKey(uid)) || 'null')
  } catch {
    return null
  }
}
export function writeDraft(uid: string, draft: CheckoutDraft) {
  localStorage.setItem(draftKey(uid), JSON.stringify(draft))
}
export function readAttempt(uid: string): Attempt | null {
  try {
    return JSON.parse(localStorage.getItem(attemptKey(uid)) || 'null')
  } catch {
    return null
  }
}
export function writeAttempt(uid: string, attempt: Attempt | null) {
  if (attempt) localStorage.setItem(attemptKey(uid), JSON.stringify(attempt))
  else localStorage.removeItem(attemptKey(uid))
}
