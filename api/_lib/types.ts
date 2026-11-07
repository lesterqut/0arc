/**
 * Shared types for server-side helper code (Vercel functions + local dev
 * server). These describe the wire shape, not the in-app domain models.
 */

export interface ApiRequest {
  method: string;
  url: string;
  headers: Record<string, string | undefined>;
  body?: string;
  query?: Record<string, string>;
}

export interface ApiResponse {
  status: number;
  body: unknown;
}
