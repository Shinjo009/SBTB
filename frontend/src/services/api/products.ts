import { apiClient } from './client'
import type { Category, Page, Product, StoreSettings } from '@/types'

export interface ProductFilters {
  q?: string
  category?: string
  sort?: string
  min_price?: number
  max_price?: number
  in_stock?: boolean
  featured?: boolean
  new_arrival?: boolean
  best_seller?: boolean
  page?: number
  page_size?: number
}

export const productsApi = {
  getCategories: () =>
    apiClient.get<Category[]>('/categories').then((r) => r.data),

  getProducts: (filters: ProductFilters = {}) =>
    apiClient.get<Page<Product>>('/products', { params: filters }).then((r) => r.data),

  getProduct: (slug: string) =>
    apiClient.get<Product>(`/products/${slug}`).then((r) => r.data),

  getStoreSettings: () =>
    apiClient.get<StoreSettings>('/settings/store').then((r) => r.data),
}
