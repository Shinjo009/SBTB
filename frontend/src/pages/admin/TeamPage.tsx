import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Shield } from 'lucide-react'
import { adminApi } from '@/services/api/admin'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { getErrorMessage } from '@/services/api/client'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatDate } from '@/lib/utils'

export default function AdminTeamPage() {
  useDocumentTitle('Admin Team')
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'ADMIN' | 'MANAGER'>('MANAGER')

  const { data: team, isLoading } = useQuery({
    queryKey: ['admin', 'team'],
    queryFn: adminApi.getTeam,
  })

  const inviteMutation = useMutation({
    mutationFn: () =>
      adminApi.inviteTeam({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        role,
      }),
    onSuccess: (res) => {
      toast(res.message || 'Team member invited', 'success')
      setFullName('')
      setEmail('')
      setRole('MANAGER')
      queryClient.invalidateQueries({ queryKey: ['admin', 'team'] })
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  })

  return (
    <div>
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-rose-dark" />
        <h1 className="font-display text-2xl font-semibold">Team</h1>
      </div>
      <p className="mt-1 text-sm text-ink/60">
        Invite a second Admin or a Manager. They sign in with email OTP like everyone else.
      </p>

      <form
        className="mt-6 grid gap-3 rounded-2xl border border-rose/15 bg-white p-4 sm:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!fullName.trim() || !email.trim()) {
            toast('Name and email are required', 'error')
            return
          }
          inviteMutation.mutate()
        }}
      >
        <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-ink/80">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'ADMIN' | 'MANAGER')}
            className="w-full rounded-xl border border-rose/30 bg-white px-4 py-2.5 outline-none focus:border-rose"
          >
            <option value="MANAGER">Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button type="submit" loading={inviteMutation.isPending} className="w-full">
            Invite
          </Button>
        </div>
      </form>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-rose/15 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rose/10 text-left text-ink/60">
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Roles</th>
              <th className="p-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="p-3 text-ink/50">Loading...</td></tr>
            ) : team?.length ? team.map((m) => (
              <tr key={m.id} className="border-b border-rose/5">
                <td className="p-3 font-medium">{m.full_name}</td>
                <td className="p-3 text-ink/60">{m.email}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {m.roles.filter((r) => r !== 'CUSTOMER').map((r) => (
                      <Badge key={r} variant={r === 'ADMIN' ? 'success' : 'warning'}>{r}</Badge>
                    ))}
                  </div>
                </td>
                <td className="p-3 text-ink/60">{formatDate(m.created_at)}</td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="p-3 text-ink/50">No team members yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
