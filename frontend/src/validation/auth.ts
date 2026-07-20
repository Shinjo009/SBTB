import { z } from 'zod'

export const requestOtpSchema = z.object({
  email: z.email('Enter a valid email'),
})

export const verifyOtpSchema = z.object({
  email: z.email('Enter a valid email'),
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
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

export type RequestOtpInput = z.infer<typeof requestOtpSchema>
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>
export type AddressInput = z.infer<typeof addressSchema>
export type PaymentSubmitInput = z.infer<typeof paymentSubmitSchema>
