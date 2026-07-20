import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { getErrorMessage, useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { signupSchema, type SignupInput } from '@/validation/auth'

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
      await signup(data)
      toast('Check your email for the OTP', 'success')
      navigate('/verify-otp', { state: { email: data.email } })
    } catch (err) {
      toast(getErrorMessage(err), 'error')
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Create account</h1>
      <p className="mt-1 text-sm text-ink/60">Join the scrunchie squad</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <Input label="Full name" error={errors.full_name?.message} {...register('full_name')} />
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Input label="Password" type="password" error={errors.password?.message} {...register('password')} />
        <Input label="Confirm password" type="password" error={errors.confirm_password?.message} {...register('confirm_password')} />
        <Button type="submit" loading={isSubmitting} className="w-full">Sign Up</Button>
      </form>
      <p className="mt-4 text-center text-sm text-ink/60">
        Have an account? <Link to="/login" className="text-rose-dark hover:underline">Sign in</Link>
      </p>
    </div>
  )
}
