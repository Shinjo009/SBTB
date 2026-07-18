import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Minus, Plus, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { BackButton } from '@/components/ui/BackButton'
import { Skeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { productsApi } from '@/services/api/products'
import { cartApi } from '@/services/api/cart'
import { useAuth } from '@/hooks/useAuth'
import { getErrorMessage } from '@/services/api/client'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatCurrency, getImageUrl } from '@/lib/utils'

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [qty, setQty] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productsApi.getProduct(slug!),
    enabled: !!slug,
  })

  useDocumentTitle(product?.name ?? 'Product')

  const addMutation = useMutation({
    mutationFn: () => cartApi.addItem(product!.id, qty),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] })
      toast('Added to cart!', 'success')
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  })

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="aspect-square" />
        <div className="space-y-4"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-6 w-1/3" /><Skeleton className="h-32" /></div>
      </div>
    )
  }

  if (!product) return <p>Product not found</p>

  const outOfStock = product.available_stock <= 0
  const images = product.images.length ? product.images : [{ id: '0', url: '', alt_text: product.name, sort_order: 0, is_primary: true }]

  const handleAdd = () => {
    if (!user) { navigate('/login'); return }
    if (!user.email_verified) { toast('Please verify your email first', 'error'); return }
    addMutation.mutate()
  }

  return (
    <div>
      <BackButton to="/shop" />
      <div className="grid gap-8 md:grid-cols-2">
      <div>
        <div className="aspect-square overflow-hidden rounded-2xl bg-rose-light/20">
          <img
            src={getImageUrl(images[selectedImage]?.url)}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        </div>
        {images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setSelectedImage(i)}
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === selectedImage ? 'border-rose' : 'border-transparent'}`}
              >
                <img src={getImageUrl(img.url)} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex flex-wrap gap-2">
          {product.is_new_arrival && <Badge variant="lilac">New</Badge>}
          {product.is_best_seller && <Badge variant="sage">Best Seller</Badge>}
          {outOfStock && <Badge variant="danger">Sold Out</Badge>}
        </div>
        <h1 className="mt-2 font-display text-2xl font-semibold">{product.name}</h1>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xl font-semibold">{formatCurrency(product.price)}</span>
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="text-ink/40 line-through">{formatCurrency(product.compare_at_price)}</span>
          )}
        </div>
        {product.short_description && (
          <p className="mt-4 text-ink/70">{product.short_description}</p>
        )}
        {product.description && (
          <p className="mt-2 text-sm text-ink/60 whitespace-pre-line">{product.description}</p>
        )}

        {!outOfStock && (
          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center rounded-xl border border-rose/30">
              <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="p-2.5 hover:bg-rose-light/20">
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center font-medium">{qty}</span>
              <button type="button" onClick={() => setQty(Math.min(product.available_stock, qty + 1))} className="p-2.5 hover:bg-rose-light/20">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <span className="text-sm text-ink/50">{product.available_stock} available</span>
          </div>
        )}

        <Button
          size="lg"
          className="mt-6 w-full sm:w-auto"
          disabled={outOfStock}
          loading={addMutation.isPending}
          onClick={handleAdd}
        >
          <ShoppingBag className="h-4 w-4" /> Add to Cart
        </Button>
      </div>
      </div>
    </div>
  )
}
