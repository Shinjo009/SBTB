import { Link, useLocation } from 'react-router-dom'
import { Home, ShoppingBag, ShoppingCart, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { cartApi } from '@/services/api/cart'
import { useAuth } from '@/hooks/useAuth'

const links = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/shop', icon: ShoppingBag, label: 'Shop' },
  { to: '/cart', icon: ShoppingCart, label: 'Cart' },
  { to: '/profile', icon: User, label: 'Profile' },
]

export function BottomNav() {
  const { pathname } = useLocation()
  const { user } = useAuth()

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: cartApi.get,
    enabled: !!user?.email_verified,
    retry: false,
  })

  const count = cart?.item_count ?? 0

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-rose/20 bg-ivory/95 backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {links.map(({ to, icon: Icon, label }) => {
          const active =
            to === '/home'
              ? pathname === '/home' || pathname === '/'
              : pathname.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 text-xs transition',
                active ? 'text-rose-dark' : 'text-ink/50 hover:text-ink',
              )}
            >
              <span className="relative">
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                {to === '/cart' && count > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose text-[10px] font-bold text-white">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </span>
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
