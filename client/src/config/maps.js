// Leaflet with OpenStreetMap Configuration
// OpenStreetMap provides free mapping tiles
// No API key required!

export const MAP_CONFIG = {
  defaultCenter: {
    lat: 19.054808571099415,  // Center between the two coordinates
    lng: 83.829417228698745   // Center between the two coordinates
  },
  defaultZoom: 14,  // Increased zoom level for better hybrid map viewing
  userLocationZoom: 16,  // Increased zoom level for user location
  // Removed map bounds to allow full map access
  mapContainerStyle: {
    width: '100%',
    height: '500px'
  },
  // Leaflet specific configuration
  leafletOptions: {
    zoomControl: true,
    attributionControl: true,
    scrollWheelZoom: true,
    doubleClickZoom: true,
    boxZoom: true,
    keyboard: true,
    dragging: true,
    touchZoom: true,
    minZoom: 2,  // Allow zooming out to world view
    maxZoom: 18
  }
}