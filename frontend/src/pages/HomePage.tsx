import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import logo from '@/assets/logo.png'
import { ProductCard } from '@/components/storefront/ProductCard'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { productsApi } from '@/services/api/products'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { prefersReducedMotion } from '@/lib/utils'

export default function HomePage() {
  useDocumentTitle('Home')

  const { data: newDrops, isLoading: loadingNew } = useQuery({
    queryKey: ['products', 'new'],
    queryFn: () => productsApi.getProducts({ new_arrival: true, page_size: 8 }),
  })

  const { data: bestSellers, isLoading: loadingBest } = useQuery({
    queryKey: ['products', 'best'],
    queryFn: () => productsApi.getProducts({ best_seller: true, page_size: 8 }),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: productsApi.getCategories,
  })

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-light/40 via-ivory to-lilac/20 px-6 py-12 text-center">
        <div className="absolute -left-10 top-0 h-40 w-40 rounded-full bg-rose/20 blur-3xl" />
        <div className="absolute -right-10 bottom-0 h-40 w-40 rounded-full bg-sage/20 blur-3xl" />
        <motion.div
          initial={prefersReducedMotion() ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mx-auto max-w-lg"
        >
          <div className="mx-auto mb-6 inline-block rounded-full bg-white/60 p-4 shadow-md">
            <img src={logo} alt="" className="h-20 w-20 rounded-full object-cover" />
          </div>
          <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
            Pastel scrunchies for every mood
          </h1>
          <p className="mt-3 text-ink/60">
            Soft, premium, and totally Instagram-worthy. New drops every week.
          </p>
          <Link to="/shop" className="mt-6 inline-block">
            <Button size="lg">
              Shop Now <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-lilac" /> New Drops
          </h2>
          <Link to="/shop?sort=newest" className="text-sm text-rose-dark hover:underline">View all</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {loadingNew
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)
            : newDrops?.items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Best Sellers</h2>
          <Link to="/shop?sort=popular" className="text-sm text-rose-dark hover:underline">View all</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {loadingBest
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)
            : bestSellers?.items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {categories && categories.length > 0 && (
        <section>
          <h2 className="mb-4 font-display text-xl font-semibold">Shop by Category</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                to={`/shop?category=${c.slug}`}
                className="shrink-0 rounded-2xl border border-rose/20 bg-white px-6 py-4 text-sm font-medium hover:bg-rose-light/20 transition"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-3xl bg-ink px-6 py-10 text-center text-ivory">
        <h2 className="font-display text-2xl font-semibold">Our Story</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-ivory/70">
          Born from a love of soft fabrics and cute aesthetics, Scrunchies By The Bunch creates
          premium hair accessories for the Gen-Z girl who wants style without compromise.
        </p>
      </section>

      <section className="rounded-3xl border border-rose/20 bg-gradient-to-r from-rose-light/30 to-lilac/20 px-6 py-10 text-center">
        <h2 className="font-display text-xl font-semibold">Join the bunch</h2>
        <p className="mt-2 text-sm text-ink/60">Be first to know about new drops & exclusive offers</p>
        <div className="mx-auto mt-4 flex max-w-sm gap-2">
          <input
            type="email"
            placeholder="your@email.com"
            className="flex-1 rounded-xl border border-rose/30 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose"
          />
          <Button>Subscribe</Button>
        </div>
      </section>
    </div>
  )
}
