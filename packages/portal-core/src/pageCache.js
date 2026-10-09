// Private data stays in this tab's memory and is discarded on session changes.
const entries = new Map();
let epoch = 0;
export const cacheEpoch = () => epoch;
export function clearPageCache() { entries.clear(); epoch += 1; }
export function readPageCache(key) {
  const entry = entries.get(key);
  if (!entry || Date.now() - entry.time > 60000) { entries.delete(key); return null; }
  return entry.data;
}
export function writePageCache(key, data, expectedEpoch = epoch) {
  if (!key || expectedEpoch !== epoch) return;
  entries.delete(key);
  entries.set(key, { data, time: Date.now() });
  while (entries.size > 30) entries.delete(entries.keys().next().value);
}
