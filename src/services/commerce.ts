import { http } from './http'
import type {
  Cart,
  CartLine,
  Collector,
  Network,
  Order,
  OrderRequest,
  PasswordInput,
  Quote,
  RegisterInput,
  Session,
  User,
  Wallet,
} from '@/types/contracts'
export const accountApi = {
  async session(signal?: AbortSignal) {
    return (
      await http.get<Session | { user: null }>('/auth/session', { signal })
    ).data
  },
  async login(input: { email: string; password: string }) {
    return (await http.post<Session>('/auth/login', input)).data
  },
  async register(input: RegisterInput) {
    return (await http.post<Session>('/auth/register', input)).data
  },
  async social(provider: 'google' | 'facebook') {
    return (await http.post<Session>('/auth/social', { provider })).data
  },
  async logout() {
    await http.post('/auth/logout', {})
  },
  async profile(signal?: AbortSignal) {
    return (await http.get<User>('/profile', { signal })).data
  },
  async updateProfile(input: Omit<User, 'id'>) {
    return (await http.patch<User>('/profile', input)).data
  },
  async password(input: PasswordInput) {
    await http.put('/profile/password', input)
  },
  async wallets(signal?: AbortSignal) {
    return (await http.get<Wallet[]>('/wallets', { signal })).data
  },
  async saveWallet(input: Omit<Wallet, 'id' | 'connected'>, id?: string) {
    return (
      await http.request<Wallet[]>({
        method: id ? 'PATCH' : 'POST',
        url: id ? `/wallets/${encodeURIComponent(id)}` : '/wallets',
        data: input,
      })
    ).data
  },
  async walletConnection(
    id: string,
    action: 'connect' | 'disconnect' | 'refuse',
  ) {
    return (
      await http.post<Wallet>(`/wallets/${encodeURIComponent(id)}/connection`, {
        action,
      })
    ).data
  },
  async favorites(signal?: AbortSignal) {
    return (await http.get<string[]>('/favorites', { signal })).data
  },
  async favorite(id: string, active: boolean) {
    return (
      await http.request<string[]>({
        method: active ? 'PUT' : 'DELETE',
        url: `/favorites/${encodeURIComponent(id)}`,
        data: active ? {} : undefined,
      })
    ).data
  },
}
export const commerceApi = {
  async cart(network: Network = 'ethereum', signal?: AbortSignal) {
    return (await http.get<Cart>('/cart', { params: { network }, signal })).data
  },
  async add(line: CartLine) {
    return (await http.post<Cart>('/cart/items', line)).data
  },
  async quantity(line: CartLine) {
    return (
      await http.patch<Cart>(
        `/cart/items/${encodeURIComponent(line.nftId)}/${encodeURIComponent(line.editionId)}`,
        { quantity: line.quantity },
      )
    ).data
  },
  async remove(line: Pick<CartLine, 'nftId' | 'editionId'>) {
    return (
      await http.delete<Cart>(
        `/cart/items/${encodeURIComponent(line.nftId)}/${encodeURIComponent(line.editionId)}`,
      )
    ).data
  },
  async coupon(code: string) {
    return (await http.put<Cart>('/cart/coupon', { code })).data
  },
  async quote(network: Network) {
    return (await http.post<Quote>('/quotes', { network })).data
  },
  async order(input: OrderRequest, key: string) {
    return (
      await http.post<Order>('/orders', input, {
        headers: { 'Idempotency-Key': key },
      })
    ).data
  },
  async orderByAttempt(key: string, signal?: AbortSignal) {
    return (
      await http.get<Order>(`/orders/by-attempt/${encodeURIComponent(key)}`, {
        signal,
      })
    ).data
  },
  async getOrder(id: string, signal?: AbortSignal) {
    return (
      await http.get<Order>(`/orders/${encodeURIComponent(id)}`, { signal })
    ).data
  },
  async orders(signal?: AbortSignal) {
    return (await http.get<Order[]>('/orders', { signal })).data
  },
}
export interface CheckoutDraft {
  collector: Collector
  walletId: string
  network: Network
}
