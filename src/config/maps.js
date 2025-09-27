// Leaflet with OpenStreetMap Configuration
// OpenStreetMap provides free mapping tiles
// No API key required!

export const MAP_CONFIG = {
  defaultCenter: {
    lat: 19.054808571099415,  // Center between the two coordinates
    lng: 83.829417228698745   // Center between the two coordinates
  },
  defaultZoom: 13,
  userLocationZoom: 15,
  // Map bounds to limit visible area between specified coordinates
  maxBounds: {
    northEast: { lat: 19.10624355377579, lng: 83.84362220764162 }, // North-East boundary
    southWest: { lat: 19.00337359342304, lng: 83.81521224975587 }  // South-West boundary
  },
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
    minZoom: 12,
    maxZoom: 18
  }
}
