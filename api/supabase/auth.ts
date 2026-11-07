/**
 * Supabase Auth routes (server-side, Node only).
 *
 * These endpoints authenticate through the Supabase client that holds the
 * service-role key, so credentials and tokens never reach the browser.
 *
 * Routes:
 *   POST /api/supabase/auth/signup        body: { username, password }
 *   POST /api/supabase/auth/signin        body: { username, password }
 *   POST /api/supabase/auth/signout       no body, clears cookies
 */


import type { ApiRequest, ApiResponse } from '../_lib/types';
import { getClient } from '../_lib/supabase';

const USERNAME_MAX = 30;
const USERNAME_MIN = 3;

function validateUsername(raw: unknown): string | null {
  if (typeof raw !== 'string') return 'Username must be text.';
  const v = raw.trim();
  if (!v) return 'Username is required.';
  if (v.length < USERNAME_MIN) return 'Username must be at least 3 characters.';
  if (v.length > USERNAME_MAX) return 'Username cannot exceed 30 characters.';
  if (!/^[a-zA-Z0-9_]+$/.test(v))
    return 'Username can only contain letters, numbers, and underscores.';
  return null;
}

function validatePassword(raw: unknown): string | null {
  if (typeof raw !== 'string') return 'Password must be text.';
  if (raw.length < 6) return 'Password must be at least 6 characters.';
  if (raw.length > 128) return 'Password is too long.';
  return null;
}

export async function handleSignup(req: ApiRequest): Promise<ApiResponse> {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== '/api/supabase/auth/signup') {
      return { status: 404, body: { ok: false, error: 'Not found' } };
    }

    if (req.method !== 'POST') {
      return { status: 405, body: { ok: false, error: 'POST only' } };
    }

    const body = (await readBody(req)) ?? {};
    const usernameRaw = String(body.username ?? '');
    const passwordRaw = String(body.password ?? '');

    const usernameErr = validateUsername(usernameRaw);
    if (usernameErr) return { status: 400, body: { ok: false, error: usernameErr } };

    const passwordErr = validatePassword(passwordRaw);
    if (passwordErr) return { status: 400, body: { ok: false, error: passwordErr } };

    const username = usernameRaw.trim().toLowerCase();

    const supabase = await getClient();

    const existingResult = await supabase
      .from('0arc_users')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    const existingId = (existingResult.data as { id?: unknown } | null | undefined)?.id;

    if (typeof existingId === 'string' && existingId.length > 0) {
      return {
        status: 409,
        body: { ok: false, error: `Username "${username}" is already taken.` },
      };
    }

    const password = passwordRaw;
    const { data, error } = await supabase.auth.signUp({
      email: `${username}@0arc.local`,
      password,
      options: {
        data: { username },
        emailRedirectTo: undefined,
      },
    });

    if (error) {
      return { status: 400, body: { ok: false, error: error.message ?? 'Sign-up failed.' } };
    }

    if (!data.user) {
      return { status: 400, body: { ok: false, error: 'Sign-up produced no user.' } };
    }

    const userId = (data.user as { id: string }).id;

    const profileResult = await supabase
      .from('0arc_users')
      .select('id, username, created_at')
      .eq('id', userId)
      .maybeSingle();

    const profile = profileResult.data as { id?: unknown; username?: unknown; created_at?: unknown } | null | undefined;

    if (!profile || typeof (profile as { id?: unknown }).id !== 'string') {
      return { status: 201, body: { ok: true, username } };
    }

    return {
      status: 201,
      body: {
        ok: true,
        username: String((profile as { username?: unknown }).username ?? username),
        createdAt: String((profile as { created_at?: unknown }).created_at ?? new Date().toISOString()),
      },
    };
  } catch (err) {
    console.error('signup error', err);
    return { status: 500, body: { ok: false, error: 'Internal server error.' } };
  }
}

export async function handleSignin(req: ApiRequest): Promise<ApiResponse> {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== '/api/supabase/auth/signin') {
      return { status: 404, body: { ok: false, error: 'Not found' } };
    }

    if (req.method !== 'POST') {
      return { status: 405, body: { ok: false, error: 'POST only' } };
    }

    const body = (await readBody(req)) ?? {};
    const usernameRaw = String(body.username ?? '');
    const passwordRaw = String(body.password ?? '');

    const usernameErr = validateUsername(usernameRaw);
    if (usernameErr) return { status: 400, body: { ok: false, error: usernameErr } };

    const passwordErr = validatePassword(passwordRaw);
    if (passwordErr) return { status: 400, body: { ok: false, error: passwordErr } };

    const username = usernameRaw.trim().toLowerCase();

    const supabase = await getClient();
    const email = `${username}@0arc.local`;
    const password = passwordRaw;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        status: 401,
        body: { ok: false, error: 'Bad username or password.' },
      };
    }

    if (!data.user) {
      return { status: 401, body: { ok: false, error: 'Not signed in.' } };
    }

    const userId = (data.user as { id: string }).id;

    const profileResult = await supabase
      .from('0arc_users')
      .select('id, username, created_at')
      .eq('id', userId)
      .maybeSingle();

    const profile = profileResult.data as { id?: unknown; username?: unknown; created_at?: unknown } | null | undefined;

    if (!profile || typeof (profile as { id?: unknown }).id !== 'string') {
      return {
        status: 401,
        body: { ok: false, error: 'Account data missing; contact support.' },
      };
    }

    const sessionToken = String((data.session as { access_token?: unknown })?.access_token ?? '');

    return {
      status: 200,
      body: {
        ok: true,
        userId,
        username: String((profile as { username?: unknown }).username ?? username),
        createdAt: String((profile as { created_at?: unknown }).created_at ?? new Date().toISOString()),
        sessionToken,
      },
    };
  } catch (err) {
    console.error('signin error', err);
    return { status: 500, body: { ok: false, error: 'Internal server error.' } };
  }
}

export async function handleSignout(req: ApiRequest): Promise<ApiResponse> {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== '/api/supabase/auth/signout') {
      return { status: 404, body: { ok: false, error: 'Not found' } };
    }

    if (req.method !== 'POST') {
      return { status: 405, body: { ok: false, error: 'POST only' } };
    }

    const supabase = await getClient();
    await supabase.auth.signOut();

    return { status: 200, body: { ok: true } };
  } catch (err) {
    console.error('signout error', err);
    return { status: 500, body: { ok: false, error: 'Sign-out failed.' } };
  }
}

async function readBody(req: ApiRequest): Promise<Record<string, unknown> | null> {
  if (!req.body) return null;
  try {
    return JSON.parse(req.body as string) as Record<string, unknown>;
  } catch {
    return null;
  }
}
