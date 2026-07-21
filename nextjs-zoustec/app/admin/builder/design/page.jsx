'use client';

/**
 * Drag-drop website designer (Puck) — full-screen editor for the event
 * website content. Replaces the fixed "sections" form: admins compose the
 * page from the block library (site-blocks) with free layout, then publish
 * back into event.config.puck. Legacy events are migrated on first open via
 * sectionsToPuckData; EventSite renders config.puck when present.
 *
 * iframe preview is disabled so the canvas shares the admin document and
 * inherits brand CSS vars (applyBrand) without style-sync edge cases.
 */

import { useEffect, useState } from 'react';
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
  const [initialData, setInitialData] = useState(null);
  const [tenant, setTenant] = useState(TENANT);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');

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
        setInitialData(ev.config?.puck || sectionsToPuckData(ev.config?.sections?.length ? ev.config.sections : (DEFAULT_SECTIONS[ev.event_type] || [])));
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

  async function save(data) {
    if (!event || busy) return;
    setBusy(true); setError('');
    try {
      const updated = await adminApi(`/api/admin/events/${event.id}`, {
        method: 'PATCH',
        body: { config: { ...(event.config || {}), puck: data } },
      });
      setEvent(updated);
      setFlash('已儲存 ✓'); setTimeout(() => setFlash(''), 2500);
    } catch (e) {
      if (e instanceof AuthRequired) return router.replace(loginUrl('/admin/builder/design'));
      setError(e.message);
    } finally { setBusy(false); }
  }

  if (error) {
    return <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px', color: 'var(--status-danger-fg, #B91C1C)', fontSize: '14px', fontWeight: 600 }}>{error}</div>;
  }
  if (!event || !initialData) {
    return <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>載入中…</div>;
  }

  return (
    <div style={{ height: '100dvh' }}>
      <Puck
        config={editorConfig}
        data={initialData}
        iframe={{ enabled: false }}
        headerTitle={`${event.name} — 網站設計`}
        overrides={{
          headerActions: () => (
            <HeaderActions
              onSave={save}
              busy={busy}
              flash={flash}
              publicUrl={`/e/${tenant}/${event.slug}`}
              backUrl={`/admin/builder?event=${event.id}`}
            />
          ),
        }}
      />
    </div>
  );
}
