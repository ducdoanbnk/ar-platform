/**
 * Next.js project export (匯出 Next.js 專案) — packs export-template/ plus
 * the LIVE block library (lib/site-blocks.jsx, components/Icon.jsx — always
 * in sync with the designer) plus a content snapshot into a ready-to-run
 * project zip.
 *
 * Runs on the frontend service because only it has the template sources;
 * auth is the caller's tenant-admin token, forwarded to the backend.
 *
 * NO key is minted here — the customer holds exactly ONE tenant-wide key,
 * issued/rotated from the Zoustec console at onboarding. The zip ships with
 * an empty ZOUSTEC_EXPORT_KEY: the site runs immediately from the bundled
 * snapshot, and pasting the tenant key enables live sync.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import JSZip from 'jszip';

const BACKEND = process.env.BACKEND_INTERNAL_URL || 'http://localhost:8000';

async function addDir(zip, dir, prefix) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) await addDir(zip, full, rel);
    else zip.file(rel, await fs.readFile(full));
  }
}

async function backendGet(pathName, auth) {
  const res = await fetch(`${BACKEND}${pathName}`, { headers: { authorization: auth } });
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status, body: await res.json().catch(() => ({})) });
  return res.json();
}

export async function POST(req) {
  const auth = req.headers.get('authorization') || '';
  const { eventId } = await req.json().catch(() => ({}));
  if (!auth || !eventId) {
    return NextResponse.json({ error: { message: '缺少授權或活動 ID。' } }, { status: 400 });
  }

  // Snapshot via the caller's own admin auth (RLS-scoped to their tenant).
  let event, tasks, branding;
  try {
    const events = await backendGet('/api/admin/events', auth);
    event = events.find((e) => e.id === eventId);
    if (!event) return NextResponse.json({ error: { message: '找不到活動。' } }, { status: 404 });
    tasks = await backendGet(`/api/admin/events/${eventId}/tasks`, auth);
    branding = await backendGet('/api/admin/branding', auth);
  } catch (e) {
    return NextResponse.json(e.body || { error: { message: e.message } }, { status: e.status || 502 });
  }

  // Public task shape only — no QR secrets inside the handed-over project.
  const site = {
    event,
    tasks: tasks.map((t) => ({ name: t.name, verification_type: t.verification_type, radius_m: t.radius_m })),
    branding,
    tenant_slug: branding.tenant_slug,
  };

  const root = process.cwd();
  const zip = new JSZip();
  await addDir(zip, path.join(root, 'export-template'), '');

  const pkgRaw = await fs.readFile(path.join(root, 'export-template', 'package.json'), 'utf8');
  const projectName = `${site.tenant_slug}-${event.slug}-site`.toLowerCase();
  zip.file('package.json', pkgRaw.replace('{{PROJECT_NAME}}', projectName));

  const readmeRaw = await fs.readFile(path.join(root, 'export-template', 'README.md'), 'utf8');
  zip.file('README.md', readmeRaw.replaceAll('{{EVENT_NAME}}', event.name));

  // The real block library — byte-identical to what the designer renders.
  zip.file('lib/site-blocks.jsx', await fs.readFile(path.join(root, 'lib', 'site-blocks.jsx')));
  zip.file('components/Icon.jsx', await fs.readFile(path.join(root, 'components', 'Icon.jsx')));

  zip.file('data/site.json', JSON.stringify(site, null, 2));

  const apiBase = (req.headers.get('origin') || '').replace(/\/$/, '');
  const liffId = branding.line_liff_id || process.env.NEXT_PUBLIC_LIFF_ID || '';
  zip.file('.env.local', [
    `ZOUSTEC_API_BASE=${apiBase}`,
    `ZOUSTEC_EVENT_ID=${eventId}`,
    '# 貼上 Zoustec 發給貴公司的 API 金鑰（一組即可）以啟用內容自動同步；',
    '# 留空時網站以 data/site.json 快照運作。',
    'ZOUSTEC_EXPORT_KEY=',
    `ZOUSTEC_LIFF_ID=${liffId}`,
    '',
  ].join('\n'));
  zip.file('.gitignore', ['node_modules/', '.next/', '.env.local', ''].join('\n'));

  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return new NextResponse(buf, {
    headers: {
      'content-type': 'application/zip',
      'content-disposition': `attachment; filename="${projectName}.zip"`,
    },
  });
}
