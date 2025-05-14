// src/worker/train.worker.ts
/* eslint-disable no-restricted-globals */
import Papa from 'papaparse';                 // multi‑thread CSV parser  🗂
import { openDB } from 'idb';                 // tiny IndexedDB helper   📦

interface WorkerRequest { csvText: string }
interface WorkerResponse { progress?: number; done?: boolean }

self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  const { csvText } = data;

  // 1. parse CSV → passwords[]
  const passwords: string[] = [];
  Papa.parse<string[]>(csvText, {
    worker: false,            // already in worker thread
    skipEmptyLines: true,
    step: (row) => passwords.push(row.data.at(-1) || ''),
    complete: () => analyze(passwords)
  });

  async function analyze(pwds: string[]) {
    // 2. строим паттерны (тот же алгоритм, что раньше)
    const { masks, numbers, words } = buildPatterns(pwds);

    // 3. сохраняем в IndexedDB (быстрее больших blobs в chrome.storage)
    const db = await openDB('pg-store', 1, {
      upgrade(db) { db.createObjectStore('patterns'); }
    });
    await db.put('patterns', { masks, numbers, words }, 'profile');

    // 4. флажок в chrome.storage для контент‑скрипта
    chrome.storage.local.set({ hasPatterns: true }, () => {
      postMessage(<WorkerResponse>{ done: true });
    });
  }
};

// ---------- helpers ----------
function buildPatterns(pwds: string[]) {
  const masks: Record<string, number> = {};
  const numbers: Record<string, number> = {};
  const words: Record<string, number> = {};

  for (const p of pwds) {
    // маска (X = буква, D = цифра, S = символ)
    const m = p.replace(/[A-Za-z]/g, 'X')
               .replace(/\d/g, 'D')
               .replace(/[!@#$%^&*()\-_=+]/g, 'S');
    masks[m] = (masks[m] || 0) + 1;

    for (const d of new Set(p.replace(/\D/g, '')))
      numbers[d] = (numbers[d] || 0) + 1;

    for (let len = 3; len <= 7; len++)
      for (let i = 0; i <= p.length - len; i++) {
        const sub = p.slice(i, i + len);
        words[sub] = (words[sub] || 0) + 1;
      }
  }
  return { masks, numbers, words };
}
