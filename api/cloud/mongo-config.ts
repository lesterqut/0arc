import type { ApiRequest, ApiResponse, readBodyField } from '../_lib/http.js';
import { connectMongo } from '../_lib/cloudStore.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  let body = req.body as any;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {}
  }

  const uri = typeof body?.uri === 'string' ? body.uri : '';
  const result = await connectMongo(uri.trim());
  return res.status(result.ok ? 200 : 400).json(result);
}
