import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { adminApi } from '@/services/api/admin'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatCurrency } from '@/lib/utils'

export default function AdminProductsPage() {
  useDocumentTitle('Admin Products')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'products'],
    queryFn: () => adminApi.getProducts({ page_size: 50 }),
  })

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Products</h1>
        <Link to="/admin/products/new">
          <Button size="sm"><Plus className="h-4 w-4" /> Add Product</Button>
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-rose/15 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rose/10 text-left text-ink/60">
              <th className="p-3">Name</th>
              <th className="p-3">SKU</th>
              <th className="p-3">Price</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="p-3"><Skeleton className="h-8" /></td></tr>
                ))
              : data?.items.map((p) => (
                  <tr key={p.id} className="border-b border-rose/5 hover:bg-rose-light/5">
                    <td className="p-3">
                      <Link to={`/admin/products/${p.id}`} className="font-medium hover:text-rose-dark">{p.name}</Link>
                    </td>
                    <td className="p-3 text-ink/60">{p.sku}</td>
                    <td className="p-3">{formatCurrency(p.price)}</td>
                    <td className="p-3">{p.available_stock}</td>
                    <td className="p-3"><Badge variant={p.status === 'ACTIVE' ? 'success' : 'default'}>{p.status}</Badge></td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
