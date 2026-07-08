import './globals.css';

export const metadata = {
  title: 'Zoustec AR 體驗平台',
  description: 'AR 集章互動體驗平台 — 6 個核心畫面',
};

// viewport-fit=cover: extend into the notch/home-indicator areas (each screen
// reserves its own safe-area via env()). theme-color: tints the LINE/mobile
// browser chrome the same dark tone instead of the default color.
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0B2935',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
