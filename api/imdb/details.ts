import { resolveMediaDetails, type MediaKind } from '../_lib/media.js';
import { readBodyField, readBodyNumber, type ApiRequest, type ApiResponse } from '../_lib/http.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const title = readBodyField(req.body, 'title');
  if (!title) {
    res.status(400).json({ error: 'Title is required' });
    return;
  }

  const requestedType = readBodyField(req.body, 'type');
  const type: MediaKind =
    requestedType === 'series' || requestedType === 'anime' ? requestedType : 'movie';

  const details = await resolveMediaDetails(
    title,
    readBodyNumber(req.body, 'year'),
    type,
    readBodyField(req.body, 'posterUrl') || undefined
  );

  res.status(200).json(details);
}
