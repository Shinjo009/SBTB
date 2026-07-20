import { describe, expect, it } from 'vitest'
import { loginSchema, signupSchema } from './auth'

describe('auth schemas', () => {
  it('accepts valid login', () => {
    const result = loginSchema.safeParse({
      email: 'aisha@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'x' })
    expect(result.success).toBe(false)
  })

  it('requires matching passwords on signup', () => {
    expect(
      signupSchema.safeParse({
        full_name: 'Aisha',
        email: 'a@b.com',
        password: 'password123',
        confirm_password: 'password999',
      }).success,
    ).toBe(false)
    expect(
      signupSchema.safeParse({
        full_name: 'Aisha',
        email: 'a@b.com',
        password: 'password123',
        confirm_password: 'password123',
      }).success,
    ).toBe(true)
  })
})
