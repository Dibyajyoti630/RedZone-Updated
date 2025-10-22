import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Circle, useMapEvents, useMap, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import AdminIcon from '../components/icons/AdminIcon.jsx'
import DashboardIcon from '../components/icons/DashboardIcon.jsx'
import HistoryIcon from '../components/icons/HistoryIcon.jsx'
import BellIcon from '../components/icons/BellIcon.jsx'
import ShieldIcon from '../components/icons/ShieldIcon.jsx'
import { API_ENDPOINTS, API_BASE_URL } from '../config/api.js'
import { MAP_CONFIG } from '../config/maps.js'
import './Admin.css'

export default function Admin({ onLogout }) {
  // Component for handling map clicks
  function MapClickHandler() {
    useMapEvents({
      click: (e) => {
        if (mapMode === 'create') {
          const { lat, lng } = e.latlng
          setSelectedCoords({ lat, lng })
          console.log('Red zone location selected:', { lat, lng })
        }
      }
    })
    return null
  }

  // Component for centering map on coordinates
  function MapCenterUpdater({ center }) {
    const map = useMap()
    
    useEffect(() => {
      if (center) {
        map.setView([center.lat, center.lng], 15)
      }
    }, [center, map])
    
    return null
  }
  const [activeTab, setActiveTab] = useState('dashboard')
  const [historyFilter, setHistoryFilter] = useState('all')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navRef = useRef(null)
  
  // State declarations
  const [stats, setStats] = useState([
    { title: 'Total Users', value: 'Loading...', change: '0%', color: 'blue' },
    { title: 'Active Users', value: 'Loading...', change: '0%', color: 'green' },
    { title: 'Admin Users', value: 'Loading...', change: '0%', color: 'red' },
    { title: 'Recent Users (7d)', value: 'Loading...', change: '0%', color: 'purple' }
  ])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [redZones, setRedZones] = useState([])
  const [loadingRedZones, setLoadingRedZones] = useState(false)
  const [userContacts, setUserContacts] = useState([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [pendingRemovals, setPendingRemovals] = useState([])
  const [loadingPendingRemovals, setLoadingPendingRemovals] = useState(false)
  const [hasNotifications, setHasNotifications] = useState(false)
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false)
  const notificationRef = useRef(null)
  const [newRedZone, setNewRedZone] = useState({
    title: '',
    description: '',
    location: '',
    severity: 'medium'
  })
  
  // Add state for image files
  const [redZoneImage, setRedZoneImage] = useState(null)
  const [mapRedZoneImage, setMapRedZoneImage] = useState(null)

  // Map-based red zone creation state
  const [mapRedZone, setMapRedZone] = useState({
    title: '',
    description: '',
    severity: 'medium',
    coordinates: null
  })
  const [mapMode, setMapMode] = useState('view') // 'view' or 'create'
  const [selectedCoords, setSelectedCoords] = useState(null)
  const navigate = useNavigate()
  
  // Close mobile menu when clicking outside or on overlay
  const handleOverlayClick = (e) => {
    // Only close if clicking directly on the overlay, not on its children
    if (e.target === e.currentTarget) {
      setMobileMenuOpen(false)
    }
  }
  
  // Handle hamburger menu toggle with animation
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }
  
  // Close menu when window is resized to desktop size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768 && mobileMenuOpen) {
        setMobileMenuOpen(false)
      }
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [mobileMenuOpen])
  
  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotificationDropdown(false)
      }
    }
    
    if (showNotificationDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showNotificationDropdown])
  
  // Fetch pending contact removal requests
  const fetchPendingRemovals = async () => {
    try {
      setLoadingPendingRemovals(true)
      const token = localStorage.getItem('token')
      
      if (!token) {
        setError('No authentication token found')
        return
      }

      const response = await fetch(API_ENDPOINTS.ADMIN_PENDING_CONTACT_REMOVALS, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorBody}`)
      }

      const data = await response.json()
      setPendingRemovals(data.pendingRequests || [])
      setHasNotifications(data.pendingRequests && data.pendingRequests.length > 0)
      setError(null)
    } catch (err) {
      console.error('Error fetching pending removals:', err.message || err)
      setError(`Failed to load pending removals: ${err.message || 'Unknown error'}`)
    } finally {
      setLoadingPendingRemovals(false)
    }
  }
  
  // Handle approval of contact removal
  const handleApproveRemoval = async (contactId) => {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        setError('No authentication token found')
        return
      }

      const response = await fetch(`${API_ENDPOINTS.ADMIN_USER_CONTACTS}/${contactId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorBody}`)
      }
      
      // Remove from pending removals and refresh lists
      setPendingRemovals(pendingRemovals.filter(contact => contact._id !== contactId))
      setUserContacts(userContacts.filter(contact => contact._id !== contactId))
      
      // Update notification status
      const remainingPending = pendingRemovals.filter(contact => contact._id !== contactId)
      setHasNotifications(remainingPending.length > 0)
      
      alert('Contact removal approved successfully. User will no longer receive SMS notifications.')
    } catch (err) {
      console.error('Error approving contact removal:', err.message || err)
      alert('An error occurred while approving the contact removal')
    }
  }
  
  // Handle rejection of contact removal
  const handleRejectRemoval = async (contactId) => {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        setError('No authentication token found')
        return
      }

      const response = await fetch(API_ENDPOINTS.ADMIN_REJECT_CONTACT_REMOVAL(contactId), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorBody}`)
      }
      
      // Remove from pending removals list
      setPendingRemovals(pendingRemovals.filter(contact => contact._id !== contactId))
      
      // Update notification status
      const remainingPending = pendingRemovals.filter(contact => contact._id !== contactId)
      setHasNotifications(remainingPending.length > 0)
      
      alert('Contact removal request rejected successfully.')
    } catch (err) {
      console.error('Error rejecting contact removal:', err.message || err)
      alert('An error occurred while rejecting the contact removal')
    }
  }
  
  // Fetch user contacts for admin
  const fetchUserContacts = async () => {
    try {
      setLoadingContacts(true)
      const token = localStorage.getItem('token')
      
      if (!token) {
        setError('No authentication token found')
        return
      }

      const response = await fetch(API_ENDPOINTS.ADMIN_USER_CONTACTS, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorBody}`)
      }

      const data = await response.json()
      setUserContacts(data.contacts || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching user contacts:', err.message || err)
      setError(`Failed to load user contacts: ${err.message || 'Unknown error'}`)
    } finally {
      setLoadingContacts(false)
    }
  }
  
  // Handle contact deletion
  const handleDeleteContact = async (contactId) => {
    if (!confirm('Are you sure you want to delete this contact?')) {
      return
    }
    
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        setError('No authentication token found')
        return
      }

      const response = await fetch(`${API_ENDPOINTS.ADMIN_USER_CONTACTS}/${contactId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorBody}`)
      }
      
      // Remove the deleted contact from state
      setUserContacts(userContacts.filter(contact => contact._id !== contactId))
      alert('Contact deleted successfully')
    } catch (err) {
      console.error('Error deleting contact:', err.message || err)
      alert('An error occurred while deleting the contact')
    }
  }

  const handleLogout = () => {
    onLogout()
    navigate('/')
  }

  // Fetch admin statistics from API
  const fetchStats = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      if (!token) {
        setError('No authentication token found')
        return
      }

      const response = await fetch(API_ENDPOINTS.ADMIN_STATS, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorBody}`)
      }

      const data = await response.json()
      
      // Update stats with real data from database
      setStats([
        { title: 'Total Users', value: data.stats.totalUsers.toString(), change: 'Live', color: 'blue' },
        { title: 'Active Users', value: data.stats.activeUsers.toString(), change: 'Live', color: 'green' },
        { title: 'Admin Users', value: data.stats.adminUsers.toString(), change: 'Live', color: 'red' },
        { title: 'Recent Users (7d)', value: data.stats.recentUsers.toString(), change: 'Live', color: 'purple' }
      ])
      
      setError(null)
    } catch (err) {
      console.error('Error fetching stats:', err.message || err)
      setError(`Failed to load statistics: ${err.message || 'Unknown error'}`)
      // Set fallback values
      setStats([
        { title: 'Total Users', value: 'Error', change: '0%', color: 'blue' },
        { title: 'Active Users', value: 'Error', change: '0%', color: 'green' },
        { title: 'Admin Users', value: 'Error', change: '0%', color: 'red' },
        { title: 'Recent Users (7d)', value: 'Error', change: '0%', color: 'purple' }
      ])
    } finally {
      setLoading(false)
    }
  }

  // Fetch all RedZones for admin
  const fetchRedZones = async () => {
    try {
      setLoadingRedZones(true)
      const token = localStorage.getItem('token')
      
      if (!token) {
        setError('No authentication token found')
        return
      }

      const response = await fetch(API_ENDPOINTS.REDZONES_ALL, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorBody}`)
      }

      const data = await response.json()
      console.log('Admin fetchRedZones API response:', data)
      setRedZones(data.redZones)
      setError(null)
    } catch (err) {
      console.error('Error fetching RedZones:', err.message || err)
      setError(`Failed to load RedZones: ${err.message || 'Unknown error'}`)
    } finally {
      setLoadingRedZones(false)
    }
  }

  // Handle RedZone approval
  const handleApproveRedZone = async (id) => {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        setError('No authentication token found')
        return
      }

      const response = await fetch(API_ENDPOINTS.REDZONES_APPROVE(id), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorBody}`)
      }
      
      // Fetch all RedZones again to update the state
      fetchRedZones()

      // Show success message
      alert('RedZone approved successfully. SMS notifications will be sent to all registered users with valid phone numbers.')
    } catch (err) {
      console.error('Error approving RedZone:', err.message || err)
      setError(`Failed to approve RedZone: ${err.message || 'Unknown error'}`)
    }
  }

  // Handle RedZone rejection
  const handleRejectRedZone = async (id) => {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        setError('No authentication token found')
        return
      }

      const response = await fetch(API_ENDPOINTS.REDZONES_REJECT(id), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorBody}`)
      }
      
      // Fetch all RedZones again to update the state
      fetchRedZones()

      // Show success message
      alert('RedZone rejected successfully')
    } catch (err) {
      console.error('Error rejecting RedZone:', err.message || err)
      setError(`Failed to reject RedZone: ${err.message || 'Unknown error'}`)
    }
  }
  
  // Handle marking a RedZone as safe
  const handleMarkSafe = async (id) => {
    if (!confirm('Are you sure you want to mark this RedZone as safe? This will send SMS notifications to all users.')) {
      return
    }
    
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        setError('No authentication token found')
        return
      }

      const response = await fetch(API_ENDPOINTS.REDZONES_SAFE_NOW(id), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorBody}`)
      }
      
      // Fetch all RedZones again to update the state
      fetchRedZones()

      // Show success message
      alert('RedZone marked as safe successfully. SMS notifications will be sent to all registered users with valid phone numbers.')
    } catch (err) {
      console.error('Error marking RedZone as safe:', err.message || err)
      setError(`Failed to mark RedZone as safe: ${err.message || 'Unknown error'}`)
    }
  }

  // Handle new RedZone submission
  const handleSubmitRedZone = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        setError('No authentication token found')
        return
      }

      // Create FormData for file upload
      const formData = new FormData()
      formData.append('title', newRedZone.title)
      formData.append('description', newRedZone.description)
      formData.append('location', newRedZone.location)
      formData.append('severity', newRedZone.severity)
      formData.append('status', 'approved') // Admin-created zones are auto-approved
      
      if (redZoneImage) {
        formData.append('image', redZoneImage)
      }

      const response = await fetch(API_ENDPOINTS.REDZONES_CREATE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorBody}`)
      }

      const result = await response.json()

      // Reset form
      setNewRedZone({
        title: '',
        description: '',
        location: '',
        severity: 'medium'
      })
      setRedZoneImage(null)

      // Add the new RedZone to the list with approved status
      setRedZones(prevRedZones => [
        {
          ...result.redZone,
          createdAt: new Date().toISOString()
        },
        ...prevRedZones
      ])

      // Show success message
      alert('New RedZone created successfully')
    } catch (err) {
      console.error('Error creating RedZone:', err.message || err)
      setError(`Failed to create RedZone: ${err.message || 'Unknown error'}`)
    }
  }

  // Handle map-based red zone creation
  const handleCreateMapRedZone = async (e) => {
    e.preventDefault()
    if (!selectedCoords) {
      alert('Please select a location on the map first')
      return
    }

    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        setError('No authentication token found')
        return
      }

      // Create FormData for file upload
      const formData = new FormData()
      formData.append('title', mapRedZone.title)
      formData.append('description', mapRedZone.description)
      formData.append('location', newRedZone.location || `${selectedCoords.lat.toFixed(6)}, ${selectedCoords.lng.toFixed(6)}`)
      formData.append('severity', newRedZone.severity) // Use main form severity instead of mapRedZone.severity
      formData.append('status', 'approved') // Admin-created zones are auto-approved
    
      // Add coordinates as a JSON string
      formData.append('coordinates', JSON.stringify({
        lat: selectedCoords.lat,
        lng: selectedCoords.lng
      }))
      
      if (mapRedZoneImage) {
        formData.append('image', mapRedZoneImage)
      }

      const response = await fetch(API_ENDPOINTS.REDZONES_CREATE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorBody}`)
      }

      const result = await response.json()

      // Reset forms and state
      setMapRedZone({
        title: '',
        description: '',
        severity: 'medium',
        coordinates: null
      })
      setMapRedZoneImage(null)
      setSelectedCoords(null)
      setMapMode('view')

      // Refresh the red zones list to show the new zone immediately
      await fetchRedZones()

      // Also add the new zone to current state for immediate visibility
      const newZoneForState = {
        _id: result.redZone._id,
        title: result.redZone.title,
        description: result.redZone.description,
        location: result.redZone.location,
        severity: result.redZone.severity,
        status: result.redZone.status,
        coordinates: result.redZone.coordinates,
        createdAt: result.redZone.createdAt,
        reportedBy: result.redZone.reportedBy
      }
    
      // Add to current state for immediate display
      setRedZones(prevRedZones => [newZoneForState, ...prevRedZones])

      alert('Red Zone created successfully and is now visible to all users!')
      console.log('New red zone created with coordinates:', result.redZone.coordinates)
    } catch (err) {
      console.error('Error creating map-based RedZone:', err.message || err)
      setError(`Failed to create RedZone: ${err.message || 'Unknown error'}`)
    }
  }

  // Get circle color based on severity
  const getCircleColor = (severity) => {
    switch (severity) {
      case 'high': return '#EF4444'
      case 'medium': return '#F59E0B'
      case 'low': return '#10B981'
      default: return '#6B7280'
    }
  }

  useEffect(() => {
    fetchStats()
    fetchRedZones()
    fetchUserContacts()
    fetchPendingRemovals()
  }, [])

  const recentActivity = [
    { action: 'New user registered', time: '2 minutes ago', type: 'user' },
    { action: 'Alert triggered in Zone A', time: '5 minutes ago', type: 'alert' },
    { action: 'System backup completed', time: '1 hour ago', type: 'system' },
    { action: 'Admin login from IP 192.168.1.100', time: '2 hours ago', type: 'security' }
  ]

  return (
    <div className="admin-container">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="mobile-overlay" 
          onClick={handleOverlayClick}
        ></div>
      )}
      
      {/* Mobile Hamburger Menu */}
      <div className="mobile-header">
        <div 
          className={`hamburger-menu ${mobileMenuOpen ? 'active' : ''}`} 
          onClick={toggleMobileMenu}
        >
          <span></span>
          <span></span>
          <span></span>
        </div>
        <h1>Admin Dashboard</h1>
        <div className="mobile-actions">
          <button 
            className="mobile-refresh" 
            onClick={fetchStats} 
            disabled={loading}
          >
            <span>🔄</span>
          </button>
        </div>
      </div>

      {/* Admin Header */}
      <header className={`admin-header ${mobileMenuOpen ? 'hidden-mobile' : ''}`}>
        <div className="admin-header-left">
          <AdminIcon />
          <h1>Admin Dashboard</h1>
        </div>
        <div className="admin-header-right">
          <button 
            className="btn btn-secondary" 
            onClick={fetchStats}
            disabled={loading}
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            <span style={{ fontSize: '14px' }}>🔄</span>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <div className="notification-bell" style={{ position: 'relative' }} ref={notificationRef}>
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
            >
              <BellIcon />
              {hasNotifications && <span className="notification-dot"></span>}
            </button>
            
            {showNotificationDropdown && (
              <div 
                className="notification-dropdown"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: '0',
                  background: 'rgba(0, 0, 0, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '20px',
                  minWidth: '400px',
                  maxWidth: '500px',
                  zIndex: 1000,
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                  marginTop: '10px'
                }}
              >
                <h3 style={{ margin: '0 0 15px 0', color: 'white', fontSize: '1.1rem' }}>Pending Contact Removal Requests</h3>
                
                {loadingPendingRemovals ? (
                  <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>Loading pending requests...</p>
                ) : pendingRemovals.length > 0 ? (
                  <>
                    <div className="notification-summary" style={{ marginBottom: '15px' }}>
                      <p className="notification-count" style={{ color: '#3498db', margin: 0, fontWeight: '600' }}>
                        {pendingRemovals.length} pending removal request{pendingRemovals.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {pendingRemovals.map((contact) => (
                        <div 
                          key={contact._id} 
                          style={{
                            backgroundColor: 'rgba(231, 76, 60, 0.1)',
                            borderLeft: '4px solid #e74c3c',
                            borderRadius: '4px',
                            padding: '12px',
                            marginBottom: '10px',
                            color: 'white'
                          }}
                        >
                          <div style={{ marginBottom: '8px' }}>
                            <strong>{contact.name}</strong> ({contact.email})
                          </div>
                          <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '10px' }}>
                            Phone: {contact.phone} | Requested: {new Date(contact.updatedAt).toLocaleDateString()}
                          </div>
                          <div className="action-buttons" style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              onClick={() => {
                                handleApproveRemoval(contact._id)
                                setShowNotificationDropdown(false)
                              }}
                              className="btn btn-success"
                              style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                              title="Approve Removal"
                            >
                              ✅ Accept
                            </button>
                            <button 
                              onClick={() => {
                                handleRejectRemoval(contact._id)
                                setShowNotificationDropdown(false)
                              }}
                              className="btn btn-danger"
                              style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                              title="Reject Removal"
                            >
                              ❌ Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <button 
                      onClick={fetchPendingRemovals}
                      className="btn btn-secondary"
                      disabled={loadingPendingRemovals}
                      style={{ 
                        marginTop: '15px', 
                        width: '100%',
                        fontSize: '0.9rem',
                        padding: '8px'
                      }}
                    >
                      {loadingPendingRemovals ? 'Refreshing...' : '🔄 Refresh Requests'}
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255, 255, 255, 0.7)' }}>
                    <div style={{ marginBottom: '10px', fontSize: '2rem', opacity: 0.5 }}>
                      <BellIcon />
                    </div>
                    <h4 style={{ margin: '0 0 8px 0', color: 'rgba(255, 255, 255, 0.8)' }}>No Pending Requests</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>There are no pending contact removal requests at this time.</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <button className="btn btn-primary">Settings</button>
          <button onClick={handleLogout} className="btn btn-ghost">Logout</button>
        </div>
      </header>

      {/* Admin Navigation - Top Navbar */}
      <nav 
        ref={navRef} 
        className={`admin-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}
      >
        <div className="mobile-nav-header">
          <h2>Menu</h2>
          <button 
            className="close-mobile-menu" 
            onClick={() => setMobileMenuOpen(false)}
          >
            ×
          </button>
        </div>
        <div className="nav-links-container">
          <button 
            className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('dashboard')
              setMobileMenuOpen(false)
            }}
          >
            <DashboardIcon />
            <span>Dashboard</span>
          </button>
          <button 
            className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('users')
              setMobileMenuOpen(false)
            }}
          >
            <AdminIcon />
            <span>Manage RedZones</span>
          </button>
          <button 
            className={`admin-nav-item ${activeTab === 'create-redzone' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('create-redzone')
              setMobileMenuOpen(false)
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            <span>Create RedZone</span>
          </button>
          <button 
            className={`admin-nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('history')
              setMobileMenuOpen(false)
            }}
          >
            <HistoryIcon />
            <span>History</span>
          </button>
          <button 
            className={`admin-nav-item ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('security')
              setMobileMenuOpen(false)
            }}
          >
            <ShieldIcon />
            <span>Users</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="admin-main">
        {activeTab === 'dashboard' && (
          <div className="dashboard-content">
            {/* Stats Cards */}
            {error && (
              <div className="error-message" style={{ 
                background: '#fee', 
                color: '#c33', 
                padding: '1rem', 
                borderRadius: '8px', 
                marginBottom: '1rem',
                border: '1px solid #fcc'
              }}>
                ⚠️ {error}
              </div>
            )}
            
            <div className="stats-grid">
              {stats.map((stat, index) => (
                <div key={index} className={`stat-card stat-${stat.color}`}>
                  <div className="stat-header">
                    <h3>{stat.title}</h3>
                    <span className={`stat-change ${stat.change === 'Live' ? 'positive' : stat.change.startsWith('+') ? 'positive' : 'negative'}`}>
                      {loading ? 'Loading...' : stat.change}
                    </span>
                  </div>
                  <div className="stat-value">
                    {loading ? (
                      <div>Loading...</div>
                    ) : (
                      stat.value
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Activity */}
            <div className="activity-section">
              <h2>Recent Activity</h2>
              <div className="activity-list">
                {recentActivity.map((activity, index) => (
                  <div key={index} className={`activity-item activity-${activity.type}`}>
                    <div className="activity-icon">
                      {activity.type === 'user' && <AdminIcon />}
                      {activity.type === 'alert' && <BellIcon />}
                      {activity.type === 'system' && <DashboardIcon />}
                      {activity.type === 'security' && <ShieldIcon />}
                    </div>
                    <div className="activity-content">
                      <p className="activity-action">{activity.action}</p>
                      <p className="activity-time">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-content">
            <h2>RedZone Review History</h2>
            <div className="history-filters">
              <button 
                className={`btn ${historyFilter === 'all' ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setHistoryFilter('all')}
              >
                All
              </button>
              <button 
                className={`btn ${historyFilter === 'approved' ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setHistoryFilter('approved')}
              >
                Approved
              </button>
              <button 
                className={`btn ${historyFilter === 'rejected' ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setHistoryFilter('rejected')}
              >
                Rejected
              </button>
              <button 
                className={`btn ${historyFilter === 'safe' ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setHistoryFilter('safe')}
              >
                Safe
              </button>
            </div>
            
            <div className="history-list">
              {loadingRedZones ? (
                <p>Loading history...</p>
              ) : (
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Location</th>
                      <th>Level</th>
                      <th>Status</th>
                      <th>Image</th>
                      <th>Reviewed At</th>
                      {historyFilter === 'all' && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {redZones
                      .filter(zone => {
                        if (historyFilter === 'all') return zone.status === 'approved' || zone.status === 'rejected' || zone.status === 'safe';
                        if (historyFilter === 'approved') return zone.status === 'approved';
                        if (historyFilter === 'rejected') return zone.status === 'rejected';
                        if (historyFilter === 'safe') return zone.status === 'safe';
                        return false;
                      })
                      .map((zone, index) => (
                        <tr key={`${zone._id}-${index}`} className={`severity-${zone.severity}`}>
                          <td>{zone.title}</td>
                          <td>{zone.location}</td>
                          <td>
                            <span className={`severity-badge ${zone.severity}`}>
                              {zone.severity.charAt(0).toUpperCase() + zone.severity.slice(1)}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge ${zone.status}`}>
                              {zone.status.charAt(0).toUpperCase() + zone.status.slice(1)}
                            </span>
                          </td>
                          <td>
                            {zone.imageUrl ? (
                              <img 
                                src={`${API_BASE_URL}${zone.imageUrl}`} 
                                alt={zone.title} 
                                className="redzone-thumbnail"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.parentElement.innerHTML = '<span class="no-image">No image</span>';
                                }}
                              />
                            ) : (
                              <span className="no-image">No image</span>
                            )}
                          </td>
                          <td>{new Date(zone.reviewedAt || zone.updatedAt).toLocaleString()}</td>
                          <td>
                            {historyFilter === 'all' && zone.status === 'approved' && (
                              <button 
                                className="btn btn-success btn-sm"
                                onClick={() => handleMarkSafe(zone._id)}
                              >
                                Safe Now
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
              
              {!loadingRedZones && redZones.filter(zone => {
                if (historyFilter === 'all') return zone.status === 'approved' || zone.status === 'rejected' || zone.status === 'safe';
                if (historyFilter === 'approved') return zone.status === 'approved';
                if (historyFilter === 'rejected') return zone.status === 'rejected';
                if (historyFilter === 'safe') return zone.status === 'safe';
                return false;
              }).length === 0 && (
                <div className="empty-state">
                  <p>No {historyFilter === 'safe' ? 'safe zones' : 'review history'} found.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="security-content">
            <h2>User Contacts</h2>
            <div className="user-contacts-section">
              {loadingContacts ? (
                <p>Loading contacts...</p>
              ) : userContacts.length > 0 ? (
                <table className="contacts-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Date Added</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userContacts.map((contact) => (
                      <tr key={contact._id}>
                        <td>{contact.name}</td>
                        <td>{contact.email}</td>
                        <td>{contact.phone}</td>
                        <td>{new Date(contact.createdAt).toLocaleString()}</td>
                        <td>
                          <button 
                            onClick={() => handleDeleteContact(contact._id)}
                            className="delete-btn"
                            title="Delete Contact"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
                  <p>No user contacts found. Users can add their contact information from the dashboard.</p>
                </div>
              )}
              
              <button 
                onClick={fetchUserContacts} 
                className="btn btn-secondary refresh-btn"
                disabled={loadingContacts}
              >
                {loadingContacts ? 'Refreshing...' : '🔄 Refresh Contacts'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="redzones-management">
            <h2>Manage RedZones</h2>
            <div className="redzones-grid">
              <div className="manage-redzones-card">
                <h3>All RedZones</h3>
                {loadingRedZones ? (
                  <p>Loading RedZones...</p>
                ) : (
                  <table className="redzones-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Location</th>
                        <th>Level</th>
                        <th>Status</th>
                        <th>Image</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {redZones
                        .filter(zone => zone.status === 'pending')
                        .map((zone, index) => (
                          <tr key={`${zone._id}-${index}`}>
                            <td>{zone.title}</td>
                            <td>{zone.location}</td>
                            <td>
                              <span className={`severity-badge ${zone.severity}`}>
                                {zone.severity.charAt(0).toUpperCase() + zone.severity.slice(1)}
                              </span>
                            </td>
                            <td>
                              <span className={`status-badge ${zone.status}`}>
                                {zone.status.charAt(0).toUpperCase() + zone.status.slice(1)}
                              </span>
                            </td>
                            <td>
                              {zone.imageUrl ? (
                                <img 
                                  src={`${API_BASE_URL}${zone.imageUrl}`} 
                                  alt={zone.title} 
                                  className="redzone-thumbnail"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.parentElement.innerHTML = '<span class="no-image">No image</span>';
                                  }}
                                />
                              ) : (
                                <span className="no-image">No image</span>
                              )}
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button 
                                  onClick={() => handleApproveRedZone(zone._id)}
                                  className="approve-btn"
                                  title="Approve"
                                >
                                  ✅
                                </button>
                                <button 
                                  onClick={() => handleRejectRedZone(zone._id)}
                                  className="reject-btn"
                                  title="Reject"
                                >
                                  ❌
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
                
                {redZones.filter(zone => zone.status === 'pending').length === 0 && !loadingRedZones && (
                  <div className="empty-state">
                    <p>No pending RedZones for review.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'create-redzone' && (
          <div className="create-redzone-content">
            <h2>Create RedZone</h2>
            
            {/* Form-based creation - Centered with increased width */}
            <div className="add-redzone-card">
              <h3>Add New RedZone</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                // Don't submit form directly, let the single button handle it
              }} className="redzone-form">
                <div className="form-group">
                  <label htmlFor="title">Title:</label>
                  <input
                    type="text"
                    id="title"
                    value={newRedZone.title}
                    onChange={(e) => setNewRedZone({...newRedZone, title: e.target.value})}
                    required
                    placeholder="E.g., Dangerous Intersection"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="description">Description:</label>
                  <textarea
                    id="description"
                    value={newRedZone.description}
                    onChange={(e) => setNewRedZone({...newRedZone, description: e.target.value})}
                    required
                    placeholder="Describe the danger in detail"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="location">Location:</label>
                  <input
                    type="text"
                    id="location"
                    value={newRedZone.location}
                    onChange={(e) => setNewRedZone({...newRedZone, location: e.target.value})}
                    required
                    placeholder="E.g., Gunupur Market Area"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="severity">Severity Level:</label>
                  <select
                    id="severity"
                    value={newRedZone.severity}
                    onChange={(e) => {
                      const newSeverity = e.target.value;
                      setNewRedZone({...newRedZone, severity: newSeverity});
                    }}
                    required
                  >
                    <option value="low">Low - Caution advised</option>
                    <option value="medium">Medium - Potential danger</option>
                    <option value="high">High - Immediate danger</option>
                  </select>
                  {/* Visual indicator for current severity color */}
                  <div style={{ 
                    marginTop: '8px',
                    padding: '8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <span>Current danger zone color: </span>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: getCircleColor(newRedZone.severity),
                      marginLeft: '10px',
                      border: '2px solid white'
                    }}></div>
                    <span style={{ 
                      marginLeft: '10px',
                      fontWeight: '500',
                      textTransform: 'capitalize'
                    }}>
                      {newRedZone.severity}
                    </span>
                  </div>
                </div>
                
                {/* Image Upload Section */}
                <div className="form-group">
                  <label htmlFor="image">Upload Image (optional):</label>
                  <input
                    type="file"
                    id="image"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setRedZoneImage(e.target.files[0])
                      }
                    }}
                  />
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)', marginTop: '5px' }}>
                    Upload an image to provide visual context for the RedZone (optional)
                  </p>
                </div>
                
                {/* Removed individual submit button */}
              </form>
            </div>
            
            {/* Map-based creation */}
            <div className="map-create-content">
              <h3>Create RedZone on Map</h3>
              <p>Click on the map to select a location for the new RedZone</p>
              
              <div className="map-controls">
                <button 
                  className={`btn ${mapMode === 'view' ? 'btn-secondary' : 'btn-ghost'}`}
                  onClick={() => {
                    setMapMode('view')
                    setSelectedCoords(null)
                  }}
                >
                  👁️ View Mode
                </button>
                <button 
                  className={`btn ${mapMode === 'create' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setMapMode('create')}
                >
                  ➕ Create Mode
                </button>
                {selectedCoords && (
                  <span className="selected-coords">
                    Selected: {selectedCoords.lat.toFixed(6)}, {selectedCoords.lng.toFixed(6)}
                  </span>
                )}
              </div>

              <div className="map-create-container">
                <MapContainer
                  center={[MAP_CONFIG.defaultCenter.lat, MAP_CONFIG.defaultCenter.lng]}
                  zoom={MAP_CONFIG.defaultZoom}
                  style={{ height: '100%', width: '100%' }}
                  maxBounds={undefined}
                  maxBoundsViscosity={1.0}
                  {...MAP_CONFIG.leafletOptions}
                >
                  {/* Hybrid Map Layers - ESRI World Imagery with Labels */}
                  <TileLayer
                    attribution='&copy; <a href="https://www.esri.com/">Esri</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    zIndex={1}
                  />
                  <TileLayer
                    attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                    zIndex={2}
                  />
                  
                  <MapClickHandler />
                  {selectedCoords && <MapCenterUpdater center={selectedCoords} />}
                  
                  {/* Show existing approved red zones as circles */}
                  {redZones
                    .filter(zone => zone.status === 'approved' && zone.coordinates && zone.coordinates.lat && zone.coordinates.lng)
                    .map((zone, index) => (
                      <Circle
                        key={`${zone._id}-${index}`}
                        center={[zone.coordinates.lat, zone.coordinates.lng]}
                        radius={200} // Reduced from 500m to 200m to match user map
                        pathOptions={{
                          color: getCircleColor(zone.severity),
                          fillColor: getCircleColor(zone.severity),
                          fillOpacity: 0.3,
                          weight: 2
                        }}
                      >
                        <Popup>
                          <div>
                            <h4>{zone.title}</h4>
                            <p><strong>Severity:</strong> {zone.severity}</p>
                            <p><strong>Description:</strong> {zone.description}</p>
                            {zone.location && (
                              <p><strong>Location:</strong> {zone.location}</p>
                            )}
                          </div>
                        </Popup>
                      </Circle>
                    ))
                  }
                  
                  {/* Show selected location as a circle with dynamic color based on severity */}
                  {selectedCoords && (
                    <Circle
                      center={[selectedCoords.lat, selectedCoords.lng]}
                      radius={200} // Reduced from 500m to 200m to match user map
                      pathOptions={{
                        color: getCircleColor(newRedZone.severity),
                        fillColor: getCircleColor(newRedZone.severity),
                        fillOpacity: 0.5,
                        weight: 3,
                        dashArray: '10, 10' // Dashed border to indicate it's being created
                      }}
                    />
                  )}
                </MapContainer>
              </div>

              {/* Instructions */}
              <div className={`instructions ${mapMode === 'create' ? 'create-mode' : ''}`}>
                {mapMode === 'view' ? (
                  <p style={{ margin: 0 }}>
                    👁️ <strong>View Mode:</strong> You can see existing RedZones on the map. Switch to Create Mode to add new ones.
                  </p>
                ) : (
                  <p style={{ margin: 0 }}>
                    ➕ <strong>Create Mode:</strong> Click anywhere on the map to select a location for your new RedZone. A red circle will appear showing the danger area.
                  </p>
                )}
              </div>

              {/* Show form button when coordinates are selected */}
              {/* Removed "Add RedZone at Selected Location" button as per user request */}

              {/* Creation Form */}
              {/* Removed separate map creation form as per user request */}

              {/* Single Add RedZone button at the bottom of the page */}
              <div className="bottom-add-button">
                <button 
                  onClick={async () => {
                    // Check if we're creating via map or form
                    if (mapMode === 'create' && selectedCoords) {
                      // Handle map-based creation using main form data
                      if (!newRedZone.title || !newRedZone.description || !newRedZone.location) {
                        alert('Please fill in all required fields in the main form');
                        return;
                      }
                      
                      try {
                        const token = localStorage.getItem('token');
                        if (!token) {
                          setError('No authentication token found');
                          return;
                        }

                        // Create FormData for file upload
                        const formData = new FormData();
                        formData.append('title', newRedZone.title);
                        formData.append('description', newRedZone.description);
                        formData.append('location', newRedZone.location || `${selectedCoords.lat.toFixed(6)}, ${selectedCoords.lng.toFixed(6)}`);
                        formData.append('severity', newRedZone.severity); // Use main form severity
                        formData.append('status', 'approved'); // Admin-created zones are auto-approved
                        
                        // Add coordinates as a JSON string
                        formData.append('coordinates', JSON.stringify({
                          lat: selectedCoords.lat,
                          lng: selectedCoords.lng
                        }));
                        
                        if (redZoneImage) {
                          formData.append('image', redZoneImage);
                        }

                        const response = await fetch(API_ENDPOINTS.REDZONES_CREATE, {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${token}`
                          },
                          body: formData
                        });

                        if (!response.ok) {
                          const errorBody = await response.text();
                          throw new Error(`HTTP error! status: ${response.status}, message: ${errorBody}`);
                        }

                        const result = await response.json();

                        // Reset form and map state
                        setNewRedZone({
                          title: '',
                          description: '',
                          location: '',
                          severity: 'medium'
                        });
                        setRedZoneImage(null);
                        setSelectedCoords(null);
                        setMapMode('view');

                        // Refresh the red zones list to show the new zone immediately
                        await fetchRedZones();

                        // Also add the new zone to current state for immediate visibility
                        const newZoneForState = {
                          _id: result.redZone._id,
                          title: result.redZone.title,
                          description: result.redZone.description,
                          location: result.redZone.location,
                          severity: result.redZone.severity,
                          status: result.redZone.status,
                          coordinates: result.redZone.coordinates,
                          createdAt: result.redZone.createdAt,
                          reportedBy: result.redZone.reportedBy
                        };
                        
                        // Add to current state for immediate display
                        setRedZones(prevRedZones => [newZoneForState, ...prevRedZones]);

                        alert('Red Zone created successfully and is now visible to all users!');
                        console.log('New red zone created with coordinates:', result.redZone.coordinates);
                      } catch (err) {
                        console.error('Error creating map-based RedZone:', err.message || err);
                        setError(`Failed to create RedZone: ${err.message || 'Unknown error'}`);
                      }
                    } else if (!selectedCoords) {
                      // Handle form-based creation
                      if (!newRedZone.title || !newRedZone.description || !newRedZone.location) {
                        alert('Please fill in all required fields');
                        return;
                      }
                      
                      try {
                        const token = localStorage.getItem('token');
                        if (!token) {
                          setError('No authentication token found');
                          return;
                        }

                        // Create FormData for file upload
                        const formData = new FormData();
                        formData.append('title', newRedZone.title);
                        formData.append('description', newRedZone.description);
                        formData.append('location', newRedZone.location);
                        formData.append('severity', newRedZone.severity);
                        formData.append('status', 'approved'); // Admin-created zones are auto-approved
                        
                        if (redZoneImage) {
                          formData.append('image', redZoneImage);
                        }

                        const response = await fetch(API_ENDPOINTS.REDZONES_CREATE, {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${token}`
                          },
                          body: formData
                        });

                        if (!response.ok) {
                          const errorBody = await response.text();
                          throw new Error(`HTTP error! status: ${response.status}, message: ${errorBody}`);
                        }

                        const result = await response.json();

                        // Reset form
                        setNewRedZone({
                          title: '',
                          description: '',
                          location: '',
                          severity: 'medium'
                        });
                        setRedZoneImage(null);

                        // Add the new RedZone to the list with approved status
                        setRedZones(prevRedZones => [
                          {
                            ...result.redZone,
                            createdAt: new Date().toISOString()
                          },
                          ...prevRedZones
                        ]);

                        // Show success message
                        alert('New RedZone created successfully');
                      } catch (err) {
                        console.error('Error creating RedZone:', err.message || err);
                        setError(`Failed to create RedZone: ${err.message || 'Unknown error'}`);
                      }
                    } else {
                      alert('Please select a location on the map first');
                    }
                  }}
                  className="btn btn-primary"
                  disabled={mapMode === 'create' && !selectedCoords}
                  style={{ 
                    width: '100%', 
                    maxWidth: '400px', 
                    margin: '0 auto', 
                    padding: '12px 24px',
                    fontSize: '18px'
                  }}
                >
                  Add RedZone
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}