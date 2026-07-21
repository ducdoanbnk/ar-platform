/**
 * Puck block library for the event website (drag-drop builder).
 *
 * One shared config drives BOTH the editor (<Puck> in /admin/builder/design)
 * and the public site (<Render> from @measured/puck/rsc in EventSite). It is
 * deliberately free of 'use client' and hooks so the RSC renderer can import
 * it; the editor wraps it (puck-editor-config) to swap in interactive fields
 * (e.g. image upload).
 *
 * Styling matches the legacy EventSections "light" cards so migrated content
 * looks identical; colors come from brand CSS vars (multi-tenant theming).
 */

import { Icon } from '../components/Icon';

/* ── Theme registry ────────────────────────────────────────────────────
 * A theme is a data object (WordPress-style "theme", no code): design
 * tokens as CSS-var overrides + page styles + hero treatment + typography.
 * Blocks and the structural chrome (hero, stats, buttons, cards) all read
 * these tokens, so switching themes restyles the ENTIRE site while brand
 * colors (tenant palette) stay theirs. Being pure JSON, themes can later
 * move to the DB → per-tenant custom themes / marketplace.
 *
 * Token contract consumed by blocks & chrome:
 *   --site-radius        card corner radius
 *   --site-btn-radius    button corner radius
 *   --site-heading-weight heading font weight
 *   --surface-sunken / --border-subtle / --border-default   card skin
 *   --text-strong / --text-body / --text-subtle             typography
 *   --site-card-bg       solid card background (stats/tasks on home)
 * plus: page {background,color}, font (body+heading stack),
 * hero {overlay: css-gradient over hero image, tint: extra scrim color}
 */
