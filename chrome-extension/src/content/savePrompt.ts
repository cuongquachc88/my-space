// Runs on regular web pages. Detects login forms (username + password) and
// offers to save the credentials to My SPACE vault via the side panel.
//
//   →  content script       : shows badge in page
//   →  service worker       : forwards to sidepanel (`SAVE_PASSWORD_OFFER_FROM_PAGE`)
//   →  side panel Keyvault  : confirm UI, user accepts → `SECRETS_CREATE`

interface PasswordFields {
  username: HTMLInputElement
  password: HTMLInputElement
  form: HTMLFormElement | null
}

// ── Field detection ─────────────────────────────────────────────────────────

function isVisible(el: HTMLElement): boolean {
  if (!(el instanceof HTMLInputElement)) return false
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return false
  const style = window.getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false
  return true
}

function isPasswordLike(el: HTMLInputElement): boolean {
  const t = (el.type || '').toLowerCase()
  return t === 'password'
}

function isUsernameLike(el: HTMLInputElement): boolean {
  const t = (el.type || '').toLowerCase()
  if (t === 'email' || t === 'tel') return true
  if (t !== 'text' && t !== '') return false

  const ac = (el.autocomplete || '').toLowerCase()
  if (ac.startsWith('username') || ac.startsWith('email')) return true

  const id = (el.id || '').toLowerCase()
  const name = (el.name || '').toLowerCase()
  const placeholder = (el.placeholder || '').toLowerCase()
  const haystack = `${id} ${name} ${placeholder}`
  if (/(email|user|login|account|signin)/.test(haystack)) return true
  return false
}

function findUsernameField(form: HTMLFormElement | null, pwd: HTMLInputElement): HTMLInputElement | null {
  if (!form) {
    // Search a wider container if not inside a <form>
    const container = pwd.closest('div, section, main') || document.body
    const inputs = Array.from(container.querySelectorAll('input')).filter(isVisible) as HTMLInputElement[]
    const usernameLike = inputs.find(i => i !== pwd && isUsernameLike(i))
    if (usernameLike) return usernameLike
    // Fall back to any visible text input above password
    return inputs.find(i => i !== pwd && (i.type || '').toLowerCase() === 'text') ?? null
  }

  // Look inside the form first
  const inputs = Array.from(form.querySelectorAll('input')).filter(isVisible) as HTMLInputElement[]
  const usernameLike = inputs.find(i => i !== pwd && isUsernameLike(i))
  if (usernameLike) return usernameLike

  // Fallback: any text/email input before password in DOM order
  const before = inputs.filter(i => i !== pwd && i.compareDocumentPosition(pwd) & Node.DOCUMENT_POSITION_PRECEDING)
  const anyText = before.find(i => {
    const t = (i.type || '').toLowerCase()
    return t === 'text' || t === 'email' || t === '' || t === 'tel'
  })
  return anyText ?? null
}

function findLoginFields(): PasswordFields[] {
  const pwds = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="password"]'))
    .filter(isVisible)
  return pwds.map(pwd => {
    const form = pwd.closest('form')
    const username = findUsernameField(form, pwd)
    return username ? { username, password: pwd, form } : null
  }).filter((x): x is PasswordFields => x !== null)
}

// ── Floating Badge ──────────────────────────────────────────────────────────

const WRAP_ID = 'myspace-save-wrap'

