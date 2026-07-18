import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { adminApi } from '@/services/api/admin'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { getErrorMessage } from '@/services/api/client'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function AdminCategoriesPage() {
  useDocumentTitle('Admin Categories')
  const { toast } = useToast()
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')

  const { data: categories, isLoading } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: adminApi.getCategories,
  })

  const createMutation = useMutation({
    mutationFn: () => adminApi.createCategory({ name, slug, is_active: true, sort_order: 0 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] })
      setModalOpen(false)
      setName('')
      setSlug('')
      toast('Category created', 'success')
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] })
      toast('Category deleted', 'info')
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  })

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Categories</h1>
        <Button size="sm" onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Add</Button>
      </div>

      <div className="mt-6 space-y-2">
        {isLoading ? (
          <p className="text-ink/50">Loading...</p>
        ) : categories?.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-xl border border-rose/15 bg-white p-4">
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-ink/50">{c.slug}</p>
            </div>
            <button type="button" onClick={() => deleteMutation.mutate(c.id)} className="text-red-400 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Category">
        <div className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
          <Button loading={createMutation.isPending} onClick={() => createMutation.mutate()} className="w-full">Create</Button>
        </div>
      </Modal>
    </div>
  )
}
