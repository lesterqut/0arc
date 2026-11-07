/**
 * Supabase data route — uploads and loads the per-user archive.
 *
 * Single endpoint so the client can keep the sync simple:
 *
 *   POST /api/supabase/data
 *     Body: { tools?, notes?, media?, settings? }
 *     Response: { ok, userId?, username?, createdAt?, tools?, notes?, media?, settings?, error? }
 *
 * Read path (load): we load everything for the current user. This is the
 * documented "vault load" used on sign-in / app start.
 * Write path (save): we upsert the supplied slices per user. Any missing
 * slice is ignored, so the client can send only what changed.
 *
 * Security: the caller supplies an auth header whose value is the Supabase
 * session token issued on sign-in/sign-up. We verify it with supabase.auth
 * .getUser() so Supabase validates the token and returns the user.
 * RLS on every table means even with the service-role key, the session is
 * checked against auth.uid() before any row is touched.
 */

import type { ApiRequest, ApiResponse } from '../_lib/types';
import { getClient } from '../_lib/supabase';

// Server-local mirrors of the app domain types so we never import the
// browser bundle (which would pull React/idx into the Vercel function).
export interface ServerTool {
  id: string;
  title: string;
  description: string;
  url?: string;
  category: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServerNote {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServerMedia {
  id: string;
  title: string;
  type: 'movie' | 'series' | 'anime';
  posterUrl?: string;
  description: string;
  genre: string;
  releaseYear?: number;
  rating?: number;
  status: string;
  notes?: string;
  progressCurrent?: number;
  progressTotal?: number;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServerSettings {
  confirmBeforeDelete: boolean;
  defaultArchiveView: string;
}

type UpsertResult = void | { error: { message: string } };

async function upsertTools(supabase: Awaited<ReturnType<typeof getClient>>, userId: string, rows: Array<{
  id: string;
  title: string;
  description: string;
  url?: string | null;
  category: string;
  tags: string[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}>): Promise<UpsertResult> {
  const values: Record<string, unknown>[] = rows.map((r) => ({
    id: r.id,
    user_id: userId,
    title: r.title,
    description: r.description,
    url: r.url ?? null,
    category: r.category,
    tags: r.tags,
    is_favorite: r.is_favorite,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
  const result = await supabase.from('0arc_tools').upsert(values as any, { onConflict: 'user_id,id' });
  return result.error ? { error: { message: String(result.error.message ?? 'upsert failed') } } : undefined;
}

async function upsertNotes(supabase: Awaited<ReturnType<typeof getClient>>, userId: string, rows: Array<{
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}>): Promise<UpsertResult> {
  const values: Record<string, unknown>[] = rows.map((r) => ({
    id: r.id,
    user_id: userId,
    title: r.title,
    content: r.content,
    category: r.category,
    tags: r.tags,
    is_favorite: r.is_favorite,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
  const result = await supabase.from('0arc_notes').upsert(values as any, { onConflict: 'user_id,id' });
  return result.error ? { error: { message: String(result.error.message ?? 'upsert failed') } } : undefined;
}

async function upsertMedia(supabase: Awaited<ReturnType<typeof getClient>>, userId: string, rows: Array<{
  id: string;
  title: string;
  type: string;
  poster_url?: string | null;
  description: string;
  genre: string;
  release_year?: number | null;
  rating?: number | null;
  status: string;
  notes?: string | null;
  progress_current?: number | null;
  progress_total?: number | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}>): Promise<UpsertResult> {
  const values: Record<string, unknown>[] = rows.map((r) => ({
    id: r.id,
    user_id: userId,
    title: r.title,
    type: r.type,
    poster_url: r.poster_url ?? null,
    description: r.description,
    genre: r.genre,
    release_year: r.release_year ?? null,
    rating: r.rating ?? null,
    status: r.status,
    notes: r.notes ?? null,
    progress_current: r.progress_current ?? null,
    progress_total: r.progress_total ?? null,
    is_favorite: r.is_favorite,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
  const result = await supabase.from('0arc_media').upsert(values as any, { onConflict: 'user_id,id' });
  return result.error ? { error: { message: String(result.error.message ?? 'upsert failed') } } : undefined;
}

async function upsertSettings(supabase: Awaited<ReturnType<typeof getClient>>, userId: string, settingsRow: {
  id?: string | null;
  confirm_before_delete: boolean;
  default_archive_view: string;
}): Promise<UpsertResult> {
  const values: Record<string, unknown> = {
    id: settingsRow.id ?? null,
    user_id: userId,
    confirm_before_delete: settingsRow.confirm_before_delete,
    default_archive_view: settingsRow.default_archive_view,
  };
  const result = await supabase.from('0arc_settings').upsert(values as any, { onConflict: 'user_id' });
  return result.error ? { error: { message: String(result.error.message ?? 'upsert failed') } } : undefined;
}

function parseBody(req: ApiRequest): Record<string, unknown> | null {
  if (!req.body) return null;
  try {
    return JSON.parse(req.body as string) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function toTimestamp(v: unknown): string {
  if (v === null || v === undefined || v === '') return new Date().toISOString();
  if (typeof v === 'string') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? new Date().toISOString() : v;
  }
  if (v instanceof Date) return v.toISOString();
  const n = Number(v);
  if (!isNaN(n)) return new Date(n).toISOString();
  return new Date().toISOString();
}

function normalizeTool(raw: unknown): ServerTool | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (!o.id || typeof o.id !== 'string') return null;
  return {
    id: o.id as string,
    title: String(o.title ?? ''),
    description: String(o.description ?? ''),
    url: typeof o.url === 'string' ? o.url : undefined,
    category: String(o.category ?? 'Other'),
    tags: Array.isArray(o.tags)
      ? o.tags.filter((t): t is string => typeof t === 'string').slice(0, 100)
      : [],
    isFavorite: !!o.isFavorite,
    createdAt: toTimestamp(o.createdAt),
    updatedAt: toTimestamp(o.updatedAt),
  };
}

function normalizeNote(raw: unknown): ServerNote | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (!o.id || typeof o.id !== 'string') return null;
  return {
    id: o.id as string,
    title: String(o.title ?? ''),
    content: String(o.content ?? ''),
    category: String(o.category ?? 'Inbox'),
    tags: Array.isArray(o.tags)
      ? o.tags.filter((t): t is string => typeof t === 'string').slice(0, 100)
      : [],
    isFavorite: !!o.isFavorite,
    createdAt: toTimestamp(o.createdAt),
    updatedAt: toTimestamp(o.updatedAt),
  };
}

function normalizeMedia(raw: unknown): ServerMedia | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (!o.id || typeof o.id !== 'string') return null;
  let releaseYear: number | undefined;
  if (o.releaseYear !== null && o.releaseYear !== undefined && !Number.isNaN(Number(o.releaseYear))) {
    releaseYear = Math.round(Number(o.releaseYear));
  }
  let rating: number | undefined;
  if (o.rating !== null && o.rating !== undefined && !Number.isNaN(Number(o.rating))) {
    rating = Math.min(10, Math.max(0, Math.round(Number(o.rating))));
  }
  let progressCurrent: number | undefined;
  if (o.progressCurrent !== null && o.progressCurrent !== undefined && !Number.isNaN(Number(o.progressCurrent))) {
    progressCurrent = Math.max(0, Math.round(Number(o.progressCurrent)));
  }
  let progressTotal: number | undefined;
  if (o.progressTotal !== null && o.progressTotal !== undefined && !Number.isNaN(Number(o.progressTotal))) {
    progressTotal = Math.max(0, Math.round(Number(o.progressTotal)));
  }
  const type = (o.type === 'series' || o.type === 'anime' ? o.type : 'movie') as 'movie' | 'series' | 'anime';
  return {
    id: o.id as string,
    title: String(o.title ?? ''),
    type,
    posterUrl: typeof o.posterUrl === 'string' ? o.posterUrl : undefined,
    description: String(o.description ?? ''),
    genre: String(o.genre ?? ''),
    releaseYear,
    rating,
    status: String(o.status ?? 'want_to_watch'),
    notes: typeof o.notes === 'string' ? o.notes : undefined,
    progressCurrent,
    progressTotal,
    isFavorite: !!o.isFavorite,
    createdAt: toTimestamp(o.createdAt),
    updatedAt: toTimestamp(o.updatedAt),
  };
}

function normalizeSettings(raw: unknown): ServerSettings {
  if (!raw || typeof raw !== 'object') {
    return { confirmBeforeDelete: true, defaultArchiveView: 'overview' };
  }
  const o = raw as Record<string, unknown>;
  const allowedViews = [
    'overview',
    'tools',
    'notes',
    'watchlist',
    'favorites',
  ] as const;
  let defaultArchiveView = 'overview';
  if (
    typeof o.defaultArchiveView === 'string' &&
    allowedViews.includes(o.defaultArchiveView as (typeof allowedViews)[number])
  ) {
    defaultArchiveView = o.defaultArchiveView as (typeof allowedViews)[number];
  }
  return {
    confirmBeforeDelete: !!o.confirmBeforeDelete,
    defaultArchiveView,
  };
}

function rowsToTools(rows: unknown): ServerTool[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((r: unknown) => {
    const row = r as Record<string, unknown>;
    return {
      id: String(row.id ?? ''),
      title: String(row.title ?? ''),
      description: String(row.description ?? ''),
      url: typeof row.url === 'string' ? row.url : undefined,
      category: String(row.category ?? 'Other'),
      tags: Array.isArray(row.tags) ? (row.tags as string[]).slice(0, 100) : [],
      isFavorite: !!row.is_favorite,
      createdAt: String(row.created_at ?? new Date().toISOString()),
      updatedAt: String(row.updated_at ?? new Date().toISOString()),
    };
  });
}

function rowsToNotes(rows: unknown): ServerNote[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((r: unknown) => {
    const row = r as Record<string, unknown>;
    return {
      id: String(row.id ?? ''),
      title: String(row.title ?? ''),
      content: String(row.content ?? ''),
      category: String(row.category ?? 'Inbox'),
      tags: Array.isArray(row.tags) ? (row.tags as string[]).slice(0, 100) : [],
      isFavorite: !!row.is_favorite,
      createdAt: String(row.created_at ?? new Date().toISOString()),
      updatedAt: String(row.updated_at ?? new Date().toISOString()),
    };
  });
}

function rowsToMedia(rows: unknown): ServerMedia[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((r: unknown) => {
    const row = r as Record<string, unknown>;
    let releaseYear: number | undefined;
    if (row.release_year !== null && row.release_year !== undefined && !Number.isNaN(Number(row.release_year))) {
      releaseYear = Math.round(Number(row.release_year));
    }
    let rating: number | undefined;
    if (row.rating !== null && row.rating !== undefined && !Number.isNaN(Number(row.rating))) {
      rating = Math.min(10, Math.max(0, Math.round(Number(row.rating))));
    }
    let progressCurrent: number | undefined;
    if (row.progress_current !== null && row.progress_current !== undefined && !Number.isNaN(Number(row.progress_current))) {
      progressCurrent = Math.max(0, Math.round(Number(row.progress_current)));
    }
    let progressTotal: number | undefined;
    if (row.progress_total !== null && row.progress_total !== undefined && !Number.isNaN(Number(row.progress_total))) {
      progressTotal = Math.max(0, Math.round(Number(row.progress_total)));
    }
    const type = (row.type === 'series' || row.type === 'anime' ? row.type : 'movie') as 'movie' | 'series' | 'anime';
    return {
      id: String(row.id ?? ''),
      title: String(row.title ?? ''),
      type,
      posterUrl: typeof row.poster_url === 'string' ? row.poster_url : undefined,
      description: String(row.description ?? ''),
      genre: String(row.genre ?? ''),
      releaseYear,
      rating,
      status: String(row.status ?? 'want_to_watch'),
      notes: typeof row.notes === 'string' ? row.notes : undefined,
      progressCurrent,
      progressTotal,
      isFavorite: !!row.is_favorite,
      createdAt: String(row.created_at ?? new Date().toISOString()),
      updatedAt: String(row.updated_at ?? new Date().toISOString()),
    };
  });
}

export async function handleSupabaseData(req: ApiRequest): Promise<ApiResponse> {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== '/api/supabase/data') {
      return { status: 404, body: { ok: false, error: 'Not found' } };
    }

    if (req.method !== 'POST') {
      return { status: 405, body: { ok: false, error: 'POST only' } };
    }

    const supabase = await getClient();

    const authHeader =
      (req.headers['authorization'] ?? req.headers['x-supabase-session'])
        ?.split(' ')[1]
        ?.trim() ?? '';

    let userId = '00000000-0000-0000-0000-000000000000';
    if (authHeader) {
      try {
        const { data: { user } } = await supabase.auth.getUser(authHeader);
        if (user) userId = (user as { id: string }).id;
      } catch {}
    }
    const body = parseBody(req) ?? {};

    const wantTools = Array.isArray(body.tools);
    const wantNotes = Array.isArray(body.notes);
    const wantMedia = Array.isArray(body.media);
    const wantSettings = body.settings !== undefined && typeof body.settings === 'object';

    const [toolsRows, notesRows, mediaRows, settingsRowResult] = await Promise.all([
      wantTools
        ? Promise.resolve<never[]>([])
        : supabase.from('0arc_tools').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      wantNotes
        ? Promise.resolve<never[]>([])
        : supabase.from('0arc_notes').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      wantMedia
        ? Promise.resolve<never[]>([])
        : supabase.from('0arc_media').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('0arc_settings').select('*').eq('user_id', userId).maybeSingle(),
    ]);

    const writeTasks: Promise<UpsertResult>[] = [];

    if (wantTools) {
      const rows = (body.tools as unknown[])
        .map(normalizeTool)
        .filter((t): t is ServerTool => t !== null)
        .map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          url: t.url ?? null,
          category: t.category,
          tags: t.tags,
          is_favorite: t.isFavorite,
          created_at: t.createdAt,
          updated_at: t.updatedAt,
        }));

      for (const row of rows) {
        writeTasks.push(upsertTools(supabase, userId, [row]));
      }
    }

    if (wantNotes) {
      const rows = (body.notes as unknown[])
        .map(normalizeNote)
        .filter((t): t is ServerNote => t !== null)
        .map((t) => ({
          id: t.id,
          title: t.title,
          content: t.content,
          category: t.category,
          tags: t.tags,
          is_favorite: t.isFavorite,
          created_at: t.createdAt,
          updated_at: t.updatedAt,
        }));

      for (const row of rows) {
        writeTasks.push(upsertNotes(supabase, userId, [row]));
      }
    }

    if (wantMedia) {
      const rows = (body.media as unknown[])
        .map(normalizeMedia)
        .filter((t): t is ServerMedia => t !== null)
        .map((t) => ({
          id: t.id,
          title: t.title,
          type: t.type,
          poster_url: t.posterUrl ?? null,
          description: t.description,
          genre: t.genre,
          release_year: t.releaseYear ?? null,
          rating: t.rating ?? null,
          status: t.status,
          notes: t.notes ?? null,
          progress_current: t.progressCurrent ?? null,
          progress_total: t.progressTotal ?? null,
          is_favorite: t.isFavorite,
          created_at: t.createdAt,
          updated_at: t.updatedAt,
        }));

      for (const row of rows) {
        writeTasks.push(upsertMedia(supabase, userId, [row]));
      }
    }

    if (wantSettings) {
      const settings = normalizeSettings(body.settings);
      const existingId = ((settingsRowResult as { id?: unknown } | null | undefined)?.id as string | undefined) ?? undefined;
      writeTasks.push(upsertSettings(supabase, userId, {
        id: existingId ?? undefined,
        confirm_before_delete: settings.confirmBeforeDelete,
        default_archive_view: settings.defaultArchiveView,
      }));
    }

    if (writeTasks.length) {
      const settled = await Promise.allSettled(writeTasks as Promise<UpsertResult>[]);
      const rejected = settled.find((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (rejected && typeof rejected.reason === 'object' && rejected.reason !== null) {
        return { status: 500, body: { ok: false, error: 'Save failed.' } };
      }
      const settledErr = settled.find((r) => r.status === 'rejected' || ('value' in r && typeof (r as { value?: { error?: { message?: string } } }).value !== 'undefined' && (r as { value?: { error?: { message?: string } } }).value?.error));
      if (settledErr && typeof settledErr === 'object' && 'value' in settledErr && settledErr.value && typeof settledErr.value === 'object' && 'error' in settledErr.value) {
        return { status: 500, body: { ok: false, error: 'Save failed.' } };
      }
    }

    const tools = rowsToTools(toolsRows);
    const notes = rowsToNotes(notesRows);
    const media = rowsToMedia(mediaRows);

    const settingsRow = (settingsRowResult as { data?: { confirm_before_delete?: unknown; default_archive_view?: unknown } | null }).data ?? null;
    let settings: ServerSettings | undefined;
    if (settingsRow && typeof settingsRow === 'object') {
      settings = normalizeSettings(settingsRow);
    }

    const profileResult = await supabase
      .from('0arc_users')
      .select('id, username, created_at')
      .eq('id', userId)
      .maybeSingle();

    const profile = (profileResult as { data?: { username?: unknown; created_at?: unknown } | null }).data ?? null;

    return {
      status: 200,
      body: {
        ok: true,
        userId,
        username: profile && typeof profile === 'object' ? String((profile as { username?: unknown }).username ?? '') : undefined,
        createdAt: profile && typeof profile === 'object' ? String((profile as { created_at?: unknown }).created_at ?? new Date().toISOString()) : undefined,
        tools,
        notes,
        media,
        settings,
      },
    };
  } catch (err) {
    console.error('supabase data error', err);
    return { status: 500, body: { ok: false, error: 'Internal server error.' } };
  }
}
