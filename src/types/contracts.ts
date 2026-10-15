// ETH trafega como string. Os cálculos monetários usam wei/BigInt.
export type Eth = string
export type Category =
  | 'art'
  | 'photography'
  | 'music'
  | '3d'
  | 'collectibles'
  | 'generative'
  | 'gaming'
  | 'membership'
  | 'utility'
export type Collection = 'cosmos' | 'origins' | 'horizons'
export type Network = 'ethereum' | 'polygon' | 'solana'
export type Sort = 'recent' | 'price-asc' | 'price-desc' | 'name'

export interface Edition {
  id: string
  name: string
  price: Eth
  available: number
}

export interface Nft {
  id: string
  name: string
  description: string
  creator: string
  collection: Collection
  category: Category
  image: string
  gallery: string[]
  mobileImage?: string
  authImage?: string
  recommendationRank?: number
  network: Network
  token: string
  attributes: string[]
  rating: string
  reviewCount: number
  imageWidth: number
  imageHeight: number
  createdAt: string
  editions: Edition[]
  version: number
}

export interface CatalogSearch {
  q: string
  collection: Collection | 'all'
  category: Category | 'all'
  sort: Sort
  page: number
  available: boolean
  network: Network | 'all'
  priceMin: string
  priceMax: string
  view: 'all' | 'new' | 'trending'
}

export interface PageResponse<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  facets?: {
    categories: Record<Category, number>
    networks: Record<Network, number>
  }
}

export interface ApiError {
  code: string
  message: string
  fields?: Record<string, string>
}

export interface NftUpdatedEvent {
  eventId: string
  resourceId: string
  version: number
  nft: Nft
}

export type Scenario =
  | 'standard'
  | 'slow'
  | 'variable'
  | 'empty'
  | 'http-error'
  | 'network-error'
  | BusinessScenario
export interface MockConfig {
  scenario: Scenario
}

export interface User {
  id: string
  name: string
  email: string
  phone: string
  avatar: string
  username?: string
  walletAlias?: string
  ens?: string
}
export interface Session {
  token: string
  user: User
  expiresAt: number
  cartNotice?: string
}
export interface Collector {
  name: string
  email: string
  phone: string
  acceptTerms: boolean
  username?: string
  profileName?: string
  referralCode?: string
  ens?: string
  note?: string
  secondary?: string
}
export interface Wallet {
  id: string
  name: string
  address: string
  network: Network
  primary: boolean
  connected: boolean
  provider?: 'metamask' | 'walletconnect' | 'coinbase'
  displayName?: string
  profileName?: string
  email?: string
  ens?: string
  referralCode?: string
  secondary?: string
}
export interface CartLine {
  nftId: string
  editionId: string
  quantity: number
}
export interface ReceiptItem extends CartLine {
  key: string
  name: string
  image: string
  edition: string
  unitPrice: Eth
  subtotal: Eth
  available: number
  version: number
  token?: string
}
export interface Totals {
  subtotal: Eth
  discount: Eth
  networkFee: Eth
  total: Eth
}
export interface Cart extends Totals {
  revision: number
  coupon: string
  items: ReceiptItem[]
  warnings: string[]
}
export interface Quote extends Cart {
  id: string
  ownerId: string
  network: Network
  expiresAt: number
  fingerprint: string
}
export type OrderStatus = 'pending' | 'confirmed' | 'rejected'
export interface Order {
  id: string
  ownerId: string
  status: OrderStatus
  version: number
  createdAt: string
  transaction: string
  reason: string
  quote: Quote
  collector: Collector
  wallet: Wallet
}
export interface OrderRequest {
  quoteId: string
  walletId: string
  collector: Collector
  walletProvider?: Wallet['provider']
}
export interface OrderUpdatedEvent {
  eventId: string
  resourceId: string
  userId: string
  version: number
  order: Order
}
export interface RegisterInput {
  name: string
  email: string
  password: string
  confirmPassword: string
  acceptTerms?: boolean
}
export interface PasswordInput {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}
export type BusinessScenario =
  | 'favorite-error'
  | 'payment-rejected'
  | 'order-timeout'
  | 'order-pending'
  | 'wallet-refused'
  | 'validation-error'
