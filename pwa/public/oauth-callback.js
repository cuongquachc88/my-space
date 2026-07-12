(function () {
  var params = new URLSearchParams(window.location.search)
  var code = params.get('code')
  var state = params.get('state')
  var error = params.get('error')

  // window.name === 'google-auth' means this was opened by window.open() as a popup.
  // window.opener may be null after cross-origin redirect (Chrome COOP), so use
  // window.name as the reliable signal instead.
  var isPopup = window.name === 'google-auth'

  if (!isPopup) {
    // Mobile browser redirect flow: store in sessionStorage, redirect back to app
    if (error) {
      sessionStorage.setItem('oauth_error', error)
    } else if (code && state) {
      sessionStorage.setItem('oauth_code', code)
      sessionStorage.setItem('oauth_state_return', state)
    } else {
      sessionStorage.setItem('oauth_error', 'no_code')
    }
    window.location.replace('/')
    return
  }

  // Popup flow: postMessage to opener if available, else use localStorage
  // as cross-window channel (parent listens via storage event).
  var result = error
    ? { type: 'OAUTH_ERROR', error: error }
    : (code && state)
      ? { type: 'OAUTH_CODE', code: code, state: state }
      : { type: 'OAUTH_ERROR', error: 'no_code' }

  if (window.opener) {
    window.opener.postMessage(result, window.location.origin)
  } else {
    localStorage.setItem('oauth_result', JSON.stringify(result))
  }
  window.close()
})()
