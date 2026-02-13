import type { NextConfig } from "next";

const isExport = process.env.NEXT_OUTPUT === "export";

const nextConfig: NextConfig = {
  output: isExport ? "export" : "standalone",
  trailingSlash: isExport,
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
