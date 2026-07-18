import { Outlet } from 'react-router-dom'
import { AnnouncementBar } from '@/components/storefront/AnnouncementBar'
import { BottomNav } from '@/components/storefront/BottomNav'
import { Header } from '@/components/storefront/Header'

export function StoreLayout() {
  return (
    <div className="min-h-dvh bg-ivory pb-20 md:pb-0">
      <AnnouncementBar />
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
