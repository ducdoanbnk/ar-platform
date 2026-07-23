/**
 * Next.js project export (匯出 Next.js 專案) — packs export-template/ plus
 * the LIVE block library (lib/site-blocks.jsx, components/Icon.jsx — always
 * in sync with the designer) plus a content snapshot and a freshly minted
 * scoped headless key into a ready-to-run project zip.
 *
 * Runs on the frontend service because only it has the template sources;
 * auth is the caller's tenant-admin token, forwarded to the backend for the
 * key mint (so RLS/audit apply as usual).
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

export async function POST(req) {
  const auth = req.headers.get('authorization') || '';
  const { eventId } = await req.json().catch(() => ({}));
  if (!auth || !eventId) {
    return NextResponse.json({ error: { message: '缺少授權或活動 ID。' } }, { status: 400 });
  }

  // 1) Mint a scoped read-only key (plaintext returned exactly once).
  const keyRes = await fetch(`${BACKEND}/api/admin/events/${eventId}/export-keys`, {
    method: 'POST',
    headers: { authorization: auth },
  });
  if (!keyRes.ok) {
    return NextResponse.json(await keyRes.json().catch(() => ({})), { status: keyRes.status });
  }
  const { key } = await keyRes.json();

  // 2) Content snapshot via the same headless API the project will call.
  const siteRes = await fetch(`${BACKEND}/api/headless/events/${eventId}`, {
    headers: { 'x-export-key': key },
  });
  if (!siteRes.ok) {
    return NextResponse.json(await siteRes.json().catch(() => ({})), { status: siteRes.status });
  }
  const site = await siteRes.json();

  // 3) Assemble the project.
  const root = process.cwd();
  const zip = new JSZip();
  await addDir(zip, path.join(root, 'export-template'), '');

  const pkgRaw = await fs.readFile(path.join(root, 'export-template', 'package.json'), 'utf8');
  const projectName = `${site.tenant_slug}-${site.event.slug}-site`.toLowerCase();
  zip.file('package.json', pkgRaw.replace('{{PROJECT_NAME}}', projectName));

  const readmeRaw = await fs.readFile(path.join(root, 'export-template', 'README.md'), 'utf8');
  zip.file('README.md', readmeRaw.replaceAll('{{EVENT_NAME}}', site.event.name));

  // The real block library — byte-identical to what the designer renders.
  zip.file('lib/site-blocks.jsx', await fs.readFile(path.join(root, 'lib', 'site-blocks.jsx')));
  zip.file('components/Icon.jsx', await fs.readFile(path.join(root, 'components', 'Icon.jsx')));

  zip.file('data/site.json', JSON.stringify(site, null, 2));

  const apiBase = (req.headers.get('origin') || '').replace(/\/$/, '');
  const liffId = site.branding.line_liff_id || process.env.NEXT_PUBLIC_LIFF_ID || '';
  zip.file('.env.local', [
    `ZOUSTEC_API_BASE=${apiBase}`,
    `ZOUSTEC_EVENT_ID=${eventId}`,
    `ZOUSTEC_EXPORT_KEY=${key}`,
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
