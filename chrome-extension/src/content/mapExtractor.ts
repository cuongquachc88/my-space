// Runs as a content script on map pages.
// Parses the current URL for lat/lng, injects a floating "Pin" button,
// and sends captured coordinates to the service worker.

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

  // Bing Maps: cp=lat~lng
  m = url.match(/cp=(-?\d+\.?\d*)~(-?\d+\.?\d*)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  // Google Maps place: /place/.../data=!3dlat!4dlng
  m = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }

  // Generic: lat=N&lng=M or lat=N&lon=M
  const latM = url.match(/[?&]lat=(-?\d+\.?\d*)/)
  const lngM = url.match(/[?&]lo?ng?=(-?\d+\.?\d*)/)
  if (latM && lngM) return { lat: parseFloat(latM[1]), lng: parseFloat(lngM[1]) }

  return null
}

function getPageLabel(): string {
  const title = document.title.replace(/\s*[-|–]\s*(Google Maps|OpenStreetMap|Bing Maps|Apple Maps).*$/, '').trim()
  return title || new URL(location.href).hostname
}

// ── Floating Pin Button ─────────────────────────────────────────────────────

const WRAP_ID = 'myspace-pin-wrap'
const BTN_ID = 'myspace-pin-btn'
const TOGGLE_ID = 'myspace-pin-toggle'

// Wrapper: holds main button + collapse toggle. Positioned higher to avoid
// Google Maps' own zoom/locate/pegman controls on the right edge.
const WRAP_STYLES = `
  position: fixed;
  bottom: 220px;
  right: 16px;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  gap: 6px;
  pointer-events: none;
`

const BTN_STYLES = `
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: none;
  border-radius: 24px;
  background: linear-gradient(135deg, #fb923c, #f97316);
  color: white;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(251,146,60,0.4), 0 1px 3px rgba(0,0,0,0.2);
  transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s, padding 0.2s, width 0.2s;
  opacity: 0;
  transform: translateY(8px) scale(0.9);
  pointer-events: none;
  white-space: nowrap;
  overflow: hidden;
`
const BTN_VISIBLE = 'opacity: 1; transform: translateY(0) scale(1); pointer-events: auto;'
const BTN_HOVER = 'transform: translateY(0) scale(1.05); box-shadow: 0 6px 20px rgba(251,146,60,0.5);'
const BTN_CLICKED = 'background: linear-gradient(135deg, #34d399, #10b981); box-shadow: 0 4px 16px rgba(52,211,153,0.4);'
const BTN_ERROR = 'background: linear-gradient(135deg, #f87171, #ef4444); box-shadow: 0 4px 16px rgba(248,113,113,0.4);'

const TOGGLE_STYLES = `
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(0,0,0,0.55);
  color: white;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  transition: transform 0.15s, background 0.15s;
  pointer-events: auto;
  opacity: 0;
  transform: translateY(8px);
`
const TOGGLE_VISIBLE = 'opacity: 1; transform: translateY(0);'
const TOGGLE_HOVER = 'transform: scale(1.1); background: rgba(0,0,0,0.75);'

