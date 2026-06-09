import { initDb } from './db'
import { dispatch } from './handler'

initDb().then(() => {
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    dispatch(msg).then(sendResponse)
    return true // keep channel open for async response
  })
})
