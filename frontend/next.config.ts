import type { NextConfig } from "next";

const isExport = process.env.NEXT_OUTPUT === "export";

const nextConfig: NextConfig = {
  output: isExport ? "export" : "standalone",
  trailingSlash: false, // must be false for static export — trailingSlash:true nests pages as login/index.html, breaking S3 routing
  images: isExport ? { unoptimized: true } : undefined,
  ...(isExport
    ? {}
    : {
        async rewrites() {
          const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
          return [
            {
              source: "/api/:path*",
              destination: `${backendUrl}/api/:path*`,
            },
          ];
        },
      }),
};

export default nextConfig;
