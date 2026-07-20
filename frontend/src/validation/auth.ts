import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export const signupSchema = z
  .object({
    full_name: z.string().min(2, 'Name is required'),
    email: z.email('Enter a valid email'),
    phone: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string().min(8, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

export const addressSchema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  phone: z.string().min(8, 'Phone is required'),
  line1: z.string().min(3, 'Address is required'),
  line2: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postal_code: z.string().min(4, 'Postal code is required'),
  country: z.string().min(2),
  is_default: z.boolean().optional(),
})

export const paymentSubmitSchema = z.object({
  upi_reference: z.string().min(4, 'UTR / UPI reference is required'),
  customer_note: z.string().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type AddressInput = z.infer<typeof addressSchema>
export type PaymentSubmitInput = z.infer<typeof paymentSubmitSchema>
