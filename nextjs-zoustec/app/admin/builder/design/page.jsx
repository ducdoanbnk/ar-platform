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
import { Puck, Render, createUsePuck } from '@measured/puck';
import '@measured/puck/puck.css';
import { Icon } from '../../../../components/Icon';
import { adminApi, AuthRequired, loginUrl } from '../../../../lib/admin-client';
import { editorConfig, editorSubPageConfig } from '../../../../lib/puck-editor-config';
import { sectionsToPuckData, siteConfig, themeStyles, upgradePuckDoc } from '../../../../lib/site-blocks';
import { SITE_TEMPLATES, applyTemplate } from '../../../../lib/site-templates';
import { DEFAULT_SECTIONS } from '../../../../lib/event-sections';

const TENANT = process.env.NEXT_PUBLIC_TENANT_SLUG || 'taipei';
const usePuck = createUsePuck();
const HOME = '__home__';

const EMPTY_DOC = { root: { props: { theme: 'default' } }, content: [], zones: {} };

// Sample data so template previews show believable smart blocks.
const PREVIEW_META = {
  event: { reward_threshold: 3, reward_name: '限定紀念禮' },
  tasks: [
    { name: '打卡點 A', verification_type: 'qr' },
    { name: '打卡點 B', verification_type: 'gps', radius_m: 100 },
  ],
};

/** Scaled-down live render of a template — the theme+layout ARE the
 * thumbnail, no hand-made images to maintain. */
function TplPreview({ tpl }) {
  const t = themeStyles(tpl.theme);
  const data = {
    root: { props: { theme: tpl.theme } },
    content: JSON.parse(JSON.stringify(tpl.home)).map((b) => {
      if (b.type === 'Banner' && b.props.image === '__HERO__') b.props.image = '';
      return b;
    }),
    zones: {},
  };
  return (
    <div style={{ height: '160px', overflow: 'hidden', borderRadius: '9px', border: '1px solid var(--border-subtle)', pointerEvents: 'none', background: '#fff', ...t.page }}>
      <div style={{ width: '940px', transform: 'scale(0.31)', transformOrigin: 'top left', padding: '14px' }}>
        <Render config={siteConfig} data={data} metadata={PREVIEW_META} />
      </div>
    </div>
  );
}

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
  const [tasks, setTasks] = useState([]); // metadata for the live smart blocks
  const [homeDoc, setHomeDoc] = useState(null); // initial home document
  const [pages, setPages] = useState([]); // [{slug, title, nav, data}]
  const [cur, setCur] = useState(HOME); // HOME or a page slug
  const [newTitle, setNewTitle] = useState('');
  const [tplModal, setTplModal] = useState(false);
  const [rev, setRev] = useState(0); // bumps to remount Puck after applying a template
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
        setTasks(await adminApi(`/api/admin/events/${ev.id}/tasks`));
        // Existing Puck document wins (even if emptied on purpose); otherwise
        // migrate the legacy sections. v1 docs (pre smart blocks) get the
        // live stats/tasks blocks prepended so the v2 layout loses nothing.
        let home = ev.config?.puck
          ? (ev.config?.puckVersion >= 2 ? ev.config.puck : upgradePuckDoc(ev.config.puck))
          : sectionsToPuckData(ev.config?.sections?.length ? ev.config.sections : (DEFAULT_SECTIONS[ev.event_type] || []));
        // Event basics live on the root panel (活動設定) — the event record
        // stays the source of truth, so re-seed them on every open.
        home = { ...home, root: { ...(home.root || {}), props: {
          ...(home.root?.props || {}),
          title: ev.name,
          description: ev.description || '',
          heroImage: ev.config?.heroImage || '',
          rewardName: ev.reward_name || '',
          rewardThreshold: ev.reward_threshold || 1,
          theme: home.root?.props?.theme || 'default',
        } } };
        setHomeDoc(home);
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

  function applyTpl(tpl) {
    // Keep the event's own settings (title/hero/reward/menu/CSS) — the
    // template only replaces layout + theme + sub-pages.
    const rp = (draftsRef.current[HOME] || homeDoc)?.root?.props || {};
    const { home, pages: tplPages } = applyTemplate(tpl, rp);
    draftsRef.current = {};
    setHomeDoc(home);
    setPages(tplPages);
    setCur(HOME);
    setRev((r) => r + 1);
    setTplModal(false);
    setFlash('已套用範本 — 按「儲存並發佈」生效'); setTimeout(() => setFlash(''), 3500);
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
      // Event basics come off the root panel; clamp the reward threshold to
      // the task count (a higher one can never be reached).
      const rp = home.root?.props || {};
      let threshold = Number(rp.rewardThreshold) || 1;
      if (tasks.length > 0 && threshold > tasks.length) threshold = tasks.length;
      const updated = await adminApi(`/api/admin/events/${event.id}`, {
        method: 'PATCH',
        body: {
          name: (rp.title || '').trim() || event.name,
          description: rp.description || '',
          reward_name: rp.rewardName || '',
          reward_threshold: threshold,
          config: { ...(event.config || {}), heroImage: rp.heroImage || undefined, puck: home, pages: outPages, puckVersion: 2 },
        },
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
        <button onClick={() => setTplModal(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '10px', borderRadius: '9px', border: '1px solid var(--primary-200)', background: 'var(--primary-50)', color: 'var(--primary-700)', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', marginBottom: '4px' }}>
          <span style={{ fontSize: '15px', display: 'inline-flex', lineHeight: 0 }}><Icon name="layout-template" /></span>更換整站範本
        </button>
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
          活動設定（標題／封面圖／獎勵／佈景主題）：在「首頁」點畫布空白處 → 右側面板。主題套用整個網站。
        </div>
      </aside>

      {/* ── Canvas — remount per document so Puck loads the right data ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Puck
          key={`${cur}:${rev}`}
          config={cur === HOME ? editorConfig : editorSubPageConfig}
          data={docFor(cur)}
          onChange={(d) => { draftsRef.current[cur] = d; }}
          metadata={{ event, tasks }}
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

      {/* ── Template gallery ──────────────────────────────────────────── */}
      {tplModal && (
        <div onClick={() => setTplModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(11,41,53,.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '16px', boxShadow: 'var(--shadow-xl)', padding: '22px', width: '100%', maxWidth: '980px', maxHeight: '86dvh', overflow: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <span style={{ fontSize: '18px', color: 'var(--primary-600)', display: 'inline-flex', lineHeight: 0 }}><Icon name="layout-template" /></span>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-strong)' }}>選擇整站範本</div>
              <button onClick={() => setTplModal(false)} style={{ marginLeft: 'auto', width: '32px', height: '32px', borderRadius: '9999px', border: '1px solid var(--border-default)', background: '#fff', color: 'var(--text-body)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ display: 'inline-flex', lineHeight: 0 }}><Icon name="x" /></span></button>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>套用範本會替換版面與佈景主題（活動標題、封面圖、獎勵與選單設定會保留）。按「儲存並發佈」後才會更新公開網站。</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
              {SITE_TEMPLATES.map((tpl) => (
                <div key={tpl.key} style={{ border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <TplPreview tpl={tpl} />
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-strong)' }}>{tpl.label}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: 1.5, flex: 1 }}>{tpl.desc}</div>
                  <button onClick={() => applyTpl(tpl)} style={{ height: '36px', borderRadius: '9999px', background: 'var(--primary-600)', color: '#fff', border: 'none', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>套用此範本</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
