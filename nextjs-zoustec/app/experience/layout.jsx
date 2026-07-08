import TenantBrand from '../../components/TenantBrand';

export const metadata = { title: 'WebAR 體驗 · Zoustec AR' };

export default function ExperienceLayout({ children }) {
  return (
    <div style={{ background: '#0B2935' }}>
      <TenantBrand />
      <div className="mobile-viewport">{children}</div>
    </div>
  );
}
