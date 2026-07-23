/**
 * Site payload loader. Live-fetches from the Zoustec platform (headless API,
 * scoped export key) so content edited in the platform designer appears here
 * without redeploying; falls back to the bundled snapshot when offline or if
 * the key was revoked.
 */

import snapshot from '../data/site.json';

const API_BASE = process.env.ZOUSTEC_API_BASE || '';
const EVENT_ID = process.env.ZOUSTEC_EVENT_ID || '';
const EXPORT_KEY = process.env.ZOUSTEC_EXPORT_KEY || '';

export async function getSite() {
  if (API_BASE && EVENT_ID && EXPORT_KEY) {
    try {
      const res = await fetch(`${API_BASE}/api/headless/events/${EVENT_ID}`, {
        headers: { 'x-export-key': EXPORT_KEY },
        next: { revalidate: 60 },
      });
      if (res.ok) return await res.json();
    } catch { /* platform unreachable — use the snapshot */ }
  }
  return snapshot;
}
