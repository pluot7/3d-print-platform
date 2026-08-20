import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import OfficialModels from './pages/OfficialModels'
import ModelDetail from './pages/ModelDetail'
import OrderPage from './pages/OrderPage'
import UserCenter from './pages/UserCenter'

import LoginPage from './pages/LoginPage'
import Community from './pages/Community'
import DiscussionDetail from './pages/DiscussionDetail'
import Announcements from './pages/Announcements'
import AnnouncementDetail from './pages/AnnouncementDetail'
import CheckoutPage from './pages/CheckoutPage'
import Pricing from './pages/Pricing'
import Help from './pages/Help'
import MessagesPage from './pages/MessagesPage'
import ActivitiesPage from './pages/ActivitiesPage'
import UserProfilePage from './pages/UserProfilePage'

// 受保护的路由包装器
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      {/* 公开路由 */}
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={<AppLayout><Home /></AppLayout>}
      />
      <Route
        path="/official"
        element={<AppLayout><OfficialModels /></AppLayout>}
      />
      <Route
        path="/community"
        element={<AppLayout><Community /></AppLayout>}
      />
      <Route
        path="/community/:id"
        element={<AppLayout><DiscussionDetail /></AppLayout>}
      />
      <Route
        path="/announcements"
        element={<AppLayout><Announcements /></AppLayout>}
      />
      <Route
        path="/announcements/:id"
        element={<AppLayout><AnnouncementDetail /></AppLayout>}
      />
      <Route
        path="/pricing"
        element={<AppLayout><Pricing /></AppLayout>}
      />
      <Route
        path="/help"
        element={<AppLayout><Help /></AppLayout>}
      />
      <Route
        path="/help/:tab"
        element={<AppLayout><Help /></AppLayout>}
      />
      <Route
        path="/model/:id"
        element={<AppLayout><ModelDetail /></AppLayout>}
      />
      <Route
        path="/checkout"
        element={
          <ProtectedRoute>
            <AppLayout><CheckoutPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/order/:id"
        element={
          <ProtectedRoute>
            <AppLayout><OrderPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/user"
        element={
          <ProtectedRoute>
            <AppLayout><UserCenter /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/:id"
        element={
          <ProtectedRoute>
            <AppLayout><UserProfilePage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <AppLayout><MessagesPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/activities"
        element={
          <ProtectedRoute>
            <AppLayout><ActivitiesPage /></AppLayout>
          </ProtectedRoute>
        }
      />



      {/* 导航栏链接 */}
      {/* （社区链接已添加到 Navbar 组件中） */}

      {/* 其他路由重定向 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