export const THEMES = {
  default: {
    label: '清爽（預設）',
    swatch: ['#FFFFFF', '#EEF2F6', '#0E7490'],
    vars: { '--site-card-bg': '#fff' },
    page: {},
  },
  dark: {
    label: '深色',
    swatch: ['#0B2935', '#12384A', '#6FCDE8'],
    vars: {
      '--surface-sunken': 'rgba(255,255,255,.07)',
      '--border-subtle': 'rgba(255,255,255,.15)',
      '--border-default': 'rgba(255,255,255,.24)',
      '--text-strong': '#F3F6F8',
      '--text-body': '#C9D6DD',
      '--text-subtle': '#8FA6B0',
      '--status-warning-bg': 'rgba(245,158,11,.16)',
      '--site-card-bg': 'rgba(255,255,255,.06)',
    },
    page: { background: '#0B2935', color: '#C9D6DD' },
    hero: { overlay: 'linear-gradient(rgba(4,18,24,.55), rgba(4,18,24,.78))' },
  },
  warm: {
    label: '暖陽',
    swatch: ['#FFFBF4', '#FBF2E3', '#C2410C'],
    vars: {
      '--surface-sunken': '#FBF2E3',
      '--border-subtle': '#F0E0C5',
      '--border-default': '#E2CBA2',
      '--text-strong': '#43301A',
      '--text-body': '#6B5638',
      '--text-subtle': '#9C8767',
      '--site-card-bg': '#FFFDF8',
      '--site-radius': '16px',
    },
    page: { background: '#FFFBF4' },
    hero: { overlay: 'linear-gradient(rgba(67,32,10,.45), rgba(67,32,10,.62))' },
  },
  nature: {
    label: '森林',
    swatch: ['#F7FBF6', '#EEF6EC', '#166534'],
    vars: {
      '--surface-sunken': '#EEF6EC',
      '--border-subtle': '#DCEBD6',
      '--border-default': '#BDD8B2',
      '--text-strong': '#1E3A26',
      '--text-body': '#3F5C48',
      '--text-subtle': '#7C967F',
      '--site-card-bg': '#FDFFFC',
      '--site-radius': '18px',
      '--site-btn-radius': '14px',
    },
    page: { background: '#F7FBF6' },
    hero: { overlay: 'linear-gradient(rgba(13,36,20,.45), rgba(13,36,20,.66))' },
  },
  elegant: {
    label: '典雅（襯線體）',
    swatch: ['#FFFEFB', '#F1EEE7', '#2B2620'],
    vars: {
      '--surface-sunken': '#FAF9F7',
      '--border-subtle': '#E8E4DC',
      '--border-default': '#D4CDC0',
      '--text-strong': '#2B2620',
      '--text-body': '#575044',
      '--text-subtle': '#948B7B',
      '--site-card-bg': '#FFFFFE',
      '--site-radius': '4px',
      '--site-btn-radius': '4px',
      '--site-heading-weight': '600',
    },
    page: { background: '#FFFEFB' },
    font: "Georgia, 'Noto Serif TC', 'Times New Roman', serif",
    hero: { overlay: 'linear-gradient(rgba(24,20,14,.5), rgba(24,20,14,.68))' },
  },
  ocean: {
    label: '海洋',
    swatch: ['#F4FAFD', '#E3F2FA', '#0369A1'],
    vars: {
      '--surface-sunken': '#E9F4FA',
      '--border-subtle': '#D5E9F4',
      '--border-default': '#B1D6E8',
      '--text-strong': '#0C3B54',
      '--text-body': '#33607A',
      '--text-subtle': '#6E97AC',
      '--site-card-bg': '#FCFEFF',
      '--site-radius': '20px',
      '--site-btn-radius': '9999px',
    },
    page: { background: '#F4FAFD' },
    hero: { overlay: 'linear-gradient(rgba(4,36,54,.4), rgba(4,36,54,.62))' },
  },
  bold: {
    label: '活力',
    swatch: ['#FFFFFF', '#F4F4F5', '#18181B'],
    vars: {
      '--surface-sunken': '#F4F4F5',
      '--border-subtle': '#E4E4E7',
      '--border-default': '#111113',
      '--text-strong': '#111113',
      '--text-body': '#3F3F46',
      '--text-subtle': '#7B7B85',
      '--site-card-bg': '#fff',
      '--site-radius': '2px',
      '--site-btn-radius': '2px',
      '--site-heading-weight': '900',
    },
    page: { background: '#fff' },
    hero: { overlay: 'linear-gradient(rgba(0,0,0,.5), rgba(0,0,0,.7))' },
  },
};

export function themeStyles(themeKey) {
  const t = THEMES[themeKey] || THEMES.default;
  return {
    vars: { ...t.vars, ...(t.font ? { fontFamily: t.font } : {}) },
    page: { ...t.page, ...(t.font ? { fontFamily: t.font } : {}) },
    hero: t.hero || null,
  };
}

const card = { background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--site-radius, 14px)', padding: '14px' };
const warnCard = { background: 'var(--status-warning-bg, #FEF3C7)', border: '1px solid #FBBF24', borderRadius: 'var(--site-radius, 14px)', padding: '14px' };
const cardTitle = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 800, color: 'var(--text-strong)', marginBottom: '9px' };
const ALIGN = { left: 'flex-start', center: 'center', right: 'flex-end' };

/* ── Block renderers (plain presentational components) ────────────────── */

function HeadingBlock({ text, level, align }) {
  const Tag = level === 'h3' ? 'h3' : 'h2';
  const size = level === 'h3' ? 'clamp(15px, 1.8vw, 17px)' : 'clamp(18px, 2.2vw, 22px)';
  return <Tag style={{ margin: 0, fontSize: size, fontWeight: 'var(--site-heading-weight, 800)', color: 'var(--text-strong)', textAlign: align || 'left' }}>{text}</Tag>;
}

function ParagraphBlock({ text, align }) {
  const paras = String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
      {paras.map((pg, i) => <p key={i} style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.7, color: 'var(--text-body)', textAlign: align || 'left' }}>{pg}</p>)}
    </div>
  );
}

