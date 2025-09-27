import { useState, useEffect } from 'react'
import NavBar from './components/NavBar.jsx'
import Hero from './components/Hero.jsx'
import Features from './components/Features.jsx'
import About from './components/About.jsx'
import Footer from './components/Footer.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Admin from './pages/Admin.jsx'
import UserDashboard from './pages/UserDashboard.jsx'
import Map from './pages/Map.jsx'
import ReportRedZone from './pages/ReportRedZone.jsx'
import NotFound from './pages/NotFound.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { API_ENDPOINTS, apiCall } from './config/api.js'

function Home() {
  return (
    <>
      <Hero />
      <Features />
      <About />
      <Footer />
    </>
  )
}

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const location = useLocation()
  const isAdminPage = location.pathname === '/admin'

  // Check for existing authentication on app load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      const savedUser = localStorage.getItem('user')

      if (token && savedUser) {
        try {
          // Verify token with backend
          const data = await apiCall(API_ENDPOINTS.ME)
          setUser(data.user)
          setIsAuthenticated(true)
          setIsAdmin(data.user.role === 'admin')
        } catch (error) {
          console.error('Auth check error:', error)
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        }
      }
      setLoading(false)
    }

    checkAuth()
  }, [])

  // Function to handle login
  const handleLogin = (userData) => {
    setUser(userData)
    setIsAuthenticated(true)
    setIsAdmin(userData.role === 'admin')
  }

  // Function to handle logout
  const handleLogout = () => {
    setUser(null)
    setIsAuthenticated(false)
    setIsAdmin(false)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  if (loading) {
    return (
      <div className="app">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          color: 'var(--text-900)'
        }}>
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {/* Only show NavBar on non-admin pages */}
      {!isAdminPage && (
        <NavBar isAuthenticated={isAuthenticated} isAdmin={isAdmin} onLogout={handleLogout} />
      )}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route 
            path="/login" 
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Login onLogin={handleLogin} />
              )
            } 
          />
          <Route 
            path="/signup" 
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Signup onLogin={handleLogin} />
              )
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <UserDashboard user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/map" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Map />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/report" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <ReportRedZone />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated && isAdmin}>
                <Admin onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return <AppContent />
}


