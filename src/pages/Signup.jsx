import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_ENDPOINTS, apiCall } from '../config/api'

export default function Signup({ onLogin }) {
  const [formData, setFormData] = useState({
    name: '',
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
    if (!formData.name || !formData.email || !formData.password) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    try {
      const data = await apiCall(API_ENDPOINTS.REGISTER, {
        method: 'POST',
        body: JSON.stringify(formData)
      })

      // Registration successful
      console.log('User registered successfully:', data)
      
      // Store token in localStorage for persistence
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      
      // Automatically log in the user after successful registration
      if (onLogin) {
        onLogin(data.user)
      }

      // Redirect to dashboard
      navigate('/dashboard')

    } catch (error) {
      console.error('Registration error:', error)
      setError(error.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth container">
      <div className="auth-card">
        <h2>Create your account</h2>
        <p className="muted">Join RedZone to stay safe anywhere</p>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form className="form" onSubmit={handleSubmit}>
          <label>
            <span>Name</span>
            <input 
              type="text" 
              name="name"
              placeholder="Full name" 
              value={formData.name}
              onChange={handleChange}
              required 
            />
          </label>
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
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
        
        <div className="auth-info">
          <p className="muted" style={{ marginTop: 12 }}>
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    </section>
  )
}


