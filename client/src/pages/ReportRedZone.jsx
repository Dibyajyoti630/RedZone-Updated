import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_ENDPOINTS } from '../config/api.js'
import './ReportRedZone.css'

function ReportRedZone() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    landmark: '',
    severity: 'medium',
    coordinates: {
      lat: null,
      lng: null
    },
    image: null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFormData({
        ...formData,
        image: file
      })
      
      // Create a preview URL for the image
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // Try to get user's current location when component mounts
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            coordinates: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
          }))
        },
        (error) => {
          console.warn('Error getting location:', error.message)
        }
      )
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        setError('You must be logged in to report a RedZone')
        setLoading(false)
        return
      }

      // Create FormData for multipart/form-data submission (for image upload)
      const formDataToSubmit = new FormData()
      
      // Add all text fields
      formDataToSubmit.append('title', formData.title)
      formDataToSubmit.append('description', formData.description)
      formDataToSubmit.append('location', formData.location)
      formDataToSubmit.append('landmark', formData.landmark)
      formDataToSubmit.append('severity', formData.severity)
      
      // Add coordinates if available
      if (formData.coordinates.lat && formData.coordinates.lng) {
        formDataToSubmit.append('coordinates', JSON.stringify(formData.coordinates))
      }
      
      // Add image if available
      if (formData.image) {
        formDataToSubmit.append('image', formData.image)
      }

      const response = await fetch(API_ENDPOINTS.REDZONES_CREATE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type here, it will be automatically set with the boundary parameter
        },
        body: formDataToSubmit
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to submit RedZone report')
      }

      const result = await response.json()

      // Success - redirect to dashboard
      alert('RedZone report submitted successfully! It will be reviewed by an admin.')
      navigate('/dashboard')
    } catch (err) {
      console.error('Error submitting RedZone report:', err)
      setError(err.message || 'Failed to submit report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="report-redzone-container">
      <div className="report-redzone-header">
        <h1>Report a RedZone</h1>
        <p>Help keep your community safe by reporting dangerous areas</p>
      </div>

      <div className="report-redzone-content">
        <div className="report-form-container">
          <form onSubmit={handleSubmit} className="report-form">
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="E.g., Dangerous Intersection"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the danger in detail"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="location">Address/Location</label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="E.g., Gunupur Market Area"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="landmark">Nearby Landmark</label>
              <input
                type="text"
                id="landmark"
                name="landmark"
                value={formData.landmark}
                onChange={handleChange}
                placeholder="E.g., Near GIET UNIVERSITY"
              />
            </div>

            <div className="form-group">
              <label htmlFor="severity">Severity Level</label>
              <select
                id="severity"
                name="severity"
                value={formData.severity}
                onChange={handleChange}
                required
              >
                <option value="low">Low - Caution advised</option>
                <option value="medium">Medium - Potential danger</option>
                <option value="high">High - Immediate danger</option>
              </select>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary submit-btn"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        </div>

        <div className="image-upload-card">
          <div className="image-upload-header">
            <h2>Upload Image</h2>
            <p>Add a photo of the area to help identify the danger</p>
          </div>
          <div className="image-upload-container">
            {imagePreview ? (
              <div className="image-preview">
                <img src={imagePreview} alt="Preview" />
                <button 
                  type="button" 
                  className="remove-image-btn"
                  onClick={() => {
                    setImagePreview(null)
                    setFormData({
                      ...formData,
                      image: null
                    })
                  }}
                >
                  Remove Image
                </button>
              </div>
            ) : (
              <div className="image-upload-placeholder">
                <div className="upload-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="m21 15-5-5L5 21"/>
                  </svg>
                </div>
                <p>Click to upload an image</p>
                <input 
                  type="file" 
                  id="image" 
                  name="image" 
                  accept="image/*"
                  onChange={handleImageChange}
                  className="file-input"
                />
              </div>
            )}
            {formData.coordinates.lat && formData.coordinates.lng && (
              <div className="location-info">
                <p>Location detected:</p>
                <p className="coordinates">
                  Lat: {formData.coordinates.lat.toFixed(6)}<br />
                  Lng: {formData.coordinates.lng.toFixed(6)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="report-actions">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="btn btn-ghost"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default ReportRedZone