function TextCardBlock({ title, text }) {
  const paras = String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  return (
    <div style={card}>
      {title && <div style={cardTitle}><span style={{ fontSize: '15px', display: 'inline-flex', lineHeight: 0, color: 'var(--brand)' }}><Icon name="type" /></span>{title}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {paras.map((pg, i) => <p key={i} style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.6, color: 'var(--text-body)' }}>{pg}</p>)}
      </div>
    </div>
  );
}

function NoticeBlock({ title, tone, items }) {
  const warn = tone === 'warning';
  return (
    <div style={warn ? warnCard : card}>
      <div style={{ ...cardTitle, color: warn ? 'var(--status-warning-fg, #92400E)' : 'var(--text-strong)', marginBottom: title ? '9px' : 0 }}>
        <span style={{ fontSize: '15px', display: 'inline-flex', lineHeight: 0 }}><Icon name={warn ? 'triangle-alert' : 'info'} /></span>
        {title}
      </div>
      <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {(items || []).map((it, i) => <li key={i} style={{ fontSize: '12.5px', lineHeight: 1.55, color: warn ? 'var(--status-warning-fg, #92400E)' : 'var(--text-body)' }}>{it.text}</li>)}
      </ul>
    </div>
  );
}

function InfoListBlock({ title, items }) {
  return (
    <div style={card}>
      {title && <div style={cardTitle}><span style={{ fontSize: '15px', display: 'inline-flex', lineHeight: 0, color: 'var(--brand)' }}><Icon name="list" /></span>{title}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {(items || []).map((it, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '12.5px' }}>
            <span style={{ color: 'var(--text-body)', fontWeight: 600 }}>{it.label}</span>
            <span style={{ color: 'var(--text-strong)', fontWeight: 700, textAlign: 'right' }}>{it.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlacesBlock({ title, items }) {
  return (
    <div style={card}>
      {title && <div style={cardTitle}><span style={{ fontSize: '15px', display: 'inline-flex', lineHeight: 0, color: 'var(--brand)' }}><Icon name="map-pin" /></span>{title}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
        {(items || []).map((it, i) => (
          <div key={i} style={{ fontSize: '12.5px', lineHeight: 1.5 }}>
            <span style={{ color: 'var(--text-strong)', fontWeight: 700 }}>{it.name}</span>
            {it.description && <span style={{ color: 'var(--text-body)' }}> — {it.description}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ImageBlock({ url, alt, height, rounded }) {
  if (!url) {
    return <div style={{ ...card, textAlign: 'center', color: 'var(--text-subtle)', fontSize: '12.5px', padding: '28px' }}>（尚未選擇圖片 — 右側面板上傳）</div>;
  }
  return <img src={url} alt={alt || ''} style={{ width: '100%', height: height === 'auto' ? 'auto' : height, objectFit: 'cover', borderRadius: rounded === 'none' ? 0 : '14px', display: 'block', border: '1px solid var(--border-subtle)' }} />;
}

function ButtonBlock({ label, href, variant, align }) {
  const solid = variant !== 'outline';
  return (
    <div style={{ display: 'flex', justifyContent: ALIGN[align] || 'flex-start' }}>
      <a href={href || '#'} style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: 'var(--site-btn-radius, 9999px)',
        background: solid ? 'var(--brand, var(--primary-600))' : 'transparent',
        color: solid ? '#fff' : 'var(--brand, var(--primary-600))',
        border: solid ? 'none' : '1.5px solid var(--brand, var(--primary-600))',
        fontSize: '14px', fontWeight: 700, textDecoration: 'none',
      }}>{label}</a>
    </div>
  );
}

function ColumnsBlock({ ratio, left: Left, right: Right }) {
  const [l, r] = ratio === '1-2' ? [1, 2] : ratio === '2-1' ? [2, 1] : [1, 1];
  // Stacks on narrow screens via auto-fit minmax; slots keep drop targets alive.
  const cell = (flex) => ({ flex: `${flex} 1 220px`, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '40px' });
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'flex-start' }}>
      <Left style={cell(l)} />
      <Right style={cell(r)} />
    </div>
  );
}

/* ── Smart blocks — bound to LIVE event data via Puck metadata ─────────
 * The editor and the public renderer both pass metadata={{event, tasks}},
 * so these blocks always show the real numbers/tasks and the admin decides
 * WHERE (or whether) they appear. */

const METHOD_ICON = { qr: 'qr-code', gps: 'map-pin', hybrid: 'scan-line' };
const METHOD_LABEL = { qr: 'QR + AR', gps: 'GPS + AR', hybrid: '混合驗證' };

const solidCard = { background: 'var(--site-card-bg, #fff)', borderRadius: 'var(--site-radius, 14px)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' };

function StatsBandBlock({ puck }) {
  const ev = puck?.metadata?.event || {};
  const tasks = puck?.metadata?.tasks || [];
  const cell = (icon, big, small) => (
    <div style={{ ...solidCard, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '13px', flex: '1 1 160px', minWidth: 0 }}>
      <span style={{ width: '40px', height: '40px', borderRadius: 'var(--site-radius, 11px)', background: 'var(--surface-sunken)', color: 'var(--brand, var(--primary-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '19px', flex: '0 0 auto' }}><Icon name={icon} /></span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '21px', fontWeight: 'var(--site-heading-weight, 800)', color: 'var(--text-strong)', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{big}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-subtle)', fontWeight: 600 }}>{small}</div>
      </div>
    </div>
  );
  return (
    <div style={{ display: 'flex', gap: '13px', flexWrap: 'wrap' }}>
      {cell('map-pin', tasks.length, '任務停靠點')}
      {cell('award', ev.reward_threshold ?? '—', '集章門檻')}
      {cell('gift', ev.reward_name || '—', '獎勵')}
    </div>
  );
}

function TaskStopsBlock({ title, puck }) {
  const tasks = puck?.metadata?.tasks || [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
      {title && <HeadingBlock text={title} level="h2" align="left" />}
      {tasks.length === 0 && <div style={{ ...card, textAlign: 'center', color: 'var(--text-subtle)', fontSize: '12.5px', padding: '22px' }}>（尚無任務 — 於網站產生器左側新增）</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
        {tasks.map((t, i) => (
          <div key={i} style={{ ...solidCard, display: 'flex', alignItems: 'center', gap: '13px', padding: '14px' }}>
            <span style={{ width: '42px', height: '42px', borderRadius: 'var(--site-radius, 11px)', background: 'var(--surface-sunken)', color: 'var(--brand, var(--primary-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '19px', flex: '0 0 auto' }}><Icon name={METHOD_ICON[t.verification_type] || 'map-pin'} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-strong)' }}>{t.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>{METHOD_LABEL[t.verification_type] || ''}{t.radius_m ? ` · 範圍 ${t.radius_m}m` : ''}</div>
            </div>
            <span style={{ fontSize: '15px', color: 'var(--text-subtle)', display: 'inline-flex', lineHeight: 0 }}><Icon name="chevron-right" /></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SpacerBlock({ size }) {
  const h = { s: 12, m: 28, l: 56 }[size] ?? 28;
  return <div style={{ height: `${h}px` }} />;
}

function DividerBlock() {
  return <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '8px 0' }} />;
}

/* ── Shared Puck config (editor + RSC render) ─────────────────────────── */

export const siteConfig = {
  categories: {
    live: { title: '活動資料（自動同步）', components: ['StatsBand', 'TaskStops'] },
    content: { title: '內容', components: ['Heading', 'Paragraph', 'TextCard', 'Notice', 'InfoList', 'Places'] },
    media: { title: '媒體與按鈕', components: ['Image', 'Button'] },
    layout: { title: '版面', components: ['Columns', 'Spacer', 'Divider'] },
  },
  components: {
    StatsBand: {
      label: '數據看板（任務／門檻／獎勵）',
      fields: {},
      defaultProps: {},
      render: StatsBandBlock,
    },
    TaskStops: {
      label: '任務停靠點（自動同步）',
      fields: { title: { type: 'text', label: '標題（留空隱藏）' } },
      defaultProps: { title: '任務停靠點' },
      render: TaskStopsBlock,
    },
    Heading: {
      label: '標題',
      fields: {
        text: { type: 'text', label: '文字' },
        level: { type: 'radio', label: '大小', options: [{ label: '大', value: 'h2' }, { label: '中', value: 'h3' }] },
        align: { type: 'radio', label: '對齊', options: [{ label: '左', value: 'left' }, { label: '中', value: 'center' }, { label: '右', value: 'right' }] },
      },
      defaultProps: { text: '區塊標題', level: 'h2', align: 'left' },
      render: HeadingBlock,
    },
    Paragraph: {
      label: '段落文字',
      fields: {
        text: { type: 'textarea', label: '內容（一行一段）' },
        align: { type: 'radio', label: '對齊', options: [{ label: '左', value: 'left' }, { label: '中', value: 'center' }, { label: '右', value: 'right' }] },
      },
      defaultProps: { text: '在此輸入段落內容。', align: 'left' },
      render: ParagraphBlock,
    },
    TextCard: {
      label: '文字卡片',
      fields: {
        title: { type: 'text', label: '卡片標題' },
        text: { type: 'textarea', label: '內容（一行一段）' },
      },
      defaultProps: { title: '文化小知識', text: '在此撰寫給旅客的故事與背景。' },
      render: TextCardBlock,
    },
    Notice: {
      label: '提醒事項',
      fields: {
        title: { type: 'text', label: '標題' },
        tone: { type: 'radio', label: '樣式', options: [{ label: '一般', value: 'info' }, { label: '警告', value: 'warning' }] },
        items: { type: 'array', label: '項目', arrayFields: { text: { type: 'text', label: '內容' } }, getItemSummary: (it) => it?.text || '項目' },
      },
      defaultProps: { title: '注意事項', tone: 'info', items: [{ text: '第一則提醒' }] },
      render: NoticeBlock,
    },
    InfoList: {
      label: '資訊列表',
      fields: {
        title: { type: 'text', label: '標題' },
        items: { type: 'array', label: '項目', arrayFields: { label: { type: 'text', label: '標籤' }, value: { type: 'text', label: '內容' } }, getItemSummary: (it) => it?.label || '項目' },
      },
      defaultProps: { title: '路線資訊', items: [{ label: '距離', value: '1.5 km' }] },
      render: InfoListBlock,
    },
    Places: {
      label: '地點清單',
      fields: {
        title: { type: 'text', label: '標題' },
        items: { type: 'array', label: '地點', arrayFields: { name: { type: 'text', label: '名稱' }, description: { type: 'text', label: '說明' } }, getItemSummary: (it) => it?.name || '地點' },
      },
      defaultProps: { title: '景點導覽', items: [{ name: '（範例）古蹟地標', description: '介紹活動收錄的景點。' }] },
      render: PlacesBlock,
    },
    Image: {
      label: '圖片',
      fields: {
        url: { type: 'text', label: '圖片網址' },
        alt: { type: 'text', label: '替代文字' },
        height: { type: 'select', label: '高度', options: [{ label: '自動', value: 'auto' }, { label: '180px', value: '180px' }, { label: '260px', value: '260px' }, { label: '360px', value: '360px' }] },
        rounded: { type: 'radio', label: '圓角', options: [{ label: '有', value: 'rounded' }, { label: '無', value: 'none' }] },
      },
      defaultProps: { url: '', alt: '', height: 'auto', rounded: 'rounded' },
      render: ImageBlock,
    },
    Button: {
      label: '按鈕',
      fields: {
        label: { type: 'text', label: '文字' },
        href: { type: 'text', label: '連結網址' },
        variant: { type: 'radio', label: '樣式', options: [{ label: '實心', value: 'solid' }, { label: '外框', value: 'outline' }] },
        align: { type: 'radio', label: '對齊', options: [{ label: '左', value: 'left' }, { label: '中', value: 'center' }, { label: '右', value: 'right' }] },
      },
      defaultProps: { label: '了解更多', href: '', variant: 'solid', align: 'left' },
      render: ButtonBlock,
    },
    Columns: {
      label: '兩欄版面',
      fields: {
        ratio: { type: 'radio', label: '欄寬比例', options: [{ label: '1 : 1', value: '1-1' }, { label: '1 : 2', value: '1-2' }, { label: '2 : 1', value: '2-1' }] },
        left: { type: 'slot' },
        right: { type: 'slot' },
      },
      defaultProps: { ratio: '1-1', left: [], right: [] },
      render: ColumnsBlock,
    },
    Spacer: {
      label: '間距',
      fields: { size: { type: 'radio', label: '大小', options: [{ label: '小', value: 's' }, { label: '中', value: 'm' }, { label: '大', value: 'l' }] } },
      defaultProps: { size: 'm' },
      render: SpacerBlock,
    },
    Divider: {
      label: '分隔線',
      fields: {},
      defaultProps: {},
      render: DividerBlock,
    },
  },
  root: {
    fields: {
      theme: { type: 'select', label: '佈景主題（套用整站）', options: Object.entries(THEMES).map(([value, t]) => ({ value, label: t.label })) },
    },
    defaultProps: { theme: 'default' },
    render: ({ children, theme }) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', ...themeStyles(theme).vars }}>{children}</div>
    ),
  },
};

/* ── Migration: legacy config.sections → Puck data ────────────────────── */

/** The smart blocks every migrated/upgraded home page starts with — the
 * structural stats + task list the legacy layout always rendered. */
export function defaultLiveBlocks() {
  return [
    { type: 'StatsBand', props: { id: 'live-stats' } },
    { type: 'TaskStops', props: { id: 'live-tasks', title: '任務停靠點' } },
  ];
}

/** v1 Puck docs predate smart blocks (stats/tasks were structural chrome).
 * Prepend them once so upgrading to the v2 layout loses nothing. */
export function upgradePuckDoc(doc) {
  const content = doc?.content || [];
  const has = (t) => content.some((c) => c.type === t);
  const prepend = defaultLiveBlocks().filter((b) => !has(b.type));
  return { ...doc, content: [...prepend, ...content] };
}

/** Converts the old per-type sections (lib/event-sections.js) into a Puck
 * document so existing events open in the drag-drop editor with their
 * content intact. Hidden sections are dropped (the new editor deletes
 * instead of hiding). */
export function sectionsToPuckData(sections) {
  const content = (sections || []).filter((s) => !s.hidden).map((s, i) => {
    const id = `migrated-${s.type}-${i}`;
    if (s.type === 'notice') {
      return { type: 'Notice', props: { id, title: s.title || '', tone: s.style === 'warning' ? 'warning' : 'info', items: (s.items || []).map((t) => ({ text: t })) } };
    }
    if (s.type === 'info-list') {
      return { type: 'InfoList', props: { id, title: s.title || '', items: (s.items || []).map((it) => ({ label: it.label || '', value: it.value || '' })) } };
    }
    if (s.type === 'places') {
      return { type: 'Places', props: { id, title: s.title || '', items: (s.items || []).map((it) => ({ name: it.name || '', description: it.description || '' })) } };
    }
    // text (and any unknown legacy type with paragraphs)
    return { type: 'TextCard', props: { id, title: s.title || '', text: (s.paragraphs || []).join('\n') } };
  });
  return { root: { props: { theme: 'default' } }, content: [...defaultLiveBlocks(), ...content], zones: {} };
}
