import { useQuery } from '@tanstack/react-query'
import { productsApi } from '@/services/api/products'

export function AnnouncementBar() {
  const { data } = useQuery({
    queryKey: ['store-settings'],
    queryFn: productsApi.getStoreSettings,
    staleTime: 5 * 60 * 1000,
  })

  if (!data?.announcement_banner) return null

  return (
    <div className="bg-rose text-center text-sm text-white">
      <p className="px-4 py-2">{data.announcement_banner}</p>
    </div>
  )
}
