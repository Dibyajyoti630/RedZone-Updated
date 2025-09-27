import { Navigate } from 'react-router-dom'

export default function ProtectedRoute({ children, isAuthenticated = false }) {
  if (!isAuthenticated) {
    // Redirect to login page if not authenticated
    return <Navigate to="/login" replace />
  }

  return children
}
