import { useEffect, useState } from 'react'

export function useCountdown(expiresAt: string | null | undefined) {
  const [remaining, setRemaining] = useState(() => calcRemaining(expiresAt))

  useEffect(() => {
    setRemaining(calcRemaining(expiresAt))
    if (!expiresAt) return
    const interval = setInterval(() => {
      const r = calcRemaining(expiresAt)
      setRemaining(r)
      if (r <= 0) clearInterval(interval)
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60

  return {
    remaining,
    expired: remaining <= 0,
    formatted: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
  }
}

function calcRemaining(expiresAt: string | null | undefined) {
  if (!expiresAt) return 0
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
}
