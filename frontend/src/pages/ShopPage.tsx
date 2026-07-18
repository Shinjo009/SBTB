import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { ProductCard } from '@/components/storefront/ProductCard'
import { BackButton } from '@/components/ui/BackButton'
import { Skeleton } from '@/components/ui/Skeleton'
import { productsApi } from '@/services/api/products'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const sortOptions = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Popular' },
]

export default function ShopPage() {
  useDocumentTitle('Shop')
  const [params, setParams] = useSearchParams()

  const filters = useMemo(() => ({
    q: params.get('q') ?? undefined,
    category: params.get('category') ?? undefined,
    sort: params.get('sort') ?? 'newest',
    in_stock: params.get('in_stock') === 'true' ? true : undefined,
    page: Number(params.get('page') ?? 1),
    page_size: 12,
  }), [params])

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: productsApi.getCategories,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['products', filters],
    queryFn: () => productsApi.getProducts(filters),
  })

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }

  return (
    <div>
      <BackButton to="/home" />
      <h1 className="font-display text-2xl font-semibold">Shop</h1>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
          <input
            type="search"
            placeholder="Search scrunchies..."
            defaultValue={filters.q}
            onChange={(e) => setFilter('q', e.target.value)}
            className="w-full rounded-xl border border-rose/30 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-rose"
          />
        </div>
        <select
          value={filters.sort}
          onChange={(e) => setFilter('sort', e.target.value)}
          className="rounded-xl border border-rose/30 bg-white px-4 py-2.5 text-sm outline-none"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {categories && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setFilter('category', '')}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm ${!filters.category ? 'bg-rose text-white' : 'bg-rose-light/30'}`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilter('category', c.slug)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm ${filters.category === c.slug ? 'bg-rose text-white' : 'bg-rose-light/30'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)
          : data?.items.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>

      {!isLoading && data?.items.length === 0 && (
        <p className="mt-8 text-center text-ink/50">No products found</p>
      )}

      {data && data.pages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: data.pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setFilter('page', String(p))}
              className={`h-9 w-9 rounded-lg text-sm ${p === data.page ? 'bg-rose text-white' : 'bg-rose-light/30'}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
