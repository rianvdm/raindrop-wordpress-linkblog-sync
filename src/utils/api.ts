// ABOUTME: API utilities for building query strings and handling external service interactions.
// ABOUTME: Provides helper functions for Raindrop API communication and date formatting.
export const RAINDROP_API_BASE = "https://api.raindrop.io/rest/v1";

export function buildQueryString(
  params: Record<string, string | number | boolean | undefined>
): string {
  const filtered = Object.entries(params)
    .filter(([_, value]) => value !== undefined)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
    );

  return filtered.length > 0 ? `?${filtered.join("&")}` : "";
}

export function parseRaindropDate(dateString: string): Date {
  // Raindrop uses ISO 8601 format
  return new Date(dateString);
}

export function formatDateForRaindrop(date: Date): string {
  // Raindrop expects ISO 8601 format
  return date.toISOString();
}
