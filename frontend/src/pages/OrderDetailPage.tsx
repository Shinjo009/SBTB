import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Badge } from '@/components/ui/Badge'
import { BackButton } from '@/components/ui/BackButton'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { ordersApi } from '@/services/api/orders'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatCurrency, formatDateTime } from '@/lib/utils'
export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getOrder(id!),
    enabled: !!id,
  })

  useDocumentTitle(order ? `Order ${order.order_number}` : 'Order')

  const retryMutation = useMutation({
    mutationFn: () => ordersApi.retryPayment(order!.payment!.id),
    onSuccess: (data) => navigate(`/payment/${data.payment.id}`, { state: { checkout: data } }),
  })

  if (isLoading) return <Skeleton className="h-64" />
  if (!order) return <p>Order not found</p>

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <BackButton to="/orders" />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">#{order.order_number}</h1>
          <p className="text-sm text-ink/50">{formatDateTime(order.created_at)}</p>
        </div>
        <Badge>{order.status.replace(/_/g, ' ')}</Badge>
      </div>

      {order.timeline && order.timeline.length > 0 && (
        <section className="rounded-2xl border border-rose/15 bg-white p-4">
          <h2 className="font-medium">Order Timeline</h2>
          <div className="mt-4 space-y-4">
            {order.timeline.map((event, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`h-3 w-3 rounded-full ${i === 0 ? 'bg-rose' : 'bg-rose-light'}`} />
                  {i < order.timeline!.length - 1 && <div className="w-0.5 flex-1 bg-rose-light/50" />}
                </div>
                <div className="pb-4">
                  <p className="text-sm font-medium">{event.to_status.replace(/_/g, ' ')}</p>
                  {event.note && <p className="text-xs text-ink/50">{event.note}</p>}
                  <p className="text-xs text-ink/40">{formatDateTime(event.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-rose/15 bg-white p-4">
        <h2 className="font-medium">Items</h2>
        <div className="mt-3 space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>{item.product_name} × {item.quantity}</span>
              <span>{formatCurrency(item.line_total)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1 border-t border-rose/10 pt-3 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
          <div className="flex justify-between"><span>Shipping</span><span>{formatCurrency(order.shipping_amount)}</span></div>
          <div className="flex justify-between font-semibold"><span>Total</span><span>{formatCurrency(order.total)}</span></div>
        </div>
      </section>

      <section className="rounded-2xl border border-rose/15 bg-white p-4 text-sm">
        <h2 className="font-medium">Shipping To</h2>
        <p className="mt-2">{order.shipping.full_name}</p>
        <p className="text-ink/60">{order.shipping.line1}{order.shipping.line2 ? `, ${order.shipping.line2}` : ''}</p>
        <p className="text-ink/60">{order.shipping.city}, {order.shipping.state} {order.shipping.postal_code}</p>
        <p className="text-ink/60">{order.shipping.phone}</p>
      </section>

      {order.status === 'PENDING_PAYMENT' && order.payment && (
        <div className="flex gap-3">
          <Link to={`/payment/${order.payment.id}`} className="flex-1">
            <Button className="w-full">Complete Payment</Button>
          </Link>
          <Button variant="outline" loading={retryMutation.isPending} onClick={() => retryMutation.mutate()}>
            Retry
          </Button>
        </div>
      )}
    </div>
  )
}
