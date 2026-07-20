import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { getErrorMessage, useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const signupSchema = z
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

type SignupInput = z.infer<typeof signupSchema>

export default function SignupPage() {
  useDocumentTitle('Sign Up')
  const { signup } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupInput) => {
    try {
      await signup({
        full_name: data.full_name,
        email: data.email,
        password: data.password,
        confirm_password: data.confirm_password,
        phone: data.phone || undefined,
      })
      toast('Account created — you’re signed in', 'success')
      navigate('/home')
    } catch (err) {
      toast(getErrorMessage(err), 'error')
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Create account</h1>
      <p className="mt-1 text-sm text-ink/60">Save your profile with email and password</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <Input label="Full name" error={errors.full_name?.message} {...register('full_name')} />
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Input label="Phone (optional)" error={errors.phone?.message} {...register('phone')} />
        <Input label="Password" type="password" error={errors.password?.message} {...register('password')} />
        <Input
          label="Confirm password"
          type="password"
          error={errors.confirm_password?.message}
          {...register('confirm_password')}
        />
        <Button type="submit" loading={isSubmitting} className="w-full">Create account</Button>
      </form>
      <p className="mt-4 text-center text-sm text-ink/60">
        Already have an account?{' '}
        <Link to="/login" className="text-rose-dark hover:underline">Sign in</Link>
      </p>
    </div>
  )
}