function createBadge(pwd: HTMLInputElement): HTMLDivElement {
  const wrap = document.createElement('div')
  wrap.id = WRAP_ID
  wrap.setAttribute('style', `
    position: absolute;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 6px 4px 4px;
    border-radius: 18px;
    background: linear-gradient(135deg, #fb923c, #f97316);
    box-shadow: 0 4px 12px rgba(251,146,60,0.4);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 12px;
    font-weight: 600;
    color: white;
    opacity: 0;
    transform: translateY(4px);
    transition: opacity 0.2s, transform 0.2s, background 0.3s;
    pointer-events: none;
    cursor: pointer;
  `)

  wrap.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="9" width="14" height="9" rx="2" stroke="white" stroke-width="1.5"/>
      <path d="M7 9V6a3 3 0 0 1 6 0v3" stroke="white" stroke-width="1.5" fill="none"/>
    </svg>
    <span class="label" style="white-space: nowrap;">Save to My SPACE?</span>
    <span class="dismiss" style="
      margin-left: 2px;
      padding: 0 4px;
      opacity: 0.7;
      cursor: pointer;
      font-size: 14px;
    ">×</span>
  `

  wrap.addEventListener('mouseenter', () => { wrap.style.transform = 'translateY(0) scale(1.04)' })
  wrap.addEventListener('mouseleave', () => {
    if (!wrap.dataset.state) wrap.style.transform = 'translateY(0)'
  })

  return wrap
}

function showBadge(wrap: HTMLDivElement, pwd: HTMLInputElement) {
  if (wrap.dataset.state) return
  wrap.style.opacity = '1'
  wrap.style.transform = 'translateY(0)'
  wrap.style.pointerEvents = 'auto'
  positionBadge(wrap, pwd)
}

function hideBadge(wrap: HTMLDivElement) {
  if (wrap.dataset.state) return
  wrap.style.opacity = '0'
  wrap.style.transform = 'translateY(4px)'
  wrap.style.pointerEvents = 'none'
}

function positionBadge(wrap: HTMLDivElement, pwd: HTMLInputElement) {
  const rect = pwd.getBoundingClientRect()
  const top = rect.top + window.scrollY
  const left = rect.right + window.scrollX + 8
  const fitsRight = left + 180 < document.documentElement.scrollWidth
  if (fitsRight) {
    wrap.style.top = `${top + rect.height / 2 - 16}px`
    wrap.style.left = `${left}px`
  } else {
    // Position above the password field
    wrap.style.top = `${top - 36}px`
    wrap.style.left = `${rect.left + window.scrollX}px`
  }
}

// ── Wire up ─────────────────────────────────────────────────────────────────

let pendingHideTimer: ReturnType<typeof setTimeout> | null = null

function debounce<T extends (...a: never[]) => void>(fn: T, ms: number): T {
  let id: ReturnType<typeof setTimeout> | null = null
  return ((...args: Parameters<T>) => {
    if (id) clearTimeout(id)
    id = setTimeout(() => fn(...args), ms)
  }) as T
}

function attach(p: PasswordFields) {
  const { username, password } = p
  const wrap = createBadge(password)
  document.body.appendChild(wrap)

  const check = debounce(() => {
    const u = username.value.trim()
    const v = password.value
    if (u && v.length >= 4) {
      positionBadge(wrap, password)
      showBadge(wrap, password)
    } else {
      hideBadge(wrap)
    }
  }, 500)

  const onInput = () => check()
  username.addEventListener('input', onInput)
  password.addEventListener('input', onInput)

  const updatePosition = () => {
    if (wrap.style.opacity !== '0') positionBadge(wrap, password)
  }
  window.addEventListener('scroll', updatePosition, { passive: true })
  window.addEventListener('resize', updatePosition, { passive: true })

  wrap.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (target.classList.contains('dismiss')) {
      wrap.remove()
      return
    }
    const u = username.value.trim()
    const v = password.value
    if (!u || !v) return

    wrap.dataset.state = 'saved'
    wrap.style.background = 'linear-gradient(135deg, #34d399, #10b981)'
    wrap.style.boxShadow = '0 4px 12px rgba(52,211,153,0.4)'
    wrap.querySelector('.label')!.textContent = 'Saving…'
    wrap.style.transform = 'translateY(0)'
    wrap.style.pointerEvents = 'auto'

    chrome.runtime.sendMessage({
      type: 'SAVE_PASSWORD_OFFER',
      payload: {
        url: location.href,
        username: u,
        password: v,
        formAction: p.form?.action || undefined,
      },
    }, (response) => {
      if (chrome.runtime.lastError || !response?.ok) {
        // Side panel not open
        wrap.style.background = 'linear-gradient(135deg, #f87171, #ef4444)'
        wrap.style.boxShadow = '0 4px 12px rgba(248,113,113,0.4)'
        wrap.querySelector('.label')!.textContent = 'Open My SPACE first'
        wrap.querySelector('.dismiss')!.textContent = '×'
      } else {
        wrap.style.background = 'linear-gradient(135deg, #34d399, #10b981)'
        wrap.style.boxShadow = '0 4px 12px rgba(52,211,153,0.4)'
        wrap.querySelector('.label')!.textContent = 'Offer sent ✓'
      }
      setTimeout(() => wrap.remove(), 2500)
    })
  })
}

// Rescan periodically for SPAs that mount forms after initial load
function scan() {
  const fields = findLoginFields()
  for (const p of fields) {
    if (!p.password.dataset.msAttached) {
      p.password.dataset.msAttached = '1'
      attach(p)
    }
  }
}

scan()
const scanInterval = setInterval(scan, 1500)

window.addEventListener('beforeunload', () => {
  clearInterval(scanInterval)
  document.querySelectorAll(`#${WRAP_ID}`).forEach(n => n.remove())
})
