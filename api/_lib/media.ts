/**
 * Shared media metadata lookup used by both the local dev server (server.ts)
 * and the Vercel serverless functions in /api.
 *
 * Resolution order, in priority:
 *   1. TMDB (free developer API key) for poster + synopsis + genre + rating.
 *   2. TVMaze for TV / anime shows (free, no key).
 *   3. Wikipedia REST summary (free, no key).
 *   4. Static fallback copy + placeholder poster.
 *
 * This intentionally does **not** require any paid AI key. If TMDB is
 * configured, it becomes the strongest free source. If not, the lookup still
 * works, just with slightly less structured metadata from TVMaze/Wikipedia.
 */
export type MediaKind = 'movie' | 'series' | 'anime';

const ENV = process.env;

/**
 * Public, free IMDb suggestion autocomplete.
 *
 * This is the live IMDb autosuggest endpoint the app already uses in
 * `api/imdb/search.ts`. It returns titles, years, type, and a thumbnail URL.
 * It does not require any API key, and it is the best free path for the
 * "search IMDb titles" UX.
 */
export async function searchImdb(
  query: string,
  requestedType?: string,
): Promise<Array<{
  id: string;
  title: string;
  year?: number;
  type: MediaKind;
  rawType?: string;
  posterUrl?: string;
  stars?: string;
}>> {
  const clean = query.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  if (!clean) return [];

  try {
    const res = await fetchWithTimeout(
      `https://v3.sg.media-imdb.com/suggestion/x/${clean}.json`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      },
    );
    if (!res.ok) return [];

    const data = (await res.json()) as { d?: Array<Record<string, any>> };
    if (!Array.isArray(data.d)) return [];

    return data.d
      .filter((item) => typeof item.id === 'string' && item.id.startsWith('tt'))
      .slice(0, 8)
      .map((item) => ({
        id: item.id as string,
        title: (item.l as string) || query,
        year: item.y ? Number(item.y) : undefined,
        type: mapImdbType(item.q || item.qid, (item.l as string) || '', requestedType),
        rawType: item.q || item.qid || 'title',
        posterUrl: item.i?.imageUrl || undefined,
        stars: item.s || undefined,
      }));
  } catch {
    return [];
  }
}

export interface ImdbCandidate {
  id: string;
  title: string;
  year?: number;
  type: MediaKind;
  rawType?: string;
  posterUrl?: string;
  stars?: string;
}

export interface MediaDetails {
  title: string;
  type: MediaKind;
  description: string;
  genre: string;
  releaseYear: number;
  rating: number;
  posterUrl: string;
  progressTotal?: number;
}

const FALLBACK_POSTERS: Record<MediaKind, string> = {
  movie: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80',
  series: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800&auto=format&fit=crop&q=80',
  anime: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
};

const DEFAULT_GENRE: Record<MediaKind, string> = {
  movie: 'Drama',
  series: 'Drama',
  anime: 'Animation',
};

const REQUEST_TIMEOUT_MS = 4000;

/** TMDB v3 API key. Leave unset and this module degrades to TVMaze + Wikipedia. */
function getTmdbKey(): string | undefined {
  const key = ENV.TMDB_API_KEY;
  if (!key || key === 'MY_TMDB_API_KEY') return undefined;
  return key.trim();
}

/** Absolute poster URL built from a TMDB poster_path once we know the image base URL. */
let tmdbBaseUrl: string | null = null;
let tmdbSize: string | null = null;

async function tmdbImageBase(): Promise<{ baseUrl: string; size: string } | null> {
  const key = getTmdbKey();
  if (!key) return null;
  if (tmdbBaseUrl && tmdbSize) return { baseUrl: tmdbBaseUrl, size: tmdbSize };

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/configuration?api_key=${encodeURIComponent(key)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      images?: {
        secure_base_url?: string;
        poster_sizes?: Array<string>;
      };
    };
    const base = data.images?.secure_base_url;
    if (!base) return null;

    const size =
      (data.images?.poster_sizes ?? []).find((s) => /^[a-z0-9]+$/.test(s)) ??
      'w500';
    tmdbBaseUrl = base.replace(/\/+$/, '');
    tmdbSize = size;
    return { baseUrl: tmdbBaseUrl, size: tmdbSize };
  } catch {
    return null;
  }
}

