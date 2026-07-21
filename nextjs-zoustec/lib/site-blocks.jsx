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

/* ── Theme presets ─────────────────────────────────────────────────────
 * A theme is a set of CSS-var overrides scoped to the Puck content (root
 * render) plus page-level styles (EventSite wrapper: background + font).
 * Blocks keep reading the same tokens, so every theme restyles every block
 * — the "thỏa trí custom" layer that stays consistent per design system. */
export const THEMES = {
  default: { label: '清爽（預設）', vars: {}, page: {} },
  dark: {
    label: '深色',
    vars: {
      '--surface-sunken': 'rgba(255,255,255,.07)',
      '--border-subtle': 'rgba(255,255,255,.15)',
      '--border-default': 'rgba(255,255,255,.24)',
      '--text-strong': '#F3F6F8',
      '--text-body': '#C9D6DD',
      '--text-subtle': '#8FA6B0',
      '--status-warning-bg': 'rgba(245,158,11,.16)',
    },
    page: { background: '#0B2935', color: '#C9D6DD' },
  },
  warm: {
    label: '暖陽',
    vars: {
      '--surface-sunken': '#FBF2E3',
      '--border-subtle': '#F0E0C5',
      '--border-default': '#E2CBA2',
      '--text-strong': '#43301A',
      '--text-body': '#6B5638',
      '--text-subtle': '#9C8767',
    },
    page: { background: '#FFFBF4' },
  },
  nature: {
    label: '森林',
    vars: {
      '--surface-sunken': '#EEF6EC',
      '--border-subtle': '#DCEBD6',
      '--border-default': '#BDD8B2',
      '--text-strong': '#1E3A26',
      '--text-body': '#3F5C48',
      '--text-subtle': '#7C967F',
    },
    page: { background: '#F7FBF6' },
  },
  elegant: {
    label: '典雅（襯線體）',
    vars: {
      '--surface-sunken': '#FAF9F7',
      '--border-subtle': '#E8E4DC',
      '--border-default': '#D4CDC0',
      '--text-strong': '#2B2620',
      '--text-body': '#575044',
      '--text-subtle': '#948B7B',
      '--site-radius': '4px',
    },
    page: { background: '#FFFEFB' },
    font: "Georgia, 'Noto Serif TC', 'Times New Roman', serif",
  },
};

export function themeStyles(themeKey) {
  const t = THEMES[themeKey] || THEMES.default;
  return { vars: { ...t.vars, ...(t.font ? { fontFamily: t.font } : {}) }, page: { ...t.page, ...(t.font ? { fontFamily: t.font } : {}) } };
}

const card = { background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--site-radius, 14px)', padding: '14px' };
const warnCard = { background: 'var(--status-warning-bg, #FEF3C7)', border: '1px solid #FBBF24', borderRadius: 'var(--site-radius, 14px)', padding: '14px' };
const cardTitle = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 800, color: 'var(--text-strong)', marginBottom: '9px' };
const ALIGN = { left: 'flex-start', center: 'center', right: 'flex-end' };

/* ── Block renderers (plain presentational components) ────────────────── */

function HeadingBlock({ text, level, align }) {
  const Tag = level === 'h3' ? 'h3' : 'h2';
  const size = level === 'h3' ? 'clamp(15px, 1.8vw, 17px)' : 'clamp(18px, 2.2vw, 22px)';
  return <Tag style={{ margin: 0, fontSize: size, fontWeight: 800, color: 'var(--text-strong)', textAlign: align || 'left' }}>{text}</Tag>;
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
        display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '9999px',
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
    content: { title: '內容', components: ['Heading', 'Paragraph', 'TextCard', 'Notice', 'InfoList', 'Places'] },
    media: { title: '媒體與按鈕', components: ['Image', 'Button'] },
    layout: { title: '版面', components: ['Columns', 'Spacer', 'Divider'] },
  },
  components: {
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
  return { root: { props: {} }, content, zones: {} };
}
