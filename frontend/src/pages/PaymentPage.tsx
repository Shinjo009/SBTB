import { useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Clock, Copy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { BackButton } from '@/components/ui/BackButton'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { ordersApi } from '@/services/api/orders'
import { getErrorMessage } from '@/services/api/client'
import { useCountdown } from '@/hooks/useCountdown'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { paymentSubmitSchema, type PaymentSubmitInput } from '@/validation/auth'
import { formatCurrency, getImageUrl } from '@/lib/utils'
import type { CheckoutResponse, Payment } from '@/types'

export default function PaymentPage() {
  useDocumentTitle('Payment')
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const checkoutState = (location.state as { checkout?: CheckoutResponse } | null)?.checkout
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [screenshot, setScreenshot] = useState<File | null>(null)

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: ordersApi.getOrders,
  })

  const orderFromList = orders?.find((o) => o.payment?.id === id)
  const fromCheckout = checkoutState?.payment
  const payment: Payment | undefined =
    fromCheckout && fromCheckout.id === id ? fromCheckout : orderFromList?.payment ?? undefined

  const { formatted, expired } = useCountdown(payment?.expires_at ?? null)

  const { register, handleSubmit, formState: { errors } } = useForm<PaymentSubmitInput>({
    resolver: zodResolver(paymentSubmitSchema),
  })

  const submitMutation = useMutation({
    mutationFn: (data: PaymentSubmitInput) => {
      const form = new FormData()
      form.append('upi_reference', data.upi_reference)
      if (data.customer_note) form.append('customer_note', data.customer_note)
      if (screenshot) form.append('screenshot', screenshot)
      return ordersApi.submitPayment(id!, form)
    },
    onSuccess: () => {
      toast('Payment submitted for verification', 'success')
      navigate(`/payment/${id}/pending`)
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  })

  const copyUpi = () => {
    if (payment?.upi_id) {
      void navigator.clipboard.writeText(payment.upi_id)
      toast('UPI ID copied', 'success')
    }
  }

  if (isLoading && !checkoutState) return <Skeleton className="h-64" />

  if (!payment || !id) {
    return (
      <div className="py-16 text-center">
        <p className="text-ink/50">Payment not found. Check your orders.</p>
        <Button className="mt-4" onClick={() => navigate('/orders')}>View Orders</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <BackButton to="/orders" />
      <div className="text-center">
        <h1 className="font-display text-2xl font-semibold">Complete Payment</h1>
        <p className="mt-1 text-sm text-ink/60">Pay via UPI to confirm your order</p>
      </div>

      <div className="rounded-2xl border border-rose/20 bg-white p-6 text-center">
        <p className="text-sm text-ink/60">Amount to pay</p>
        <p className="font-display text-3xl font-semibold">{formatCurrency(payment.amount)}</p>
        <p className="mt-1 text-xs text-ink/50">Ref: {payment.reference_code}</p>
        <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm ${expired ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
          <Clock className="h-4 w-4" />
          {expired ? 'Expired' : `${formatted} remaining`}
        </div>
      </div>

      {payment.upi_qr_url ? (
        <div className="flex justify-center">
          <img
            src={getImageUrl(payment.upi_qr_url)}
            alt="UPI QR Code"
            className="h-48 w-48 rounded-xl border border-rose/20 object-contain"
          />
        </div>
      ) : (
        <p className="rounded-xl bg-white/80 p-4 text-center text-sm text-ink/60">
          UPI QR will appear here after the admin configures it in Store Settings.
        </p>
      )}

      <div className="rounded-2xl border border-rose/20 bg-white p-4">
        <p className="text-sm text-ink/60">UPI ID</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="font-medium break-all">{payment.upi_id || 'Configure in Admin → Settings'}</p>
          {payment.upi_id && (
            <button type="button" onClick={copyUpi} className="rounded-full p-2 hover:bg-ivory" aria-label="Copy UPI ID">
              <Copy className="h-4 w-4" />
            </button>
          )}
        </div>
        {payment.payment_instructions && (
          <p className="mt-3 text-sm text-ink/70 whitespace-pre-wrap">{payment.payment_instructions}</p>
        )}
      </div>

      {!expired && (
        <form className="space-y-4 rounded-2xl border border-rose/20 bg-white p-4" onSubmit={handleSubmit((d) => submitMutation.mutate(d))}>
          <h2 className="font-medium">I have paid</h2>
          <Input label="UPI / UTR reference" error={errors.upi_reference?.message} {...register('upi_reference')} />
          <Input label="Note (optional)" {...register('customer_note')} />
          <div>
            <label className="mb-1 block text-sm font-medium">Screenshot (optional, not proof)</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
              className="block w-full text-sm"
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitMutation.isPending}>
            {submitMutation.isPending ? 'Submitting…' : 'Submit for verification'}
          </Button>
        </form>
      )}

      {expired && (
        <Button
          className="w-full"
          onClick={() =>
            void ordersApi.retryPayment(id).then((data) =>
              navigate(`/payment/${data.payment.id}`, { state: { checkout: data } }),
            )
          }
        >
          Start new payment window
        </Button>
      )}
    </div>
  )
}
