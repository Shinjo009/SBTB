import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { authApi } from '@/services/api/auth'
import { getErrorMessage } from '@/services/api/client'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn, prefersReducedMotion } from '@/lib/utils'

export default function VerifyOTPPage() {
  useDocumentTitle('Verify Email')
  const { state } = useLocation() as { state?: { email?: string } }
  const email = state?.email ?? ''
  const navigate = useNavigate()
  const { toast } = useToast()
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (!email) navigate('/signup', { replace: true })
  }, [email, navigate])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const otp = digits.join('')

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const next = [...digits]
    if (value.length > 1) {
      const chars = value.slice(0, 6 - index).split('')
      chars.forEach((c, i) => { if (index + i < 6) next[index + i] = c })
    } else {
      next[index] = value
    }
    setDigits(next)
    const nextEmpty = next.findIndex((d, i) => i > index && !d)
    const focusIdx = value.length > 1 ? Math.min(index + value.length, 5) : (value ? index + 1 : index)
    inputs.current[nextEmpty >= 0 ? nextEmpty : focusIdx]?.focus()
  }

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = [...digits]
    pasted.split('').forEach((c, i) => { next[i] = c })
    setDigits(next)
    inputs.current[Math.min(pasted.length, 5)]?.focus()
  }, [digits])

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  const handleVerify = async () => {
    if (otp.length !== 6) { toast('Enter the 6-digit code', 'error'); return }
    setLoading(true)
    try {
      await authApi.verifyEmail({ email, otp })
      toast('Email verified! Please sign in.', 'success')
      navigate('/login')
    } catch (err) {
      toast(getErrorMessage(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    try {
      await authApi.resendOtp(email)
      toast('OTP sent again — check your email', 'success')
      setCountdown(60)
    } catch (err) {
      toast(getErrorMessage(err), 'error')
    }
  }

  return (
    <div className="text-center">
      <h1 className="font-display text-2xl font-semibold">Verify your email</h1>
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
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={cn(
              'h-12 w-10 rounded-xl border-2 text-center text-lg font-semibold outline-none transition sm:h-14 sm:w-12',
              d ? 'border-rose bg-rose-light/20' : 'border-rose/30 bg-white',
            )}
          />
        ))}
      </div>

      <Button onClick={handleVerify} loading={loading} className="mt-8 w-full">Verify</Button>

      <p className="mt-4 text-sm text-ink/60">
        {countdown > 0 ? (
          <>Resend in {countdown}s</>
        ) : (
          <button type="button" onClick={handleResend} className="text-rose-dark hover:underline">
            Resend code
          </button>
        )}
      </p>
    </div>
  )
}
