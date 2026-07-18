import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { BackButton } from '@/components/ui/BackButton'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { cartApi } from '@/services/api/cart'
import { ordersApi } from '@/services/api/orders'
import { getErrorMessage } from '@/services/api/client'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { addressSchema, type AddressInput } from '@/validation/auth'
import { formatCurrency } from '@/lib/utils'
import type { Address } from '@/types'

export default function CheckoutPage() {
  useDocumentTitle('Checkout')
  const navigate = useNavigate()
  const { toast } = useToast()
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null)
  const [showNewAddress, setShowNewAddress] = useState(false)

  const { data: cart, isLoading: loadingCart } = useQuery({
    queryKey: ['cart'],
    queryFn: cartApi.get,
  })

  const { data: addresses, isLoading: loadingAddresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: ordersApi.getAddresses,
  })

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: { country: 'India' },
  })

  const createAddressMutation = useMutation({
    mutationFn: ordersApi.createAddress,
    onSuccess: (addr) => {
      setSelectedAddress(addr.id)
      setShowNewAddress(false)
      toast('Address saved', 'success')
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  })

  const checkoutMutation = useMutation({
    mutationFn: (addressId: string) => ordersApi.createOrder(addressId, crypto.randomUUID()),
    onSuccess: (data) => navigate(`/payment/${data.payment.id}`, { state: { checkout: data } }),
    onError: (err) => toast(getErrorMessage(err), 'error'),
  })

  const handlePlaceOrder = () => {
    const addrId = selectedAddress ?? addresses?.find((a) => a.is_default)?.id ?? addresses?.[0]?.id
    if (!addrId) { toast('Please select or add an address', 'error'); return }
    checkoutMutation.mutate(addrId)
  }

  if (loadingCart || loadingAddresses) return <Skeleton className="h-64" />

  return (
    <div className="mx-auto max-w-lg">
      <BackButton to="/cart" />
      <h1 className="font-display text-2xl font-semibold">Checkout</h1>

      <section className="mt-6">
        <h2 className="font-medium">Shipping Address</h2>
        <div className="mt-3 space-y-2">
          {addresses?.map((addr: Address) => (
            <label key={addr.id} className={`flex cursor-pointer rounded-xl border p-4 transition ${selectedAddress === addr.id || (!selectedAddress && addr.is_default) ? 'border-rose bg-rose-light/10' : 'border-rose/20'}`}>
              <input
                type="radio"
                name="address"
                value={addr.id}
                checked={selectedAddress === addr.id || (!selectedAddress && addr.is_default)}
                onChange={() => setSelectedAddress(addr.id)}
                className="mt-1 mr-3"
              />
              <div className="text-sm">
                <p className="font-medium">{addr.full_name}</p>
                <p className="text-ink/60">{addr.line1}, {addr.city}, {addr.state} {addr.postal_code}</p>
                <p className="text-ink/60">{addr.phone}</p>
              </div>
            </label>
          ))}
        </div>

        {!showNewAddress ? (
          <Button variant="outline" className="mt-3" onClick={() => setShowNewAddress(true)}>Add New Address</Button>
        ) : (
          <form onSubmit={handleSubmit((d) => createAddressMutation.mutate(d))} className="mt-4 space-y-3 rounded-xl border border-rose/20 p-4">
            <Input label="Full name" error={errors.full_name?.message} {...register('full_name')} />
            <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
            <Input label="Address line 1" error={errors.line1?.message} {...register('line1')} />
            <Input label="Address line 2" {...register('line2')} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="City" error={errors.city?.message} {...register('city')} />
              <Input label="State" error={errors.state?.message} {...register('state')} />
            </div>
            <Input label="Postal code" error={errors.postal_code?.message} {...register('postal_code')} />
            <input type="hidden" {...register('country')} />
            <div className="flex gap-2">
              <Button type="submit" loading={isSubmitting || createAddressMutation.isPending}>Save Address</Button>
              <Button type="button" variant="ghost" onClick={() => setShowNewAddress(false)}>Cancel</Button>
            </div>
          </form>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-rose/15 bg-white p-4">
        <div className="flex justify-between">
          <span>Subtotal ({cart?.item_count} items)</span>
          <span className="font-semibold">{formatCurrency(cart?.subtotal ?? 0)}</span>
        </div>
        <Button
          size="lg"
          className="mt-4 w-full"
          loading={checkoutMutation.isPending}
          onClick={handlePlaceOrder}
        >
          Place Order
        </Button>
      </section>
    </div>
  )
}
