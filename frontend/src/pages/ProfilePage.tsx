import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Package, Shield, User as UserIcon } from 'lucide-react'
import { BackButton } from '@/components/ui/BackButton'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function ProfilePage() {
  useDocumentTitle('Profile')
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/welcome')
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <BackButton to="/home" />
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-light/40">
          <UserIcon className="h-8 w-8 text-rose-dark" />
        </div>
        <p className="mt-4 text-ink/50">Sign in to view your profile</p>
        <Link to="/login">
          <Button className="mt-4">Sign In</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md">
      <BackButton to="/home" />

      <div className="rounded-2xl border border-rose/15 bg-white p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-light/40">
          <UserIcon className="h-8 w-8 text-rose-dark" />
        </div>
        <h1 className="mt-4 font-display text-xl font-semibold">{user.full_name}</h1>
        <p className="text-sm text-ink/60">{user.email}</p>
        {isAdmin && (
          <p className="mt-2 inline-flex rounded-full bg-rose-light/40 px-3 py-0.5 text-xs font-medium text-rose-dark">
            Admin
          </p>
        )}
        {!user.email_verified && (
          <p className="mt-2 text-sm text-amber-600">Email not verified</p>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <Link
          to="/orders"
          className="flex items-center gap-3 rounded-xl border border-rose/15 bg-white p-4 transition hover:bg-rose-light/10"
        >
          <Package className="h-5 w-5 text-rose" />
          <span>My Orders</span>
        </Link>
        {isAdmin && (
          <Link
            to="/admin"
            className="flex items-center gap-3 rounded-xl border border-rose/15 bg-white p-4 transition hover:bg-rose-light/10"
          >
            <Shield className="h-5 w-5 text-rose" />
            <span>Admin Dashboard</span>
          </Link>
        )}
      </div>

      <Button variant="outline" className="mt-6 w-full" onClick={handleLogout}>
        <LogOut className="h-4 w-4" /> Logout
      </Button>
    </div>
  )
}
