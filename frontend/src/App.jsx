import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import IntroSplash from './components/IntroSplash'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AdminDashboard from './pages/AdminDashboard'
import IncidentsPage from './pages/IncidentsPage'
import CitizenReportPage from './pages/CitizenReportPage'
import SchemesPage from './pages/SchemesPage'
import SettingsPage from './pages/SettingsPage'
import ChatbotPage from './pages/ChatbotPage'
import OAuthCallbackPage from './pages/OAuthCallbackPage'
import MapPage from './pages/MapPage'
import NewsPage from './pages/NewsPage'
import VeriAIChatbot from './components/VeriAIChatbot'

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="skeleton w-48 h-6 rounded" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/incidents" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <>
      {user && <Navbar />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={user ? <Navigate to="/incidents" /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/incidents" /> : <RegisterPage />} />
        <Route path="/dashboard" element={
          <ProtectedRoute roles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/incidents" element={
          <ProtectedRoute>
            <IncidentsPage />
          </ProtectedRoute>
        } />
        <Route path="/report" element={
          <ProtectedRoute>
            <CitizenReportPage />
          </ProtectedRoute>
        } />
        <Route path="/map" element={
          <ProtectedRoute>
            <MapPage />
          </ProtectedRoute>
        } />
        <Route path="/news" element={
          <ProtectedRoute>
            <NewsPage />
          </ProtectedRoute>
        } />
        <Route path="/schemes" element={
          <ProtectedRoute>
            <SchemesPage />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        } />
        <Route path="/chatbot" element={
          <ProtectedRoute>
            <ChatbotPage />
          </ProtectedRoute>
        } />
        <Route path="/oauth-callback" element={<OAuthCallbackPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      {user && <VeriAIChatbot />}
    </>
  )
}

export default function App() {
  // Show splash once per browser session
  const [splashDone, setSplashDone] = useState(
    () => sessionStorage.getItem('trinetra_splash_shown') === '1'
  )

  const handleSplashComplete = () => {
    sessionStorage.setItem('trinetra_splash_shown', '1')
    setSplashDone(true)
  }

  return (
    <>
      {!splashDone && <IntroSplash onComplete={handleSplashComplete} />}
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </>
  )
}
