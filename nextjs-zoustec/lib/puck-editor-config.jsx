'use client';

/**
 * Editor-side Puck config: the shared block library (site-blocks) with
 * interactive fields swapped in, PLUS the unified root panel — the event
 * basics (標題/活動介紹/封面圖/獎勵/門檻), site menu, theme, hero toggle and
 * site-wide custom CSS all live on the root document so ALL editing happens
 * in the designer. The root render draws a WYSIWYG hero preview above the
 * block canvas; on the public site the hero stays structural (EventSite) and
 * the root props are saved back into the event record on publish.
 *
 * Field markers from site-blocks (`__color` / `__image` on text fields) are
 * resolved here into a color picker / media-upload widget by walking the
 * whole component tree — blocks declare intent, this file owns the widgets.
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

/** Color picker + free text (rgba/var() allowed). Empty = theme default. */
function ColorField({ value, onChange }) {
  const hex = /^#[0-9a-fA-F]{6}$/.test(value || '') ? value : '#0E7490';
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} style={{ width: '34px', height: '30px', padding: 0, border: '1px solid var(--border-default)', borderRadius: '7px', background: '#fff', cursor: 'pointer' }} />
      <input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="預設" style={{ flex: 1, minWidth: 0, height: '30px', border: '1px solid var(--border-default)', borderRadius: '7px', padding: '0 8px', fontSize: '12px', fontFamily: 'var(--font-mono)', outline: 'none' }} />
      {value && <button type="button" onClick={() => onChange('')} title="清除" style={{ border: 'none', background: 'none', color: 'var(--text-subtle)', cursor: 'pointer', display: 'inline-flex', lineHeight: 0, fontSize: '13px', padding: 0 }}><Icon name="x" /></button>}
    </div>
  );
}

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

/** Recursively resolve `__color` / `__image` markers into custom widgets
 * (walks objectFields / arrayFields too, so nested style groups get them). */
function resolveField(field) {
  if (!field || typeof field !== 'object') return field;
  if (field.__color) return { type: 'custom', label: field.label, render: ({ value, onChange }) => <ColorField value={value} onChange={onChange} /> };
  if (field.__image) return { type: 'custom', label: field.label, render: ({ value, onChange }) => <ImageUploadField value={value} onChange={onChange} /> };
  if (field.objectFields) return { ...field, objectFields: mapFields(field.objectFields) };
  if (field.arrayFields) return { ...field, arrayFields: mapFields(field.arrayFields) };
  return field;
}
function mapFields(fields) {
  return Object.fromEntries(Object.entries(fields || {}).map(([k, f]) => [k, resolveField(f)]));
}
function resolveComponents(components) {
  return Object.fromEntries(Object.entries(components).map(([name, c]) => [name, { ...c, fields: mapFields(c.fields) }]));
}

/** WYSIWYG hero preview in the editor canvas — mirrors EventSite's hero
 * using the root props being edited. 隱藏預設 Hero shows the slim header the
 * public site falls back to (build a Banner block instead). */
function EditorRoot({ children, title, description, heroImage, theme, hideHero, customCss }) {
  const t = themeStyles(theme);
  const overlay = t.hero?.overlay || 'linear-gradient(rgba(11,41,53,.55), rgba(11,41,53,.66))';
  return (
    <div style={{ ...t.page }}>
      {customCss && <style dangerouslySetInnerHTML={{ __html: String(customCss).replace(/<\//g, '<\\/') }} />}
      {hideHero === 'hide' ? (
        <div style={{ padding: '12px 20px', background: 'linear-gradient(135deg, var(--brand-hero-a, #0E7490), var(--brand-hero-b, #155E75))', color: '#fff', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '9px' }}>
          <span style={{ display: 'inline-flex', lineHeight: 0, fontSize: '15px' }}><Icon name="scan-line" /></span>{title || '（活動標題）'}
          <span style={{ marginLeft: 'auto', fontSize: '10.5px', fontWeight: 600, opacity: .8 }}>預設 Hero 已隱藏 — 用「橫幅 Banner」區塊自行設計</span>
        </div>
      ) : (
        <div style={{ position: 'relative', minHeight: '250px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '24px', color: '#fff', background: heroImage ? `${overlay}, url(${heroImage}) center/cover` : 'linear-gradient(150deg, var(--brand-hero-a, #0E7490), var(--brand-hero-b, #155E75))' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.85)', marginBottom: '8px' }}>WebAR 集章活動</div>
          <div style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 'var(--site-heading-weight, 800)', lineHeight: 1.1, letterSpacing: '-.02em', maxWidth: '20ch', ...(t.page.fontFamily ? { fontFamily: t.page.fontFamily } : {}) }}>{title || '（活動標題）'}</div>
          {description && <p style={{ margin: '10px 0 0', fontSize: '13.5px', color: 'rgba(255,255,255,.85)', lineHeight: 1.6, maxWidth: '62ch' }}>{description}</p>}
          <div style={{ display: 'flex', gap: '9px', marginTop: '16px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 20px', borderRadius: 'var(--site-btn-radius, 9999px)', background: '#fff', color: 'var(--brand-dark, #134E61)', fontSize: '13.5px', fontWeight: 800 }}><span style={{ fontSize: '15px', display: 'inline-flex', lineHeight: 0 }}><Icon name="qr-code" /></span>開始旅程</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '10px 17px', borderRadius: 'var(--site-btn-radius, 9999px)', background: 'rgba(255,255,255,.12)', color: '#fff', fontSize: '13px', fontWeight: 600, border: '1px solid rgba(255,255,255,.25)' }}>查看地圖</span>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '22px 20px 30px', ...t.vars }}>{children}</div>
    </div>
  );
}

const resolvedComponents = resolveComponents(siteConfig.components);

export const editorConfig = {
  ...siteConfig,
  components: resolvedComponents,
  root: {
    label: '活動設定',
    fields: {
      title: { type: 'text', label: '活動標題' },
      description: { type: 'textarea', label: '活動介紹' },
      heroImage: { type: 'custom', label: '封面圖', render: ({ value, onChange }) => <ImageUploadField value={value} onChange={onChange} /> },
      hideHero: { type: 'radio', label: '預設 Hero 區', options: [{ label: '顯示', value: '' }, { label: '隱藏（自行設計）', value: 'hide' }] },
      rewardName: { type: 'text', label: '獎勵名稱' },
      rewardThreshold: { type: 'number', label: '集章門檻（收集幾枚解鎖獎勵）', min: 1 },
      menu: {
        type: 'array', label: '網站選單（留空＝自動列出子頁面）',
        arrayFields: {
          label: { type: 'text', label: '顯示文字' },
          link: { type: 'text', label: '連結（子頁面代稱如 lich-trinh，或完整網址）' },
        },
        getItemSummary: (it) => it?.label || '選單項目',
      },
      theme: { type: 'custom', label: '佈景主題（套用整站）', render: ({ value, onChange }) => <ThemePickerField value={value} onChange={onChange} /> },
      customCss: { type: 'textarea', label: '全站自訂 CSS（進階 — 可搭配區塊的 CSS class）' },
    },
    defaultProps: { title: '', description: '', heroImage: '', hideHero: '', rewardName: '', rewardThreshold: 1, menu: [], theme: 'default', customCss: '' },
    render: EditorRoot,
  },
};

/** Sub-pages keep the plain root (no hero, no event fields) — the theme and
 * site settings live on the home page document. */
export const editorSubPageConfig = {
  ...editorConfig,
  root: siteConfig.root,
};
