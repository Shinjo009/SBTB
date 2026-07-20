import { apiClient } from './client'
import type {
  AdminCustomer,
  AdminOrderSummary,
  AdminStoreSettings,
  Category,
  DashboardStats,
  MessageResponse,
  Page,
  PendingPayment,
  Product,
} from '@/types'

export const adminApi = {
  getDashboard: () =>
    apiClient.get<DashboardStats>('/admin/dashboard').then((r) => r.data),

  getCategories: () =>
    apiClient.get<Category[]>('/admin/categories').then((r) => r.data),

  createCategory: (data: Partial<Category>) =>
    apiClient.post<Category>('/admin/categories', data).then((r) => r.data),

  updateCategory: (id: string, data: Partial<Category>) =>
    apiClient.put<Category>(`/admin/categories/${id}`, data).then((r) => r.data),

  deleteCategory: (id: string) =>
    apiClient.delete<MessageResponse>(`/admin/categories/${id}`).then((r) => r.data),

  getProducts: (params: { page?: number; page_size?: number; q?: string } = {}) =>
    apiClient.get<Page<Product>>('/admin/products', { params }).then((r) => r.data),

  getProduct: async (id: string) => {
    const page = await apiClient
      .get<Page<Product>>('/admin/products', { params: { page_size: 100 } })
      .then((r) => r.data)
    const product = page.items.find((p) => p.id === id)
    if (!product) throw new Error('Product not found')
    return product
  },

  createProduct: (data: Partial<Product>) =>
    apiClient.post<Product>('/admin/products', data).then((r) => r.data),

  updateProduct: (id: string, data: Partial<Product>) =>
    apiClient.put<Product>(`/admin/products/${id}`, data).then((r) => r.data),

  uploadProductImage: (productId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return apiClient
      .post<{ id: string; url: string }>(`/admin/products/${productId}/images`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },

  getPendingPayments: () =>
    apiClient.get<PendingPayment[]>('/admin/payments/pending').then((r) => r.data),

  approvePayment: (id: string) =>
    apiClient.post<MessageResponse>(`/admin/payments/${id}/approve`).then((r) => r.data),

  declinePayment: (id: string, reason?: string) =>
    apiClient
      .post<MessageResponse>(`/admin/payments/${id}/decline`, { reason })
      .then((r) => r.data),

  getCustomers: () =>
    apiClient.get<AdminCustomer[]>('/admin/customers').then((r) => r.data),

  createCustomer: (data: { full_name: string; email: string; phone?: string; password: string }) =>
    apiClient.post<AdminCustomer>('/admin/customers', data).then((r) => r.data),

  getTeam: () =>
    apiClient
      .get<{ id: string; full_name: string; email: string; roles: string[]; is_active: boolean; created_at: string }[]>(
        '/admin/team',
      )
      .then((r) => r.data),

  inviteTeam: (data: { full_name: string; email: string; password: string; role: 'ADMIN' | 'MANAGER' }) =>
    apiClient
      .post<{
        id: string
        full_name: string
        email: string
        roles: string[]
        is_active: boolean
        created_at: string
        message?: string
      }>('/admin/team', data)
      .then((r) => r.data),

  getOrders: (status?: string) =>
    apiClient
      .get<AdminOrderSummary[]>('/admin/orders', { params: status ? { status } : {} })
      .then((r) => r.data),

  updateOrderStatus: (id: string, status: string, note?: string) =>
    apiClient
      .patch<{ id: string; status: string }>(`/orders/${id}/status`, { status, note })
      .then((r) => r.data),

  getSettings: () =>
    apiClient.get<AdminStoreSettings>('/admin/settings').then((r) => r.data),

  updateSettings: (data: Partial<AdminStoreSettings>) =>
    apiClient.put<AdminStoreSettings>('/admin/settings', data).then((r) => r.data),

  uploadUpiQr: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return apiClient
      .post<{ upi_qr_url: string }>('/admin/settings/upi-qr', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },
}
