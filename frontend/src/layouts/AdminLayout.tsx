import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  CreditCard,
  Users,
  Settings,
  ArrowLeft,
  LogOut,
  User,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

const nav = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true, adminOnly: false },
  { to: '/admin/products', icon: Package, label: 'Products', adminOnly: false },
  { to: '/admin/categories', icon: FolderTree, label: 'Categories', adminOnly: false },
  { to: '/admin/orders', icon: ShoppingCart, label: 'Orders', adminOnly: false },
  { to: '/admin/payments', icon: CreditCard, label: 'Payments', adminOnly: false },
  { to: '/admin/customers', icon: Users, label: 'Customers', adminOnly: false },
  { to: '/admin/team', icon: Shield, label: 'Team', adminOnly: true },
  { to: '/admin/settings', icon: Settings, label: 'Settings', adminOnly: true },
]

export function AdminLayout() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const links = nav.filter((item) => !item.adminOnly || isAdmin)

  const handleLogout = async () => {
    await logout()
    navigate('/welcome')
  }

  return (
    <div className="flex min-h-dvh bg-ivory">
      <aside className="hidden w-56 shrink-0 border-r border-rose/15 bg-white p-4 md:block">
        <div className="mb-6">
          <p className="font-display text-lg font-semibold">{isAdmin ? 'Admin' : 'Manager'}</p>
          <p className="text-xs text-ink/50">{user?.full_name}</p>
        </div>
        <nav className="space-y-1">
          {links.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition',
                  isActive ? 'bg-rose-light/40 font-medium text-ink' : 'text-ink/60 hover:bg-rose-light/20',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-6 space-y-2 border-t border-rose/15 pt-4">
          <Link to="/profile" className="flex items-center gap-2 text-sm text-ink/60 hover:text-ink">
            <User className="h-4 w-4" /> Profile
          </Link>
          <Link to="/home" className="flex items-center gap-2 text-sm text-ink/60 hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Back to store
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 text-left text-sm text-ink/60 hover:text-ink"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </aside>

      <div className="flex-1">
        <header className="border-b border-rose/15 bg-white px-4 py-3 md:hidden">
          <div className="flex items-center justify-between gap-2">
            <p className="font-display font-semibold">{isAdmin ? 'Admin' : 'Manager'}</p>
            <div className="flex items-center gap-3 text-sm">
              <Link to="/profile" className="text-ink/60">Profile</Link>
              <button type="button" onClick={handleLogout} className="text-ink/60">Logout</button>
            </div>
          </div>
          <nav className="mt-2 flex gap-2 overflow-x-auto pb-1 text-xs">
            {links.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'whitespace-nowrap rounded-full px-3 py-1',
                    isActive ? 'bg-rose text-white' : 'bg-rose-light/30',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
