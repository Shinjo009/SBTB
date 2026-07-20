import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Spinner } from '@/components/ui/Spinner'
import { StoreLayout } from '@/layouts/StoreLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AdminLayout } from '@/layouts/AdminLayout'
import { ProtectedRoute, AdminRoute, GuestRoute } from './ProtectedRoute'

const SplashPage = lazy(() => import('@/pages/SplashPage'))
const WelcomePage = lazy(() => import('@/pages/WelcomePage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const SignupPage = lazy(() => import('@/pages/SignupPage'))
const HomePage = lazy(() => import('@/pages/HomePage'))
const ShopPage = lazy(() => import('@/pages/ShopPage'))
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage'))
const CartPage = lazy(() => import('@/pages/CartPage'))
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'))
const PaymentPage = lazy(() => import('@/pages/PaymentPage'))
const PaymentPendingPage = lazy(() => import('@/pages/PaymentPendingPage'))
const OrdersPage = lazy(() => import('@/pages/OrdersPage'))
const OrderDetailPage = lazy(() => import('@/pages/OrderDetailPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

const AdminDashboardPage = lazy(() => import('@/pages/admin/DashboardPage'))
const AdminProductsPage = lazy(() => import('@/pages/admin/ProductsPage'))
const AdminProductFormPage = lazy(() => import('@/pages/admin/ProductFormPage'))
const AdminCategoriesPage = lazy(() => import('@/pages/admin/CategoriesPage'))
const AdminOrdersPage = lazy(() => import('@/pages/admin/OrdersPage'))
const AdminPendingPaymentsPage = lazy(() => import('@/pages/admin/PendingPaymentsPage'))
const AdminCustomersPage = lazy(() => import('@/pages/admin/CustomersPage'))
const AdminTeamPage = lazy(() => import('@/pages/admin/TeamPage'))
const AdminSettingsPage = lazy(() => import('@/pages/admin/SettingsPage'))

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner size="lg" />
    </div>
  )
}

function SuspenseWrap({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  { path: '/', element: <SuspenseWrap><SplashPage /></SuspenseWrap> },
  { path: '/welcome', element: <SuspenseWrap><WelcomePage /></SuspenseWrap> },

  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <SuspenseWrap><GuestRoute><LoginPage /></GuestRoute></SuspenseWrap> },
      { path: '/signup', element: <SuspenseWrap><GuestRoute><SignupPage /></GuestRoute></SuspenseWrap> },
    ],
  },

  {
    element: <StoreLayout />,
    children: [
      { path: '/home', element: <SuspenseWrap><HomePage /></SuspenseWrap> },
      { path: '/shop', element: <SuspenseWrap><ShopPage /></SuspenseWrap> },
      { path: '/products/:slug', element: <SuspenseWrap><ProductDetailPage /></SuspenseWrap> },
      { path: '/cart', element: <SuspenseWrap><ProtectedRoute><CartPage /></ProtectedRoute></SuspenseWrap> },
      { path: '/checkout', element: <SuspenseWrap><ProtectedRoute><CheckoutPage /></ProtectedRoute></SuspenseWrap> },
      { path: '/payment/:id', element: <SuspenseWrap><ProtectedRoute><PaymentPage /></ProtectedRoute></SuspenseWrap> },
      { path: '/payment/:id/pending', element: <SuspenseWrap><ProtectedRoute><PaymentPendingPage /></ProtectedRoute></SuspenseWrap> },
      { path: '/orders', element: <SuspenseWrap><ProtectedRoute><OrdersPage /></ProtectedRoute></SuspenseWrap> },
      { path: '/orders/:id', element: <SuspenseWrap><ProtectedRoute><OrderDetailPage /></ProtectedRoute></SuspenseWrap> },
      { path: '/profile', element: <SuspenseWrap><ProfilePage /></SuspenseWrap> },
    ],
  },

  {
    path: '/admin',
    element: <AdminRoute><AdminLayout /></AdminRoute>,
    children: [
      { index: true, element: <SuspenseWrap><AdminDashboardPage /></SuspenseWrap> },
      { path: 'products', element: <SuspenseWrap><AdminProductsPage /></SuspenseWrap> },
      { path: 'products/new', element: <SuspenseWrap><AdminProductFormPage /></SuspenseWrap> },
      { path: 'products/:id', element: <SuspenseWrap><AdminProductFormPage /></SuspenseWrap> },
      { path: 'categories', element: <SuspenseWrap><AdminCategoriesPage /></SuspenseWrap> },
      { path: 'orders', element: <SuspenseWrap><AdminOrdersPage /></SuspenseWrap> },
      { path: 'payments', element: <SuspenseWrap><AdminPendingPaymentsPage /></SuspenseWrap> },
      { path: 'customers', element: <SuspenseWrap><AdminCustomersPage /></SuspenseWrap> },
      { path: 'team', element: <SuspenseWrap><AdminTeamPage /></SuspenseWrap> },
      { path: 'settings', element: <SuspenseWrap><AdminSettingsPage /></SuspenseWrap> },
    ],
  },

  { path: '/404', element: <SuspenseWrap><NotFoundPage /></SuspenseWrap> },
  { path: '*', element: <Navigate to="/404" replace /> },
])
