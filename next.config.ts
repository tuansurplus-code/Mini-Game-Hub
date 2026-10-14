import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/homepage/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=86400" }] },
      { source: "/template-previews/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=86400" }] },
      { source: "/template-artwork/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=86400" }] },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
