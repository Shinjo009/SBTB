import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

type BackButtonProps = {
  to?: string
  label?: string
  className?: string
}

/** Navigates to history back, or `to` fallback when no history exists */
export function BackButton({ to = '/home', label = 'Back', className }: BackButtonProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(to)
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className={cn(
        'mb-4 inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm text-ink/70 transition-colors hover:bg-rose-light/30 hover:text-ink',
        className,
      )}
      aria-label={label}
    >
      <ArrowLeft className="h-4 w-4" />
      <span>{label}</span>
    </button>
  )
}
