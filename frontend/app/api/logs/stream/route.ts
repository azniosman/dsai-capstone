/**
 * @file app/api/logs/stream/route.ts
 * @description Next.js server-side SSE proxy to the NestJS
 * `GET /api/logs/stream` endpoint. Uses the Edge runtime so the response
 * can be streamed long-form without the default 60-second API route timeout.
 *
 * GET /api/logs/stream
 */

export const runtime = "edge";

/** Strip trailing slash and ensure /api prefix is present exactly once. */
const buildBackendUrl = (path: string): string => {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000")
    .replace(/\/+$/, "");
  return `${base}/api${path}`;
};

export async function GET() {
  const upstreamUrl = buildBackendUrl("/logs/stream");

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
      },
      // @ts-expect-error — Next.js Edge fetch supports duplex streaming
      duplex: "half",
    });

    if (!upstream.ok || !upstream.body) {
      return new Response(
        JSON.stringify({ error: `Upstream SSE unavailable (${upstream.status})` }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return new Response(
      "data: {\"error\":\"upstream_unavailable\"}\n\n",
      {
        status: 200, // Keep 200 so EventSource doesn't immediately error
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
      },
    );
  }
}
