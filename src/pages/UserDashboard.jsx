import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { API_ENDPOINTS, API_BASE_URL } from '../config/api.js'

function UserDashboard({ user, onLogout }) {
  const [recentRedZones, setRecentRedZones] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [contactExists, setContactExists] = useState(false)
  const [loadingContact, setLoadingContact] = useState(false)
  const [userInRedZone, setUserInRedZone] = useState(false)
  const [redZoneInfo, setRedZoneInfo] = useState(null)
  const [alertShown, setAlertShown] = useState(false)

  useEffect(() => {
    fetchRecentRedZones()
    fetchUserContact()
    checkUserRedZoneStatus()
    
    // Set up interval to periodically check user's redzone status
    const interval = setInterval(() => {
      checkUserRedZoneStatus()
    }, 30000) // Check every 30 seconds
    
    return () => clearInterval(interval)
  }, [])

  const checkUserRedZoneStatus = async () => {
    try {
      // Use the hardcoded test location
      const latitude = 19.04835900
      const longitude = 83.83171400
      
      // Check if user is inside any redzone
      const token = localStorage.getItem('token')
      const response = await fetch(API_ENDPOINTS.REDZONES_CHECK_USER_LOCATION, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ latitude, longitude })
      })
      
      if (response.ok) {
        const data = await response.json()
        setUserInRedZone(data.inRedZone)
        setRedZoneInfo(data.redZone)
        
        // If user is in a redzone and alert hasn't been shown yet, show it
        if (data.inRedZone && data.redZone && !alertShown) {
          setAlertShown(true)
          showRedZoneAlert(data.redZone)
          
          // Reset alert shown after 5 minutes so it can be shown again if they're still in the zone
          setTimeout(() => {
            setAlertShown(false)
          }, 300000) // 5 minutes
        } else if (!data.inRedZone) {
          // Reset alert shown when user is no longer in a redzone
          setAlertShown(false)
        }
      }
    } catch (error) {
      console.error('Error checking user redzone status:', error)
    }
  }

  // Function to show a prominent alert when entering a RedZone
  const showRedZoneAlert = (redZone) => {
    // Create alert container
    const alertContainer = document.createElement('div')
    alertContainer.id = 'redzone-alert-dashboard'
    alertContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.9);
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: center;
      backdrop-filter: blur(5px);
    `
    
    // Create alert content
    const alertContent = document.createElement('div')
    alertContent.style.cssText = `
      background-color: #1a1a1a;
      border: 3px solid ${redZone.severity === 'high' ? '#e74c3c' : redZone.severity === 'medium' ? '#f39c12' : '#f1c40f'};
      border-radius: 15px;
      padding: 30px;
      max-width: 90%;
      width: 500px;
      text-align: center;
      box-shadow: 0 0 30px rgba(239, 68, 68, 0.5);
      animation: pulse 2s infinite;
    `
    
    // Add pulse animation
    const style = document.createElement('style')
    style.textContent = `
      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
        70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
        100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
      }
    `
    document.head.appendChild(style)
    
    // Add alert content
    alertContent.innerHTML = `
      <h2 style="color: ${redZone.severity === 'high' ? '#e74c3c' : redZone.severity === 'medium' ? '#f39c12' : '#f1c40f'}; margin-top: 0; font-size: 28px;">
        ⚠️ DANGER WARNING ⚠️
      </h2>
      <h3 style="color: white; margin: 20px 0;">${redZone.title}</h3>
      <p style="color: #ff6b6b; font-size: 18px; margin: 15px 0;">
        You have entered a ${redZone.severity.toUpperCase()} risk area!
      </p>
      <div style="background-color: rgba(255, 255, 255, 0.1); border-radius: 10px; padding: 15px; margin: 20px 0; text-align: left;">
        <p style="color: white; margin: 5px 0;"><strong>Description:</strong> ${redZone.description}</p>
        <p style="color: white; margin: 5px 0;"><strong>Severity:</strong> ${redZone.severity.toUpperCase()}</p>
        <p style="color: white; margin: 5px 0;"><strong>Location:</strong> ${redZone.location}</p>
      </div>
      <p style="color: #f8f9fa; font-size: 16px; margin: 20px 0;">
        Please take immediate precautions and leave this area if possible.
      </p>
      <button id="close-alert-dashboard" style="
        background-color: ${redZone.severity === 'high' ? '#e74c3c' : redZone.severity === 'medium' ? '#f39c12' : '#f1c40f'};
        color: white;
        border: none;
        border-radius: 8px;
        padding: 15px 30px;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        margin-top: 20px;
        transition: all 0.3s;
      ">
        ACKNOWLEDGE & CLOSE
      </button>
    `
    
    // Add close functionality
    alertContent.querySelector('#close-alert-dashboard').addEventListener('click', () => {
      document.body.removeChild(alertContainer)
      document.head.removeChild(style)
    })
    
    // Add to DOM
    alertContainer.appendChild(alertContent)
    document.body.appendChild(alertContainer)
    
    // Try to vibrate the device
    if ('vibrate' in navigator) {
      navigator.vibrate([500, 200, 500, 200, 1000])
    }
    
    // Play alert sound
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 800;
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      
      // Create a more attention-grabbing sound pattern
      const now = audioContext.currentTime;
      oscillator.frequency.setValueAtTime(800, now);
      oscillator.frequency.setValueAtTime(1000, now + 0.1);
      oscillator.frequency.setValueAtTime(800, now + 0.2);
      oscillator.frequency.setValueAtTime(1000, now + 0.3);
      
      oscillator.stop(now + 0.5);
    } catch (e) {
      console.log('Audio alert not supported');
    }
  }

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
      
      if (response.ok || response.status === 404) {
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
      const token = localStorage.getItem('token')
      
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
        alert('Your contact information has been saved successfully!')
        setShowNotifyForm(false)
        setNotifyFormData({
          phone: '',
          email: ''
        })
        fetchUserContact()
      } else {
        const errorData = await response.json()
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
      {/* RedZone Alert Banner */}
      {userInRedZone && redZoneInfo && (
        <div className="redzone-alert-banner" style={{
          backgroundColor: redZoneInfo.severity === 'high' ? '#e74c3c' : redZoneInfo.severity === 'medium' ? '#f39c12' : '#f1c40f',
          color: 'white',
          padding: '15px 20px',
          textAlign: 'center',
          fontWeight: 'bold',
          position: 'relative',
          animation: 'pulse 2s infinite'
        }}>
          <style>{`
            @keyframes pulse {
              0% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.7); }
              70% { box-shadow: 0 0 0 10px rgba(231, 76, 60, 0); }
              100% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0); }
            }
          `}</style>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <span>🚨 URGENT: You are currently in a {redZoneInfo.severity.toUpperCase()} risk area: {redZoneInfo.title}</span>
            <Link to="/map" className="btn btn-secondary" style={{ 
              marginLeft: '15px', 
              backgroundColor: 'rgba(0,0,0,0.3)', 
              border: '1px solid white',
              color: 'white',
              padding: '5px 10px',
              textDecoration: 'none',
              borderRadius: '4px'
            }}>
              View on Map
            </Link>
          </div>
        </div>
      )}

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
                        src={`${API_BASE_URL}${redZone.imageUrl.startsWith('/') ? '' : '/'}${redZone.imageUrl}`} 
                        alt="RedZone" 
                        style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '4px', cursor: 'pointer' }}
                        onClick={() => window.open(`${API_BASE_URL}${redZone.imageUrl.startsWith('/') ? '' : '/'}${redZone.imageUrl}`, '_blank')}
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