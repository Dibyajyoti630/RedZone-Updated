// API Configuration
// Use environment variable or fallback to localhost for development
const getApiBaseUrl = () => {
  // Check if running in browser and get the environment variable
  const envUrl = import.meta.env.VITE_API_URL
  
  if (envUrl) {
    console.log('Using VITE_API_URL from environment:', envUrl)
    return envUrl
  }
  
  // Fallback to localhost for development
  const fallbackUrl = 'http://localhost:5004'
  console.log('Using fallback API URL:', fallbackUrl)
  return fallbackUrl
}

export const API_BASE_URL = getApiBaseUrl()

export const API_ENDPOINTS = {
  // Auth endpoints
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  REGISTER: `${API_BASE_URL}/api/auth/register`,
  ME: `${API_BASE_URL}/api/auth/me`,
  
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
  USER_CONTACT_REQUEST_REMOVAL: `${API_BASE_URL}/api/user-contacts/me/request-removal`,
  USER_CONTACT_NOTIFY: `${API_BASE_URL}/api/user-contacts/notify`,
  USER_CONTACT_ME: `${API_BASE_URL}/api/user-contacts/me`,
  
  // Health check
  HEALTH: `${API_BASE_URL}/api/health`
}

// Helper function to make API calls
export const apiCall = async (endpoint, options = {}) => {
  console.log('Making API call to:', endpoint)
  const token = localStorage.getItem('token')
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    }
  }

  console.log('Request options:', {
    method: options.method || 'GET',
    headers: defaultOptions.headers,
    body: options.body
  })

  const response = await fetch(endpoint, {
    ...defaultOptions,
    ...options
  })

  console.log('Response status:', response.status, response.statusText)

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
