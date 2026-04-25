import { createBrowserRouter } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { TokenProvider } from './context/TokenContext'
import Layout from './components/Layout'
import NotFound from './pages/NotFound'

const GroupHome = lazy(() => import('./pages/GroupHome'))
const NewPurchase = lazy(() => import('./pages/NewPurchase'))
const EditPurchase = lazy(() => import('./pages/EditPurchase'))
const History = lazy(() => import('./pages/History'))
const Leaderboard = lazy(() => import('./pages/Leaderboard'))

function SuspenseWrapper({ children }) {
  return (
    <Suspense fallback={<div className="animate-pulse p-4 text-text-secondary">Laden...</div>}>
      {children}
    </Suspense>
  )
}

export const router = createBrowserRouter([
  {
    path: '/:token',
    element: (
      <TokenProvider>
        <Layout />
      </TokenProvider>
    ),
    children: [
      {
        index: true,
        element: <SuspenseWrapper><GroupHome /></SuspenseWrapper>,
      },
      {
        path: 'erfassen',
        element: <SuspenseWrapper><NewPurchase /></SuspenseWrapper>,
      },
      {
        path: 'einkauf/:id',
        element: <SuspenseWrapper><EditPurchase /></SuspenseWrapper>,
      },
      {
        path: 'verlauf',
        element: <SuspenseWrapper><History /></SuspenseWrapper>,
      },
      {
        path: 'rangliste',
        element: <SuspenseWrapper><Leaderboard /></SuspenseWrapper>,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
])
