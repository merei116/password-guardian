export const get = <T = any>(k: string | string[]): Promise<T> =>
  new Promise((r) => chrome.storage.local.get(k, r));
export const set = (obj: any): Promise<void> =>
  new Promise((r) => chrome.storage.local.set(obj, r));
export const clear = (): Promise<void> =>
  new Promise((r) => chrome.storage.local.clear(r));
