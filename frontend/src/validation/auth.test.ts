import { describe, expect, it } from 'vitest'
import { requestOtpSchema, verifyOtpSchema } from './auth'

describe('auth validation', () => {
  it('accepts valid email for OTP request', () => {
    const result = requestOtpSchema.safeParse({ email: 'aisha@example.com' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = requestOtpSchema.safeParse({ email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('requires 6-digit otp', () => {
    expect(verifyOtpSchema.safeParse({ email: 'a@b.com', otp: '12345' }).success).toBe(false)
    expect(verifyOtpSchema.safeParse({ email: 'a@b.com', otp: '123456' }).success).toBe(true)
  })
})
