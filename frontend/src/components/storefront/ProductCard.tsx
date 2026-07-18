import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/Badge'
import { cn, formatCurrency, getImageUrl, prefersReducedMotion } from '@/lib/utils'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
  className?: string
}

export function ProductCard({ product, className }: ProductCardProps) {
  const image = product.images.find((i) => i.is_primary) ?? product.images[0]
  const outOfStock = product.available_stock <= 0

  return (
    <motion.div
      whileHover={prefersReducedMotion() ? undefined : { y: -4 }}
      className={cn('group', className)}
    >
      <Link to={`/products/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-rose-light/20">
          <img
            src={getImageUrl(image?.url)}
            alt={image?.alt_text ?? product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            {product.is_new_arrival && <Badge variant="lilac">New</Badge>}
            {product.is_best_seller && <Badge variant="sage">Best Seller</Badge>}
            {outOfStock && <Badge variant="danger">Sold Out</Badge>}
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <h3 className="font-medium text-ink line-clamp-1">{product.name}</h3>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-ink">{formatCurrency(product.price)}</span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className="text-sm text-ink/40 line-through">
                {formatCurrency(product.compare_at_price)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
