// src/shared/analyze.ts
// -----------------------------------------------------------------------------
// Lightweight password‑pattern analyzer (no ML).
// Exposes a single function `analyzePasswords()` that takes an array of strings
// and returns aggregated statistics ready to be stored in IndexedDB or shown
// in UI.
// -----------------------------------------------------------------------------

export interface PatternStats {
  masks: Record<string, number>;      // e.g. "XDDDXXS" → 12
  numbers: Record<string, number>;    // digit frequency
  words: Record<string, number>;      // substring (3–7 chars) frequency
  profile: {
    digitUsage: number;               // % of passwords containing digits
    mixedCase: number;                // % with both upper & lower
    mutationUsage: number;            // leetspeak substitutions
  };
}

const mutationMap: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "$": "s", "@": "a",
};

/**
 * Returns e.g. "XDDXS" for "Pa55w$".
 */
function maskOf (pwd: string): string {
  return pwd.split('').map(c => {
    if (/[a-zA-Z]/.test(c)) return 'X';
    if (/\d/.test(c))      return 'D';
    if (/[!@#$%^&*()\-_=+]/.test(c)) return 'S';
    return '_';
  }).join('');
}

export function analyzePasswords (pwds: string[]): PatternStats {
  const masks: Record<string, number> = {};
  const numbers: Record<string, number> = {};
  const words:   Record<string, number> = {};

  let cntDigits = 0, cntMixed = 0, cntMut  = 0;

  for (const p of pwds) {
    // --- mask
    const m = maskOf(p);
    masks[m] = (masks[m] || 0) + 1;

    // --- digits usage & per‑digit freq
    const digs = p.replace(/\D/g, '');
    if (digs) {
      cntDigits++;
      for (const d of new Set(digs)) numbers[d] = (numbers[d] || 0) + 1;
    }

    // --- mixed case
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) cntMixed++;

    // --- substrings 3–7 letters/digits
    const lower = p.toLowerCase();
    for (let L = 3; L <= 7; L++) {
      for (let i = 0; i <= lower.length - L; i++) {
        const sub = lower.slice(i, i + L);
        words[sub] = (words[sub] || 0) + 1;
      }
    }

    // --- mutation / leetspeak usage
    const mut = p.split('').map(c => mutationMap[c] ?? c).join('');
    if (mut !== p) cntMut++;
  }

  const total = pwds.length || 1;
  return {
    masks,
    numbers,
    words,
    profile: {
      digitUsage: +(cntDigits / total * 100).toFixed(1),
      mixedCase:  +(cntMixed / total * 100).toFixed(1),
      mutationUsage: +(cntMut / total * 100).toFixed(1),
    }
  };
}
