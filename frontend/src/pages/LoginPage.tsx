import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { getErrorMessage, useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type LoginInput = z.infer<typeof loginSchema>

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
      const user = await login(data)
      toast('Welcome back!', 'success')
      navigate(user.roles.some((r) => r === 'ADMIN' || r === 'MANAGER') ? '/admin' : '/home')
    } catch (err) {
      toast(getErrorMessage(err), 'error')
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Welcome back</h1>
      <p className="mt-1 text-sm text-ink/60">Sign in with your email and password</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Input label="Password" type="password" error={errors.password?.message} {...register('password')} />
        <Button type="submit" loading={isSubmitting} className="w-full">Sign In</Button>
      </form>
      <p className="mt-4 text-center text-sm text-ink/55">
        New here?{' '}
        <Link to="/signup" className="font-semibold text-rose-dark hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  )
}
