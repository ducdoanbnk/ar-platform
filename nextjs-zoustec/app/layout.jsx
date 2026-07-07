import './globals.css';

export const metadata = {
  title: 'Zoustec AR 體驗平台',
  description: 'AR 集章互動體驗平台 — 6 個核心畫面',
};

// viewport-fit=cover: tràn vào vùng tai thỏ/home-indicator (safe-area do
// từng màn tự chừa bằng env()). theme-color: thanh trình duyệt LINE/mobile
// nhuộm cùng tông nền tối thay vì màu mặc định.
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
