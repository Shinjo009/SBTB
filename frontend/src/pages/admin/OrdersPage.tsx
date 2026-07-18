import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { adminApi } from '@/services/api/admin'
import { useToast } from '@/components/ui/Toast'
import { getErrorMessage } from '@/services/api/client'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatCurrency, formatDate } from '@/lib/utils'

const statuses = ['', 'PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

export default function AdminOrdersPage() {
  useDocumentTitle('Admin Orders')
  const [filter, setFilter] = useState('')
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin', 'orders', filter],
    queryFn: () => adminApi.getOrders(filter || undefined),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.updateOrderStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
      toast('Order updated', 'success')
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  })

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Orders</h1>
      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="mt-4 rounded-xl border border-rose/30 px-4 py-2 text-sm"
      >
        {statuses.map((s) => (
          <option key={s} value={s}>{s || 'All statuses'}</option>
        ))}
      </select>

      <div className="mt-6 space-y-2">
        {isLoading ? (
          <p className="text-ink/50">Loading...</p>
        ) : orders?.map((o) => (
          <div key={o.id} className="rounded-xl border border-rose/15 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">#{o.order_number}</p>
                <p className="text-sm text-ink/50">{o.customer} · {formatDate(o.created_at)}</p>
              </div>
              <Badge>{o.status.replace(/_/g, ' ')}</Badge>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-semibold">{formatCurrency(o.total)}</span>
              {o.status === 'PAID' && (
                <Button size="sm" onClick={() => updateMutation.mutate({ id: o.id, status: 'PROCESSING' })}>
                  Mark Processing
                </Button>
              )}
              {o.status === 'PROCESSING' && (
                <Button size="sm" onClick={() => updateMutation.mutate({ id: o.id, status: 'SHIPPED' })}>
                  Mark Shipped
                </Button>
              )}
              {o.status === 'SHIPPED' && (
                <Button size="sm" onClick={() => updateMutation.mutate({ id: o.id, status: 'DELIVERED' })}>
                  Mark Delivered
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
