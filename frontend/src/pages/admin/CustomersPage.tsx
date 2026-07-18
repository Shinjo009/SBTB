import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/services/api/admin'
import { Badge } from '@/components/ui/Badge'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatDate } from '@/lib/utils'

export default function AdminCustomersPage() {
  useDocumentTitle('Admin Customers')

  const { data: customers, isLoading } = useQuery({
    queryKey: ['admin', 'customers'],
    queryFn: adminApi.getCustomers,
  })

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Customers</h1>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-rose/15 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rose/10 text-left text-ink/60">
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Orders</th>
              <th className="p-3">Joined</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="p-3 text-ink/50">Loading...</td></tr>
            ) : customers?.map((c) => (
              <tr key={c.id} className="border-b border-rose/5">
                <td className="p-3 font-medium">{c.full_name}</td>
                <td className="p-3 text-ink/60">{c.email}</td>
                <td className="p-3">{c.order_count}</td>
                <td className="p-3 text-ink/60">{formatDate(c.created_at)}</td>
                <td className="p-3">
                  <Badge variant={c.email_verified ? 'success' : 'warning'}>
                    {c.email_verified ? 'Verified' : 'Unverified'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
