import './polyfill'
import { initDb } from './db'
import { dispatch } from './handler'

// Register listener immediately so the service worker never gets "receiving end does not exist".
// Messages queued before initDb resolves are held by the pending promise.
let ready: Promise<void> = initDb()

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.target !== 'offscreen') return false
  ready.then(() => dispatch(msg)).then(sendResponse)
  return true // keep channel open for async response
})
