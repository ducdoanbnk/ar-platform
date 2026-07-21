/**
 * Site template gallery — WordPress-theme-style full designs the tenant
 * applies in one click. A template is pure data: theme (token set) + the
 * home document's block layout + optional sub-pages. Applying one replaces
 * the site's LAYOUT while `applyTemplate` preserves the event's own data
 * (title, description, hero image, reward — and the smart blocks pull live
 * tasks/stats by themselves).
 *
 * The `__HERO__` marker in a Banner image resolves to the event's hero
 * image at apply time, so templates look "theirs" immediately.
 */

export const SITE_TEMPLATES = [
  {
    key: 'classic',
    label: '經典清爽',
    desc: '預設佈局 — 數據看板、任務、景點與說明卡片。',
    theme: 'default',
    hideHero: '',
    home: [
      { type: 'StatsBand', props: { id: 't-cl-1' } },
      { type: 'TaskStops', props: { id: 't-cl-2', title: '任務停靠點' } },
      { type: 'Heading', props: { id: 't-cl-3', text: '活動資訊', level: 'h2', align: 'left' } },
      { type: 'Places', props: { id: 't-cl-4', title: '景點導覽', items: [{ name: '（編輯）地標名稱', description: '介紹活動收錄的景點。' }] } },
      { type: 'TextCard', props: { id: 't-cl-5', title: '活動說明', text: '在此撰寫活動的背景與玩法。' } },
    ],
    pages: [],
  },
  {
    key: 'impact',
    label: '形象大片',
    desc: '隱藏預設 Hero，自製滿版橫幅 + 粗獷字重，適合品牌活動。',
    theme: 'bold',
    hideHero: 'hide',
    home: [
      { type: 'Banner', props: { id: 't-im-1', image: '__HERO__', height: 'xl', overlay: 'dark', overlayColor: '', title: '（編輯）活動主標語', subtitle: '一句話說出這場活動的魅力。', align: 'center', ctaLabel: '立即參加', ctaHref: '#join' } },
      { type: 'Spacer', props: { id: 't-im-2', size: 'm' } },
      { type: 'StatsBand', props: { id: 't-im-3' } },
      { type: 'Columns', props: { id: 't-im-4', ratio: '1-1',
        left: [{ type: 'TextCard', props: { id: 't-im-5', title: '關於活動', text: '介紹活動亮點與參加方式。' } }],
        right: [{ type: 'Notice', props: { id: 't-im-6', title: '注意事項', tone: 'info', items: [{ text: '（編輯）第一則提醒' }] } }] } },
      { type: 'TaskStops', props: { id: 't-im-7', title: '任務停靠點' } },
    ],
    pages: [],
  },
  {
    key: 'magazine',
    label: '典雅雜誌',
    desc: '襯線字體、窄欄置中排版，適合文化導覽與展覽。',
    theme: 'elegant',
    hideHero: '',
    home: [
      { type: 'Heading', props: { id: 't-mg-1', text: '關於這場旅程', level: 'h2', align: 'center' } },
      { type: 'Paragraph', props: { id: 't-mg-2', text: '在此撰寫一段富有故事性的介紹文字。', align: 'center', style: { maxWidth: 'narrow' } } },
      { type: 'Divider', props: { id: 't-mg-3' } },
      { type: 'StatsBand', props: { id: 't-mg-4' } },
      { type: 'Columns', props: { id: 't-mg-5', ratio: '1-1',
        left: [{ type: 'Places', props: { id: 't-mg-6', title: '導覽地點', items: [{ name: '（編輯）地點', description: '故事簡介。' }] } }],
        right: [{ type: 'InfoList', props: { id: 't-mg-7', title: '活動資訊', items: [{ label: '時間', value: '（編輯）' }, { label: '地點', value: '（編輯）' }] } }] } },
      { type: 'TaskStops', props: { id: 't-mg-8', title: '集章路線' } },
    ],
    pages: [
      { slug: 'story', title: '策展故事', nav: true, data: { root: { props: {} }, content: [
        { type: 'Heading', props: { id: 't-mg-p1', text: '策展故事', level: 'h2', align: 'center' } },
        { type: 'Paragraph', props: { id: 't-mg-p2', text: '（編輯）述說這場活動背後的理念。', align: 'center', style: { maxWidth: 'narrow' } } },
      ], zones: {} } },
    ],
  },
  {
    key: 'night',
    label: '夜色霓虹',
    desc: '深色主題 + 大橫幅，適合夜間市集與音樂活動。',
    theme: 'dark',
    hideHero: 'hide',
    home: [
      { type: 'Banner', props: { id: 't-ni-1', image: '__HERO__', height: 'l', overlay: 'custom', overlayColor: 'rgba(8,12,30,.6)', title: '（編輯）夜間活動標題', subtitle: '入夜之後，故事才開始。', align: 'left', ctaLabel: '開始旅程', ctaHref: '#join' } },
      { type: 'StatsBand', props: { id: 't-ni-2', style: { marginY: 'm' } } },
      { type: 'TaskStops', props: { id: 't-ni-3', title: '打卡點' } },
      { type: 'Notice', props: { id: 't-ni-4', title: '夜間注意事項', tone: 'warning', items: [{ text: '（編輯）夜間出行請注意安全。' }] } },
    ],
    pages: [],
  },
  {
    key: 'trail',
    label: '山林步道',
    desc: '自然綠意主題，路線資訊與安全提醒排前面，適合登山健行。',
    theme: 'nature',
    hideHero: '',
    home: [
      { type: 'InfoList', props: { id: 't-tr-1', title: '路線資訊', items: [{ label: '距離', value: '（編輯）1.5 km' }, { label: '爬升', value: '（編輯）+180 m' }, { label: '難度', value: '（編輯）中等' }] } },
      { type: 'Notice', props: { id: 't-tr-2', title: '安全提醒', tone: 'warning', items: [{ text: '每人至少攜帶 1 公升飲用水。' }, { text: '雨後石階濕滑，請穿著止滑鞋。' }] } },
      { type: 'StatsBand', props: { id: 't-tr-3' } },
      { type: 'TaskStops', props: { id: 't-tr-4', title: '步道打卡點' } },
      { type: 'Places', props: { id: 't-tr-5', title: '沿途景點', items: [{ name: '（編輯）觀景台', description: '視野最好的休息點。' }] } },
    ],
    pages: [],
  },
  {
    key: 'festive',
    label: '節慶購物',
    desc: '暖色調 + 促銷橫幅，適合商場檔期與市集活動。',
    theme: 'warm',
    hideHero: '',
    home: [
      { type: 'Banner', props: { id: 't-fe-1', image: '__HERO__', height: 'm', overlay: 'custom', overlayColor: 'rgba(120,60,10,.45)', title: '（編輯）檔期主題', subtitle: '集滿印章兌換限定好禮。', align: 'center', ctaLabel: '查看好禮', ctaHref: '#gift' } },
      { type: 'StatsBand', props: { id: 't-fe-2', style: { marginY: 'm' } } },
      { type: 'Places', props: { id: 't-fe-3', title: '參與店家', items: [{ name: '（編輯）美食街 B1', description: '單筆消費滿額即可蓋章。' }] } },
      { type: 'Notice', props: { id: 't-fe-4', title: '兌換說明', tone: 'info', items: [{ text: '請保留發票 — 服務台人員將核對消費。' }] } },
      { type: 'TaskStops', props: { id: 't-fe-5', title: '蓋章站點' } },
    ],
    pages: [],
  },
];

/** Builds the new home doc + pages from a template, preserving the event's
 * own settings (title/description/hero/reward, custom menu & CSS stay). */
export function applyTemplate(tpl, currentRootProps) {
  const hero = currentRootProps?.heroImage || '';
  const content = JSON.parse(JSON.stringify(tpl.home)).map((b) => {
    if (b.type === 'Banner' && b.props.image === '__HERO__') b.props.image = hero;
    return b;
  });
  const home = {
    root: { props: {
      ...currentRootProps,
      theme: tpl.theme,
      themeCustom: {},
      hideHero: tpl.hideHero || '',
    } },
    content,
    zones: {},
  };
  const pages = JSON.parse(JSON.stringify(tpl.pages || []));
  return { home, pages };
}
