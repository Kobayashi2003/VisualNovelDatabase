import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
  async rewrites() {
    return [
      {
        source: "/api/vndb/:path*",
        destination: `${process.env.VNDB_BASE_URL || "http://localhost:5000"}/:path*`,
      },
      {
        source: "/api/imgserve/:path*",
        destination: `${process.env.IMGSERVE_BASE_URL || "http://localhost:5001"}/:path*`,
      },
      {
        source: "/api/userserve/:path*",
        destination: `${process.env.USERSERVE_BASE_URL || "http://localhost:5002"}/:path*`,
      },
    ]
  }
};

export default nextConfig;
