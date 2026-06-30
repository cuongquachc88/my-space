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

// The wrapper is the positioning container. Sat at the TOP-RIGHT corner
// of the viewport (16px from each edge) so it's well clear of Google
// Maps' bottom controls and its top search bar.
//
// !important on every position-related property to escape nested
// `transform` containers and any `contain` / `will-change` quirks that
// Google Maps (and other SPAs) insert, which would otherwise create a
// containing block overriding position:fixed.
//
// `contain: layout` is explicitly set so Maps' compositing doesn't shift
// this element into a tile layer that ignores our z-index.
const WRAP_STYLES = `
  position: fixed !important;
  top: 65px !important;
  right: 16px !important;
  left: auto !important;
  bottom: auto !important;
  transform: none !important;
  contain: layout style !important;
  z-index: 2147483647 !important;
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
  transition: opacity 0.2s, background 0.2s, box-shadow 0.2s;
  opacity: 0;
  pointer-events: none;
  white-space: nowrap;
`
const BTN_VISIBLE = 'opacity: 1; pointer-events: auto;'
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
  transition: transform 0.15s, background 0.15s, opacity 0.2s;
  pointer-events: auto;
  opacity: 0;
`
const TOGGLE_VISIBLE = 'opacity: 1;'
const TOGGLE_HOVER = 'transform: scale(1.1); background: rgba(0,0,0,0.75);'

function createPinButton(): { wrap: HTMLDivElement; btn: HTMLButtonElement; toggle: HTMLButtonElement } {
  const wrap = document.createElement('div')
  wrap.id = WRAP_ID
  wrap.setAttribute('style', WRAP_STYLES)

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

  wrap.appendChild(btn)
  wrap.appendChild(toggle)

  function restoreBtn() {
    btn.style.cssText = BTN_STYLES + BTN_VISIBLE
    btn.querySelector('span')!.textContent = 'Pin to My SPACE'
  }

  function flashError(label: string) {
    btn.style.cssText = BTN_STYLES + BTN_VISIBLE + BTN_ERROR
    btn.querySelector('span')!.textContent = label
    setTimeout(restoreBtn, 2500)
  }

  function flashSuccess() {
    btn.style.cssText = BTN_STYLES + BTN_VISIBLE + BTN_CLICKED
    btn.querySelector('span')!.textContent = 'Pinned!'
    setTimeout(restoreBtn, 2000)
  }

  btn.addEventListener('mouseenter', () => {
    btn.style.cssText = BTN_STYLES + BTN_VISIBLE
    btn.style.transform = 'scale(1.05)'
  })
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = ''
    btn.style.cssText = BTN_STYLES + BTN_VISIBLE
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
        flashError('Open My SPACE first')
      } else {
        flashSuccess()
      }
    })
  })

  toggle.addEventListener('mouseenter', () => {
    toggle.style.cssText = TOGGLE_STYLES + TOGGLE_VISIBLE + TOGGLE_HOVER
  })
  toggle.addEventListener('mouseleave', () => {
    toggle.style.cssText = TOGGLE_STYLES + TOGGLE_VISIBLE
  })
  toggle.addEventListener('click', (e) => {
    e.stopPropagation()
    // Collapse to just the toggle × button. Hide the main button so
    // the user sees only the small × chip.
    btn.style.cssText = BTN_STYLES  // hidden: opacity 0
    toggle.setAttribute('title', 'Expand')
  })
  // Double-click expand toggle
  toggle.addEventListener('dblclick', (e) => {
    e.stopPropagation()
    btn.style.cssText = BTN_STYLES + BTN_VISIBLE
    toggle.setAttribute('title', 'Collapse')
  })

  return { wrap, btn, toggle }
}

// ── Inject button and update on URL changes ─────────────────────────────────

interface Mounted {
  wrap: HTMLDivElement
  btn: HTMLButtonElement
  toggle: HTMLButtonElement
}
let mounted: Mounted | null = null
let currentUrl = ''

function show() {
  if (!mounted) return
  mounted.btn.style.cssText = BTN_STYLES + BTN_VISIBLE
  mounted.toggle.style.cssText = TOGGLE_STYLES + TOGGLE_VISIBLE
}

function hide() {
  if (!mounted) return
  mounted.btn.style.cssText = BTN_STYLES
  mounted.toggle.style.cssText = TOGGLE_STYLES
}

function updateButton() {
  if (location.href === currentUrl) return
  currentUrl = location.href

  const coords = extractFromUrl(location.href)

  if (!coords) {
    hide()
    return
  }

  if (!mounted) {
    mounted = createPinButton()
    document.body.appendChild(mounted.wrap)
  } else if (!document.body.contains(mounted.wrap)) {
    // Maps may have removed our element during a partial DOM rebuild.
    // Re-append and keep going.
    document.body.appendChild(mounted.wrap)
  }

  show()
}

// Periodic resurrection — Google Maps can detach the button during a
// render even between mutations. Check every 500 ms and re-attach with
// visible state if missing.
setInterval(() => {
  if (!mounted) return
  const coords = extractFromUrl(location.href)
  if (!coords) return
  if (!document.body.contains(mounted.wrap)) {
    document.body.appendChild(mounted.wrap)
    show()
  }
}, 500)

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
  if (mounted) {
    mounted.wrap.remove()
    mounted = null
  }
})
