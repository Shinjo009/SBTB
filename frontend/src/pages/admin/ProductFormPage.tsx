import { useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { adminApi } from '@/services/api/admin'
import { getErrorMessage } from '@/services/api/client'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import type { Product } from '@/types'

type ProductFormData = Partial<Product> & { stock_quantity?: number }

export default function AdminProductFormPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const isNew = location.pathname.endsWith('/products/new') || id === 'new'
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: product } = useQuery({
    queryKey: ['admin', 'product', id],
    queryFn: () => adminApi.getProduct(id!),
    enabled: !isNew && !!id,
  })

  useDocumentTitle(isNew ? 'New Product' : 'Edit Product')

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<ProductFormData>({
    defaultValues: {
      status: 'DRAFT',
      currency: 'INR',
      is_featured: false,
      is_new_arrival: false,
      is_best_seller: false,
      stock_quantity: 10,
      low_stock_threshold: 5,
    },
  })

  useEffect(() => {
    if (product) reset(product)
  }, [product, reset])

  const saveMutation = useMutation({
    mutationFn: (data: ProductFormData) =>
      isNew ? adminApi.createProduct(data) : adminApi.updateProduct(id!, data),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] })
      toast('Product saved', 'success')
      navigate(`/admin/products/${saved.id}`)
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => adminApi.uploadProductImage(id!, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'product', id] })
      toast('Image uploaded', 'success')
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  })

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-2xl font-semibold">{isNew ? 'New Product' : 'Edit Product'}</h1>
      <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="mt-6 space-y-4">
        <Input label="Name" {...register('name', { required: true })} />
        <Input label="SKU" {...register('sku', { required: true })} />
        <Input label="Slug" {...register('slug')} />
        <Input label="Price" type="number" step="0.01" {...register('price', { valueAsNumber: true })} />
        <Input label="Compare at price" type="number" step="0.01" {...register('compare_at_price', { valueAsNumber: true })} />
        <Input label="Stock quantity" type="number" {...register('stock_quantity', { valueAsNumber: true })} />
        <Input label="Low stock threshold" type="number" {...register('low_stock_threshold', { valueAsNumber: true })} />
        <Input label="Short description" {...register('short_description')} />
        <div>
          <label className="block text-sm font-medium text-ink/80">Description</label>
          <textarea {...register('description')} rows={4} className="mt-1.5 w-full rounded-xl border border-rose/30 px-4 py-2.5 text-sm outline-none focus:border-rose" />
        </div>
        <select {...register('status')} className="w-full rounded-xl border border-rose/30 px-4 py-2.5 text-sm">
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" {...register('is_featured')} /> Featured</label>
          <label className="flex items-center gap-2"><input type="checkbox" {...register('is_new_arrival')} /> New Arrival</label>
          <label className="flex items-center gap-2"><input type="checkbox" {...register('is_best_seller')} /> Best Seller</label>
        </div>
        <Button type="submit" loading={isSubmitting || saveMutation.isPending}>Save Product</Button>
      </form>

      {!isNew && (
        <div className="mt-8">
          <h2 className="font-medium">Upload Image</h2>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="mt-2 text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) uploadMutation.mutate(file)
            }}
          />
        </div>
      )}
    </div>
  )
}
