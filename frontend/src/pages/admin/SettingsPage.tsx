import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { adminApi } from '@/services/api/admin'
import { getErrorMessage } from '@/services/api/client'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getImageUrl } from '@/lib/utils'
import type { AdminStoreSettings } from '@/types'

export default function AdminSettingsPage() {
  useDocumentTitle('Admin Settings')
  const { toast } = useToast()
  const qc = useQueryClient()
  const qrRef = useRef<HTMLInputElement>(null)

  const { data: settings } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: adminApi.getSettings,
  })

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<AdminStoreSettings>()

  useEffect(() => {
    if (settings) reset(settings)
  }, [settings, reset])

  const saveMutation = useMutation({
    mutationFn: adminApi.updateSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] })
      toast('Settings saved', 'success')
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  })

  const qrMutation = useMutation({
    mutationFn: adminApi.uploadUpiQr,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] })
      toast('QR uploaded', 'success')
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  })

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-2xl font-semibold">Store Settings</h1>
      <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="mt-6 space-y-4">
        <Input label="Store name" {...register('store_name')} />
        <Input label="Support email" type="email" {...register('support_email')} />
        <Input label="Announcement banner" {...register('announcement_banner')} />
        <Input label="UPI ID" {...register('upi_id')} placeholder="From your payment provider" />
        <div>
          <label className="block text-sm font-medium text-ink/80">Payment instructions</label>
          <textarea {...register('payment_instructions')} rows={3} className="mt-1.5 w-full rounded-xl border border-rose/30 px-4 py-2.5 text-sm outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/80">Shipping info</label>
          <textarea {...register('shipping_info')} rows={3} className="mt-1.5 w-full rounded-xl border border-rose/30 px-4 py-2.5 text-sm outline-none" />
        </div>
        <Input label="Low stock default" type="number" {...register('low_stock_default', { valueAsNumber: true })} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('is_storefront_live')} /> Storefront live
        </label>
        <Button type="submit" loading={isSubmitting || saveMutation.isPending}>Save Settings</Button>
      </form>

      <div className="mt-8">
        <h2 className="font-medium">UPI QR Code</h2>
        {settings?.upi_qr_url && (
          <img src={getImageUrl(settings.upi_qr_url)} alt="UPI QR" className="mt-2 h-32 w-32 rounded-xl border" />
        )}
        <input
          ref={qrRef}
          type="file"
          accept="image/*"
          className="mt-2 text-sm"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) qrMutation.mutate(file)
          }}
        />
      </div>
    </div>
  )
}
