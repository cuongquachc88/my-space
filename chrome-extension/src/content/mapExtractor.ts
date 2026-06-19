// Runs as a content script on map pages.
// Parses the current URL for lat/lng and sends it to the service worker.

interface ExtractedPin {
  lat: number
  lng: number
  label: string
  url: string
}

function extractFromUrl(url: string): { lat: number; lng: number } | null {
  // Google Maps: /@lat,lng,zoom or /place/.../data=...!3dlat!4dlng or ?ll=lat,lng
  let m = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  m = url.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  // Google Maps query: /maps/search/... with center param
  m = url.match(/[?&]center=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  // OpenStreetMap: map=zoom/lat/lng or #map=zoom/lat/lng
  m = url.match(/[#?&]map=\d+\/(-?\d+\.?\d*)\/(-?\d+\.?\d*)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  // Apple Maps: ?ll=lat,lng or &ll=lat,lng
  m = url.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  // Bing Maps: cp=lat~lng
  m = url.match(/cp=(-?\d+\.?\d*)~(-?\d+\.?\d*)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  // Generic: lat=N&lng=M or lat=N&lon=M
  const latM = url.match(/[?&]lat=(-?\d+\.?\d*)/)
  const lngM = url.match(/[?&]lo?ng?=(-?\d+\.?\d*)/)
  if (latM && lngM) return { lat: parseFloat(latM[1]), lng: parseFloat(lngM[1]) }

  return null
}

function getPageLabel(): string {
  // Try to get a meaningful name from the page title or URL
  const title = document.title.replace(/\s*[-|–]\s*(Google Maps|OpenStreetMap|Bing Maps|Apple Maps).*$/, '').trim()
  return title || new URL(location.href).hostname
}

const coords = extractFromUrl(location.href)

if (coords) {
  const pin: ExtractedPin = {
    lat: coords.lat,
    lng: coords.lng,
    label: getPageLabel(),
    url: location.href,
  }
  chrome.runtime.sendMessage({ type: 'MAP_PIN_CAPTURE', payload: pin })
} else {
  chrome.runtime.sendMessage({ type: 'MAP_PIN_CAPTURE', payload: null })
}
