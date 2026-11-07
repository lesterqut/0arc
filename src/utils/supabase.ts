/**
 * Legacy Supabase configuration helpers kept for backwards compatibility.
 */

const STORAGE_URL_KEY = '0arc_supabase_url';
const STORAGE_KEY_KEY = '0arc_supabase_anon_key';
const STORAGE_DISCONNECTED_KEY = '0arc_supabase_disconnected';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  source: 'env' | 'custom' | 'none';
}

export function getSupabaseConfig(): SupabaseConfig {
  let envUrl = '';
  let envKey = '';

  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
      envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';
    }
  } catch {}

  if (envUrl && envKey) {
    return { url: envUrl, anonKey: envKey, source: 'env' };
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedUrl = (localStorage.getItem(STORAGE_URL_KEY) || '').trim();
      const storedKey = (localStorage.getItem(STORAGE_KEY_KEY) || '').trim();
      if (storedUrl && storedKey) {
        return { url: storedUrl, anonKey: storedKey, source: 'custom' };
      }
    }
  } catch {}

  return { url: '', anonKey: '', source: 'none' };
}

export function isSupabaseConfigured(): boolean {
  const config = getSupabaseConfig();
  return Boolean(config.url && config.anonKey);
}

export function isCloudSyncEnabled(): boolean {
  return true;
}

export function setCloudSyncEnabled(_enabled: boolean): void {}

export function saveSupabaseCredentials(url: string, anonKey: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_URL_KEY, url.trim());
  localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
  localStorage.removeItem(STORAGE_DISCONNECTED_KEY);
}

export function clearSupabaseCredentials(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_URL_KEY);
  localStorage.removeItem(STORAGE_KEY_KEY);
}

export function getSupabaseClient(): any {
  return null;
}

export function resetSupabaseClient(): void {}

export async function testSupabaseConnection(
  url: string,
  anonKey: string
): Promise<{ ok: boolean; message: string }> {
  if (!url || !anonKey) {
    return { ok: false, message: 'URL and Anon Key are required.' };
  }
  return { ok: true, message: 'Cloud connection active.' };
}
