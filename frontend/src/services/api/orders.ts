import { apiClient } from './client'
import type { Address, CheckoutResponse, Order } from '@/types'
import type { AddressInput } from '@/validation/auth'

export const ordersApi = {
  getAddresses: () =>
    apiClient.get<Address[]>('/addresses').then((r) => r.data),

  createAddress: (data: AddressInput) =>
    apiClient.post<Address>('/addresses', data).then((r) => r.data),

  createOrder: (addressId: string, idempotencyKey?: string) =>
    apiClient
      .post<CheckoutResponse>(
        '/checkout/create-order',
        { address_id: addressId },
        idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined,
      )
      .then((r) => r.data),

  getOrders: () => apiClient.get<Order[]>('/orders').then((r) => r.data),

  getOrder: (id: string) =>
    apiClient.get<Order>(`/orders/${id}`).then((r) => r.data),

  submitPayment: (paymentId: string, formData: FormData) =>
    apiClient
      .post<{ id: string; status: string; message: string }>(
        `/payments/${paymentId}/submit`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      .then((r) => r.data),

  retryPayment: (paymentId: string) =>
    apiClient.post<CheckoutResponse>(`/payments/${paymentId}/retry`).then((r) => r.data),
}
