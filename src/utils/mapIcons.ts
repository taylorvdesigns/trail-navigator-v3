import L from 'leaflet';

// Custom icon for highlighted POI
export const highlightIcon = new L.Icon({
  iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Default icon for regular POIs
export const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Debug logging
console.log('Map icons initialized:', {
  highlightIcon: highlightIcon.options,
  defaultIcon: defaultIcon.options
}); 