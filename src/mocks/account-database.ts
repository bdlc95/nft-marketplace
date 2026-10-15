import type {
  CartLine,
  Order,
  OrderStatus,
  Quote,
  User,
  Wallet,
} from '@/types/contracts'
import { registerReset } from './database'

type StoredUser = User & { passwordHash: string; salt: string }
export interface StoredCart {
  revision: number
  coupon: string
  items: CartLine[]
}
export type StoredOrder = Order & {
  settleAt: number | null
  decision: OrderStatus
  reserved: boolean
}
export function createDefaultWallet(userId: string): Wallet {
  return {
    id: `${userId}-wallet`,
    name: 'Minha carteira',
    address: `0x${'1'.repeat(40)}`,
    network: 'ethereum',
    primary: true,
    connected: false,
  }
}
interface AccountDatabase {
  users: StoredUser[]
  sessions: Record<string, { userId: string; expiresAt: number }>
  carts: Record<string, StoredCart>
  favorites: Record<string, string[]>
  wallets: Record<string, Wallet[]>
  quotes: Record<string, Quote>
  orders: Record<string, StoredOrder>
  attempts: Record<string, { fingerprint: string; orderId: string }>
  feeOverride: string | null
  expiredCoupons: string[]
}
const key = 'nft-challenge:account-db:v1'
const empty = (): AccountDatabase => ({
  users: [],
  sessions: {},
  carts: {},
  favorites: {},
  wallets: {},
  quotes: {},
  orders: {},
  attempts: {},
  feeOverride: null,
  expiredCoupons: [],
})
function restore(): AccountDatabase {
  try {
    const data = JSON.parse(
      localStorage.getItem(key) || 'null',
    ) as AccountDatabase | null
    if (data?.users && data.sessions && data.orders && data.carts) {
      for (const user of data.users) {
        if (user.id === 'user-bruno' && user.name === 'Bruno Demo')
          user.name = 'Bruno'
        if (user.id === 'user-jade' && user.name === 'Jade Demo')
          user.name = 'Jade'
      }
      return data
    }
  } catch {
    /* Recuperação de dados inválidos. */
  }
  return empty()
}
export let accounts = restore()
export function saveAccounts() {
  localStorage.setItem(key, JSON.stringify(accounts))
}
let seeding: Promise<void> | undefined
export const orderTimers = new Map<string, ReturnType<typeof setTimeout>>()
export async function passwordHash(password: string, salt: string) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode(salt),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    material,
    256,
  )
  return Array.from(new Uint8Array(bits), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('')
}
export function publicUser(user: StoredUser): User {
  const { id, name, email, phone, avatar } = user
  return {
    id,
    name,
    email,
    phone,
    avatar,
    username: user.username || email.split('@')[0],
    walletAlias: user.walletAlias || 'Principal',
    ens: user.ens || email.split('@')[0],
  }
}
export function ensureAccounts(): Promise<void> {
  if (seeding) return seeding
  if (accounts.users.length) return Promise.resolve()
  return (seeding ??= (async () => {
    for (const [id, name, email] of [
      ['user-bruno', 'Bruno', 'bruno@example.test'],
      ['user-jade', 'Jade', 'jade@example.test'],
    ]) {
      const salt = crypto.randomUUID()
      accounts.users.push({
        id,
        name,
        email,
        phone: '11987654321',
        avatar: '',
        salt,
        passwordHash: await passwordHash('Kurio123!', salt),
      })
      accounts.wallets[id] = [createDefaultWallet(id)]
      accounts.favorites[id] = []
    }
    saveAccounts()
  })())
}
registerReset(() => {
  for (const timer of orderTimers.values()) clearTimeout(timer)
  orderTimers.clear()
  accounts = empty()
  seeding = undefined
  saveAccounts()
  if (typeof localStorage.key === 'function')
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const name = localStorage.key(i)
      if (name?.startsWith('kurio:')) localStorage.removeItem(name)
    }
})
