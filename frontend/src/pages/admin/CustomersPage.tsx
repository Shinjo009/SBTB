import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { adminApi } from '@/services/api/admin'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { getErrorMessage } from '@/services/api/client'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatDate } from '@/lib/utils'

function isStaffCustomer(roles?: string[]) {
  return Boolean(roles?.some((r) => r === 'ADMIN' || r === 'MANAGER'))
}

export default function AdminCustomersPage() {
  useDocumentTitle('Admin Customers')
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')

  const { data: customers, isLoading } = useQuery({
    queryKey: ['admin', 'customers'],
    queryFn: adminApi.getCustomers,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createCustomer({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        password,
      }),
    onSuccess: () => {
      toast('Customer created — they can sign in with email and password', 'success')
      setFullName('')
      setEmail('')
      setPhone('')
      setPassword('')
      queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] })
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteCustomer,
    onSuccess: (res) => {
      toast(res.message || 'Customer deleted', 'info')
      queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] })
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  })

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Customers</h1>
      <p className="mt-1 text-sm text-ink/60">
        Create a customer with email and password so they can sign in.
      </p>

      <form
        className="mt-6 grid gap-3 rounded-2xl border border-rose/15 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (!fullName.trim() || !email.trim() || password.length < 8) {
            toast('Name, email, and password (8+ chars) are required', 'error')
            return
          }
          createMutation.mutate()
        }}
      >
        <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="flex items-end">
          <Button type="submit" loading={createMutation.isPending} className="w-full">
            Add customer
          </Button>
        </div>
      </form>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-rose/15 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rose/10 text-left text-ink/60">
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Orders</th>
              <th className="p-3">Joined</th>
              <th className="p-3">Status</th>
              <th className="p-3"> </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="p-3 text-ink/50">Loading...</td></tr>
            ) : customers?.length ? customers.map((c) => (
              <tr key={c.id} className="border-b border-rose/5">
                <td className="p-3 font-medium">{c.full_name}</td>
                <td className="p-3 text-ink/60">{c.email}</td>
                <td className="p-3">{c.order_count}</td>
                <td className="p-3 text-ink/60">{formatDate(c.created_at)}</td>
                <td className="p-3">
                  <Badge variant={c.email_verified ? 'success' : 'warning'}>
                    {c.email_verified ? 'Active' : 'Pending'}
                  </Badge>
                </td>
                <td className="p-3 text-right">
                  {!isStaffCustomer(c.roles) && (
                    <button
                      type="button"
                      title="Delete customer"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (!window.confirm(`Delete account for ${c.email}?`)) return
                        deleteMutation.mutate(c.id)
                      }}
                      className="text-red-400 hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="p-3 text-ink/50">No customers yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
