// src/background.ts
import { get, clear } from './shared/storage'

// 1. On install or update, open onboarding popup if not done yet
chrome.runtime.onInstalled.addListener(async () => {
  const { pg_done } = await get('pg_done')
  if (!pg_done) {
    await chrome.action.openPopup()
  }
})

// 2. Message handler for UI ↔ background RPC
chrome.runtime.onMessage.addListener((req, sender, send) => {
  switch (req.type) {
    // Content script asks for initial data (keywords + model flag)
    case 'getUserData':
      get(['keywords', 'hasPersonalModel']).then(data => send(data))
      break

    // “Reset everything” button
    case 'wipeAll':
      clear().then(() => {
        chrome.runtime.reload()
        send(true)
      })
      break

    // Fired by installer after training completes
    // We broadcast new patterns to all tabs
    case 'modelUpdated':
      // req.patterns should be included by the sender
      chrome.tabs.query({}, tabs =>
        tabs.forEach(t => {
          if (t.id != null) {
            chrome.tabs.sendMessage(t.id, {
              type: 'hotReloadPatterns',
              patterns: req.patterns
            })
          }
        })
      )
      send(true)
      break

    default:
      // not our message
      break
  }
  // Return true to indicate we'll call send asynchronously
  return true
})