function tmdbPosterUrl(posterPath?: string | null): string | undefined {
  if (!posterPath || !posterPath.startsWith('/')) return undefined;
  return `${tmdbBaseUrl ?? 'https://image.tmdb.org/t/p/'}${tmdbSize ?? 'w500'}${posterPath}`;
}

/** fetch() with a hard timeout so a slow third party cannot stall the whole request. */
async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeout = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function asMediaKind(value?: string): MediaKind | undefined {
  return value === 'movie' || value === 'series' || value === 'anime' ? value : undefined;
}

function mapImdbType(
  rawType: string | undefined,
  title: string,
  requestedType?: string,
): MediaKind {
  const requested = asMediaKind(requestedType);
  const raw = (rawType || '').toLowerCase();

  if (raw.includes('series') || raw.includes('tv') || raw.includes('mini')) {
    if (requested === 'anime' || title.toLowerCase().includes('anime')) return 'anime';
    return 'series';
  }
  return requested === 'anime' ? 'anime' : 'movie';
}

interface TmdbSearchItem {
  id: number;
  title?: string;
  name?: string;
  media_type?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  overview?: string;
  genre_ids?: Array<number>;
}

interface TmdbMedia {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  genres?: Array<{ id: number; name: string }>;
}

function tmdbReleaseYear(item: TmdbMedia): number {
  const raw = item.release_date || item.first_air_date || '';
  return raw ? Number(raw.slice(0, 4)) : new Date().getFullYear();
}

function tmdbTitle(item: TmdbMedia): string {
  return item.title || item.name || '';
}

function tmdbGenreIds(item: TmdbSearchItem): Array<number> {
  return item.genre_ids && item.genre_ids.length ? item.genre_ids : [];
}

