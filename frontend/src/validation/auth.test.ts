import { describe, expect, it } from 'vitest'
import { loginSchema, signupSchema } from './auth'

describe('auth validation', () => {
  it('accepts valid signup', () => {
    const result = signupSchema.safeParse({
      full_name: 'Aisha Khan',
      email: 'aisha@example.com',
      password: 'Password123!',
      confirm_password: 'Password123!',
    })
    expect(result.success).toBe(true)
  })

  it('rejects mismatched passwords', () => {
    const result = signupSchema.safeParse({
      full_name: 'Aisha Khan',
      email: 'aisha@example.com',
      password: 'Password123!',
      confirm_password: 'Different123!',
    })
    expect(result.success).toBe(false)
  })

  it('requires email for login', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'x' })
    expect(result.success).toBe(false)
  })
})
