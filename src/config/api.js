// API Configuration
// Use environment variable or fallback to localhost for development
const getApiBaseUrl = () => {
  // Check if running in browser and get the environment variable
  const envUrl = import.meta.env.VITE_API_URL
  
  if (envUrl) {
    console.log('Using VITE_API_URL from environment:', envUrl)
    return envUrl
  }
  
  // Fallback to localhost for development - using port 5005 to match backend
  const fallbackUrl = 'http://localhost:5005'
  console.log('Using fallback API URL:', fallbackUrl)
  return fallbackUrl
}

export const API_BASE_URL = getApiBaseUrl()

export const API_ENDPOINTS = {
  // Auth endpoints
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  REGISTER: `${API_BASE_URL}/api/auth/register`,
  ME: `${API_BASE_URL}/api/auth/me`,
  REFRESH_TOKEN: `${API_BASE_URL}/api/auth/refresh-token`,
  
  // Admin endpoints
  ADMIN_STATS: `${API_BASE_URL}/api/admin/stats`,
  ADMIN_USER_CONTACTS: `${API_BASE_URL}/api/admin/user-contacts`,
  ADMIN_APPROVE_CONTACT_REMOVAL: (id) => `${API_BASE_URL}/api/admin/user-contacts/${id}/approve-removal`,
  ADMIN_REJECT_CONTACT_REMOVAL: (id) => `${API_BASE_URL}/api/admin/user-contacts/${id}/reject-removal`,
  ADMIN_PENDING_CONTACT_REMOVALS: `${API_BASE_URL}/api/admin/pending-contact-removals`,
  
  // User endpoints
  UPDATE_PROFILE: `${API_BASE_URL}/api/users/profile`,
  UPDATE_NOTIFICATION_PREFS: `${API_BASE_URL}/api/users/notification-preferences`,
  
  // RedZone endpoints
  REDZONES_RECENT: `${API_BASE_URL}/api/redzones/recent`,
  REDZONES_APPROVED: `${API_BASE_URL}/api/redzones/approved`,
  REDZONES_ALL: `${API_BASE_URL}/api/redzones`,
  REDZONES_CREATE: `${API_BASE_URL}/api/redzones`,
  REDZONES_APPROVE: (id) => `${API_BASE_URL}/api/redzones/${id}/approve`,
  REDZONES_REJECT: (id) => `${API_BASE_URL}/api/redzones/${id}/reject`,
  REDZONES_SAFE_NOW: (id) => `${API_BASE_URL}/api/redzones/${id}/safe-now`,
  REDZONES_CHECK_USER_LOCATION: `${API_BASE_URL}/api/redzones/check-user-location`,
  USER_CONTACT_REQUEST_REMOVAL: `${API_BASE_URL}/api/user-contacts/me/request-removal`,
  USER_CONTACT_NOTIFY: `${API_BASE_URL}/api/user-contacts/notify`,
  USER_CONTACT_ME: `${API_BASE_URL}/api/user-contacts/me`,
  
  // Health check
  HEALTH: `${API_BASE_URL}/api/health`
}

// Function to refresh token
const refreshToken = async () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) return null

    const response = await fetch(API_ENDPOINTS.REFRESH_TOKEN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to refresh token')
    }

    const data = await response.json()
    localStorage.setItem('token', data.token)
    return data.token
  } catch (error) {
    console.error('Token refresh error:', error)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    return null
  }
}

// Helper function to make API calls
export const apiCall = async (endpoint, options = {}) => {
  console.log('Making API call to:', endpoint)
  let token = localStorage.getItem('token')
  
  const makeRequest = async (authToken) => {
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
        ...options.headers
      }
    }

    console.log('Request options:', {
      method: options.method || 'GET',
      headers: defaultOptions.headers,
      body: options.body
    })

    return await fetch(endpoint, {
      ...defaultOptions,
      ...options
    })
  }

  let response = await makeRequest(token)

  // If unauthorized due to expired token, try to refresh
  if (response.status === 401) {
    const errorData = await response.json().catch(() => ({}))
    if (errorData.expired || (errorData.message && errorData.message.includes('expired'))) {
      console.log('Token expired, attempting to refresh...')
      const newToken = await refreshToken()
      
      if (newToken) {
        // Retry the request with new token
        response = await makeRequest(newToken)
      } else {
        // Redirect to login if refresh failed
        window.location.href = '/login'
        throw new Error('Session expired. Please log in again.')
      }
    }
  }

  console.log('Response status:', response.status, response.statusText)

  // Handle 404 specifically for user contact endpoint
  if (response.status === 404 && endpoint.includes('/user-contacts/me')) {
    console.log('User contact not found, returning default response')
    return { exists: false }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('API Error:', {
      status: response.status,
      statusText: response.statusText,
      errorData
    })
    throw new Error(errorData.message || `API call failed: ${response.status} ${response.statusText}`)
  }
  
  const responseData = await response.json()
  console.log('Response data:', responseData)
  return responseData
}