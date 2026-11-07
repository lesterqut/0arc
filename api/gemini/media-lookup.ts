import { lookupMedia } from '../_lib/media.js';
import { readBodyField, type ApiRequest, type ApiResponse } from '../_lib/http.js';

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

  const type = readBodyField(req.body, 'type') || 'movie';
  const details = await lookupMedia(title, type);
  res.status(200).json(details);
}
