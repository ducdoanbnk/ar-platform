'use client';

/**
 * Editor-side Puck config: the shared block library (site-blocks) with
 * interactive fields swapped in — the Image block gets an upload widget
 * (POST /api/admin/media → DB-backed URL) instead of a bare URL input.
 * Split from site-blocks so the RSC renderer never imports client hooks.
 */

import { useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { adminUpload } from './admin-client';
import { siteConfig } from './site-blocks';

function ImageUploadField({ value, onChange }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function upload(file) {
    if (!file || busy) return;
    setBusy(true); setErr('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      const out = await adminUpload('/api/admin/media', fd);
      onChange(out.url);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {value && <img src={value} alt="" style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-subtle)' }} />}
      <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '9px', borderRadius: '8px', border: '1.5px dashed var(--border-default)', background: '#fff', color: 'var(--text-muted)', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}>
        <span style={{ fontSize: '15px', display: 'inline-flex', lineHeight: 0 }}><Icon name={busy ? 'loader' : 'image-up'} /></span>
        {busy ? '上傳中…' : value ? '更換圖片' : '上傳圖片'}
      </button>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
      <input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="或貼上圖片網址…" style={{ width: '100%', height: '32px', border: '1px solid var(--border-default)', borderRadius: '7px', padding: '0 9px', fontSize: '11.5px', fontFamily: 'var(--font-mono)', color: 'var(--text-body)', outline: 'none' }} />
      {err && <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--status-danger-fg, #B91C1C)' }}>{err}</div>}
    </div>
  );
}

export const editorConfig = {
  ...siteConfig,
  components: {
    ...siteConfig.components,
    Image: {
      ...siteConfig.components.Image,
      fields: {
        ...siteConfig.components.Image.fields,
        url: { type: 'custom', label: '圖片', render: ({ value, onChange }) => <ImageUploadField value={value} onChange={onChange} /> },
      },
    },
  },
};
