import { Link, useParams } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { BackButton } from '@/components/ui/BackButton'
import { Button } from '@/components/ui/Button'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function PaymentPendingPage() {
  useDocumentTitle('Payment Pending')
  const { id } = useParams<{ id: string }>()

  return (
    <div className="mx-auto max-w-md py-6">
      <BackButton to="/orders" />
      <div className="py-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
        <Clock className="h-8 w-8 text-amber-600" />
      </div>
      <h1 className="mt-6 font-display text-2xl font-semibold">Payment Under Review</h1>
      <p className="mt-3 text-ink/60">
        We&apos;ve received your payment details and are verifying your transaction.
        You&apos;ll be notified once it&apos;s confirmed.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <Link to="/orders"><Button className="w-full">View Orders</Button></Link>
        <Link to="/home"><Button variant="outline" className="w-full">Continue Shopping</Button></Link>
      </div>
      {id && <p className="mt-4 text-xs text-ink/40">Payment ID: {id}</p>}
      </div>
    </div>
  )
}
