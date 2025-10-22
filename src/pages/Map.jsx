import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MAP_CONFIG } from '../config/maps.js'
import { API_ENDPOINTS, API_BASE_URL } from '../config/api.js'

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom marker icons
const createCustomIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 32px;
      height: 32px;
      background-color: ${color};
      border: 2px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    ">!</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  })
}

const userLocationIcon = L.divIcon({
  className: 'user-location-marker',
  html: `<div style="
    width: 24px;
    height: 24px;
    background-color: #4285F4;
    border: 2px solid white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
})

// Component to handle map center updates
function MapUpdater({ center, zoom, shouldCenterOnUser }) {
  const map = useMap()
  
  useEffect(() => {
    if (center && shouldCenterOnUser) {
      map.setView([center.lat, center.lng], zoom, {
        animate: true,
        duration: 1
      })
    }
  }, [center, zoom, map, shouldCenterOnUser])
  
  return null
}

function Map() {
  // Debug API_BASE_URL
  console.log('API_BASE_URL:', API_BASE_URL);
  
  // Mock notifications
  const mockNotifications = [
    {
      id: 1,
      type: "warning",
      message: "You are approaching a high-risk area",
      timestamp: new Date().toISOString()
    },
    {
      id: 2,
      type: "info",
      message: "New RedZone reported in your area",
      timestamp: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
    }
  ]

  // Check browser geolocation support
  const checkGeolocationSupport = useCallback(() => {
    if (!navigator.geolocation) {
      return false
    }
    
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        // Silently check permission status
      })
    }
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // GPS test successful
        },
        (error) => {
          // GPS test failed
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000
        }
      )
    }
    
    return true
  }, [])
  
  // Move the checkCurrentStatus function declaration here, before any references to it
  const checkCurrentStatus = (lat, lng) => {
    console.log('Checking current status for location:', { lat, lng });
    console.log('RedZones available:', redZones.length);
    
    // Calculate distance to nearest RedZone
    const { distance: nearestDistance, zone: nearestZone } = getNearestRedZoneInfo(lat, lng);
    console.log('Nearest RedZone distance:', nearestDistance, 'zone:', nearestZone);

    // Check if user is inside any RedZone (within 200m radius)
    let insideRedZone = false;
    let insideRedZoneSeverity = 'low';
    
    redZones.forEach((zone, index) => {
      const distance = calculateDistance(lat, lng, zone.position.lat, zone.position.lng);
      console.log(`Distance to zone ${index} (${zone.id}): ${distance} km`);
      
      // RedZone radius is 200m = 0.2km
      if (distance < 0.2) {
        insideRedZone = true;
        console.log('User is inside RedZone:', zone.id);
        
        // Use the highest severity if inside multiple zones
        if (zone.severity === 'high' || (zone.severity === 'medium' && insideRedZoneSeverity !== 'high') || insideRedZoneSeverity === 'low') {
          insideRedZoneSeverity = zone.severity;
          console.log('Updated severity to:', insideRedZoneSeverity);
        }
      }
    });

    console.log('Inside RedZone:', insideRedZone, 'Severity:', insideRedZoneSeverity);
    console.log('Nearest distance:', nearestDistance);

    // Set status based on whether user is inside a RedZone or distance to nearest RedZone
    let newStatus;
    if (insideRedZone) {
      // Show danger for high severity zones, warning for medium/low
      newStatus = insideRedZoneSeverity === 'high' ? 'danger' : 'warning';
      console.log('Setting status to:', newStatus, '(inside RedZone)');
    } else if (nearestDistance < 0.5) { // Within 0.5 km
      newStatus = nearestZone?.severity === 'high' ? 'danger' : 'warning';
      console.log('Setting status to:', newStatus, '(near RedZone)');
    } else if (nearestDistance < 2) { // Within 2 km
      newStatus = 'warning';
      console.log('Setting status to:', newStatus, '(close to RedZone)');
    } else {
      newStatus = 'safe';
      console.log('Setting status to:', newStatus, '(safe area)');
    }
    
    setCurrentStatus(newStatus);
    console.log('Status updated to:', newStatus);
  }

  const [userLocation, setUserLocation] = useState({ lat: 19.048359, lng: 83.831714 }) // Set your specific location
  const [locationEnabled, setLocationEnabled] = useState(true) // Set to true to show location by default
  const [redZones, setRedZones] = useState([])
  const [currentStatus, setCurrentStatus] = useState('safe')
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [locationLoading, setLocationLoading] = useState(false)
  const [mapLoading, setMapLoading] = useState(true)
  const [error, setError] = useState(null)
  const [shouldCenterOnUser, setShouldCenterOnUser] = useState(true) // Set to true to center on your location
  const [locationAccuracy, setLocationAccuracy] = useState(null)
  const [isMobile, setIsMobile] = useState(false)
  const [mobilePermissionStatus, setMobilePermissionStatus] = useState(null)
  const mapRef = useRef(null)
  const watchIdRef = useRef(null)
  // Add a ref for redZones to avoid dependency issues
  const redZonesRef = useRef(redZones);
  // Add a ref for checkCurrentStatus function to avoid dependency issues
  // Initialize with null and update in useEffect to avoid temporal dead zone
  const checkCurrentStatusRef = useRef(null);
  
  // Update the ref when checkCurrentStatus changes
  useEffect(() => {
    checkCurrentStatusRef.current = checkCurrentStatus;
  }, [checkCurrentStatus]);
  
  // Update the ref when redZones change
  useEffect(() => {
    redZonesRef.current = redZones;
  }, [redZones]);

  // Function to start watching for location changes
  const startLocationWatching = useCallback(() => {
    console.log('startLocationWatching called');
    if (navigator.geolocation) {
      const watchOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
        forceRequest: true
      }
      
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords
          console.log('Location updated:', { latitude, longitude, accuracy });
          
          const newLocation = { lat: latitude, lng: longitude }
          setUserLocation(newLocation)
          setLocationAccuracy(accuracy)
          if (checkCurrentStatusRef.current) {
            checkCurrentStatusRef.current(latitude, longitude)
          }
          
          // Check if user has entered a RedZone and trigger alert if needed
          checkAndTriggerRedZoneAlertWithZones(latitude, longitude, newLocation, redZonesRef.current);
        },
        (error) => {
          console.error('Location watching error:', error);
          // Don't stop watching, but log the error
          // More detailed error handling
          switch(error.code) {
            case error.PERMISSION_DENIED:
              console.log('Location permission denied during watching. User may have revoked permissions.');
              break;
            case error.POSITION_UNAVAILABLE:
              console.log('Location unavailable during watching. Temporary issue with GPS or network.');
              break;
            case error.TIMEOUT:
              console.log('Location watch timeout. Will retry on next position update.');
              break;
            default:
              console.log(`Unknown location watching error (Code: ${error.code}). Continuing to watch.`);
          }
        },
        watchOptions
      )
    }
  }, [])

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i
      const isMobileDevice = mobileRegex.test(userAgent.toLowerCase())
      setIsMobile(isMobileDevice)
      return isMobileDevice
    }
    
    checkMobile()
  }, [])

  // Handle map loading state
  useEffect(() => {
    setMapLoading(true);
    
    const loadingTimeout = setTimeout(() => {
      setMapLoading(false);
    }, 10000);
    
    return () => {
      clearTimeout(loadingTimeout);
    };
  }, []);

  // Check mobile geolocation permissions
  const checkMobilePermissions = useCallback(async () => {
    if (!isMobile) return
    
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'geolocation' })
        setMobilePermissionStatus(result.state)
        
        result.addEventListener('change', () => {
          setMobilePermissionStatus(result.state)
        })
      }
    } catch (error) {
      // Could not query mobile permissions
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setMobilePermissionStatus('granted')
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setMobilePermissionStatus('denied')
          setError('Mobile Location Permission Denied\n\n Please follow these steps:\n\n1. **Close this browser tab**\n2. **Go to Phone Settings** → Apps → Browser → Permissions → Location → **Allow**\n3. **Reopen the website** and try again\n\n💡 Alternative: Use the "Manual Location" button below')
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000
      }
    )
  }, [isMobile])

  // Mobile-specific permission request
  const requestMobilePermission = useCallback(() => {
    if (!isMobile) return
    
    console.log('📱 Requesting mobile location permission...')
    
    // Try to get a quick position to trigger permission request
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ Mobile permission granted!')
        setMobilePermissionStatus('granted')
        // Don't set location yet, let the main enableLocation function handle it
      },
      (error) => {
        console.log('Mobile permission request failed:', error.code)
        if (error.code === error.PERMISSION_DENIED) {
          setMobilePermissionStatus('denied')
          setError('Mobile Location Permission Denied\\n\\n Please follow these steps:\\n\\n1. **Close this browser tab**\\n2. **Go to Phone Settings** → Apps → Browser → Permissions → Location → **Allow**\\n3. **Reopen the website** and try again\\n\\n💡 Alternative: Use the "Manual Location" button below')
        }
      },
      {
        enableHighAccuracy: false,  // Use low accuracy for permission request
        timeout: 10000,            // Short timeout
        maximumAge: 60000          // Allow cached location for permission check
      }
    )
  }, [isMobile])

  // Load RedZones and notifications from API
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Set your specific location immediately
        setUserLocation({ lat: 19.04835900, lng: 83.83171400 });
        setLocationEnabled(true);
        setShouldCenterOnUser(true);
        if (checkCurrentStatusRef.current) {
          checkCurrentStatusRef.current(19.04835900, 83.83171400);
        }
        
        // Check geolocation support first
        checkGeolocationSupport()
        
        // Fetch approved red zones from API
        const token = localStorage.getItem('token')
        if (token) {
          try {
            const response = await fetch(API_ENDPOINTS.REDZONES_APPROVED, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            })
            
            if (response.ok) {
              const data = await response.json()
              console.log('RedZones API response:', data);
              
              // Transform API data to match our format (already filtered for approved zones)
              const transformedRedZones = data.redZones
                .filter(zone => {
                  // Filter for approved zones and validate required data
                  const isValid = zone.status === 'approved' && 
                                 zone.coordinates && 
                                 zone.coordinates.lat && 
                                 zone.coordinates.lng;
                  return isValid;
                })
                .map(zone => {
                  // Validate and transform zone data
                  const transformedZone = {
                    id: zone._id,
                    name: zone.title || 'Unnamed RedZone',
                    position: {
                      lat: parseFloat(zone.coordinates.lat),
                      lng: parseFloat(zone.coordinates.lng)
                    },
                    severity: zone.severity || 'low',
                    description: zone.description || 'No description provided',
                    timestamp: zone.createdAt,
                    imageUrl: zone.imageUrl || null,
                    status: zone.status
                  };
                  
                  console.log('Transformed RedZone:', transformedZone);
                  return transformedZone;
                });
              
              console.log('Final transformed RedZones:', transformedRedZones);
              setRedZones(transformedRedZones);
              
              // Re-check status after loading RedZones
              if (userLocation && checkCurrentStatusRef.current) {
                checkCurrentStatusRef.current(19.04835900, 83.83171400);
              }
            } else {
              console.log('Failed to fetch RedZones, setting empty array');
              setRedZones([]);
            }
          } catch (apiError) {
            console.error('Error fetching RedZones:', apiError);
            setRedZones([]);
          }
        } else {
          console.log('No token found, setting empty RedZones array');
          setRedZones([]);
        }
        
        // Set mock notifications (you can replace this with API call later)
        setNotifications(mockNotifications);
        setLoading(false);
      } catch (error) {
        console.error('Error in loadInitialData:', error);
        setRedZones([]);
        setLoading(false);
      }
    }
    
    loadInitialData();
  }, [checkGeolocationSupport]); // Remove userLocation from dependencies to prevent continuous fetching

  // Function to refresh red zones from API
  const refreshRedZones = useCallback(async () => {
    console.log('refreshRedZones called');
    const token = localStorage.getItem('token')
    if (!token) {
      console.log('No token found, skipping refresh');
      return;
    }
    
    try {
      console.log('Fetching RedZones from API...');
      const response = await fetch(API_ENDPOINTS.REDZONES_APPROVED, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('RedZones API response:', data);
        
        const transformedRedZones = data.redZones
          .filter(zone => zone.status === 'approved') // Extra safety filter
          .map(zone => ({
            id: zone._id,
            name: zone.title || 'Unnamed RedZone', // Add fallback for name
            position: zone.coordinates && zone.coordinates.lat && zone.coordinates.lng 
              ? { lat: parseFloat(zone.coordinates.lat), lng: parseFloat(zone.coordinates.lng) }
              : { lat: 19.0769, lng: 83.7603 },
            severity: zone.severity || 'low', // Add fallback for severity
            description: zone.description || 'No description provided', // Add fallback for description
            timestamp: zone.createdAt,
            imageUrl: zone.imageUrl || null,
            status: zone.status // Keep status for debugging
          }))
        
        console.log('Transformed RedZones:', transformedRedZones);
        
        setRedZones(prevZones => {
          // Only update if the new data is different to prevent unnecessary re-renders
          const newZoneIds = new Set(transformedRedZones.map(z => z.id));
          const oldZoneIds = new Set(prevZones.map(z => z.id));
          
          // Check if zones are the same
          if (newZoneIds.size === oldZoneIds.size && 
              [...newZoneIds].every(id => oldZoneIds.has(id))) {
            console.log('RedZones unchanged, skipping update');
            return prevZones; // No change, return previous zones
          }
          
          console.log('RedZones updated, setting new zones');
          return transformedRedZones;
        });
      } else {
        console.log('Failed to fetch RedZones, status:', response.status);
      }
    } catch (error) {
      console.error('Error refreshing RedZones:', error);
      // Silently handle refresh errors
    }
  }, [])

  // Set up periodic refresh for red zones (every 60 seconds instead of 30)
  useEffect(() => {
    console.log('Setting up periodic RedZone refresh (every 60 seconds)');
    const interval = setInterval(() => {
      console.log('Refreshing RedZones...');
      refreshRedZones();
    }, 60000); // 60 seconds instead of 30
    return () => {
      console.log('Clearing RedZone refresh interval');
      clearInterval(interval);
    }
  }, [refreshRedZones])

  // Start location watching when location is enabled and redZones are loaded
  useEffect(() => {
    console.log('Location watching effect triggered:', { locationEnabled, redZonesLength: redZones.length, watchIdExists: !!watchIdRef.current });
    if (locationEnabled && redZones.length > 0 && !watchIdRef.current) {
      console.log('Starting location watching...');
      startLocationWatching();
    }
    
    // Cleanup function
    return () => {
      if (watchIdRef.current) {
        console.log('Cleaning up location watching...');
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }
  }, [locationEnabled, redZones.length, startLocationWatching])

  // Cleanup location watcher on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  const enableLocation = useCallback(() => {
    console.log('Enabling location...');
    
    if (navigator.geolocation) {
      setLocationLoading(true)
      setError(null)
      
      // Request vibration permission if needed (for some browsers)
      if ('vibrate' in navigator) {
        // Try to trigger a small vibration to request permission
        try {
          navigator.vibrate(1);
          setTimeout(() => navigator.vibrate(0), 100);
        } catch (e) {
          console.log('Could not request vibration permission:', e);
        }
      }
      
      // Add a safety timeout to prevent infinite loading
      const safetyTimeout = setTimeout(() => {
        if (locationLoading) {
          setError('⚠️ Location request is taking longer than expected. This might mean:\n\n• GPS signal is weak\n• You are indoors\n• Device GPS is slow\n\nTry moving to an open area or refreshing the page.')
          setLocationLoading(false)
        }
      }, 35000) // 35 seconds (5 seconds more than the geolocation timeout)
      
      // Check permission status first
      if (navigator.permissions) {
        navigator.permissions.query({ name: 'geolocation' }).then((result) => {
          if (result.state === 'denied') {
            clearTimeout(safetyTimeout)
            setError('❌ Location permission denied. Please follow these steps:\n\n1. Click the lock/info icon in your browser address bar\n2. Change "Location" from "Block" to "Allow"\n3. Refresh the page and try again\n\nIf you still see "Block", try using a different browser.')
            setLocationLoading(false)
            return
          }
        }).catch((permError) => {
          // Permission check failed, continue anyway
        })
      }
      
      // Mobile-specific location options
      const locationOptions = isMobile ? {
        enableHighAccuracy: true,
        timeout: 45000,        // Longer timeout for mobile GPS
        maximumAge: 0,         // Always get fresh location
        forceRequest: true     // Force new request
      } : {
        enableHighAccuracy: true,
        timeout: 30000,        // Standard timeout for desktop
        maximumAge: 0,         // Always get fresh location
        forceRequest: true     // Force new request
      }
      
      // For mobile devices, show specific instructions
      if (isMobile && !mobilePermissionStatus) {
        checkMobilePermissions()
      }
      
      // First get current position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Location acquired:', position);
          clearTimeout(safetyTimeout) // Clear the safety timeout
          const { latitude, longitude, accuracy, altitude, heading, speed } = position.coords
          const timestamp = position.timestamp
          
          const newLocation = { lat: latitude, lng: longitude }
          setUserLocation(newLocation)
          setLocationAccuracy(accuracy)
          setLocationEnabled(true)
          setShouldCenterOnUser(true)
          if (checkCurrentStatusRef.current) {
            checkCurrentStatusRef.current(latitude, longitude)
          }
          
          // Check if user has entered a RedZone and trigger alert
          console.log('Checking for RedZone entry after location update...');
          checkAndTriggerRedZoneAlertWithZones(latitude, longitude, newLocation, redZones);
          
          setLocationLoading(false)
          
          // Start watching for location changes with better options
          startLocationWatching()
        },
        (error) => {
          console.error('Location error:', error);
          clearTimeout(safetyTimeout)
          
          let errorMessage = 'Unable to get your location. Please check your browser settings.'
          
          // More detailed error handling
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location permissions in your browser settings and try again.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable. Please check your device GPS or network connection and try again.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again or check your network connection.';
              break;
            default:
              errorMessage = `Unknown error occurred (Code: ${error.code}). Please try again.`;
          }
          
          setError(errorMessage)
          setLocationLoading(false)
        },
        locationOptions
      )
    } else {
      const errorMsg = '❌ Geolocation is not supported by this browser. Please use a modern browser like Chrome, Firefox, or Edge.'
      console.error(errorMsg)
      setError(errorMsg)
      setLocationLoading(false)
    }
  }, [locationLoading, isMobile, mobilePermissionStatus, checkMobilePermissions, startLocationWatching, redZones])

  // Function to check if user has entered a RedZone and trigger alert (without useCallback dependency issues)
  const checkAndTriggerRedZoneAlertWithZones = (lat, lng, location, currentRedZones) => {
    console.log('Checking for RedZone entry...', { lat, lng, redZonesCount: currentRedZones.length });
    
    // Get the current RedZone the user is in (if any)
    let currentRedZone = null;
    let currentRedZoneSeverity = 'low';
    
    currentRedZones.forEach(zone => {
      const distance = calculateDistance(lat, lng, zone.position.lat, zone.position.lng);
      console.log(`Distance to zone ${zone.id}: ${distance} km`);
      
      // RedZone radius is 200m = 0.2km
      if (distance < 0.2) {
        currentRedZone = zone;
        // Use the highest severity if inside multiple zones
        if (zone.severity === 'high' || (zone.severity === 'medium' && currentRedZoneSeverity !== 'high') || currentRedZoneSeverity === 'low') {
          currentRedZoneSeverity = zone.severity;
        }
        console.log('User is inside RedZone:', zone);
      }
    });
    
    // Check if we have a RedZone and if it's different from the previously alerted one
    if (currentRedZone) {
      const previouslyAlertedZoneId = localStorage.getItem('lastAlertedRedZoneId');
      console.log('Previously alerted zone ID:', previouslyAlertedZoneId);
      console.log('Current zone ID:', currentRedZone.id);
      
      // Only trigger alert if it's a new RedZone or if enough time has passed (to avoid spam)
      if (previouslyAlertedZoneId !== currentRedZone.id) {
        console.log('Triggering RedZone alert for zone:', currentRedZone);
        // Store the ID of the alerted RedZone
        localStorage.setItem('lastAlertedRedZoneId', currentRedZone.id);
        
        // Show the RedZone alert
        showRedZoneAlert(currentRedZone, location);
        
        // Send special notifications
        sendSpecialNotifications(currentRedZone, location);
      } else {
        console.log('Already alerted for this zone, skipping alert');
      }
    } else {
      console.log('User is not inside any RedZone');
    }
  };

  const centerOnMyLocation = useCallback(() => {
    if (userLocation) {
      setShouldCenterOnUser(true)
    } else {
      enableLocation()
    }
  }, [userLocation, enableLocation])

  // Function to find the nearest RedZone and its distance
  const getNearestRedZoneInfo = (lat, lng) => {
    if (!redZones || redZones.length === 0) {
      return { distance: Infinity, zone: null };
    }

    let nearestDistance = Infinity;
    let nearestZone = null;

    redZones.forEach(zone => {
      const distance = calculateDistance(lat, lng, zone.position.lat, zone.position.lng);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestZone = zone;
      }
    });

    return { distance: nearestDistance, zone: nearestZone };
  };

  // Function to show a prominent alert when entering a RedZone
  const showRedZoneAlert = (redZone, location) => {
    console.log('Showing RedZone alert for:', redZone);
    
    // Send special notifications to the user
    sendSpecialNotifications(redZone, location);
    
    // Create alert container
    const alertContainer = document.createElement('div');
    alertContainer.id = 'redzone-alert';
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
    `;
    
    // Create alert content
    const alertContent = document.createElement('div');
    alertContent.style.cssText = `
      background-color: #1a1a1a;
      border: 3px solid ${getMarkerColor(redZone.severity)};
      border-radius: 15px;
      padding: 30px;
      max-width: 90%;
      width: 500px;
      text-align: center;
      box-shadow: 0 0 30px rgba(239, 68, 68, 0.5);
      animation: pulse 2s infinite;
    `;
    
    // Add pulse animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
        70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
        100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
      }
    `;
    document.head.appendChild(style);
    
    // Add alert content
    alertContent.innerHTML = `
      <h2 style="color: ${getMarkerColor(redZone.severity)}; margin-top: 0; font-size: 28px;">
        ⚠️ DANGER WARNING ⚠️
      </h2>
      <h3 style="color: white; margin: 20px 0;">${redZone.name || redZone.title}</h3>
      <p style="color: #ff6b6b; font-size: 18px; margin: 15px 0;">
        You have entered a ${redZone.severity.toUpperCase()} risk area!
      </p>
      <div style="background-color: rgba(255, 255, 255, 0.1); border-radius: 10px; padding: 15px; margin: 20px 0; text-align: left;">
        <p style="color: white; margin: 5px 0;"><strong>Description:</strong> ${redZone.description}</p>
        <p style="color: white; margin: 5px 0;"><strong>Severity:</strong> ${redZone.severity.toUpperCase()}</p>
        <p style="color: white; margin: 5px 0;"><strong>Your Location:</strong> ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}</p>
        <p style="color: white; margin: 5px 0;"><strong>Reported:</strong> ${formatTimestamp(redZone.timestamp)}</p>
      </div>
      <p style="color: #f8f9fa; font-size: 16px; margin: 20px 0;">
        Please take immediate precautions and leave this area if possible.
      </p>
      <button id="close-alert" style="
        background-color: ${getMarkerColor(redZone.severity)};
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
    `;
    
    // Add close functionality
    alertContent.querySelector('#close-alert').addEventListener('click', () => {
      console.log('Alert closed by user');
      document.body.removeChild(alertContainer);
      document.head.removeChild(style);
    });
    
    // Add to DOM
    alertContainer.appendChild(alertContent);
    document.body.appendChild(alertContainer);
    
    // Try to vibrate the device
    triggerVibration();
    
    // Play alert sound if possible
    try {
      console.log('Attempting to play alert sound...');
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
      console.log('Alert sound played successfully');
    } catch (e) {
      console.log('Audio alert not supported:', e);
    }
  };

  // Function to send special SMS and email notifications when user enters a redzone
  const sendSpecialNotifications = async (redZone, location) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, skipping notifications');
        return;
      }
      
      // Call the backend endpoint to trigger notifications
      const response = await fetch(API_ENDPOINTS.REDZONES_CHECK_USER_LOCATION, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude: location.lat,
          longitude: location.lng
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Special notifications triggered:', data);
      } else {
        console.error('Failed to trigger special notifications:', response.status);
      }
    } catch (error) {
      console.error('Error sending special notifications:', error);
    }
  };

  // Function to trigger device vibration
  const triggerVibration = () => {
    console.log('Attempting to trigger vibration...');
    
    // Check if vibration API is supported
    if ('vibrate' in navigator) {
      console.log('Vibration API is supported');
      
      // Try different vibration patterns for maximum effect
      try {
        // Strong vibration pattern
        const pattern = [
          500, // vibrate for 500ms
          200, // pause for 200ms
          500, // vibrate for 500ms
          200, // pause for 200ms
          1000, // vibrate for 1000ms
          200, // pause for 200ms
          1000, // vibrate for 1000ms
          200, // pause for 200ms
          500, // vibrate for 500ms
          200, // pause for 200ms
          500  // vibrate for 500ms
        ];
        
        console.log('Vibration pattern:', pattern);
        navigator.vibrate(pattern);
        console.log('Vibration triggered successfully');
      } catch (e) {
        console.log('Vibration not supported or blocked:', e);
      }
    } else {
      console.log('Vibration API not supported');
    }
  };

  // Function to check if user has entered a RedZone and trigger alert
  const checkAndTriggerRedZoneAlert = useCallback((lat, lng, location) => {
    // Get the current RedZone the user is in (if any)
    let currentRedZone = null;
    let currentRedZoneSeverity = 'low';
    
    redZones.forEach(zone => {
      const distance = calculateDistance(lat, lng, zone.position.lat, zone.position.lng);
      // RedZone radius is 200m = 0.2km
      if (distance < 0.2) {
        currentRedZone = zone;
        // Use the highest severity if inside multiple zones
        if (zone.severity === 'high' || (zone.severity === 'medium' && currentRedZoneSeverity !== 'high') || currentRedZoneSeverity === 'low') {
          currentRedZoneSeverity = zone.severity;
        }
      }
    });
    
    // Check if we have a RedZone and if it's different from the previously alerted one
    if (currentRedZone) {
      const previouslyAlertedZoneId = localStorage.getItem('lastAlertedRedZoneId');
      
      // Only trigger alert if it's a new RedZone or if enough time has passed (to avoid spam)
      if (previouslyAlertedZoneId !== currentRedZone.id) {
        // Store the ID of the alerted RedZone
        localStorage.setItem('lastAlertedRedZoneId', currentRedZone.id);
        
        // Show the RedZone alert
        showRedZoneAlert(currentRedZone, location);
        
        // Send special notifications to the user
        sendSpecialNotifications(currentRedZone, location);
      }
    }
  }, [redZones]);

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'safe': return '#10B981'
      case 'warning': return '#F59E0B'
      case 'danger': return '#EF4444'
      default: return '#6B7280'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'safe': return '🟢'
      case 'warning': return '🟡'
      case 'danger': return '🔴'
      default: return '⚪'
    }
  }

  const getMarkerColor = (severity) => {
    switch (severity) {
      case 'high': return '#EF4444'
      case 'medium': return '#F59E0B'
      case 'low': return '#10B981'
      default: return '#6B7280'
    }
  }

  // Get circle color for red zones (same as marker color)
  const getCircleColor = (severity) => {
    return getMarkerColor(severity)
  }

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    } else {
      return 'Just now'
    }
  }

  // Function to manually test status calculation (for debugging)
  const testStatusCalculation = () => {
    if (userLocation) {
      console.log('Testing status calculation for current location...');
      checkCurrentStatus(userLocation.lat, userLocation.lng);
    } else {
      console.log('No user location available for status test');
    }
  };

  const mapCenter = useMemo(() => {
    return userLocation || MAP_CONFIG.defaultCenter
  }, [userLocation])

  const mapZoom = useMemo(() => {
    return userLocation ? MAP_CONFIG.userLocationZoom : MAP_CONFIG.defaultZoom
  }, [userLocation])

  // Show initial loading text
  if (loading) {
    return (
      <div className="map-page">
        <div className="map-container">
          <div className="loading-spinner">
            <p>Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="map-page">
      <div className="map-container">
        <div className="map-header">
          <h1>RedZone Map</h1>
          <p>Interactive map showing dangerous areas and RedZones</p>
        </div>

        <div className="map-layout">
          {/* Main Map Area */}
          <div className="map-main">
            <div className="map-area">
              {error ? (
                <div className="map-error">
                  <div className="error-content">
                    {error.split('\n').map((line, index) => (
                      <p key={index} className={line.startsWith('•') ? 'error-bullet' : 'error-text'}>
                        {line}
                      </p>
                    ))}
                  </div>
                  <div className="error-actions">
                    <button onClick={enableLocation} className="btn btn-primary">
                      🔄 Try Again
                    </button>
                    <button onClick={() => setError(null)} className="btn btn-secondary">
                      ❌ Dismiss
                    </button>
                    <button 
                      onClick={() => {
                        const lat = prompt('Enter your latitude (e.g., 19.0769):')
                        const lng = prompt('Enter your longitude (e.g., 83.7603):')
                        if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
                          const manualLocation = { lat: parseFloat(lat), lng: parseFloat(lng) }
                          setUserLocation(manualLocation)
                          setLocationEnabled(true)
                          setShouldCenterOnUser(true)
                          setError(null)
                          setLocationAccuracy(100) // Assume manual input has ~100m accuracy
                          if (checkCurrentStatusRef.current) {
                            checkCurrentStatusRef.current(parseFloat(lat), parseFloat(lng))
                          }
                          console.log('📍 Manual location set:', manualLocation)
                        } else if (lat !== null && lng !== null) {
                          alert('Please enter valid coordinates (numbers only)')
                        }
                      }} 
                      className="btn btn-secondary"
                    >
                      📍 Manual Location
                  </button>
                  </div>
                </div>
              ) : (
                <>
                  {mapLoading && (
                    <div className="map-loading-overlay" style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      zIndex: 1000,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <div className="map-loading-text" style={{
                        textAlign: 'center',
                        padding: '20px'
                      }}>
                        <p style={{ fontWeight: 'bold', margin: 0 }}>Loading...</p>
                      </div>
                    </div>
                  )}
                  <MapContainer
                    center={[mapCenter.lat, mapCenter.lng]}
                    zoom={mapZoom}
                    style={MAP_CONFIG.mapContainerStyle}
                    {...MAP_CONFIG.leafletOptions}
                    ref={mapRef}
                    whenReady={() => {
                      setMapLoading(false);
                    }}
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
                    
                    <MapUpdater 
                      center={mapCenter} 
                      zoom={mapZoom} 
                      shouldCenterOnUser={shouldCenterOnUser}
                    />

                    {/* User Location Marker */}
                    {userLocation && (
                      <Marker
                        position={[userLocation.lat, userLocation.lng]}
                        icon={userLocationIcon}
                      >
                        <Popup>
                          <div>
                            <h4>📍 Your Exact Location</h4>
                            <p><strong>Latitude:</strong> {userLocation.lat.toFixed(8)}</p>
                            <p><strong>Longitude:</strong> {userLocation.lng.toFixed(8)}</p>
                            {locationAccuracy && (
                              <p><strong>Accuracy:</strong> ±{Math.round(locationAccuracy)} meters</p>
                            )}
                            <p><small>Last updated: {new Date().toLocaleTimeString()}</small></p>
                          </div>
                        </Popup>
                      </Marker>
                    )}

                    {/* RedZone Circles - Clean Implementation */}
                    {(() => {
                      console.log('Rendering RedZones:', redZones);
                      const filteredZones = redZones
                        .filter(zone => zone.status === 'approved' && 
                                       zone.position && 
                                       typeof zone.position.lat === 'number' && 
                                       typeof zone.position.lng === 'number' &&
                                       !isNaN(zone.position.lat) && 
                                       !isNaN(zone.position.lng));
                      console.log('Filtered RedZones:', filteredZones);
                      return filteredZones.map((zone) => (
                        <Circle
                          key={zone.id || `${zone.position.lat}-${zone.position.lng}`}
                          center={[zone.position.lat, zone.position.lng]}
                          radius={200} // Reduced from 500m to 200m
                          pathOptions={{
                            color: getCircleColor(zone.severity),
                            fillColor: getCircleColor(zone.severity),
                            fillOpacity: 0.2,
                            weight: 2
                          }}
                        >
                          <Popup>
                            <div className="info-window">
                              <h3>{zone.name || 'Unnamed RedZone'}</h3>
                              <p><strong>Severity:</strong> {(zone.severity || 'low').toUpperCase()}</p>
                              <p>{zone.description || 'No description provided'}</p>
                              {zone.location && (
                                <p><strong>Location:</strong> {zone.location}</p>
                              )}
                              <p><small>Reported: {zone.timestamp ? formatTimestamp(zone.timestamp) : 'Unknown'}</small></p>
                              <div style={{ 
                                marginTop: '10px', 
                                padding: '8px', 
                                backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                                borderRadius: '4px',
                                fontSize: '0.9em'
                              }}>
                                <strong>⚠️ Danger Zone:</strong> This red circle shows a 200m radius danger area around the reported incident. {/* Updated text */}
                              </div>
                            </div>
                          </Popup>
                        </Circle>
                      ));
                    })()}
                  </MapContainer>
                </>
              )}
            </div>
          </div>

          {/* Side Cards */}
          <div className="map-sidebar">
            {/* Current Status Card */}
            <div className="status-card">
              <h3>Current Status</h3>
              <div className="status-indicator" style={{ backgroundColor: getStatusColor(currentStatus) }}>
                <span className="status-icon">{getStatusIcon(currentStatus)}</span>
                <span className="status-text">{currentStatus.toUpperCase()}</span>
              </div>
              <p className="status-description">
                {currentStatus === 'safe' && 'You are in a safe area'}
                {currentStatus === 'warning' && 'Warning: You are near or in a RedZone area!'}
                {currentStatus === 'danger' && 'Danger: You are inside a high-risk RedZone!'}
              </p>
              {userLocation && (
                <div className="location-info">
                  {(() => {
                    const { distance: nearestDistance } = getNearestRedZoneInfo(userLocation.lat, userLocation.lng);
                    // Count how many zones the user is inside
                    let insideZones = 0;
                    let highestSeverity = 'low';
                    redZones.forEach(zone => {
                      const distance = calculateDistance(userLocation.lat, userLocation.lng, zone.position.lat, zone.position.lng);
                      if (distance < 0.2) {
                        insideZones++;
                        if (zone.severity === 'high' || (zone.severity === 'medium' && highestSeverity !== 'high')) {
                          highestSeverity = zone.severity;
                        }
                      }
                    });
                    
                    return (
                      <>
                        <p><small>📍 Your exact coordinates:</small></p>
                        <p><small>{userLocation.lat.toFixed(8)}, {userLocation.lng.toFixed(8)}</small></p>
                        <p><small>⚠️ Distance to nearest RedZone: {nearestDistance === Infinity ? 'No RedZones nearby' : `${nearestDistance.toFixed(2)} km`}</small></p>
                        <p><small>🏠 Inside RedZones: {insideZones} ({highestSeverity})</small></p>
                        <p><small>🕒 Last updated: {new Date().toLocaleTimeString()}</small></p>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="map-footer">
          <Link to="/dashboard" className="btn btn-secondary">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Map
