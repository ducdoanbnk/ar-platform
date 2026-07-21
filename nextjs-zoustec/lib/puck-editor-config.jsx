'use client';

/**
 * Editor-side Puck config: the shared block library (site-blocks) with
 * interactive fields swapped in, PLUS the unified root panel — the event
 * basics (標題/活動介紹/封面圖/獎勵/門檻) live on the root document so ALL
 * editing happens in the designer (the legacy builder form is gone). The
 * root render draws a WYSIWYG hero preview above the block canvas; on the
 * public site the hero stays structural (EventSite) so the root props are
 * saved back into the event record on publish.
 */

import { useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { adminUpload } from './admin-client';
import { siteConfig, THEMES, themeStyles } from './site-blocks';

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
      {value && <button type="button" onClick={() => onChange('')} style={{ border: 'none', background: 'none', color: 'var(--text-subtle)', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', padding: 0, textAlign: 'left' }}>移除圖片</button>}
      {err && <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--status-danger-fg, #B91C1C)' }}>{err}</div>}
    </div>
  );
}

/** WordPress-style theme picker: swatch cards instead of a dropdown. */
function ThemePickerField({ value, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
      {Object.entries(THEMES).map(([key, t]) => {
        const active = (value || 'default') === key;
        return (
          <button key={key} type="button" onClick={() => onChange(key)} style={{ padding: '8px', borderRadius: '9px', border: active ? '2px solid var(--primary-600)' : '1px solid var(--border-default)', background: active ? 'var(--primary-50)' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ display: 'flex', gap: '3px', marginBottom: '6px' }}>
              {(t.swatch || []).map((c, i) => <span key={i} style={{ width: '16px', height: '16px', borderRadius: '5px', background: c, border: '1px solid rgba(0,0,0,.08)' }} />)}
            </span>
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-strong)' }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** WYSIWYG hero preview in the editor canvas — mirrors EventSite's hero
 * using the root props being edited (title/description/heroImage/theme). */
function EditorRoot({ children, title, description, heroImage, theme }) {
  const t = themeStyles(theme);
  const overlay = t.hero?.overlay || 'linear-gradient(rgba(11,41,53,.55), rgba(11,41,53,.66))';
  return (
    <div style={{ ...t.page }}>
      <div style={{ position: 'relative', minHeight: '250px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '24px', color: '#fff', background: heroImage ? `${overlay}, url(${heroImage}) center/cover` : 'linear-gradient(150deg, var(--brand-hero-a, #0E7490), var(--brand-hero-b, #155E75))' }}>
        <div style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.85)', marginBottom: '8px' }}>WebAR 集章活動</div>
        <div style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 'var(--site-heading-weight, 800)', lineHeight: 1.1, letterSpacing: '-.02em', maxWidth: '20ch', ...(t.page.fontFamily ? { fontFamily: t.page.fontFamily } : {}) }}>{title || '（活動標題）'}</div>
        {description && <p style={{ margin: '10px 0 0', fontSize: '13.5px', color: 'rgba(255,255,255,.85)', lineHeight: 1.6, maxWidth: '62ch' }}>{description}</p>}
        <div style={{ display: 'flex', gap: '9px', marginTop: '16px', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 20px', borderRadius: 'var(--site-btn-radius, 9999px)', background: '#fff', color: 'var(--brand-dark, #134E61)', fontSize: '13.5px', fontWeight: 800 }}><span style={{ fontSize: '15px', display: 'inline-flex', lineHeight: 0 }}><Icon name="qr-code" /></span>開始旅程</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '10px 17px', borderRadius: 'var(--site-btn-radius, 9999px)', background: 'rgba(255,255,255,.12)', color: '#fff', fontSize: '13px', fontWeight: 600, border: '1px solid rgba(255,255,255,.25)' }}>查看地圖</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '22px 20px 30px', ...t.vars }}>{children}</div>
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
  root: {
    label: '活動設定',
    fields: {
      title: { type: 'text', label: '活動標題' },
      description: { type: 'textarea', label: '活動介紹' },
      heroImage: { type: 'custom', label: '封面圖', render: ({ value, onChange }) => <ImageUploadField value={value} onChange={onChange} /> },
      rewardName: { type: 'text', label: '獎勵名稱' },
      rewardThreshold: { type: 'number', label: '集章門檻（收集幾枚解鎖獎勵）', min: 1 },
      theme: { type: 'custom', label: '佈景主題（套用整站）', render: ({ value, onChange }) => <ThemePickerField value={value} onChange={onChange} /> },
    },
    defaultProps: { title: '', description: '', heroImage: '', rewardName: '', rewardThreshold: 1, theme: 'default' },
    render: EditorRoot,
  },
};

/** Sub-pages keep the plain root (no hero, no event fields) — only the
 * shared theme note applies, and the theme itself is set on the home page. */
export const editorSubPageConfig = {
  ...editorConfig,
  root: siteConfig.root,
};
