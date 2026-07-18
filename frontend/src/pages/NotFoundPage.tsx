import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function NotFoundPage() {
  useDocumentTitle('Not Found')

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="font-display text-6xl font-semibold text-rose/40">404</p>
      <h1 className="mt-4 font-display text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-ink/60">This scrunchie got lost in the bunch</p>
      <Link to="/home" className="mt-6">
        <Button>Go Home</Button>
      </Link>
    </div>
  )
}
