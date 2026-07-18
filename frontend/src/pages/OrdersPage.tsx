import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/Badge'
import { BackButton } from '@/components/ui/BackButton'
import { Skeleton } from '@/components/ui/Skeleton'
import { ordersApi } from '@/services/api/orders'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { OrderStatus } from '@/types'

const statusVariant: Record<OrderStatus, 'default' | 'warning' | 'success' | 'danger' | 'sage' | 'lilac'> = {
  PENDING_PAYMENT: 'warning',
  PAYMENT_SUBMITTED: 'warning',
  PAYMENT_VERIFICATION_PENDING: 'lilac',
  PAID: 'success',
  PROCESSING: 'sage',
  SHIPPED: 'lilac',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  PAYMENT_DECLINED: 'danger',
  PAYMENT_EXPIRED: 'danger',
}

export default function OrdersPage() {
  useDocumentTitle('Orders')

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: ordersApi.getOrders,
  })

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>

  if (!orders?.length) {
    return (
      <div>
        <BackButton to="/home" />
        <div className="py-16 text-center">
          <p className="text-ink/50">No orders yet</p>
          <Link to="/shop" className="mt-4 inline-block text-rose-dark hover:underline">Start shopping</Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <BackButton to="/home" />
      <h1 className="font-display text-2xl font-semibold">Your Orders</h1>
      <div className="mt-6 space-y-3">
        {orders.map((order) => (
          <Link
            key={order.id}
            to={`/orders/${order.id}`}
            className="block rounded-2xl border border-rose/15 bg-white p-4 transition hover:border-rose/30"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">#{order.order_number}</p>
                <p className="text-sm text-ink/50">{formatDate(order.created_at)}</p>
              </div>
              <Badge variant={statusVariant[order.status] ?? 'default'}>
                {order.status.replace('_', ' ')}
              </Badge>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-ink/60">{order.items.length} item(s)</span>
              <span className="font-semibold">{formatCurrency(order.total)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
