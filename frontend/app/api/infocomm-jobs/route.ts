/**
 * @file api/infocomm-jobs/route.ts
 * @description Next.js App Router API route — securely proxies the data.gov.sg
 * IMDA Infocomm Jobs dataset so the `DATA_GOV_SG_API_KEY` never leaves the server.
 *
 * GET /api/infocomm-jobs
 * Returns: { records: InfocommRecord[], meta: InfocommJobsMeta }
 */

import { NextResponse } from "next/server";
import { fetchInfocommJobs } from "@/lib/fetchInfocommJobs";

/** Cache the response for 5 minutes on the CDN edge. */
export const revalidate = 300;

export async function GET() {
  try {
    const data = await fetchInfocommJobs();
    return NextResponse.json(data, {
      headers: {
        // Cache at the edge for 5 minutes; allow stale for 10 minutes while
        // revalidating in the background (stale-while-revalidate pattern).
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error fetching dataset";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
