import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { prefersReducedMotion } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.div
            initial={prefersReducedMotion() ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion() ? undefined : { opacity: 0 }}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={prefersReducedMotion() ? false : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion() ? undefined : { opacity: 0, y: 20 }}
            className={cn(
              'relative z-10 w-full max-w-md rounded-t-2xl bg-ivory p-6 shadow-xl sm:rounded-2xl',
              className,
            )}
          >
            <div className="mb-4 flex items-center justify-between">
              {title && <h2 className="font-display text-lg font-semibold">{title}</h2>}
              <button
                type="button"
                onClick={onClose}
                className="ml-auto rounded-full p-1 hover:bg-rose-light/30"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
