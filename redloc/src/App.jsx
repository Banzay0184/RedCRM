import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AccessProvider, useAccess } from './lib/access'
import { AuthProvider, useAuth } from './lib/auth'
import { LangProvider } from './lib/i18n'
import Layout from './components/Layout'
import { PageLoader } from './components/ui'
import Home from './pages/Home'

const LocationDetail = lazy(() => import('./pages/LocationDetail'))
const Photos = lazy(() => import('./pages/Photos'))
const Videos = lazy(() => import('./pages/Videos'))
const Portfolios = lazy(() => import('./pages/Portfolios'))
const PortfolioDetail = lazy(() => import('./pages/PortfolioDetail'))
const Login = lazy(() => import('./pages/Login'))
const NotFound = lazy(() => import('./pages/NotFound'))
const AccessLink = lazy(() => import('./pages/AccessLink'))
const NoAccess = lazy(() => import('./pages/NoAccess'))
const LocationForm = lazy(() => import('./pages/admin/LocationForm'))
const PortfolioForm = lazy(() => import('./pages/admin/PortfolioForm'))
const Settings = lazy(() => import('./pages/admin/Settings'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 } },
})

function StaffOnly({ children }) {
  const { ready, isStaff } = useAuth()
  const location = useLocation()
  if (!ready) return <PageLoader />
  if (!isStaff) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

// Всё, кроме входа и ссылки-доступа, закрыто без сотрудника или действующей ссылки
function Gate() {
  const { ready } = useAuth()
  const { granted, reason } = useAccess()
  if (!ready) return <PageLoader />
  if (!granted) return <NoAccess reason={reason} />
  return <Layout />
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/a/:token" element={<AccessLink />} />
        <Route element={<Gate />}>
          <Route index element={<Home />} />
          <Route path="locations/:slug" element={<LocationDetail />} />
          <Route path="photos" element={<Photos />} />
          <Route path="videos" element={<Videos />} />
          <Route path="love-story" element={<Portfolios kind="love_story" />} />
          <Route path="albums" element={<Portfolios kind="album" />} />
          <Route path="love-story/:slug" element={<PortfolioDetail />} />
          <Route path="albums/:slug" element={<PortfolioDetail />} />
          <Route path="admin/locations/new" element={<StaffOnly><LocationForm /></StaffOnly>} />
          <Route path="admin/locations/:slug/edit" element={<StaffOnly><LocationForm /></StaffOnly>} />
          <Route path="admin/portfolios/new" element={<StaffOnly><PortfolioForm /></StaffOnly>} />
          <Route path="admin/portfolios/:slug/edit" element={<StaffOnly><PortfolioForm /></StaffOnly>} />
          <Route path="settings" element={<StaffOnly><Settings /></StaffOnly>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <AuthProvider>
          <AccessProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
            <Toaster position="top-center" toastOptions={{ style: { borderRadius: 12, fontSize: 14 } }} />
          </AccessProvider>
        </AuthProvider>
      </LangProvider>
    </QueryClientProvider>
  )
}
