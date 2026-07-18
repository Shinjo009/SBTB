import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import { adminApi } from '@/services/api/admin'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { getErrorMessage } from '@/services/api/client'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatCurrency, formatDateTime, getImageUrl } from '@/lib/utils'

export default function AdminPendingPaymentsPage() {
  useDocumentTitle('Pending Payments')
  const { toast } = useToast()
  const qc = useQueryClient()
  const [declineId, setDeclineId] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  const { data: payments, isLoading } = useQuery({
    queryKey: ['admin', 'pending-payments'],
    queryFn: adminApi.getPendingPayments,
  })

  const approveMutation = useMutation({
    mutationFn: adminApi.approvePayment,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'pending-payments'] })
      toast('Payment approved', 'success')
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  })

  const declineMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      adminApi.declinePayment(id, reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'pending-payments'] })
      setDeclineId(null)
      setReason('')
      toast('Payment declined', 'info')
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  })

  const confirmApprove = (id: string) => {
    if (window.confirm('Approve this payment? This cannot be undone.')) {
      approveMutation.mutate(id)
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Pending Payment Verification</h1>
      <div className="mt-6 space-y-4">
        {isLoading ? (
          <p className="text-ink/50">Loading...</p>
        ) : payments?.length === 0 ? (
          <p className="text-ink/50">No pending payments</p>
        ) : (
          payments?.map((p) => (
            <div key={p.id} className="rounded-2xl border border-rose/15 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">#{p.order_number}</p>
                  <p className="text-sm text-ink/50">
                    {p.customer} · {p.email} · {p.phone}
                  </p>
                  <p className="text-sm text-ink/50">
                    Submitted {p.submitted_at ? formatDateTime(p.submitted_at) : '—'}
                  </p>
                </div>
                <p className="font-semibold">{formatCurrency(p.amount)}</p>
              </div>
              <ul className="mt-2 text-sm text-ink/70">
                {p.items?.map((item, idx) => (
                  <li key={idx}>
                    {item.name} × {item.qty}
                  </li>
                ))}
              </ul>
              <div className="mt-3 rounded-lg bg-rose-light/10 p-3 text-sm">
                <p>
                  UTR: <span className="font-mono">{p.upi_reference || '—'}</span>
                </p>
                {p.screenshot_url && (
                  <a
                    href={getImageUrl(p.screenshot_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-rose-dark underline"
                  >
                    View screenshot
                  </a>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => confirmApprove(p.id)} loading={approveMutation.isPending}>
                  <Check className="h-4 w-4" /> Approve
                </Button>
                <Button size="sm" variant="danger" onClick={() => setDeclineId(p.id)}>
                  <X className="h-4 w-4" /> Decline
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={!!declineId} onClose={() => setDeclineId(null)} title="Decline Payment">
        <p className="text-sm text-ink/60">
          Payment verification was unsuccessful. Optionally add a reason for the customer email.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          rows={3}
          className="mt-3 w-full rounded-xl border border-rose/30 px-4 py-2.5 text-sm outline-none"
        />
        <div className="mt-4 flex gap-2">
          <Button
            variant="danger"
            loading={declineMutation.isPending}
            onClick={() => declineId && declineMutation.mutate({ id: declineId, reason })}
          >
            Confirm Decline
          </Button>
          <Button variant="ghost" onClick={() => setDeclineId(null)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  )
}
