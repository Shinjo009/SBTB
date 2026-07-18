import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { authApi } from '@/services/api/auth'
import { getErrorMessage } from '@/services/api/client'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { resetPasswordSchema, type ResetPasswordInput } from '@/validation/auth'

export default function ResetPasswordPage() {
  useDocumentTitle('Reset Password')
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const { toast } = useToast()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  })

  const onSubmit = async (data: ResetPasswordInput) => {
    try {
      await authApi.resetPassword(data)
      toast('Password reset successfully', 'success')
      navigate('/login')
    } catch (err) {
      toast(getErrorMessage(err), 'error')
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Reset password</h1>
      <p className="mt-1 text-sm text-ink/60">Enter your new password</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <input type="hidden" {...register('token')} />
        <Input label="New password" type="password" error={errors.password?.message} {...register('password')} />
        <Input label="Confirm password" type="password" error={errors.confirm_password?.message} {...register('confirm_password')} />
        <Button type="submit" loading={isSubmitting} className="w-full">Reset Password</Button>
      </form>
      <p className="mt-4 text-center text-sm">
        <Link to="/login" className="text-rose-dark hover:underline">Back to sign in</Link>
      </p>
    </div>
  )
}
