/**
 * Minimal request/response shapes for Vercel Node functions.
 * Declared locally so the repo typechecks without pulling in @vercel/node.
 * These types are erased at build time; Vercel passes the real Node objects.
 */
export interface ApiRequest {
  method?: string;
  query?: Record<string, string | string[]>;
  body?: unknown;
}

export interface ApiResponse {
  setHeader(name: string, value: string): unknown;
  status(code: number): ApiResponse;
  json(body: unknown): unknown;
}

export function readParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return (value[0] || '').trim();
  return (value || '').trim();
}

export function readBodyField(body: unknown, field: string): string {
  if (!body || typeof body !== 'object') return '';
  const value = (body as Record<string, unknown>)[field];
  return typeof value === 'string' ? value.trim() : '';
}

export function readBodyNumber(body: unknown, field: string): number | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const value = Number((body as Record<string, unknown>)[field]);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}
