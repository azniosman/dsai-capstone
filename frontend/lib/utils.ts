import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extracts a human-readable error message from an API error response.
 * Handles FastAPI validation errors (detail array), plain detail strings,
 * and generic network errors.
 */
export function extractApiError(err: unknown, fallback = "An unexpected error occurred."): string {
  if (!err || typeof err !== "object") return fallback

  const e = err as {
    response?: { data?: { detail?: unknown } }
    message?: string
  }

  const detail = e?.response?.data?.detail

  if (typeof detail === "string" && detail.length > 0) {
    return detail
  }

  // FastAPI validation error: detail is an array of {loc, msg, type}
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string; loc?: string[] }
    const field = first.loc?.slice(-1)[0] ?? "field"
    return `${field}: ${first.msg ?? "invalid value"}`
  }

  if (typeof e?.message === "string" && e.message.length > 0) {
    return e.message
  }

  return fallback
}
