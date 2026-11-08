import { NavigationTab } from '../types';

/**
 * Human-readable URLs for the archive sections.
 *
 * Home/Overview stays at `/` and Settings intentionally has no path of its own —
 * it is reached from the nav and keeps the current URL untouched (the router
 * simply parks it on `/`).
 */
export const TAB_PATHS: Record<NavigationTab, string> = {
  overview: '/',
  tools: '/tools',
  notes: '/notes',
  watchlist: '/watchlist',
  images: '/images',
  favorites: '/favorites',
  settings: '/',
};

export const TAB_TITLES: Record<NavigationTab, string> = {
  overview: 'Overview',
  tools: 'Tools',
  notes: 'Notes',
  watchlist: 'Watchlist',
  images: 'Images',
  favorites: 'Favorites',
  settings: 'Settings',
};

const PATH_TO_TAB: Record<string, NavigationTab> = {
  '/': 'overview',
  '/tools': 'tools',
  '/notes': 'notes',
  '/watchlist': 'watchlist',
  '/images': 'images',
  '/favorites': 'favorites',
};

/** Lower-case, strip trailing slashes so `/Tools/` still resolves. */
export function normalizePath(pathname: string): string {
  const trimmed = (pathname || '/').replace(/\/+$/, '');
  return (trimmed === '' ? '/' : trimmed).toLowerCase();
}

export function tabFromPath(pathname: string): NavigationTab | null {
  return PATH_TO_TAB[normalizePath(pathname)] ?? null;
}

export function pathForTab(tab: NavigationTab): string {
  return TAB_PATHS[tab] ?? '/';
}
