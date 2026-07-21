'use client';

/**
 * Drag-drop website designer (Puck) — full-screen, MULTIPAGE.
 *
 * The event website is a set of Puck documents: the home page lives in
 * event.config.puck (back-compat with the single-page rollout) and extra
 * pages in event.config.pages = [{slug, title, nav, data}]. The left rail
 * manages pages (add/rename/delete/nav toggle) and switches which document
 * the Puck canvas edits; 儲存並發佈 publishes the whole set in one PATCH.
 * The public site renders them at /e/{tenant}/{event}[/{page}] with an
 * auto-generated nav. The site-wide theme is the HOME document's root
 * 佈景主題 field.
 *
 * iframe preview is disabled so the canvas shares the admin document and
 * inherits brand CSS vars (applyBrand) without style-sync edge cases.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Puck, createUsePuck } from '@measured/puck';
import '@measured/puck/puck.css';
import { Icon } from '../../../../components/Icon';
import { adminApi, AuthRequired, loginUrl } from '../../../../lib/admin-client';
import { editorConfig } from '../../../../lib/puck-editor-config';
import { sectionsToPuckData } from '../../../../lib/site-blocks';
import { DEFAULT_SECTIONS } from '../../../../lib/event-sections';

const TENANT = process.env.NEXT_PUBLIC_TENANT_SLUG || 'taipei';
const usePuck = createUsePuck();
const HOME = '__home__';

const EMPTY_DOC = { root: { props: { theme: 'default' } }, content: [], zones: {} };

/** ASCII slug from a page title; zh-TW titles fall back to page-N. */
function slugify(title, taken) {
  let s = String(title).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  if (!s) s = 'page';
  let out = s, n = 2;
  while (taken.has(out)) out = `${s}-${n++}`;
  return out;
}

