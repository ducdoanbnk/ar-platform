/**
 * Custom-domain → tenant resolution (spec §VIII, PRD §6.2 tenant resolver:
 * domain/path → tenant → event).
 *
 * A customer's domain (e.g. walk.tainan.tw) CNAMEs to the platform. On an
 * unknown host, the ROOT rewrites to the tenant's event website entry, and a
 * single-segment path (/{event-slug}) rewrites to that event's page — the URL
 * in the browser stays the customer's domain (white-label). Platform hosts
 * and every other path pass through untouched.
 */

import { NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_INTERNAL_URL || 'http://localhost:8000';
const TTL_MS = 60_000;
const cache = new Map(); // host -> { slug: string|null, ts: number }

const PLATFORM_HOSTS = /(^localhost$)|(\.trycloudflare\.com$)|(\.vercel\.app$)|(\.onrender\.com$)/;
// Top-level app routes / asset dirs that must never be treated as event slugs.
const RESERVED = new Set(['api', 'media', 'experience', 'admin', 'e', 'portal', 'screens', 'healthz', 'models', 'targets', 'vendor']);

export async function middleware(req) {
  const url = req.nextUrl;
  const isRoot = url.pathname === '/';
  // Besides the root, only white-label event paths qualify: /{event-slug}
  // or /{event-slug}/{page-slug} (multipage sub-pages).
  const seg = isRoot ? '' : url.pathname.slice(1);
  if (!isRoot && (!/^[a-z0-9-]+(\/[a-z0-9-]+)?$/.test(seg) || RESERVED.has(seg.split('/')[0]))) return NextResponse.next();
  // Never touch LIFF OAuth returns / explicit deep-links on the root.
  if (isRoot) {
    for (const k of ['code', 'liff.state', 'tenant', 'event']) {
      if (url.searchParams.has(k)) return NextResponse.next();
    }
  }

  const host = (req.headers.get('host') || '').split(':')[0].toLowerCase();
  if (!host || PLATFORM_HOSTS.test(host)) return NextResponse.next();

  const hit = cache.get(host);
  let slug = hit && Date.now() - hit.ts < TTL_MS ? hit.slug : undefined;
  if (slug === undefined) {
    try {
      const res = await fetch(`${BACKEND}/api/public/domains/${host}`, { cache: 'no-store' });
      slug = res.ok ? (await res.json()).tenant_slug : null;
    } catch {
      slug = null; // backend unreachable → serve the portal as usual
    }
    cache.set(host, { slug, ts: Date.now() });
  }
  if (!slug) return NextResponse.next();

  const dest = url.clone();
  // Root → the tenant's homepage rule (event site or branded landing);
  // /{event-slug} → that event's page. Spec §III.3.
  dest.pathname = isRoot ? `/e/${slug}` : `/e/${slug}/${seg}`;
  return NextResponse.rewrite(dest);
}

// Named-param matchers ('/:seg') compile incorrectly in Next 14.2 — use a
// negative-lookahead regex instead; the body re-filters to root + slug paths.
export const config = { matcher: ['/((?!_next/|api/|media/).*)'] };
