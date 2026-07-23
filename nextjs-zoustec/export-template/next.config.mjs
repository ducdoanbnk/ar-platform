/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Content stores RELATIVE media URLs (/media/db/…) — proxy them (and any
    // client-side API call) to the Zoustec platform so images and uploads
    // resolve from this site's own origin, no CORS, key stays server-side.
    const base = process.env.ZOUSTEC_API_BASE;
    if (!base) return [];
    return [
      { source: '/media/:path*', destination: `${base}/media/:path*` },
      { source: '/api/:path*', destination: `${base}/api/:path*` },
    ];
  },
};

export default nextConfig;
