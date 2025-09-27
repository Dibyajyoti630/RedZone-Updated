import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { API_ENDPOINTS, API_BASE_URL } from '../config/api.js'

function UserDashboard({ user, onLogout }) {
  const [recentRedZones, setRecentRedZones] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [contactExists, setContactExists] = useState(false)
  const [loadingContact, setLoadingContact] = useState(false)

  useEffect(() => {
    fetchRecentRedZones()
    fetchUserContact()
  }, [])

  const fetchRecentRedZones = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(API_ENDPOINTS.REDZONES_RECENT, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setRecentRedZones(data.redZones)
      } else {
        setError('Failed to load recent RedZones')
      }
    } catch (error) {
      console.error('Error fetching recent RedZones:', error)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // No longer needed as we'll use Link component directly

  const [showNotifyForm, setShowNotifyForm] = useState(false)
  const [notifyFormData, setNotifyFormData] = useState({
    phone: '',
    email: ''
  })

  const fetchUserContact = async () => {
    try {
      setLoadingContact(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch(API_ENDPOINTS.USER_CONTACT_ME, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.exists) {
          setContactExists(true)
          setNotifyFormData({
            phone: data.contact.phone || '',
            email: data.contact.email || ''
          })
        } else {
          setContactExists(false)
        }
      } else {
        setContactExists(false)
      }
    } catch (error) {
      console.error('Error fetching user contact:', error)
      setContactExists(false)
    } finally {
      setLoadingContact(false)
    }
  }

  const handleNotifyMe = () => {
    setShowNotifyForm(true)
  }
  
  const handleRemoveDetails = async () => {
    if (!confirm('Are you sure you want to request removal of your contact details? This will need admin approval.')) {
      return
    }
    
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(API_ENDPOINTS.USER_CONTACT_REQUEST_REMOVAL, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        alert('Your contact removal request has been submitted to admin for review. You will continue to receive notifications until approved.')
        // Optionally refresh contact info to show new status
        fetchUserContact()
      } else {
        const errorData = await response.json()
        alert('Failed to submit removal request. ' + (errorData.message || 'Please try again.'))
      }
    } catch (error) {
      console.error('Error submitting removal request:', error)
      alert('An error occurred while submitting your removal request.')
    }
  }

  const handleNotifyFormSubmit = async (e) => {
    e.preventDefault()
    try {
      // Save to localStorage as backup
      localStorage.setItem('notificationPreferences', JSON.stringify({
        phone: notifyFormData.phone,
        email: !!notifyFormData.email
      }))
      
      const token = localStorage.getItem('token')
      
      // Send to new user-contacts endpoint
      const response = await fetch(API_ENDPOINTS.USER_CONTACT_NOTIFY, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          phone: notifyFormData.phone,
          email: notifyFormData.email || user.email
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('Contact information saved:', result)
        alert('Your contact information has been saved successfully!')
        setShowNotifyForm(false)
        // Reset form
        setNotifyFormData({
          phone: '',
          email: ''
        })
      } else {
        const errorData = await response.json()
        console.error('Failed to save contact information:', errorData)
        alert('Failed to save contact information. ' + (errorData.message || 'Please try again.'))
      }
    } catch (error) {
      console.error('Error saving contact information:', error)
      alert('An error occurred while saving your contact information.')
    }
  }

  const handleNotifyFormChange = (e) => {
    const { name, value } = e.target
    setNotifyFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="dashboard-container">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="dashboard-header-left">
          <h1>Welcome back, {user?.name || 'User'}!</h1>
          <p>Manage your RedZone alerts and stay informed about safety in your area.</p>
        </div>
        <div className="dashboard-header-right">
          <div className="user-info">
            <span className="user-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
            <div className="user-details">
              <span className="user-name">{user?.name || 'User'}</span>
              <span className="user-email">{user?.email}</span>
            </div>
          </div>
          <button onClick={onLogout} className="btn btn-ghost">
            Logout
          </button>
        </div>
      </div>

      {/* Action Cards */}
      <div className="dashboard-cards">
        <div className="action-card">
          <div className="card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <h3>MAP</h3>
          <p>View RedZones on an interactive map</p>
          <Link to="/map" className="btn btn-primary">
            View Map
          </Link>
        </div>

        <div className="action-card">
          <div className="card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
            </svg>
          </div>
          <h3>NOTIFY ME</h3>
          <p>Configure your notification preferences</p>
          {loadingContact ? (
            <p>Loading your contact information...</p>
          ) : showNotifyForm ? (
            <div className="notify-form-container">
              <form onSubmit={handleNotifyFormSubmit} className="notify-form">
                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input 
                    type="tel" 
                    id="phone" 
                    name="phone" 
                    value={notifyFormData.phone} 
                    onChange={handleNotifyFormChange} 
                    placeholder="Enter your phone number"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    value={notifyFormData.email} 
                    onChange={handleNotifyFormChange} 
                    placeholder="Enter your email address"
                    required
                  />
                </div>
                <div className="notify-actions">
                  <button type="submit" className="btn btn-primary">{contactExists ? 'Update' : 'Submit'}</button>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowNotifyForm(false)}
                  >
                    Back
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="notify-actions">
              <button onClick={handleNotifyMe} className="btn btn-primary">
                {contactExists ? 'Update Details' : 'Notify'}
              </button>
              {contactExists && (
                <button onClick={handleRemoveDetails} className="btn btn-danger">
                  Request Removal
                </button>
              )}
            </div>
          )}
        </div>

        <div className="action-card">
          <div className="card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 12h8"/>
              <path d="M12 8v8"/>
            </svg>
          </div>
          <h3>ADD NEW REDZONE</h3>
          <p>Report a new dangerous area</p>
          <Link to="/report" className="btn btn-primary">
            Report
          </Link>
        </div>
      </div>

      {/* Recent RedZones Section */}
      <div className="recent-redzones">
        <div className="section-header">
          <h2>Recent RedZones</h2>
          <p>Recently approved dangerous areas in your vicinity</p>
        </div>

        {error ? (
          <div className="error-state">
            <div className="error-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <h3>Error Loading RedZones</h3>
            <p>{error}</p>
            <button onClick={fetchRecentRedZones} className="btn btn-secondary">
              Try Again
            </button>
          </div>
        ) : loading ? (
          <div className="loading-state">
            <p>Loading...</p>
          </div>
        ) : recentRedZones.length > 0 ? (
          <div className="redzone-list">
            {recentRedZones.map((redZone) => (
              <div key={redZone._id} className="redzone-item">
                <div className="redzone-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
                <div className="redzone-content">
                  <h4>{redZone.title}</h4>
                  <p>{redZone.description}</p>
                  {redZone.imageUrl && (
                    <div className="redzone-image" style={{ marginTop: '8px', marginBottom: '8px' }}>
                      <img 
                        src={`${API_BASE_URL}${redZone.imageUrl}`} 
                        alt="RedZone" 
                        style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '4px', cursor: 'pointer' }}
                        onClick={() => window.open(`${API_BASE_URL}${redZone.imageUrl}`, '_blank')}
                      />
                    </div>
                  )}
                  <div className="redzone-meta">
                    <span className="location">{redZone.location}</span>
                    <span className="date">{new Date(redZone.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="redzone-severity">
                  <span className={`severity-badge ${redZone.severity}`}>
                    {redZone.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h3>No RedZones Found</h3>
            <p>There are no recent RedZones in your area. Stay safe!</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default UserDashboard
