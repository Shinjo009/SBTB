import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { getErrorMessage, useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn, prefersReducedMotion } from '@/lib/utils'

export default function LoginPage() {
  useDocumentTitle('Sign In')
  const { requestOtp, verifyOtp } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [loading, setLoading] = useState(false)
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [countdown, setCountdown] = useState(0)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const otp = digits.join('')

  const sendCode = async (targetEmail: string) => {
    setLoading(true)
    try {
      await requestOtp(targetEmail)
      toast('If that email is registered, a login code was sent', 'success')
      setStep('code')
      setCountdown(60)
      setDigits(['', '', '', '', '', ''])
    } catch (err) {
      toast(getErrorMessage(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  const onEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError('Enter a valid email')
      return
    }
    setEmailError('')
    setEmail(value)
    await sendCode(value)
  }

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const next = [...digits]
    if (value.length > 1) {
      value.slice(0, 6 - index).split('').forEach((c, i) => {
        if (index + i < 6) next[index + i] = c
      })
    } else {
      next[index] = value
    }
    setDigits(next)
    const focusIdx = value.length > 1 ? Math.min(index + value.length, 5) : value ? index + 1 : index
    inputs.current[focusIdx]?.focus()
  }

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = ['', '', '', '', '', '']
    pasted.split('').forEach((c, i) => { next[i] = c })
    setDigits(next)
    inputs.current[Math.min(pasted.length, 5)]?.focus()
  }, [])

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast('Enter the 6-digit code', 'error')
      return
    }
    setLoading(true)
    try {
      const user = await verifyOtp(email, otp)
      toast('Welcome back!', 'success')
      navigate(user.roles.includes('ADMIN') ? '/admin' : '/home')
    } catch (err) {
      toast(getErrorMessage(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'email') {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-sm text-ink/60">We’ll email you a 6-digit login code</p>
        <form onSubmit={onEmailSubmit} className="mt-6 space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={emailError}
            autoComplete="email"
          />
          <Button type="submit" loading={loading} className="w-full">
            Send login code
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-ink/55">
          Accounts are created by the store admin. Contact support if you need access.
        </p>
      </div>
    )
  }

  return (
    <div className="text-center">
      <h1 className="font-display text-2xl font-semibold">Enter login code</h1>
      <p className="mt-2 text-sm text-ink/60">We sent a 6-digit code to {email}</p>

      <div className="mt-8 flex justify-center gap-2" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <motion.input
            key={i}
            ref={(el) => { inputs.current[i] = el }}
            initial={prefersReducedMotion() ? false : { scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus()
            }}
            className={cn(
              'h-12 w-10 rounded-xl border-2 text-center text-lg font-semibold outline-none transition sm:h-14 sm:w-12',
              d ? 'border-rose bg-rose-light/20' : 'border-rose/30 bg-white',
            )}
          />
        ))}
      </div>

      <Button onClick={handleVerify} loading={loading} className="mt-8 w-full">
        Verify & sign in
      </Button>

      <p className="mt-4 text-sm text-ink/60">
        {countdown > 0 ? (
          <>Resend in {countdown}s</>
        ) : (
          <button type="button" onClick={() => sendCode(email)} className="text-rose-dark hover:underline">
            Resend code
          </button>
        )}
      </p>
      <button
        type="button"
        className="mt-3 text-sm text-ink/50 hover:underline"
        onClick={() => setStep('email')}
      >
        Use a different email
      </button>
    </div>
  )
}
