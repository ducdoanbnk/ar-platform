/**
 * Standalone renderers for the exported event site — a self-contained
 * mirror of the platform's EventSite/EventSubPage. The block library
 * (lib/site-blocks.jsx) is byte-identical to the platform's, so anything
 * designed in the drag-drop designer renders the same here.
 */

import Link from 'next/link';
import { Render } from '@measured/puck/rsc';
import { Icon } from './Icon';
import { siteConfig, themeStyles } from '../lib/site-blocks';

const WRAP = { maxWidth: '1140px', width: '100%', margin: '0 auto', padding: '0 clamp(16px, 4vw, 26px)' };
const TYPE_LABEL = { city: '城市探索', hiking: '登山步道', shopping: '購物中心' };

export function siteRoot(event) {
  return event.config?.puck?.root?.props || {};
}

export function navPages(event) {
  return (event.config?.pages || []).filter((p) => p.nav !== false && p.data?.content?.length);
}

export function siteNav(event) {
  const menu = (siteRoot(event).menu || []).filter((m) => m?.label);
  if (menu.length) {
    return menu.map((m) => {
      const link = String(m.link || '').trim();
      if (/^https?:\/\//i.test(link)) return { label: m.label, href: link, external: true };
      const slug = link.replace(/^\//, '');
      return { label: m.label, href: slug ? `/${slug}` : '/', slug };
    });
  }
  return navPages(event).map((p) => ({ label: p.title, href: `/${p.slug}`, slug: p.slug }));
}

function CustomCss({ event }) {
  const css = siteRoot(event).customCss;
  if (!css) return null;
  return <style dangerouslySetInnerHTML={{ __html: String(css).replace(/<\//g, '<\\/') }} />;
}

/** Brand shades via CSS color-mix — close enough to the platform palette. */
function brandVars(branding) {
  const brand = branding.theme_color || '#0E7490';
  return {
    '--brand': brand,
    '--brand-dark': `color-mix(in srgb, ${brand}, #06222c 45%)`,
    '--brand-light': `color-mix(in srgb, ${brand}, #ffffff 55%)`,
    '--brand-hero-a': `color-mix(in srgb, ${brand}, #08303c 20%)`,
    '--brand-hero-b': `color-mix(in srgb, ${brand}, #06222c 55%)`,
  };
}

function joinHref(site) {
  const liffId = site.branding.line_liff_id || process.env.ZOUSTEC_LIFF_ID || '';
  return liffId
    ? `https://liff.line.me/${liffId}/experience/login?tenant=${site.tenant_slug}&event=${site.event.id}`
    : null;
}

function Cta({ href, label, solid = true }) {
  if (!href) return null;
  return (
    <a href={href} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '13px 24px', borderRadius: 'var(--site-btn-radius, 9999px)', background: solid ? '#fff' : 'rgba(255,255,255,.12)', color: solid ? 'var(--brand-dark)' : '#fff', fontSize: '14.5px', fontWeight: 800, textDecoration: 'none', border: solid ? 'none' : '1px solid rgba(255,255,255,.25)' }}>
      {solid && <span style={{ fontSize: '16px', display: 'inline-flex', lineHeight: 0 }}><Icon name="qr-code" /></span>}{label}
    </a>
  );
}

function NavLinks({ items, activeSlug }) {
  return items.map((it) => it.external
    ? <a key={it.href} href={it.href} target="_blank" rel="noreferrer" style={{ padding: '6px 12px', borderRadius: '9999px', color: 'rgba(255,255,255,.92)', fontSize: '12.5px', fontWeight: 600, textDecoration: 'none', background: 'rgba(255,255,255,.1)' }}>{it.label}</a>
    : <Link key={it.href} href={it.href} style={{ padding: '6px 12px', borderRadius: '9999px', color: '#fff', fontSize: '12.5px', fontWeight: 600, textDecoration: 'none', background: it.slug === activeSlug ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.1)' }}>{it.label}</Link>);
}

function Footer({ branding }) {
  return (
    <div style={{ padding: '16px', textAlign: 'center', borderTop: '1px solid var(--border-subtle)', fontSize: '11.5px', color: 'var(--text-subtle)', background: '#fff' }}>
      © {branding.tenant_name}{branding.show_powered_by && <> · Powered by <span style={{ fontWeight: 700 }}>Zoustec</span></>}
    </div>
  );
}

export function EventHome({ site }) {
  const { branding, event, tasks } = site;
  const rp = siteRoot(event);
  const theme = themeStyles(rp.theme || 'default', rp.themeCustom);
  const hero = event.config?.heroImage;
  const heroOverlay = theme.hero?.overlay || 'linear-gradient(rgba(11,41,53,.55), rgba(11,41,53,.66))';
  const nav = siteNav(event);
  const hideHero = rp.hideHero === 'hide';
  const join = joinHref(site);
  const doc = event.config?.puck;

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--surface-app)', ...brandVars(branding), ...theme.vars, ...theme.page }}>
      <CustomCss event={event} />

      {hideHero ? (
        <div style={{ background: 'linear-gradient(135deg, var(--brand-hero-a), var(--brand-hero-b))', color: '#fff' }}>
          <div style={{ ...WRAP, display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '14px', paddingBottom: '14px', flexWrap: 'wrap' }}>
            {branding.logo_url && <img src={branding.logo_url} alt="" style={{ width: '30px', height: '30px', borderRadius: '8px', objectFit: 'cover', background: '#fff' }} />}
            <span style={{ fontSize: '14px', fontWeight: 700 }}>{event.name}</span>
            <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '10px', flexWrap: 'wrap' }}><NavLinks items={nav} /></nav>
            <div style={{ marginLeft: 'auto' }}><Cta href={join} label="開始旅程" /></div>
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative', minHeight: 'clamp(400px, 56vh, 580px)', background: hero ? `${heroOverlay}, url(${hero}) center/cover` : 'linear-gradient(150deg, var(--brand-hero-a), var(--brand-hero-b))', color: '#fff', display: 'flex', flexDirection: 'column' }}>
          <div style={{ ...WRAP, position: 'relative', display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '18px', paddingBottom: '18px', flexWrap: 'wrap' }}>
            {branding.logo_url && <img src={branding.logo_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '9px', objectFit: 'cover', background: '#fff' }} />}
            <span style={{ fontSize: '14px', fontWeight: 700 }}>{branding.tenant_name}</span>
            {nav.length > 0 && <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '14px', flexWrap: 'wrap' }}><NavLinks items={nav} /></nav>}
          </div>
          <div style={{ ...WRAP, position: 'relative', marginTop: 'auto', paddingBottom: 'clamp(30px, 6vh, 54px)' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--brand-light)', marginBottom: '10px' }}>{TYPE_LABEL[event.event_type] || '互動體驗'} · WebAR 集章</div>
            <h1 style={{ margin: 0, fontSize: 'clamp(30px, 5.5vw, 52px)', fontWeight: 'var(--site-heading-weight, 800)', lineHeight: 1.08, letterSpacing: '-.02em', color: '#fff', maxWidth: '20ch' }}>{event.name}</h1>
            {event.description && <p style={{ margin: '14px 0 0', fontSize: 'clamp(14px, 1.6vw, 16.5px)', color: 'rgba(255,255,255,.85)', lineHeight: 1.65, maxWidth: '62ch' }}>{event.description}</p>}
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px', flexWrap: 'wrap' }}>
              <Cta href={join} label="開始旅程" />
              <Cta href={join} label="查看地圖" solid={false} />
            </div>
          </div>
        </div>
      )}

      <div style={{ ...WRAP, flex: 1, paddingTop: '30px', paddingBottom: '40px' }}>
        {doc?.content?.length > 0 && <Render config={siteConfig} data={doc} metadata={{ event, tasks }} />}
        {join && (
          <div style={{ maxWidth: '560px', margin: '26px auto 0' }}>
            <a href={join} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', height: '54px', borderRadius: 'var(--site-btn-radius, 9999px)', background: 'var(--brand)', color: '#fff', fontSize: '16px', fontWeight: 800, textDecoration: 'none' }}>立即參加 — 免下載，LINE 直接玩</a>
          </div>
        )}
      </div>

      <Footer branding={branding} />
    </div>
  );
}

