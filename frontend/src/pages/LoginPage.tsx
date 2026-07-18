import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { getErrorMessage, useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { loginSchema, type LoginInput } from '@/validation/auth'

export default function LoginPage() {
  useDocumentTitle('Sign In')
  const { login } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginInput) => {
    try {
      await login(data)
      toast('Welcome back!', 'success')
      navigate('/home')
    } catch (err) {
      toast(getErrorMessage(err), 'error')
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Welcome back</h1>
      <p className="mt-1 text-sm text-ink/60">Sign in to your account</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Input label="Password" type="password" error={errors.password?.message} {...register('password')} />
        <div className="text-right">
          <Link to="/forgot-password" className="text-sm text-rose-dark hover:underline">Forgot password?</Link>
        </div>
        <Button type="submit" loading={isSubmitting} className="w-full">Sign In</Button>
      </form>
      <p className="mt-4 text-center text-sm text-ink/60">
        No account? <Link to="/signup" className="text-rose-dark hover:underline">Sign up</Link>
      </p>
    </div>
  )
}
