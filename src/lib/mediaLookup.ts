import type { MediaType } from '../types';

export interface MediaCandidate {
  id: string;
  title: string;
  year?: number;
  type: MediaType;
  rawType?: string;
  posterUrl?: string;
  stars?: string;
}

export interface MediaDetails {
  title: string;
  type: MediaType;
  description: string;
  genre: string;
  releaseYear: number;
  rating: number;
  posterUrl: string;
  progressTotal?: number;
}

export async function searchMedia(query: string, type?: MediaType): Promise<MediaCandidate[]> {
  const params = new URLSearchParams({ q: query.trim() });
  if (type) params.set('type', type);
  const response = await fetch(`/api/imdb/search?${params.toString()}`);
  if (!response.ok) return [];
  const payload = (await response.json()) as { results?: MediaCandidate[] };
  return Array.isArray(payload.results) ? payload.results : [];
}

export async function lookupMediaDetails(input: {
  title: string;
  year?: number;
  type?: MediaType;
  imdbId?: string;
  posterUrl?: string;
}): Promise<MediaDetails | null> {
  const response = await fetch('/api/imdb/details', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) return null;
  return (await response.json()) as MediaDetails;
}
