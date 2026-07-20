export type UserRole = 'CUSTOMER' | 'ADMIN'

export interface User {
  id: string
  email: string
  full_name: string
  phone?: string | null
  email_verified: boolean
  roles: UserRole[]
}

export interface AuthResponse {
  user: User
}

export interface TokenPairResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
}

export interface MessageResponse {
  message: string
}

export interface ProductImage {
  id: string
  url: string
  alt_text?: string | null
  sort_order: number
  is_primary: boolean
}

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'

export interface Product {
  id: string
  name: string
  slug: string
  sku: string
  category_id?: string | null
  short_description?: string | null
  description?: string | null
  price: number
  compare_at_price?: number | null
  status: ProductStatus
  currency: string
  is_featured: boolean
  is_new_arrival: boolean
  is_best_seller: boolean
  images: ProductImage[]
  available_stock: number
  on_hand: number
  reserved: number
  low_stock_threshold: number
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string | null
  image_url?: string | null
  sort_order: number
  is_active: boolean
}

export interface CartItem {
  id: string
  product_id: string
  name: string
  slug: string
  price: number
  quantity: number
  line_total: number
  available_stock: number
  image_url?: string | null
}

export interface Cart {
  id: string
  items: CartItem[]
  subtotal: number
  item_count: number
}

export interface Address {
  id: string
  full_name: string
  phone: string
  line1: string
  line2?: string | null
  landmark?: string | null
  city: string
  state: string
  postal_code: string
  country: string
  is_default: boolean
}

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAYMENT_SUBMITTED'
  | 'PAYMENT_VERIFICATION_PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'PAYMENT_DECLINED'
  | 'PAYMENT_EXPIRED'

export type PaymentStatus =
  | 'PENDING'
  | 'SUBMITTED'
  | 'VERIFICATION_PENDING'
  | 'PAID'
  | 'DECLINED'
  | 'EXPIRED'
  | 'CANCELLED'

export interface OrderItem {
  id: string
  product_name: string
  sku: string
  unit_price: number
  quantity: number
  line_total: number
}

export interface ShippingAddress {
  full_name: string
  phone: string
  line1: string
  line2?: string | null
  landmark?: string | null
  city: string
  state: string
  postal_code: string
  country: string
}

export interface PaymentVerification {
  upi_reference: string
  screenshot_url?: string | null
  customer_note?: string | null
}

export interface Payment {
  id: string
  status: PaymentStatus
  amount: number
  reference_code: string
  expires_at: string
  upi_id?: string | null
  upi_qr_url?: string | null
  payment_instructions?: string | null
  submitted_at?: string | null
  verification?: PaymentVerification | null
}

export interface OrderTimeline {
  from_status?: string | null
  to_status: string
  note?: string | null
  created_at: string
}

export interface Order {
  id: string
  order_number: string
  status: OrderStatus
  subtotal: number
  shipping_amount: number
  total: number
  currency: string
  created_at: string
  payment_expires_at?: string | null
  shipping: ShippingAddress
  items: OrderItem[]
  payment?: Payment | null
  timeline?: OrderTimeline[]
}

export interface CheckoutResponse {
  order_id: string
  order_number: string
  status: OrderStatus
  total: number
  currency: string
  payment: Payment
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface StoreSettings {
  store_name: string
  support_email: string
  announcement_banner?: string | null
  shipping_info?: string | null
  is_storefront_live: boolean
}

export interface AdminStoreSettings extends StoreSettings {
  upi_id?: string | null
  upi_qr_url?: string | null
  payment_instructions?: string | null
  low_stock_default: number
}

export interface DashboardStats {
  total_orders: number
  revenue: number
  pending_payments: number
  processing_orders: number
  low_stock_products: number
  total_customers: number
}

export interface AdminCustomer {
  id: string
  full_name: string
  email: string
  phone?: string | null
  email_verified: boolean
  created_at: string
  order_count: number
}

export interface AdminOrderSummary {
  id: string
  order_number: string
  status: OrderStatus
  total: number
  customer: string
  email: string
  created_at: string
}

export interface PendingPayment {
  id: string
  order_id: string
  order_number: string
  customer: string
  email: string
  phone: string
  amount: number
  upi_reference?: string | null
  screenshot_url?: string | null
  submitted_at?: string | null
  expires_at?: string | null
  items: { name: string; qty: number; price: number }[]
}

export interface ApiError {
  detail: string | { msg: string; type: string }[]
}
