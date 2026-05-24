import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone build: `next build` emits a self-contained server bundle to
  // .next/standalone (with its own server.js). Prod deploy only needs:
  //   .next/standalone/  +  .next/static/  +  public/
  // No node_modules, no `next start` CLI. See start-prod.ps1 for how the
  // root launcher boots it via `node .next/standalone/server.js`.
  output: "standalone",
  images: {
    // Skip Next.js's server-side image optimizer. Both image-source modes
    // already deliver appropriately-sized images — imgserve caches them and
    // VNDB serves pre-generated '.t' thumbnails — so the optimizer is
    // redundant. It also cannot serve "direct" mode: the optimizer fetches the
    // upstream image server-side, and t.vndb.org trips its private-IP (SSRF)
    // guard whenever the host resolves DNS through a fake-IP proxy. Keep this
    // on, or "direct" image source breaks.
    unoptimized: true,
  },
  // Dev-only proxy: in prod Caddy intercepts /vndb, /imgserve, /userserve
  // before they reach Next.js (see Caddyfile), so these rewrites are a no-op
  // in prod. In dev (`next dev` with no Caddy), the browser hits Next.js
  // directly on :5003 and these rewrites forward to the Flask ports.
  async rewrites() {
    return [
      {
        source: "/vndb/:path*",
        destination: `${process.env.VNDB_BASE_URL || "http://localhost:5000"}/:path*`,
      },
      {
        source: "/imgserve/:path*",
        destination: `${process.env.IMGSERVE_BASE_URL || "http://localhost:5001"}/:path*`,
      },
      {
        source: "/userserve/:path*",
        destination: `${process.env.USERSERVE_BASE_URL || "http://localhost:5002"}/:path*`,
      },
    ]
  }
};

export default nextConfig;
