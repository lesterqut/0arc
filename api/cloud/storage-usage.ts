import type { ApiRequest, ApiResponse } from '../_lib/http.js';
import { getStorageUsage } from '../_lib/cloudStore.js';

export default async function handler(_req: ApiRequest, res: ApiResponse) {
  try {
    const usage = await getStorageUsage();
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).json({ ok: true, ...usage });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to calculate storage usage',
    });
  }
}
