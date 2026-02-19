import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import axios from "axios"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function extractApiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (!detail) return fallback;
    // FastAPI returns a string for most errors
    if (typeof detail === "string") return detail;
    // FastAPI 422 validation errors return an array of objects like [{msg, loc, type}]
    if (Array.isArray(detail)) {
      return detail
        .map((d: { msg?: string; loc?: (string | number)[] }) =>
          d.msg ? `${d.loc ? d.loc.join(" → ") + ": " : ""}${d.msg}` : JSON.stringify(d)
        )
        .join("; ");
    }
    // Fallback for unexpected object shapes
    return JSON.stringify(detail);
  }
  return fallback;
}
