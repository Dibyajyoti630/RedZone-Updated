import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_ENDPOINTS, apiCall } from '../config/api.js'

export default function Login({ onLogin }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Simple validation
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    try {
      const data = await apiCall(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        body: JSON.stringify(formData)
      })

      // Login successful
      console.log('Login successful:', data)
      
      // Store token in localStorage for persistence
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      
      // Update app state
      if (onLogin) {
        onLogin(data.user)
      }

      // Redirect based on user role
      if (data.user.role === 'admin') {
        navigate('/admin')
      } else {
        navigate('/dashboard')
      }

    } catch (error) {
      console.error('Login error:', error)
      setError(error.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth container">
      <div className="auth-card">
        <h2>Welcome back</h2>
        <p className="muted">Log in to continue</p>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form className="form" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input 
              type="email" 
              name="email"
              placeholder="you@example.com" 
              value={formData.email}
              onChange={handleChange}
              required 
            />
          </label>
          <label>
            <span>Password</span>
            <input 
              type="password" 
              name="password"
              placeholder="••••••••" 
              value={formData.password}
              onChange={handleChange}
              required 
            />
          </label>
          <button 
            type="submit" 
            className="btn btn-primary btn-glow" 
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="auth-info">
          <p className="muted" style={{ marginTop: 12 }}>
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>
          <p className="muted" style={{ marginTop: 8, fontSize: '0.85rem' }}>
            <strong>Demo Accounts:</strong><br />
            Admin: admin@redzone.com / admin123<br />
            User: user@redzone.com / user123
          </p>
        </div>
      </div>
    </section>
  )
}


