/**
 * The EVENT WEBSITE (spec §VII "tự động tạo website sự kiện" + §III.3
 * "website chính thức / tên miền của khách hàng").
 *
 * Server-rendered public landing page for ONE event — full-bleed hero,
 * overlapping stat cards, task stops, content sections, and the 開始旅程 CTA
 * into the LIFF experience (QR modal on desktop — see JoinCta). White-label:
 * colors/logo come from tenant branding; "Powered by Zoustec" obeys the
 * platform flag.
 */

import Link from 'next/link';
import { Icon } from '../Icon';
import EventSections from './EventSections';
import JoinCta from './JoinCta';
import { brandPalette } from '../../lib/brand';

const TYPE_LABEL = { city: '城市探索', hiking: '登山步道', shopping: '購物中心' };
const METHOD_ICON = { qr: 'qr-code', gps: 'map-pin', hybrid: 'scan-line' };
const METHOD_LABEL = { qr: 'QR + AR', gps: 'GPS + AR', hybrid: '混合驗證' };

const WRAP = { maxWidth: '1140px', width: '100%', margin: '0 auto', padding: '0 clamp(16px, 4vw, 26px)' };

export default function EventSite({ site, linkBase }) {
  const { branding, event, tasks, other_events: others } = site;
  const p = brandPalette(branding.theme_color || '#0E7490') || {};
  // '' on a customer domain (white-label /{slug}), /e/{tenant} on the platform.
  const base = linkBase ?? `/e/${branding.tenant_slug}`;
  // LIFF permalink (same strategy as QR): works from ANY host — including the
  // customer's custom domain, where a relative link would put LINE's OAuth
  // redirectUri outside the LIFF endpoint scope (400 invalid url). Mobile
  // opens straight into LINE; desktop shows a QR modal (JoinCta).
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  const joinQuery = `tenant=${branding.tenant_slug}&event=${event.id}`;
  const joinHref = liffId
    ? `https://liff.line.me/${liffId}/experience/login?${joinQuery}`
    : `/experience/login?${joinQuery}`;
  const hero = event.config?.heroImage;

  return (
<div className="page-full" style={{ '--brand': p.brand, '--brand-dark': p.dark, '--brand-light': p.light, '--brand-hero-a': p.heroA, '--brand-hero-b': p.heroB, background: 'var(--surface-app)', display:'flex', flexDirection:'column' }}>

  {/* ── Hero (full-bleed) ────────────────────────────────────────────── */}
  <div style={{position:'relative', minHeight:'clamp(400px, 56vh, 580px)', background: hero ? `linear-gradient(rgba(11,41,53,.55), rgba(11,41,53,.66)), url(${hero}) center/cover` : `linear-gradient(150deg, ${p.heroA}, ${p.heroB})`, color:'#fff', display:'flex', flexDirection:'column'}}>
    <div style={{position:'absolute', inset:'0', background:'radial-gradient(circle at 80% 15%, rgba(255,255,255,.12), transparent 50%)'}}></div>

    {/* Header row */}
    <div style={{...WRAP, position:'relative', display:'flex', alignItems:'center', gap:'10px', paddingTop:'18px', paddingBottom:'18px'}}>
      {branding.logo_url
        ? <img src={branding.logo_url} alt={branding.tenant_name} style={{width:'32px', height:'32px', borderRadius:'9px', objectFit:'cover', background:'#fff'}} />
        : <span style={{width:'30px', height:'30px', borderRadius:'8px', background:'rgba(255,255,255,.16)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'16px'}}><Icon name="scan-line" /></span>}
      <span style={{fontSize:'14px', fontWeight:'700'}}>{branding.tenant_name}</span>
      <span style={{marginLeft:'auto', display:'inline-flex', alignItems:'center', gap:'6px', fontSize:'11px', fontWeight:'600', background:'rgba(255,255,255,.14)', padding:'6px 11px', borderRadius:'9999px', backdropFilter:'blur(4px)'}}><span style={{width:'7px', height:'7px', borderRadius:'50%', background:'#28C840'}}></span>進行中</span>
    </div>

    {/* Hero copy */}
    <div style={{...WRAP, position:'relative', marginTop:'auto', paddingBottom:'clamp(30px, 6vh, 54px)'}}>
      <div style={{fontSize:'12.5px', fontWeight:'700', letterSpacing:'.12em', textTransform:'uppercase', color:p.light, marginBottom:'10px'}}>{TYPE_LABEL[event.event_type] || '互動體驗'} · WebAR 集章</div>
      <h1 style={{margin:0, fontSize:'clamp(30px, 5.5vw, 52px)', fontWeight:800, lineHeight:1.08, letterSpacing:'-.02em', color:'#fff', maxWidth:'20ch'}}>{event.name}</h1>
      {event.description && <p style={{margin:'14px 0 0', fontSize:'clamp(14px, 1.6vw, 16.5px)', color:'rgba(255,255,255,.85)', lineHeight:1.65, maxWidth:'62ch'}}>{event.description}</p>}
      <div style={{display:'flex', gap:'10px', marginTop:'24px', flexWrap:'wrap'}}>
        <JoinCta href={joinHref} label="開始旅程" icon="qr-code" variant="primary" />
        <JoinCta href={joinHref} label="查看地圖" variant="ghost" />
      </div>
    </div>
  </div>

  {/* ── Stats band (overlaps the hero) ───────────────────────────────── */}
  <div style={{...WRAP, position:'relative', zIndex:2, marginTop:'-30px'}}>
    <div className="grid-kpi" style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'14px'}}>
      <div style={{background:'#fff', borderRadius:'14px', border:'1px solid var(--border-subtle)', boxShadow:'var(--shadow-md)', padding:'18px 20px', display:'flex', alignItems:'center', gap:'14px'}}>
        <span style={{width:'42px', height:'42px', borderRadius:'11px', background:'var(--primary-50)', color:p.brand, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flex:'0 0 auto'}}><Icon name="map-pin" /></span>
        <div><div style={{fontSize:'24px', fontWeight:'800', color:'var(--text-strong)', lineHeight:1.1}}>{tasks.length}</div><div style={{fontSize:'12px', color:'var(--text-muted)', fontWeight:'600'}}>任務停靠點</div></div>
      </div>
      <div style={{background:'#fff', borderRadius:'14px', border:'1px solid var(--border-subtle)', boxShadow:'var(--shadow-md)', padding:'18px 20px', display:'flex', alignItems:'center', gap:'14px'}}>
        <span style={{width:'42px', height:'42px', borderRadius:'11px', background:'var(--primary-50)', color:p.brand, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flex:'0 0 auto'}}><Icon name="award" /></span>
        <div><div style={{fontSize:'24px', fontWeight:'800', color:'var(--text-strong)', lineHeight:1.1}}>{event.reward_threshold}</div><div style={{fontSize:'12px', color:'var(--text-muted)', fontWeight:'600'}}>集章門檻</div></div>
      </div>
      <div style={{background:'#fff', borderRadius:'14px', border:'1px solid var(--border-subtle)', boxShadow:'var(--shadow-md)', padding:'18px 20px', display:'flex', alignItems:'center', gap:'14px', minWidth:0}}>
        <span style={{width:'42px', height:'42px', borderRadius:'11px', background:'var(--primary-50)', color:p.brand, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flex:'0 0 auto'}}><Icon name="gift" /></span>
        <div style={{minWidth:0}}><div style={{fontSize:'17px', fontWeight:'800', color:'var(--text-strong)', lineHeight:1.25, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{event.reward_name || '—'}</div><div style={{fontSize:'12px', color:'var(--text-muted)', fontWeight:'600'}}>獎勵</div></div>
      </div>
    </div>
  </div>

  {/* ── Body ─────────────────────────────────────────────────────────── */}
  <div style={{...WRAP, flex:'1', paddingTop:'30px', paddingBottom:'40px'}}>

    {/* Task stops */}
    {tasks.length > 0 && (<>
      <h2 style={{margin:'0 0 14px', fontSize:'clamp(18px, 2.2vw, 22px)', fontWeight:'800', color:'var(--text-strong)'}}>任務停靠點</h2>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'12px', marginBottom:'30px'}}>
        {tasks.map((t, i) => (
          <div key={i} style={{display:'flex', alignItems:'center', gap:'13px', padding:'15px', borderRadius:'13px', border:'1px solid var(--border-subtle)', background:'#fff', boxShadow:'var(--shadow-sm)'}}>
            <span style={{width:'44px', height:'44px', borderRadius:'11px', background:'var(--primary-50)', color:p.brand, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flex:'0 0 auto'}}><Icon name={METHOD_ICON[t.verification_type] || 'map-pin'} /></span>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontWeight:'700', fontSize:'14.5px', color:'var(--text-strong)'}}>{t.name}</div>
              <div style={{fontSize:'12px', color:'var(--text-muted)'}}>{METHOD_LABEL[t.verification_type]}{t.radius_m ? ` · 範圍 ${t.radius_m}m` : ''}</div>
            </div>
            <span style={{fontSize:'16px', color:'var(--text-subtle)', display:'inline-flex', lineHeight:'0'}}><Icon name="chevron-right" /></span>
          </div>
        ))}
      </div>
    </>)}

    {/* Content sections (per event type) */}
    {event.config?.sections?.filter((x) => !x.hidden).length > 0 && (<>
      <h2 style={{margin:'0 0 14px', fontSize:'clamp(18px, 2.2vw, 22px)', fontWeight:'800', color:'var(--text-strong)'}}>活動資訊</h2>
      <div style={{marginBottom:'30px'}}>
        <EventSections sections={event.config.sections} variant="light" />
      </div>
    </>)}

    {/* CTA cuối trang */}
    <div style={{maxWidth:'560px', margin:'0 auto 20px'}}>
      <JoinCta href={joinHref} label="立即參加 — 免下載，LINE 直接玩" icon="play" variant="bar" />
    </div>

    {others?.length > 0 && (
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:'12px', fontWeight:'700', color:'var(--text-subtle)', marginBottom:'9px'}}>此主辦方的其他活動</div>
        <div style={{display:'flex', gap:'8px', flexWrap:'wrap', justifyContent:'center'}}>
          {others.map((o) => (
            <Link key={o.slug} href={`${base}/${o.slug}`} style={{padding:'8px 15px', borderRadius:'9999px', background:'#fff', border:'1px solid var(--border-subtle)', color:'var(--text-body)', fontSize:'12.5px', fontWeight:'600', textDecoration:'none'}}>{o.name}</Link>
          ))}
        </div>
      </div>
    )}
  </div>

  {/* ── Footer ───────────────────────────────────────────────────────── */}
  <div style={{padding:'16px', textAlign:'center', borderTop:'1px solid var(--border-subtle)', fontSize:'11.5px', color:'var(--text-subtle)', background:'#fff'}}>
    © {branding.tenant_name}{branding.show_powered_by && <> · Powered by <span style={{fontWeight:'700'}}>Zoustec</span></>}
  </div>
</div>
  );
}