export function EventSubPage({ site, page }) {
  const { branding, event, tasks } = site;
  const rp = siteRoot(event);
  const theme = themeStyles(rp.theme || 'default', rp.themeCustom);
  const nav = siteNav(event);
  const join = joinHref(site);
  const data = { ...page.data, root: { ...(page.data?.root || {}), props: { ...(page.data?.root?.props || {}), theme: rp.theme || 'default', themeCustom: rp.themeCustom } } };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--surface-app)', ...brandVars(branding), ...theme.vars, ...theme.page }}>
      <CustomCss event={event} />
      <div style={{ background: 'linear-gradient(135deg, var(--brand-hero-a), var(--brand-hero-b))', color: '#fff' }}>
        <div style={{ ...WRAP, display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '14px', paddingBottom: '14px', flexWrap: 'wrap' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff', textDecoration: 'none' }}>
            {branding.logo_url && <img src={branding.logo_url} alt="" style={{ width: '30px', height: '30px', borderRadius: '8px', objectFit: 'cover', background: '#fff' }} />}
            <span style={{ fontSize: '14px', fontWeight: 700 }}>{event.name}</span>
          </Link>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '10px', flexWrap: 'wrap' }}>
            <Link href="/" style={{ padding: '6px 12px', borderRadius: '9999px', color: 'rgba(255,255,255,.92)', fontSize: '12.5px', fontWeight: 600, textDecoration: 'none' }}>首頁</Link>
            <NavLinks items={nav} activeSlug={page.slug} />
          </nav>
          <div style={{ marginLeft: 'auto' }}><Cta href={join} label="開始旅程" /></div>
        </div>
      </div>
      <div style={{ ...WRAP, flex: 1, paddingTop: '26px', paddingBottom: '40px' }}>
        <Render config={siteConfig} data={data} metadata={{ event, tasks }} />
      </div>
      <Footer branding={branding} />
    </div>
  );
}
