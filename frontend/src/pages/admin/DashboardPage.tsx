import { useQuery } from '@tanstack/react-query'
import { Package, CreditCard, ShoppingCart, Users, AlertTriangle, IndianRupee } from 'lucide-react'
import { adminApi } from '@/services/api/admin'
import { Skeleton } from '@/components/ui/Skeleton'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatCurrency } from '@/lib/utils'

const statCards = [
  { key: 'total_orders' as const, label: 'Total Orders', icon: ShoppingCart, color: 'text-rose' },
  { key: 'revenue' as const, label: 'Revenue', icon: IndianRupee, color: 'text-green-600', format: formatCurrency },
  { key: 'pending_payments' as const, label: 'Pending Payments', icon: CreditCard, color: 'text-amber-600' },
  { key: 'processing_orders' as const, label: 'Processing', icon: Package, color: 'text-blue-600' },
  { key: 'low_stock_products' as const, label: 'Low Stock', icon: AlertTriangle, color: 'text-red-500' },
  { key: 'total_customers' as const, label: 'Customers', icon: Users, color: 'text-lilac' },
]

export default function AdminDashboardPage() {
  useDocumentTitle('Admin Dashboard')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: adminApi.getDashboard,
  })

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Dashboard</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {statCards.map(({ key, label, icon: Icon, color, format }) => (
          <div key={key} className="rounded-2xl border border-rose/15 bg-white p-4">
            {isLoading ? (
              <Skeleton className="h-16" />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${color}`} />
                  <span className="text-sm text-ink/60">{label}</span>
                </div>
                <p className="mt-2 text-2xl font-semibold">
                  {format ? format(data![key]) : data![key]}
                </p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
