/**
 * @file fetchInfocommJobs.ts
 * @description Server-side API helper for the IMDA Number of Infocomm Jobs dataset.
 *
 * Dataset: IMDA Number of Infocomm Jobs
 * Source:  https://data.gov.sg
 * Resource ID: d_f3bbdfbf92b811fff364aeed23b5e0bb
 *
 * Usage:
 *   import { fetchInfocommJobs } from "@/lib/fetchInfocommJobs";
 *   const { records, meta } = await fetchInfocommJobs();
 */

/** A single quarter's employment record from the IMDA dataset. */
export interface InfocommRecord {
  /** Quarter label, e.g. "2023 Q1" */
  quarter: string;
  /** Number of Infocomm workers employed */
  employed: number;
  /** Number of Infocomm job vacancies */
  vacancies: number;
  /** Raw year extracted from the quarter string for filtering */
  year: number;
}

export interface InfocommJobsMeta {
  total: number;
  fetchedAt: string;
}

export interface InfocommJobsResult {
  records: InfocommRecord[];
  meta: InfocommJobsMeta;
}

/** Base URL for the data.gov.sg datastore API. */
const DATASET_API_URL =
  "https://data.gov.sg/api/action/datastore_search?resource_id=d_f3bbdfbf92b811fff364aeed23b5e0bb";

/** Maximum records to fetch per page (datastore_search max is 100). */
const PAGE_LIMIT = 100;

/**
 * Parses a raw record from the API into a normalised `InfocommRecord`.
 * The API returns fields with varying names across dataset versions, so we
 * check multiple possible field names.
 *
 * @param raw - Raw record object from the API response.
 * @returns Normalised `InfocommRecord`, or `null` if the row is malformed.
 */
function parseRecord(raw: Record<string, unknown>): InfocommRecord | null {
  // Quarter field: the dataset uses "quarter" key
  const quarter =
    (raw["quarter"] as string) ??
    (raw["Quarter"] as string) ??
    (raw["year"] as string) ??
    "";

  if (!quarter) return null;

  // Employed field
  const employedRaw =
    raw["employed"] ??
    raw["Employed"] ??
    raw["no_of_infocomm_workers_employed"] ??
    raw["workers_employed"] ??
    0;

  // Vacancies field
  const vacanciesRaw =
    raw["vacancies"] ??
    raw["Vacancies"] ??
    raw["no_of_infocomm_job_vacancies"] ??
    raw["job_vacancies"] ??
    0;

  const employed = Number(String(employedRaw).replace(/,/g, "")) || 0;
  const vacancies = Number(String(vacanciesRaw).replace(/,/g, "")) || 0;

  // Extract year from quarter string like "2023 Q1" or "2023Q1" or "2023"
  const yearMatch = quarter.match(/^(\d{4})/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : 0;

  return { quarter, employed, vacancies, year };
}

/**
 * Fetches all records from the IMDA Infocomm Jobs dataset via pagination.
 * Handles the `limit` / `offset` pattern used by CKAN datastore_search.
 *
 * Uses `DATA_GOV_SG_API_KEY` from the environment if set, but the endpoint
 * is publicly accessible without a key.
 *
 * @param signal - Optional `AbortSignal` to cancel in-flight requests.
 * @returns Normalised records and metadata.
 * @throws Error if the API returns a non-2xx response or malformed JSON.
 */
export async function fetchInfocommJobs(
  signal?: AbortSignal,
): Promise<InfocommJobsResult> {
  const apiKey = process.env.DATA_GOV_SG_API_KEY ?? "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = apiKey;
  }

  const allRecords: InfocommRecord[] = [];
  let offset = 0;
  let total = Infinity;

  // Paginate until we have all records
  while (offset < total) {
    const url = `${DATASET_API_URL}&limit=${PAGE_LIMIT}&offset=${offset}`;

    const response = await fetch(url, {
      headers,
      next: { revalidate: 300 }, // ISR: revalidate every 5 minutes
      signal,
    });

    if (!response.ok) {
      throw new Error(
        `Data.gov.sg API error: HTTP ${response.status} ${response.statusText}`,
      );
    }

    const json = (await response.json()) as {
      success: boolean;
      result?: {
        total: number;
        records: Record<string, unknown>[];
      };
    };

    if (!json.success || !json.result) {
      throw new Error("Data.gov.sg API returned an unsuccessful response.");
    }

    total = json.result.total;

    for (const raw of json.result.records) {
      const record = parseRecord(raw);
      if (record) allRecords.push(record);
    }

    offset += PAGE_LIMIT;

    // Safety: if no records returned this page, break to avoid infinite loop
    if (json.result.records.length === 0) break;
  }

  // Sort chronologically (oldest first)
  allRecords.sort((a, b) => a.quarter.localeCompare(b.quarter));

  return {
    records: allRecords,
    meta: {
      total: allRecords.length,
      fetchedAt: new Date().toISOString(),
    },
  };
}
