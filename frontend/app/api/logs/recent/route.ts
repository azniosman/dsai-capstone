/**
 * @file app/api/logs/recent/route.ts
 * @description Next.js server-side proxy to the NestJS `GET /api/logs/recent`
 * endpoint. The frontend calls this route using a relative URL so it is
 * completely agnostic to the backend base URL and trailing-slash variations
 * in environment config.
 *
 * GET /api/logs/recent?n=200
 */

import { NextRequest, NextResponse } from "next/server";

/** Strip trailing slash and ensure /api prefix is present exactly once. */
const buildBackendUrl = (path: string): string => {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000")
    .replace(/\/+$/, ""); // remove trailing slashes
  return `${base}/api${path}`;
};

export async function GET(req: NextRequest) {
  const n = req.nextUrl.searchParams.get("n") ?? "200";
  const upstreamUrl = buildBackendUrl(`/logs/recent?n=${n}`);

  try {
    const res = await fetch(upstreamUrl, {
      headers: { "Content-Type": "application/json" },
      // No caching — every call should return latest entries.
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${res.status}` },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown proxy error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
