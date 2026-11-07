import { searchImdb } from '../_lib/media';
import { readParam, type ApiRequest, type ApiResponse } from '../_lib/http';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const query = readParam(req.query?.q);
  const type = readParam(req.query?.type) || undefined;

  if (!query) {
    res.status(200).json({ results: [] });
    return;
  }

  try {
    const results = await searchImdb(query, type);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json({ results });
  } catch {
    res.status(200).json({ results: [] });
  }
}

// Mirror path for clients that hit /api/imdb/q instead of /api/imdb/search.
export async function handleQueryRoute(req: ApiRequest, res: ApiResponse) {
  const query = readParam(req.query?.q);
  const type = readParam(req.query?.type) || undefined;

  if (!query) {
    res.status(200).json({ results: [] });
    return;
  }

  try {
    const results = await searchImdb(query, type);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json({ results });
  } catch {
    res.status(200).json({ results: [] });
  }
}
