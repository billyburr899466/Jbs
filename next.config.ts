import type { NextConfig } from "next";

// Preview-only source. Production remains untouched while this branch is tested.
const preservedProduction = "https://jbs-universal-renovations-app.vercel.app";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: `${preservedProduction}/legacy.html` },
        { source: "/legacy-static/:path*", destination: `${preservedProduction}/legacy-static/:path*` },
        { source: "/api/:path*", destination: `${preservedProduction}/api/:path*` },
        { source: "/manifest.webmanifest", destination: `${preservedProduction}/manifest.webmanifest` },
        { source: "/icon.svg", destination: `${preservedProduction}/icon.svg` },
        { source: "/sw.js", destination: `${preservedProduction}/sw.js` },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