function HeaderActions({ onSave, busy, flash, publicUrl, backUrl }) {
  const data = usePuck((s) => s.appState.data);
  const btn = { display: 'inline-flex', alignItems: 'center', gap: '7px', height: '36px', padding: '0 13px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' };
  return (
    <>
      {flash && <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--success-600, #16A34A)', alignSelf: 'center' }}>{flash}</span>}
      <a href={backUrl} style={{ ...btn, border: '1px solid var(--border-default)', background: '#fff', color: 'var(--text-body)' }}>
        <span style={{ fontSize: '15px', display: 'inline-flex', lineHeight: 0 }}><Icon name="arrow-left" /></span>返回產生器
      </a>
      <a href={publicUrl} target="_blank" rel="noreferrer" style={{ ...btn, border: '1px solid var(--border-default)', background: '#fff', color: 'var(--text-body)' }}>
        <span style={{ fontSize: '15px', display: 'inline-flex', lineHeight: 0 }}><Icon name="external-link" /></span>檢視網站
      </a>
      <button onClick={() => onSave(data)} disabled={busy} style={{ ...btn, background: 'var(--primary-600, #0E7490)', color: '#fff', border: 'none', opacity: busy ? 0.6 : 1 }}>
        <span style={{ fontSize: '15px', display: 'inline-flex', lineHeight: 0 }}><Icon name="save" /></span>{busy ? '儲存中…' : '儲存並發佈'}
      </button>
    </>
  );
}

export default function Page() {
  const router = useRouter();
  const [event, setEvent] = useState(null);
  const [homeDoc, setHomeDoc] = useState(null); // initial home document
  const [pages, setPages] = useState([]); // [{slug, title, nav, data}]
  const [cur, setCur] = useState(HOME); // HOME or a page slug
  const [newTitle, setNewTitle] = useState('');
  const [tenant, setTenant] = useState(TENANT);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');
  // Latest edits per document (Puck onChange) — survives tab switches
  // without forcing a save on every switch.
  const draftsRef = useRef({});

  useEffect(() => {
    (async () => {
      try {
        const events = await adminApi('/api/admin/events');
        if (!events.length) return router.replace('/admin/builder');
        const params = new URLSearchParams(window.location.search);
        const ev = events.find((e) => e.id === params.get('event')) || events[0];
        setEvent(ev);
        // Existing Puck document wins (even if emptied on purpose); otherwise
        // migrate the legacy sections so old events open with content intact.
        setHomeDoc(ev.config?.puck || sectionsToPuckData(ev.config?.sections?.length ? ev.config.sections : (DEFAULT_SECTIONS[ev.event_type] || [])));
        setPages(ev.config?.pages || []);
        try {
          const b = await adminApi('/api/admin/branding');
          if (b.tenant_slug) setTenant(b.tenant_slug);
          if (b.theme_color) {
            const { applyBrand } = await import('../../../../lib/brand');
            applyBrand(b.theme_color);
          }
        } catch { /* platform default */ }
      } catch (e) {
        if (e instanceof AuthRequired) return router.replace(loginUrl('/admin/builder/design'));
        setError(e.message);
      }
    })();
  }, [router]);

  function docFor(key) {
    if (draftsRef.current[key]) return draftsRef.current[key];
    if (key === HOME) return homeDoc;
    return pages.find((p) => p.slug === key)?.data || EMPTY_DOC;
  }

  function addPage() {
    const title = newTitle.trim();
    if (!title) return;
    const slug = slugify(title, new Set(pages.map((p) => p.slug)));
    setPages([...pages, { slug, title, nav: true, data: EMPTY_DOC }]);
    setNewTitle('');
    setCur(slug);
  }

  function removePage(slug) {
    if (!window.confirm('刪除此頁面？儲存後將無法復原。')) return;
    setPages(pages.filter((p) => p.slug !== slug));
    delete draftsRef.current[slug];
    if (cur === slug) setCur(HOME);
  }

  async function save(currentDoc) {
    if (!event || busy) return;
    setBusy(true); setError('');
    try {
      draftsRef.current[cur] = currentDoc;
      const home = draftsRef.current[HOME] || homeDoc;
      const outPages = pages.map((p) => ({ ...p, data: draftsRef.current[p.slug] || p.data }));
      const updated = await adminApi(`/api/admin/events/${event.id}`, {
        method: 'PATCH',
        body: { config: { ...(event.config || {}), puck: home, pages: outPages } },
      });
      setEvent(updated);
      setHomeDoc(home);
      setPages(outPages);
      setFlash('已儲存 ✓'); setTimeout(() => setFlash(''), 2500);
    } catch (e) {
      if (e instanceof AuthRequired) return router.replace(loginUrl('/admin/builder/design'));
      setError(e.message);
    } finally { setBusy(false); }
  }

  if (error && !event) {
    return <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px', color: 'var(--status-danger-fg, #B91C1C)', fontSize: '14px', fontWeight: 600 }}>{error}</div>;
  }
  if (!event || !homeDoc) {
    return <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>載入中…</div>;
  }

  const curPage = cur === HOME ? null : pages.find((p) => p.slug === cur);
  const publicUrl = cur === HOME ? `/e/${tenant}/${event.slug}` : `/e/${tenant}/${event.slug}/${cur}`;

  const railItem = (active) => ({ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 10px', borderRadius: '9px', cursor: 'pointer', border: active ? '1.5px solid var(--primary-600)' : '1px solid var(--border-subtle)', background: active ? 'var(--primary-50)' : '#fff', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-strong)' });

  return (
    <div style={{ height: '100dvh', display: 'flex' }}>

      {/* ── Page rail (multipage manager) ─────────────────────────────── */}
      <aside style={{ width: '218px', flex: '0 0 auto', background: '#fff', borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', padding: '14px 12px', gap: '7px', overflow: 'auto' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-subtle)', margin: '0 4px 4px' }}>頁面</div>

        <div onClick={() => setCur(HOME)} style={railItem(cur === HOME)}>
          <span style={{ fontSize: '14px', color: 'var(--primary-600)', display: 'inline-flex', lineHeight: 0 }}><Icon name="home" /></span>
          <span style={{ flex: 1 }}>首頁</span>
        </div>

        {pages.map((p) => (
          <div key={p.slug} onClick={() => setCur(p.slug)} style={railItem(cur === p.slug)}>
            <span style={{ fontSize: '14px', color: 'var(--primary-600)', display: 'inline-flex', lineHeight: 0 }}><Icon name="file" /></span>
            <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</span>
            <button onClick={(e) => { e.stopPropagation(); removePage(p.slug); }} title="刪除頁面" style={{ border: 'none', background: 'none', color: 'var(--text-subtle)', fontSize: '13px', cursor: 'pointer', display: 'inline-flex', lineHeight: 0, padding: 0 }}><Icon name="trash-2" /></button>
          </div>
        ))}

        <div style={{ padding: '9px', borderRadius: '9px', border: '1.5px dashed var(--border-default)', display: 'flex', gap: '6px' }}>
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addPage()} placeholder="新頁面名稱…" style={{ flex: 1, minWidth: 0, height: '30px', border: '1px solid var(--border-default)', borderRadius: '7px', padding: '0 8px', fontSize: '12px', outline: 'none' }} />
          <button onClick={addPage} disabled={!newTitle.trim()} title="新增頁面" style={{ width: '30px', height: '30px', borderRadius: '7px', background: 'var(--primary-600)', color: '#fff', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}><Icon name="plus" /></button>
        </div>

        {/* Per-page settings (title / nav) for the selected sub-page */}
        {curPage && (
          <div style={{ marginTop: '6px', padding: '10px', borderRadius: '9px', background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)' }}>頁面標題（選單顯示）</label>
            <input value={curPage.title} onChange={(e) => setPages(pages.map((p) => (p.slug === cur ? { ...p, title: e.target.value } : p)))} style={{ height: '30px', border: '1px solid var(--border-default)', borderRadius: '7px', padding: '0 8px', fontSize: '12px', outline: 'none' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: 'var(--text-body)', cursor: 'pointer' }}>
              <input type="checkbox" checked={curPage.nav !== false} onChange={(e) => setPages(pages.map((p) => (p.slug === cur ? { ...p, nav: e.target.checked } : p)))} />
              顯示於網站選單
            </label>
            <div style={{ fontSize: '10.5px', color: 'var(--text-subtle)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>/{event.slug}/{curPage.slug}</div>
          </div>
        )}

        <div style={{ marginTop: 'auto', fontSize: '10.5px', color: 'var(--text-subtle)', lineHeight: 1.6, padding: '4px' }}>
          佈景主題：點畫布空白處 → 右側「佈景主題」，套用整個網站（以首頁設定為準）。
        </div>
      </aside>

      {/* ── Canvas — remount per document so Puck loads the right data ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Puck
          key={cur}
          config={editorConfig}
          data={docFor(cur)}
          onChange={(d) => { draftsRef.current[cur] = d; }}
          iframe={{ enabled: false }}
          headerTitle={`${event.name} — ${curPage ? curPage.title : '首頁'}`}
          overrides={{
            headerActions: () => (
              <HeaderActions
                onSave={save}
                busy={busy}
                flash={flash}
                publicUrl={publicUrl}
                backUrl={`/admin/builder?event=${event.id}`}
              />
            ),
          }}
        />
        {error && event && (
          <div style={{ position: 'fixed', bottom: '14px', right: '14px', zIndex: 50, padding: '10px 14px', borderRadius: '9px', background: 'var(--status-danger-bg, #FEE2E2)', color: 'var(--status-danger-fg, #B91C1C)', fontSize: '12.5px', fontWeight: 600, boxShadow: 'var(--shadow-lg)' }}>{error}</div>
        )}
      </div>
    </div>
  );
}
