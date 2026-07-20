import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Menu, Search, ShoppingCart, User } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import logo from '@/assets/logo.png'
import { cartApi } from '@/services/api/cart'
import { useAuth } from '@/hooks/useAuth'

export function Header() {
  const { user, logout, isStaff } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: cartApi.get,
    enabled: !!user?.email_verified,
    retry: false,
  })

  const handleLogout = async () => {
    setMenuOpen(false)
    await logout()
    navigate('/welcome')
  }

  return (
    <header className="sticky top-0 z-30 border-b border-rose/15 bg-ivory/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/home" className="flex items-center gap-2">
          <img src={logo} alt="Scrunchies By The Bunch" className="h-9 w-9 rounded-full object-cover" />
          <span className="hidden font-display text-lg font-semibold sm:inline">Scrunchies By The Bunch</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link to="/shop" className="text-sm text-ink/70 hover:text-ink">Shop</Link>
          <Link to="/orders" className="text-sm text-ink/70 hover:text-ink">Orders</Link>
          <Link to="/profile" className="text-sm text-ink/70 hover:text-ink">Profile</Link>
          {isStaff && (
            <Link to="/admin" className="text-sm text-rose-dark hover:text-rose">Admin</Link>
          )}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link to="/shop" className="rounded-full p-2 hover:bg-rose-light/30" aria-label="Search">
            <Search className="h-5 w-5" />
          </Link>
          <Link to="/cart" className="relative rounded-full p-2 hover:bg-rose-light/30" aria-label="Cart">
            <ShoppingCart className="h-5 w-5" />
            {(cart?.item_count ?? 0) > 0 && (
              <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-rose text-[10px] font-bold text-white">
                {cart!.item_count}
              </span>
            )}
          </Link>

          {user ? (
            <>
              <Link
                to="/profile"
                className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-ink/70 hover:bg-rose-light/30 hover:text-ink md:inline-flex"
              >
                <User className="h-4 w-4" />
                Profile
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-ink/70 hover:bg-rose-light/30 hover:text-ink md:inline-flex"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="hidden rounded-full bg-rose px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-dark md:inline-flex"
            >
              Sign In
            </Link>
          )}

          <button
            type="button"
            className="rounded-full p-2 hover:bg-rose-light/30 md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-rose/15 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            <Link to="/shop" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2 text-sm hover:bg-rose-light/20">Shop</Link>
            <Link to="/orders" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2 text-sm hover:bg-rose-light/20">Orders</Link>
            <Link to="/profile" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2 text-sm hover:bg-rose-light/20">Profile</Link>
            {isStaff && (
              <Link to="/admin" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2 text-sm text-rose-dark hover:bg-rose-light/20">Admin</Link>
            )}
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="mt-1 flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-ink/70 hover:bg-rose-light/20"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="mt-1 rounded-lg bg-rose px-3 py-2 text-center text-sm font-medium text-white"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
