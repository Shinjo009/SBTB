import { Outlet, Link } from 'react-router-dom'
import logo from '@/assets/logo.png'
import { BackButton } from '@/components/ui/BackButton'

export function AuthLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-ivory">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-rose-light/40 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-lilac/30 blur-3xl" />
      </div>
      <div className="relative mx-auto w-full max-w-md px-4 pt-4">
        <BackButton to="/welcome" />
      </div>
      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-4">
        <Link to="/home" className="mb-8 flex flex-col items-center gap-2">
          <img src={logo} alt="Scrunchies By The Bunch" className="h-16 w-16 rounded-full object-cover shadow-md" />
          <span className="font-display text-xl font-semibold">Scrunchies By The Bunch</span>
        </Link>
        <div className="w-full max-w-md rounded-2xl border border-rose/20 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
