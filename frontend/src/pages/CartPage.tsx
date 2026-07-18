import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { BackButton } from '@/components/ui/BackButton'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { cartApi } from '@/services/api/cart'
import { getErrorMessage } from '@/services/api/client'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatCurrency, getImageUrl } from '@/lib/utils'

export default function CartPage() {
  useDocumentTitle('Cart')
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: cartApi.get,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, qty }: { id: string; qty: number }) => cartApi.updateItem(id, qty),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
    onError: (err) => toast(getErrorMessage(err), 'error'),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => cartApi.removeItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] })
      toast('Item removed', 'info')
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  })

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>

  if (!cart?.items.length) {
    return (
      <div>
        <BackButton to="/shop" />
        <div className="py-16 text-center">
          <p className="text-ink/50">Your cart is empty</p>
          <Link to="/shop"><Button className="mt-4">Start Shopping</Button></Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <BackButton to="/shop" />
      <h1 className="font-display text-2xl font-semibold">Your Cart</h1>
      <div className="mt-6 space-y-4">
        {cart.items.map((item) => (
          <div key={item.id} className="flex gap-4 rounded-2xl border border-rose/15 bg-white p-4">
            <Link to={`/products/${item.slug}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-rose-light/20">
              <img src={getImageUrl(item.image_url)} alt={item.name} className="h-full w-full object-cover" />
            </Link>
            <div className="flex flex-1 flex-col">
              <Link to={`/products/${item.slug}`} className="font-medium hover:text-rose-dark">{item.name}</Link>
              <p className="text-sm text-ink/60">{formatCurrency(item.price)}</p>
              <div className="mt-auto flex items-center justify-between">
                <div className="flex items-center rounded-lg border border-rose/20">
                  <button type="button" onClick={() => updateMutation.mutate({ id: item.id, qty: item.quantity - 1 })} disabled={item.quantity <= 1} className="p-1.5 disabled:opacity-30">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm">{item.quantity}</span>
                  <button type="button" onClick={() => updateMutation.mutate({ id: item.id, qty: item.quantity + 1 })} disabled={item.quantity >= item.available_stock} className="p-1.5 disabled:opacity-30">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatCurrency(item.line_total)}</span>
                  <button type="button" onClick={() => removeMutation.mutate(item.id)} className="text-ink/40 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-rose/15 bg-white p-4">
        <div className="flex justify-between text-lg font-semibold">
          <span>Subtotal</span>
          <span>{formatCurrency(cart.subtotal)}</span>
        </div>
        <Button size="lg" className="mt-4 w-full" onClick={() => navigate('/checkout')}>
          Proceed to Checkout
        </Button>
      </div>
    </div>
  )
}
