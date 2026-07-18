import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import logo from '@/assets/logo.png'
import { prefersReducedMotion } from '@/lib/utils'

export default function SplashPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => navigate('/welcome', { replace: true }), 2200)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-ivory">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-rose-light/50 blur-3xl" />
        <div className="absolute right-1/4 top-1/2 h-48 w-48 rounded-full bg-lilac/30 blur-2xl" />
      </div>
      <motion.div
        initial={prefersReducedMotion() ? false : { scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative flex flex-col items-center gap-4"
      >
        <motion.div
          initial={prefersReducedMotion() ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="rounded-full bg-rose-light/30 p-6 shadow-lg"
        >
          <img src={logo} alt="Scrunchies By The Bunch" className="h-24 w-24 rounded-full object-cover" />
        </motion.div>
        <motion.p
          initial={prefersReducedMotion() ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="font-display text-2xl font-semibold text-ink"
        >
          Scrunchies By The Bunch
        </motion.p>
      </motion.div>
    </div>
  )
}