function createPinButton(): { btn: HTMLButtonElement; toggle: HTMLButtonElement } {
  const btn = document.createElement('button')
  btn.id = BTN_ID
  btn.setAttribute('style', BTN_STYLES)
  btn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" style="flex-shrink:0">
      <path d="M10 2.5C8 2.5 6.5 4 6.5 5.9c0 2.6 3.5 6.6 3.5 6.6s3.5-4 3.5-6.6C13.5 4 12 2.5 10 2.5z"
        fill="rgba(255,255,255,0.3)" stroke="white" strokeWidth="1.4"/>
      <circle cx="10" cy="5.8" r="1.4" fill="white"/>
    </svg>
    <span>Pin to My SPACE</span>
  `

  const toggle = document.createElement('button')
  toggle.id = TOGGLE_ID
  toggle.setAttribute('style', TOGGLE_STYLES)
  toggle.title = 'Collapse'
  toggle.textContent = '×'

  function flashError(label: string) {
    btn.style.cssText = BTN_STYLES + BTN_VISIBLE + BTN_ERROR
    btn.querySelector('span')!.textContent = label
    btn.dataset.state = 'flash'
    setTimeout(() => {
      removeAttribute.call(btn, 'data-state')
      btn.style.cssText = BTN_STYLES + BTN_VISIBLE
      btn.querySelector('span')!.textContent = 'Pin to My SPACE'
    }, 2500)
  }

  function flashSuccess() {
    btn.style.cssText = BTN_STYLES + BTN_VISIBLE + BTN_CLICKED
    btn.querySelector('span')!.textContent = 'Pinned!'
    btn.dataset.state = 'flash'
    setTimeout(() => {
      removeAttribute.call(btn, 'data-state')
      btn.style.cssText = BTN_STYLES + BTN_VISIBLE
      btn.querySelector('span')!.textContent = 'Pin to My SPACE'
    }, 2000)
  }

  btn.addEventListener('mouseenter', () => {
    if (!btn.dataset.state) btn.style.cssText = BTN_STYLES + BTN_VISIBLE + BTN_HOVER
  })
  btn.addEventListener('mouseleave', () => {
    if (!btn.dataset.state) btn.style.cssText = BTN_STYLES + BTN_VISIBLE
  })

  btn.addEventListener('click', () => {
    const coords = extractFromUrl(location.href)
    if (!coords) { flashError('No coords found'); return }

    const pin: ExtractedPin = {
      lat: coords.lat,
      lng: coords.lng,
      label: getPageLabel(),
      url: location.href,
    }

    chrome.runtime.sendMessage({ type: 'MAP_PIN_CAPTURE', payload: pin }, (response) => {
      if (chrome.runtime.lastError || !response?.ok) {
        // Side panel not open — tell user to open it
        btn.style.cssText = BTN_STYLES + BTN_VISIBLE + BTN_ERROR
        btn.querySelector('span')!.textContent = 'Open My SPACE first'
        btn.dataset.clicked = '1'
        setTimeout(() => {
          btn.removeAttribute('data-clicked')
          btn.style.cssText = BTN_STYLES + BTN_VISIBLE
          btn.querySelector('span')!.textContent = 'Pin to My SPACE'
        }, 2500)
      } else {
        btn.style.cssText = BTN_STYLES + BTN_VISIBLE + BTN_CLICKED
        btn.querySelector('span')!.textContent = 'Pinned!'
        btn.dataset.clicked = '1'
        setTimeout(() => {
          btn.removeAttribute('data-clicked')
          btn.style.cssText = BTN_STYLES + BTN_VISIBLE
          btn.querySelector('span')!.textContent = 'Pin to My SPACE'
        }, 2000)
      }
    })
  })

  return btn
}

// ── Inject button and update on URL changes ─────────────────────────────────

let currentUrl = ''

function updateButton() {
  if (location.href === currentUrl) return
  currentUrl = location.href

  const coords = extractFromUrl(location.href)
  let btn = document.getElementById(BTN_ID) as HTMLButtonElement | null

  if (!coords) {
    // Hide button if no coords
    if (btn) btn.style.cssText = BTN_STYLES
    return
  }

  if (!btn) {
    btn = createPinButton()
    document.body.appendChild(btn)
  }

  // Show with slight delay for animation
  requestAnimationFrame(() => {
    if (btn && !btn.dataset.clicked) {
      btn.style.cssText = BTN_STYLES + BTN_VISIBLE
    }
  })
}

// Initial run
updateButton()

// Listen for SPA URL changes (Google Maps, Bing, etc.)
const observer = new MutationObserver(() => updateButton())
observer.observe(document.body, { childList: true, subtree: true })

// Also listen to popstate
window.addEventListener('popstate', updateButton)

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  observer.disconnect()
  const btn = document.getElementById(BTN_ID)
  if (btn) btn.remove()
})
