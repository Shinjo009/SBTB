import { apiClient } from './client'
import type { Cart } from '@/types'

export const cartApi = {
  get: () => apiClient.get<Cart>('/cart').then((r) => r.data),

  addItem: (productId: string, quantity = 1) =>
    apiClient.post<Cart>('/cart/items', { product_id: productId, quantity }).then((r) => r.data),

  updateItem: (itemId: string, quantity: number) =>
    apiClient.patch<Cart>(`/cart/items/${itemId}`, { quantity }).then((r) => r.data),

  removeItem: (itemId: string) =>
    apiClient.delete<Cart>(`/cart/items/${itemId}`).then((r) => r.data),

  clear: () => apiClient.delete<Cart>('/cart').then((r) => r.data),
}