async function tmdbSearch(query: string, type: MediaKind): Promise<TmdbSearchItem[]> {
  const key = getTmdbKey();
  if (!key) return [];

  const url = new URL('https://api.themoviedb.org/3/search/multi');
  url.searchParams.set('api_key', key);
  url.searchParams.set('query', query);
  url.searchParams.set('language', 'en-US');
  url.searchParams.set('include_adult', 'false');
  url.searchParams.set('page', '1');

  const res = await fetchWithTimeout(url.toString(), { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    results?: Array<TmdbSearchItem>;
  };
  const results = data.results || [];

  const accept: Record<string, MediaKind> = { movie: 'movie', tv: 'series', person: 'movie' };
  return results
    .filter((item) => typeof item.id === 'number')
    .slice(0, 8);
}

async function tmdbDetails(id: number, type: MediaKind): Promise<TmdbMedia | null> {
  const key = getTmdbKey();
  if (!key) return null;

  const path = type === 'series' ? `/3/tv/${id}` : `/3/movie/${id}`;
  const url = new URL(`https://api.themoviedb.org${path}`);
  url.searchParams.set('api_key', key);
  url.searchParams.set('language', 'en-US');

  const res = await fetchWithTimeout(url.toString(), { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  return (await res.json()) as TmdbMedia;
}

/** Best-effort lookup: TMDB (if configured) for poster/synopsis/genre/rating, then TVMaze + Wikipedia, then static fallback. */
export async function resolveMediaDetails(
  title: string,
  year?: number,
  type: MediaKind = 'movie',
  existingPoster?: string,
): Promise<{
  title: string;
  type: MediaKind;
  description: string;
  genre: string;
  releaseYear: number;
  rating: number;
  posterUrl: string;
  progressTotal?: number;
}> {
  let description = '';
  let rating = 8.5;
  let genre = DEFAULT_GENRE[type];
  let posterUrl = existingPoster;
  let releaseYear = year || new Date().getFullYear();
  const progressTotal = type === 'movie' ? undefined : 12;
  const tmdbKey = getTmdbKey();

  if (tmdbKey && type !== 'anime') {
    try {
      const search = await tmdbSearch(title, type);
      const best = search.find((item) => !!item.overview) || search[0];
      if (best) {
        const details = await tmdbDetails(best.id, type);
        if (details) {
          const tTitle = tmdbTitle(details);
          if (tTitle) title = tTitle;
          if (details.release_date || details.first_air_date) {
            const y = tmdbReleaseYear(details);
            if (!year) releaseYear = y;
          }
          if (details.overview) description = String(details.overview).trim();
          if (details.genres?.length) genre = details.genres.map((g) => g.name).join(', ');
          if (details.vote_average && details.vote_average >= 1 && details.vote_average <= 10) {
            rating = Number(details.vote_average);
          }
          if (!posterUrl) posterUrl = tmdbPosterUrl(details.poster_path);
        }
      }
    } catch {
      // TMDB is best-effort; fall through to TVMaze / Wikipedia
    }
  }

  if ((type === 'series' || type === 'anime') && !description && !posterUrl) {
    try {
      const tvRes = await fetchWithTimeout(
        `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(title)}`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (tvRes.ok) {
        const tvData = (await tvRes.json()) as Record<string, any>;
        if (tvData.summary) description = String(tvData.summary).replace(/<[^>]+>/g, '').trim();
        if (tvData.rating?.average && tvData.rating.average >= 1 && tvData.rating.average <= 10) {
          rating = Number(tvData.rating.average);
        }
        if (tvData.genres?.length) genre = tvData.genres.join(', ');
        if (!posterUrl && tvData.image?.original) posterUrl = tvData.image.original;
        const premieredYear = String(tvData.premiered || '').match(/^\d{4}/);
        if (premieredYear && !year) releaseYear = Number(premieredYear[0]);
      }
    } catch {
      // ignore and fall through to Wikipedia
    }
  }

  if (!description) {
    const typeKey = type === 'anime' ? 'anime' : type === 'series' ? 'TV_series' : 'film';
    const variations = [`${title}_(${typeKey})`, title];

    for (const variation of variations) {
      try {
        const wikiRes = await fetchWithTimeout(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
            variation.replace(/ /g, '_'),
          )}`,
          { signal: AbortSignal.timeout(5000) },
        );
        if (!wikiRes.ok) continue;

        const wikiData = (await wikiRes.json()) as Record<string, any>;
        if (
          wikiData.extract &&
          !String(wikiData.extract).includes('may refer to:')
        ) {
          description = String(wikiData.extract);
          if (!posterUrl) {
            posterUrl =
              wikiData.originalimage?.source || wikiData.thumbnail?.source;
          }
          break;
        }
      } catch {
        // try the next variation
      }
    }
  }

  return {
    title,
    type,
    description:
      description || `An acclaimed ${type} saved to your watchlist.`,
    genre,
    releaseYear,
    rating: Math.min(10, Math.max(1, Number(rating) || 8.5)),
    posterUrl:
      posterUrl && posterUrl.startsWith('http')
        ? posterUrl
        : FALLBACK_POSTERS[type],
    progressTotal,
  };
}

/** Best-effort lookup: IMDb suggestions first, then a direct detail resolution. */
export async function lookupMedia(
  title: string,
  requestedType?: string,
): Promise<{
  title: string;
  type: MediaKind;
  description: string;
  genre: string;
  releaseYear: number;
  rating: number;
  posterUrl: string;
  progressTotal?: number;
}> {
  const cleanType = asMediaKind(requestedType) || 'movie';
  const candidates = await searchImdb(title, cleanType);
  const topPick = candidates[0];

  if (topPick) {
    return resolveMediaDetails(
      topPick.title,
      topPick.year,
      topPick.type,
      topPick.posterUrl,
    );
  }
  return resolveMediaDetails(title, undefined, cleanType, undefined);
}
