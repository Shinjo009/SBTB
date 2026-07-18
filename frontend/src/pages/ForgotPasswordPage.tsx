import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { authApi } from '@/services/api/auth'
import { getErrorMessage } from '@/services/api/client'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/validation/auth'

export default function ForgotPasswordPage() {
  useDocumentTitle('Forgot Password')
  const { toast } = useToast()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordInput) => {
    try {
      await authApi.forgotPassword(data)
      toast('Reset link sent to your email', 'success')
    } catch (err) {
      toast(getErrorMessage(err), 'error')
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Forgot password</h1>
      <p className="mt-1 text-sm text-ink/60">We&apos;ll send you a reset link</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Button type="submit" loading={isSubmitting} className="w-full">Send Reset Link</Button>
      </form>
      <p className="mt-4 text-center text-sm">
        <Link to="/login" className="text-rose-dark hover:underline">Back to sign in</Link>
      </p>
    </div>
  )
}
