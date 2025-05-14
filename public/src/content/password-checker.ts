// src/content/password-checker.ts
// -----------------------------------------------------------------------------
// Content‑script. Watches all <input type="password"> fields, shows a badge
// (WEAK/MED/STRONG).  No external "rate" module is required –  evaluation is
// done inline with a simple heuristic + personal patterns from IndexedDB.
// -----------------------------------------------------------------------------

import { get } from '../shared/storage'

import { openDB } from 'idb';


// Helper to attach / update badge ------------------------------------------------
function createBadge (input: HTMLInputElement) {
  const span = document.createElement('span')
  span.className = 'pg-badge WEAK'
  span.textContent = '…'
  span.style.marginLeft = '6px'
  span.style.padding = '2px 6px'
  span.style.borderRadius = '6px'
  span.style.font = '12px/16px monospace'
  span.style.color = '#fff'
  input.after(span)

  return {
    update (label: 'WEAK' | 'MED' | 'STRONG') {
      span.textContent = label
      span.className = 'pg-badge ' + label
      span.style.background = label === 'WEAK'
        ? '#e74c3c'
        : label === 'MED'
          ? '#f1c40f'
          : '#2ecc71'
    }
  }
}

// Rating logic -------------------------------------------------------------------
interface Patterns {
  masks?: Record<string, number>
  words?: Record<string, number>
  numbers?: Record<string, number>
}

function rate (pwd: string, pat: Patterns): 'WEAK' | 'MED' | 'STRONG' {
  if (!pwd) return 'WEAK'

  const complexity =
    (pwd.length >= 12 ? 2 : pwd.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd) ? 1 : 0) +
    (/\d/.test(pwd) ? 1 : 0) +
    (/[!@#$%^&*()\-_=+]/.test(pwd) ? 1 : 0)

  const mask = pwd.replace(/[A-Za-z]/g, 'X').replace(/\d/g, 'D').replace(/[!@#$%^&*()\-_=+]/g, 'S')
  const maskHit = pat.masks?.[mask] ?? 0

  const lower = pwd.toLowerCase()
  const wordHit = Object.keys(pat.words || {}).some(w => lower.includes(w))

  let score = complexity * 20 - maskHit * 10 - (wordHit ? 30 : 0)
  if (score < 40) return 'WEAK'
  if (score < 70) return 'MED'
  return 'STRONG'
}

// Load patterns (if user passed Step4) -------------------------------------------
async function loadPatterns (): Promise<Patterns> {
  const { hasPatterns } = await get('hasPatterns')
  if (!hasPatterns) return {}
  try {
    const db = await openDB('pg-store', 1)
    return (await db.get('patterns', 'profile')) as Patterns || {}
  } catch {
    return {}
  }
}

// Main async IIFE ----------------------------------------------------------------
;(async () => {
  const patterns = await loadPatterns()

  function scan () {
    document.querySelectorAll<HTMLInputElement>('input[type="password"]:not([data-pg])')
      .forEach(input => {
        input.dataset.pg = '1'
        const badge = createBadge(input)
        input.addEventListener('input', () => {
          badge.update(rate(input.value, patterns))
        })
      })
  }

  // initial and observe DOM mutations
  scan()
  new MutationObserver(scan)
    .observe(document.documentElement, { childList: true, subtree: true })

  // Hot‑reload patterns (Step4 worker → background → content)
  chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === 'hotReloadPatterns') {
    Object.assign(patterns, msg.patterns)
  }
})

})()